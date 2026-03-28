# backend/app/api/v1/endpoints/reports_superadmin_endpoint.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.meeting_model import MeetingModel
from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.poll_model import PollModel
from app.models.poll_option_model import PollOptionModel
from app.models.poll_response_model import PollResponseModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.services.user_service import UserService
from app.schemas.responses_schema import SuccessResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


async def _verify_superadmin(current_user: str, db: AsyncSession):
    user_service = UserService(db)
    user = await user_service.get_user_by_username(current_user)
    if not user or user.int_id_rol != 1:
        raise HTTPException(status_code=403, detail="Solo Super Admin")
    return user


# ─── 1. LISTA DE REUNIONES ────────────────────────────────────────────────────

@router.get("/meetings", response_model=SuccessResponse)
async def get_meetings_for_reports(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _verify_superadmin(current_user, db)

    result = await db.execute(
        select(MeetingModel, ResidentialUnitModel)
        .join(ResidentialUnitModel,
              MeetingModel.int_id_residential_unit == ResidentialUnitModel.id)
        .where(MeetingModel.str_status.in_(["En Curso", "Completada"]))
        .order_by(MeetingModel.dat_schedule_date.desc())
    )
    rows = result.all()

    meetings = [
        {
            "id": m.id,
            "title": m.str_title,
            "status": m.str_status,
            "modality": m.str_modality,
            "meeting_type": m.str_meeting_type,
            "scheduled_date": m.dat_schedule_date.isoformat(),
            "residential_unit": ru.str_name,
        }
        for m, ru in rows
    ]

    return SuccessResponse(success=True, status_code=200,
                           message="Reuniones obtenidas", data={"meetings": meetings})


# ─── 2. INFORME DE ASISTENCIA ─────────────────────────────────────────────────

@router.get("/{meeting_id}/attendance", response_model=SuccessResponse)
async def get_attendance_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _verify_superadmin(current_user, db)

    meeting_result = await db.execute(
        select(MeetingModel, ResidentialUnitModel)
        .join(ResidentialUnitModel,
              MeetingModel.int_id_residential_unit == ResidentialUnitModel.id)
        .where(MeetingModel.id == meeting_id)
    )
    row = meeting_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    meeting, residential_unit = row

    inv_result = await db.execute(
        select(MeetingInvitationModel, UserModel, DataUserModel)
        .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
        .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
        .where(MeetingInvitationModel.int_meeting_id == meeting_id)
        .order_by(DataUserModel.str_lastname)
    )
    invitations = inv_result.all()

    attended = []
    absent = []

    inv_map = {inv.int_user_id: inv for inv, user, data_user in invitations}

    for inv, user, data_user in invitations:
        if inv.str_apartment_number == 'ADMIN':
            continue

        # Determinar presencia efectiva
        is_directly_present = inv.bln_actually_attended and inv.dat_left_at is None
        
        delegate_inv = inv_map.get(inv.int_delegated_id) if inv.int_delegated_id else None
        is_present_by_delegation = (
            not is_directly_present
            and delegate_inv is not None
            and delegate_inv.bln_actually_attended
            and delegate_inv.dat_left_at is None
        )

        person = {
            "full_name": f"{data_user.str_firstname} {data_user.str_lastname}",
            "email": data_user.str_email,
            "apartment": inv.str_apartment_number,
            "quorum_base": float(inv.dec_quorum_base),
            "voting_weight": float(inv.dec_voting_weight),
            "attended_at": inv.dat_joined_at.isoformat() if inv.dat_joined_at else None,
            "attendance_type": (
                "Titular" if is_directly_present
                else "Delegado" if is_present_by_delegation
                else "Ausente"
            ),
            "delegated_to": inv.int_delegated_id,
        }

        if is_directly_present or is_present_by_delegation:
            attended.append(person)
        else:
            absent.append(person)

    total_quorum = sum(p["quorum_base"] for p in attended)

    return SuccessResponse(
        success=True, status_code=200,
        message="Informe de asistencia generado",
        data={
            "meeting": {
                "title": meeting.str_title,
                "residential_unit": residential_unit.str_name,
                "scheduled_date": meeting.dat_schedule_date.isoformat(),
                "status": meeting.str_status,
                "modality": meeting.str_modality,
            },
            "summary": {
                "total_invited": len(invitations),
                "total_attended": len(attended),
                "total_absent": len(absent),
                "quorum_achieved": total_quorum,
            },
            "attended": attended,
            "absent": absent,
        }
    )


# ─── 3. INFORME DE ENCUESTAS ──────────────────────────────────────────────────

@router.get("/{meeting_id}/polls", response_model=SuccessResponse)
async def get_polls_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _verify_superadmin(current_user, db)

    meeting_result = await db.execute(
        select(MeetingModel, ResidentialUnitModel)
        .join(ResidentialUnitModel,
              MeetingModel.int_id_residential_unit == ResidentialUnitModel.id)
        .where(MeetingModel.id == meeting_id)
    )
    row = meeting_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    meeting, residential_unit = row

    polls_result = await db.execute(
        select(PollModel)
        .where(PollModel.int_meeting_id == meeting_id)
        .order_by(PollModel.created_at)
    )
    polls = polls_result.scalars().all()

    polls_data = []
    for poll in polls:
        options_result = await db.execute(
            select(PollOptionModel).where(PollOptionModel.int_poll_id == poll.id)
        )
        options = options_result.scalars().all()

        options_map = {
            opt.id: {
                "id": opt.id,
                "text": opt.str_option_text,
                "votes_count": 0,
                "votes_weight": 0.0,
                "voters": [],        
            }
            for opt in options
        }

        responses_result = await db.execute(
            select(PollResponseModel, UserModel, DataUserModel, MeetingInvitationModel)
            .join(UserModel, PollResponseModel.int_user_id == UserModel.id)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .outerjoin(                                          # join con invitación
                MeetingInvitationModel,
                and_(
                    MeetingInvitationModel.int_meeting_id == meeting_id,
                    MeetingInvitationModel.int_user_id == PollResponseModel.int_user_id
                )
            )
            .where(PollResponseModel.int_poll_id == poll.id)
        )
        responses = responses_result.all()

        abstentions = []
        option_direct_voters = {}  # opt_id -> [(user_id, voted_at), ...]
        for resp, user, data_user, inv in responses:    # desempacar 4 valores
            voter_info = {
                "full_name": f"{data_user.str_firstname} {data_user.str_lastname}",
                "apartment": inv.str_apartment_number if inv else "—",
                "quorum_base": float(inv.dec_quorum_base) if inv and inv.dec_quorum_base else 0.0,
                "voting_weight": float(resp.dec_voting_weight),
                "voted_at": resp.dat_response_at.isoformat() if resp.dat_response_at else None,
                "is_delegation_vote": resp.str_ip_address == "delegation",
                "weight_note": "Peso cedido al delegado" if resp.str_ip_address == "delegation" else None,
            }
            if resp.bln_is_abstention:
                abstentions.append(voter_info)
            elif resp.int_option_id in options_map:
                options_map[resp.int_option_id]["votes_count"] += 1
                # Los votos por delegación (sentinel "delegation") son filas informativas:
                # el delegado ya votó con su dec_voting_weight que incluye el peso cedido.
                # Sumarlos causaría doble conteo, por eso se excluyen del peso total.
                if resp.str_ip_address != "delegation":
                    options_map[resp.int_option_id]["votes_weight"] += float(resp.dec_voting_weight) if resp.dec_voting_weight else 0.0
                options_map[resp.int_option_id]["voters"].append(voter_info)
                if resp.str_ip_address != "delegation":
                    opt_id = resp.int_option_id
                    if opt_id not in option_direct_voters:
                        option_direct_voters[opt_id] = []
                    option_direct_voters[opt_id].append((resp.int_user_id, voter_info["voted_at"]))

        # Para encuestas activas, inyectar filas de delegantes
        # (las encuestas cerradas ya tienen esas filas via _register_delegation_votes)
        if poll.str_status != "closed" and option_direct_voters:
            all_direct_voter_ids = list({uid for uids in option_direct_voters.values() for uid, _ in uids})
            if all_direct_voter_ids:
                del_result = await db.execute(
                    select(MeetingInvitationModel, UserModel, DataUserModel)
                    .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
                    .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                    .where(
                        MeetingInvitationModel.int_meeting_id == meeting_id,
                        MeetingInvitationModel.int_delegated_id.in_(all_direct_voter_ids)
                    )
                )
                delegations = del_result.all()

                delegate_to_delegators: dict = {}
                for del_inv, del_user, del_data_user in delegations:
                    delegate_id = del_inv.int_delegated_id
                    if delegate_id not in delegate_to_delegators:
                        delegate_to_delegators[delegate_id] = []
                    delegate_to_delegators[delegate_id].append({
                        "full_name": f"{del_data_user.str_firstname} {del_data_user.str_lastname}",
                        "apartment": del_inv.str_apartment_number,
                        "quorum_base": float(del_inv.dec_quorum_base) if del_inv.dec_quorum_base else 0.0,
                        "voting_weight": float(del_inv.dec_quorum_base) if del_inv.dec_quorum_base else 0.0,
                        "is_delegation_vote": True,
                        "weight_note": "Peso cedido al delegado",
                    })

                for opt_id, direct_voters in option_direct_voters.items():
                    for voter_id, voted_at in direct_voters:
                        for delegator_info in delegate_to_delegators.get(voter_id, []):
                            delegator_row = dict(delegator_info)
                            delegator_row["voted_at"] = voted_at
                            options_map[opt_id]["voters"].append(delegator_row)

        total_weight_voted = sum(opt["votes_weight"] for opt in options_map.values())

        voted_user_ids = {resp.int_user_id for resp, user, data_user, inv in responses}
        # For active polls, also mark delegators whose delegate voted as "voted" (they delegated)
        if poll.str_status != "closed" and voted_user_ids:
            delegators_voted_result = await db.execute(
                select(MeetingInvitationModel.int_user_id)
                .where(
                    MeetingInvitationModel.int_meeting_id == meeting_id,
                    MeetingInvitationModel.int_delegated_id.in_(voted_user_ids),
                    MeetingInvitationModel.str_apartment_number != 'ADMIN'
                )
            )
            for row in delegators_voted_result.all():
                voted_user_ids.add(row[0])

        non_voters_result = await db.execute(
            select(MeetingInvitationModel, UserModel, DataUserModel)
            .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .where(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.str_apartment_number != 'ADMIN',
                ~MeetingInvitationModel.int_user_id.in_(voted_user_ids) if voted_user_ids else True
            )
            .order_by(DataUserModel.str_lastname)
        )
        non_voters = [
            {
                "full_name": f"{du.str_firstname} {du.str_lastname}",
                "apartment": inv_nv.str_apartment_number,
                "quorum_base": float(inv_nv.dec_quorum_base) if inv_nv.dec_quorum_base else 0.0,
            }
            for inv_nv, user_nv, du in non_voters_result.all()
        ]

        polls_data.append({
            "id": poll.id,
            "title": poll.str_title,
            "description": poll.str_description,
            "type": poll.str_poll_type,
            "status": poll.str_status,
            "is_anonymous": poll.bln_is_anonymous,
            "requires_quorum": poll.bln_requires_quorum,
            "minimum_quorum_percentage": float(poll.dec_minimum_quorum_percentage) if poll.dec_minimum_quorum_percentage else 0,
            "options": list(options_map.values()),
            "abstentions": abstentions,
            "non_voters": non_voters,
            "total_voters": len(responses),
            "total_weight_voted": total_weight_voted,
        })

    return SuccessResponse(
        success=True, status_code=200,
        message="Informe de encuestas generado",
        data={
            "meeting": {
                "title": meeting.str_title,
                "residential_unit": residential_unit.str_name,
                "scheduled_date": meeting.dat_schedule_date.isoformat(),
            },
            "polls": polls_data,
        }
    )


# ─── 4. INFORME DE DELEGACIONES ───────────────────────────────────────────────

@router.get("/{meeting_id}/delegations", response_model=SuccessResponse)
async def get_delegations_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _verify_superadmin(current_user, db)

    meeting_result = await db.execute(
        select(MeetingModel, ResidentialUnitModel)
        .join(ResidentialUnitModel,
              MeetingModel.int_id_residential_unit == ResidentialUnitModel.id)
        .where(MeetingModel.id == meeting_id)
    )
    row = meeting_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    meeting, residential_unit = row

    result = await db.execute(
        select(MeetingInvitationModel, DataUserModel)
        .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
        .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
        .where(
            and_(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.int_delegated_id.isnot(None)
            )
        )
        .order_by(DataUserModel.str_lastname)
    )
    delegator_rows = result.all()

    delegations = []
    for inv, delegator_data in delegator_rows:
        delegate_result = await db.execute(
            select(DataUserModel)
            .join(UserModel, UserModel.int_data_user_id == DataUserModel.id)
            .where(UserModel.id == inv.int_delegated_id)
        )
        delegate_data = delegate_result.scalar_one_or_none()

        delegations.append({
            "delegator": {
                "full_name": f"{delegator_data.str_firstname} {delegator_data.str_lastname}",
                "email": delegator_data.str_email,
                "apartment": inv.str_apartment_number,
                "original_weight": float(inv.dec_quorum_base),
            },
            "delegate": {
                "full_name": f"{delegate_data.str_firstname} {delegate_data.str_lastname}" if delegate_data else "—",
                "email": delegate_data.str_email if delegate_data else "—",
            },
            "delegated_weight": float(inv.dec_quorum_base),
        })

    return SuccessResponse(
        success=True, status_code=200,
        message="Informe de delegaciones generado",
        data={
            "meeting": {
                "title": meeting.str_title,
                "residential_unit": residential_unit.str_name,
                "scheduled_date": meeting.dat_schedule_date.isoformat(),
            },
            "total_delegations": len(delegations),
            "delegations": delegations,
        }
    )


# ─── LLAMADOS DE ASISTENCIA ───────────────────────────────────────────────────

@router.get("/meetings/{meeting_id}/llamado/{numero}", response_model=SuccessResponse)
async def get_llamado_report(
    meeting_id: int,
    numero: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna los datos del llamado N reconstruidos desde tbl_meeting_invitations.
    Incluye nombre de la unidad y datos de la reunión para encabezado del PDF.
    """
    await _verify_superadmin(current_user, db)

    if numero not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="El número de llamado debe ser 1, 2 o 3")

    result = await db.execute(
        select(MeetingModel, ResidentialUnitModel)
        .join(ResidentialUnitModel, MeetingModel.int_id_residential_unit == ResidentialUnitModel.id)
        .where(MeetingModel.id == meeting_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")

    meeting, residential_unit = row

    from app.services.active_meeting_service import ActiveMeetingService
    svc = ActiveMeetingService(db)
    llamado_result = await svc.get_llamado_data(meeting_id, numero)

    if not llamado_result["success"]:
        raise HTTPException(status_code=404, detail=llamado_result["message"])

    return SuccessResponse(
        success=True,
        status_code=200,
        message=f"Datos del llamado {numero}",
        data={
            "meeting": {
                "id": meeting.id,
                "title": meeting.str_title,
                "scheduled_date": meeting.dat_schedule_date.isoformat() if meeting.dat_schedule_date else None,
                "status": meeting.str_status,
            },
            "residential_unit": {
                "name": residential_unit.str_name,
                "nit": residential_unit.str_nit,
            },
            "llamado": numero,
            "snapshot": llamado_result["snapshot"],
        }
    )


@router.get("/meetings/{meeting_id}/llamados", response_model=SuccessResponse)
async def get_all_llamados_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna el estado de los 3 llamados para una reunión (para mostrar en el modal del SA)."""
    await _verify_superadmin(current_user, db)

    result = await db.execute(
        select(MeetingModel, ResidentialUnitModel)
        .join(ResidentialUnitModel, MeetingModel.int_id_residential_unit == ResidentialUnitModel.id)
        .where(MeetingModel.id == meeting_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")

    meeting, residential_unit = row

    from app.services.active_meeting_service import ActiveMeetingService
    svc = ActiveMeetingService(db)
    llamados_result = await svc.get_all_llamados(meeting_id)

    return SuccessResponse(
        success=True,
        status_code=200,
        message="Llamados de la reunión",
        data={
            "meeting": {
                "id": meeting.id,
                "title": meeting.str_title,
                "scheduled_date": meeting.dat_schedule_date.isoformat() if meeting.dat_schedule_date else None,
            },
            "residential_unit": {
                "name": residential_unit.str_name,
                "nit": residential_unit.str_nit,
            },
            "llamados": llamados_result["llamados"],
        }
    )