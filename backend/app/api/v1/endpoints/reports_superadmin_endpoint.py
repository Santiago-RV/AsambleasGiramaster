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
router = APIRouter(prefix="/super-admin/reports", tags=["SA Reports"])


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

    for inv, user, data_user in invitations:
        person = {
            "full_name": f"{data_user.str_firstname} {data_user.str_lastname}",
            "email": data_user.str_email,
            "apartment": inv.str_apartment_number,
            "quorum_base": float(inv.dec_quorum_base),
            "voting_weight": float(inv.dec_voting_weight),
        }
        if inv.bln_actually_attended:
            person["attended_at"] = inv.dat_actually_attended.isoformat() if inv.dat_actually_attended else None
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
        .order_by(PollModel.dat_created_at)
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
                "text": opt.str_option_text,
                "votes_count": 0,
                "votes_weight": 0.0,
                "voters": []
            }
            for opt in options
        }

        responses_result = await db.execute(
            select(PollResponseModel, DataUserModel, MeetingInvitationModel)
            .join(UserModel, PollResponseModel.int_user_id == UserModel.id)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .outerjoin(
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
        for resp, data_user, inv in responses:
            voter_info = {
                "full_name": f"{data_user.str_firstname} {data_user.str_lastname}",
                "apartment": inv.str_apartment_number if inv else "—",
                "voting_weight": float(resp.dec_voting_weight),
                "is_abstention": resp.bln_is_abstention,
            }
            if resp.bln_is_abstention:
                abstentions.append(voter_info)
            elif resp.int_option_id in options_map:
                options_map[resp.int_option_id]["votes_count"] += 1
                options_map[resp.int_option_id]["votes_weight"] += float(resp.dec_voting_weight)
                options_map[resp.int_option_id]["voters"].append(voter_info)

        total_weight_voted = sum(opt["votes_weight"] for opt in options_map.values())

        polls_data.append({
            "id": poll.id,
            "title": poll.str_title,
            "type": poll.str_poll_type,
            "status": poll.str_status,
            "created_at": poll.dat_created_at.isoformat() if poll.dat_created_at else None,
            "options": list(options_map.values()),
            "abstentions": abstentions,
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