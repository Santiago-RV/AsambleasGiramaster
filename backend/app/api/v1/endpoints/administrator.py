from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.auth.auth import get_current_user
from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.schemas.meeting_invitation_schema import (
    BulkUploadResponse,
    MeetingInvitationCreate,
    MeetingInvitationResponse,
    MeetingInvitationBatchCreate
)
from app.services.meeting_invitation_service import MeetingInvitationService
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.core.database import get_db
from app.core.exceptions import ServiceException

from app.schemas.residential_unit_schema import BulkToggleAccessRequest, ResidentialUnitResponse

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/upload-excel",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Carga masiva de invitaciones desde Excel",
    description="Permite al administrador cargar invitaciones masivamente desde un archivo Excel"
)
async def upload_invitations_excel(
    meeting_id: int = Form(..., description="ID de la reunión"),
    file: UploadFile = File(..., description="Archivo Excel con las invitaciones"),
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Carga masiva de invitaciones desde Excel.
    
    El Excel debe contener las siguientes columnas:
    - email: Email del usuario (debe existir en la base de datos)
    - apartment_number: Número de apartamento
    - voting_weight: Peso de votación (coeficiente)
    - will_attend: (Opcional) Si asistirá (true/false)
    
    Solo usuarios administradores pueden usar este endpoint.
    """
    try:
        # Verificar que el usuario actual sea administrador
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user or user.int_id_rol not in [1, 2]:  # 1: Super Admin, 2: Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )

        # Validar tipo de archivo
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe ser un Excel (.xlsx o .xls)"
            )

        # Leer contenido del archivo
        file_content = await file.read()

        # Procesar el archivo
        invitation_service = MeetingInvitationService(db)
        results = await invitation_service.process_excel_file(
            file_content=file_content,
            meeting_id=meeting_id,
            created_by=user.id
        )

        # Preparar respuesta
        response_data = BulkUploadResponse(
            total_rows=results['total_rows'],
            successful=results['successful'],
            failed=results['failed'],
            errors=results['errors']
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message=f"Proceso completado: {results['successful']} invitaciones creadas, {results['failed']} fallidas",
            data=response_data.dict()
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al procesar el archivo Excel: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear invitación individual",
    description="Crea una invitación individual a una reunión"
)
async def create_invitation(
    invitation_data: MeetingInvitationCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una invitación individual"""
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        invitation_service = MeetingInvitationService(db)
        invitation = await invitation_service.create_invitation(
            invitation_data=invitation_data,
            created_by=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Invitación creada correctamente",
            data=MeetingInvitationResponse.from_orm(invitation).dict()
        )

    except Exception as e:
        raise ServiceException(
            message=f"Error al crear la invitación: {str(e)}",
            details={"original_error": str(e)}
        )


# @router.get(
#     "/meeting/{meeting_id}",
#     response_model=SuccessResponse,
#     status_code=status.HTTP_200_OK,
#     summary="Obtener invitaciones de una reunión",
#     description="Obtiene todas las invitaciones de una reunión específica"
# )
# async def get_meeting_invitations(
#     meeting_id: int,
#     current_user: str = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Obtiene todas las invitaciones de una reunión"""
#     try:
#         invitation_service = MeetingInvitationService(db)
#         invitations = await invitation_service.get_invitations_by_meeting(meeting_id)

#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message="Invitaciones obtenidas correctamente",
#             data=[MeetingInvitationResponse.from_orm(inv).dict() for inv in invitations]
#         )

#     except Exception as e:
#         raise ServiceException(
#             message=f"Error al obtener las invitaciones: {str(e)}",
#             details={"original_error": str(e)}
#         )

# @router.get(
#     "/meeting/{meeting_id}",
#     response_model=SuccessResponse,
#     status_code=status.HTTP_200_OK,
#     summary="Obtener invitaciones de una reunión",
#     description="Obtiene todas las invitaciones de una reunión específica con quorum base"
# )
# async def get_meeting_invitations(
#     meeting_id: int,
#     current_user: str = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Obtiene todas las invitaciones de una reunión con el quorum base de cada copropietario"""
#     try:
#         from app.models.meeting_invitation_model import MeetingInvitationModel
#         from app.models.user_model import UserModel
#         from app.models.data_user_model import DataUserModel
#         from app.models.user_residential_unit_model import UserResidentialUnitModel
#         from app.models.meeting_model import MeetingModel
#         from sqlalchemy import select, and_
        
#         # Query con JOIN para obtener el quorum base
#         query = (
#             select(
#                 MeetingInvitationModel,
#                 UserModel.str_firstname,
#                 UserModel.str_lastname,
#                 DataUserModel.str_email,
#                 UserResidentialUnitModel.dec_default_voting_weight.label('dec_quorum_base')
#             )
#             .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
#             .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
#             .outerjoin(
#                 UserResidentialUnitModel,
#                 and_(
#                     UserResidentialUnitModel.int_user_id == UserModel.id,
#                     UserResidentialUnitModel.int_residential_unit_id == (
#                         select(MeetingModel.int_id_residential_unit)
#                         .where(MeetingModel.id == meeting_id)
#                         .scalar_subquery()
#                     )
#                 )
#             )
#             .where(MeetingInvitationModel.int_meeting_id == meeting_id)
#             .order_by(
#                 UserModel.str_firstname.asc(),
#                 UserModel.str_lastname.asc()
#             )
#         )

#         result = await db.execute(query)
#         invitations_data = result.all()

#         # Formatear respuesta
#         invitations = []
#         for invitation, firstname, lastname, email, quorum_base in invitations_data:
#             invitation_dict = {
#                 "id": invitation.id,
#                 "int_meeting_id": invitation.int_meeting_id,
#                 "int_user_id": invitation.int_user_id,
#                 "dec_voting_weight": float(invitation.dec_voting_weight),  # Peso actual en la reunión
#                 "dec_quorum_base": float(quorum_base) if quorum_base is not None else 0.0,  # NUEVO: Quorum base
#                 "str_apartment_number": invitation.str_apartment_number,
#                 "str_invitation_status": invitation.str_invitation_status,
#                 "str_response_status": invitation.str_response_status,
#                 "bln_will_attend": invitation.bln_will_attend,
#                 "int_delegated_id": invitation.int_delegated_id,
#                 "str_firstname": firstname,
#                 "str_lastname": lastname,
#                 "str_email": email,
#                 "dat_sent_at": invitation.dat_sent_at,
#                 "dat_responded_at": invitation.dat_responded_at,
#                 "bln_actually_attended": invitation.bln_actually_attended,
#                 "dat_joined_at": invitation.dat_joined_at,
#                 "dat_left_at": invitation.dat_left_at,
#                 "created_at": invitation.created_at,
#                 "updated_at": invitation.updated_at
#             }
#             invitations.append(invitation_dict)

#         logger.info(f"✅ Se encontraron {len(invitations)} invitaciones para meeting_id={meeting_id}")

#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message=f"Se encontraron {len(invitations)} invitaciones",
#             data=invitations
#         )

#     except Exception as e:
#         logger.error(f"❌ Error al obtener invitaciones: {str(e)}")
#         raise ServiceException(
#             message=f"Error al obtener las invitaciones: {str(e)}",
#             details={"original_error": str(e)}
#         )

@router.get(
    "/meeting/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener invitaciones de una reunión",
    description="Obtiene todas las invitaciones con quorum base desde UserResidentialUnitModel"
)
async def get_meeting_invitations(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene invitaciones con quorum base desde la relación user_residential_unit.
    """
    try:
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.meeting_model import MeetingModel
        from sqlalchemy import select, and_
        
        logger.info(f"📋 Obteniendo invitaciones de meeting_id={meeting_id}")
        
        # ✅ Query CON JOIN a UserResidentialUnitModel para obtener quorum base
        query = (
            select(
                MeetingInvitationModel,
                DataUserModel.str_firstname,
                DataUserModel.str_lastname,
                DataUserModel.str_email,
                UserResidentialUnitModel.dec_default_voting_weight.label('dec_quorum_base')  # ✅ QUORUM BASE
            )
            .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .outerjoin(
                UserResidentialUnitModel,
                and_(
                    UserResidentialUnitModel.int_user_id == UserModel.id,
                    UserResidentialUnitModel.int_residential_unit_id == (
                        select(MeetingModel.int_id_residential_unit)
                        .where(MeetingModel.id == meeting_id)
                        .scalar_subquery()
                    )
                )
            )
            .where(MeetingInvitationModel.int_meeting_id == meeting_id)
            .order_by(
                DataUserModel.str_firstname.asc(),
                DataUserModel.str_lastname.asc()
            )
        )

        result = await db.execute(query)
        invitations_data = result.all()

        # ✅ Formatear respuesta con quorum base
        invitations = []
        for invitation, firstname, lastname, email, quorum_base in invitations_data:
            invitation_dict = {
                "id": invitation.id,
                "int_meeting_id": invitation.int_meeting_id,
                "int_user_id": invitation.int_user_id,
                
                # ✅ Quorum: actual (dec_voting_weight) y base (desde UserResidentialUnit)
                "dec_voting_weight": float(invitation.dec_voting_weight),  
                "dec_quorum_base": float(quorum_base) if quorum_base is not None else 0.0,  # ✅ QUORUM BASE
                
                "str_apartment_number": invitation.str_apartment_number,
                "str_invitation_status": invitation.str_invitation_status,
                "str_response_status": invitation.str_response_status,
                "bln_will_attend": invitation.bln_will_attend,
                "bln_actually_attended": invitation.bln_actually_attended,
                "int_delegated_id": invitation.int_delegated_id,
                
                # Info de usuario desde DataUserModel
                "str_firstname": firstname,
                "str_lastname": lastname,
                "str_email": email,
                
                # Fechas
                "dat_sent_at": invitation.dat_sent_at,
                "dat_responded_at": invitation.dat_responded_at,
                "dat_joined_at": invitation.dat_joined_at,
                "dat_left_at": invitation.dat_left_at,
                "created_at": invitation.created_at,
                "updated_at": invitation.updated_at
            }
            invitations.append(invitation_dict)

        logger.info(f"✅ Retornando {len(invitations)} invitaciones con quorum base")

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(invitations)} invitaciones",
            data=invitations
        )

    except Exception as e:
        logger.error(f"❌ Error al obtener invitaciones: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al obtener las invitaciones: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/invitations/batch",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear múltiples invitaciones a una reunión",
    description="Crea invitaciones para múltiples usuarios a una reunión programada"
)
async def create_batch_invitations(
    invitation_data: MeetingInvitationBatchCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea múltiples invitaciones a una reunión.
    
    Este endpoint permite invitar a múltiples copropietarios a una reunión programada.
    El peso de votación y número de apartamento se obtienen automáticamente desde
    UserResidentialUnitModel.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        invitation_service = MeetingInvitationService(db)
        results = await invitation_service.create_batch_invitations(
            meeting_id=invitation_data.int_meeting_id,
            user_ids=invitation_data.user_ids,
            created_by=user.id
        )

        message = f"Se crearon {results['invitations_created']} invitaciones"
        if results['failed'] > 0:
            message += f", {results['failed']} fallidas"

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message=message,
            data=results
        )

    except ServiceException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error al crear invitaciones batch: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al crear las invitaciones: {str(e)}",
            details={"original_error": str(e)}
        )


# ==========================================
# ENDPOINTS DE REUNIONES ACTIVAS PARA ADMIN
# ==========================================

@router.get(
    "/active-meetings",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener reuniones activas del admin",
    description="Obtiene las reuniones activas (En Curso) de la unidad residencial del administrador"
)
async def get_admin_active_meetings(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene las reuniones activas de la unidad residencial del administrador.
    
    Retorna:
    - Información básica de reuniones en curso
    - Cantidad de usuarios conectados
    - Total de invitados
    - Estado de quórum
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        # Verificar que sea admin (rol 2) o super admin (rol 1)
        if user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a esta información"
            )

        # Obtener la unidad residencial del admin
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from sqlalchemy import select
        
        unit_query = select(UserResidentialUnitModel.int_residential_unit_id).where(
            UserResidentialUnitModel.int_user_id == user.id,
            UserResidentialUnitModel.bool_is_admin == True
        )
        unit_result = await db.execute(unit_query)
        residential_unit_id = unit_result.scalar_one_or_none()
        
        if not residential_unit_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes una unidad residencial asignada como administrador"
            )

        # Obtener reuniones activas para esta unidad
        from app.services.active_meeting_service import ActiveMeetingService
        active_meeting_service = ActiveMeetingService(db)
        active_meetings = await active_meeting_service.get_active_meetings_by_unit(residential_unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {active_meetings.total_count} reuniones activas",
            data={
                "active_meetings": [
                    {
                        "meeting_id": meeting.meeting_id,
                        "title": meeting.title,
                        "residential_unit_name": meeting.residential_unit_name,
                        "meeting_type": meeting.meeting_type,
                        "status": meeting.status,
                        "started_at": meeting.started_at.isoformat() if meeting.started_at else None,
                        "connected_users_count": meeting.connected_users_count,
                        "total_invited": meeting.total_invited,
                        "quorum_reached": meeting.quorum_reached,
                        "active_polls_count": meeting.active_polls_count
                    }
                    for meeting in active_meetings.active_meetings
                ],
                "total_count": active_meetings.total_count
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener reuniones activas del admin: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al obtener reuniones activas: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/active-meetings/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalles de reunión activa del admin",
    description="Obtiene los detalles completos de una reunión activa de la unidad del admin"
)
async def get_admin_active_meeting_details(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los detalles completos de una reunión activa.
    
    Solo permite acceder a reuniones de la unidad residencial del administrador.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        # Verificar que sea admin (rol 2) o super admin (rol 1)
        if user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a esta información"
            )

        # Obtener la unidad residencial del admin
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from sqlalchemy import select
        
        unit_query = select(UserResidentialUnitModel.int_residential_unit_id).where(
            UserResidentialUnitModel.int_user_id == user.id,
            UserResidentialUnitModel.bool_is_admin == True
        )
        unit_result = await db.execute(unit_query)
        residential_unit_id = unit_result.scalar_one_or_none()
        
        if not residential_unit_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes una unidad residencial asignada como administrador"
            )

        # Verificar que la reunión pertenezca a la unidad del admin
        from app.models.meeting_model import MeetingModel
        meeting_query = select(MeetingModel).where(
            MeetingModel.id == meeting_id,
            MeetingModel.int_id_residential_unit == residential_unit_id
        )
        meeting_result = await db.execute(meeting_query)
        meeting = meeting_result.scalar_one_or_none()
        
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reunión no encontrada en tu unidad residencial"
            )

        # Obtener detalles de la reunión
        from app.services.active_meeting_service import ActiveMeetingService
        active_meeting_service = ActiveMeetingService(db)
        meeting_details = await active_meeting_service.get_meeting_details(meeting_id)

        if not meeting_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La reunión con ID {meeting_id} no existe"
            )

        # Formatear igual que super_admin para compatibilidad con el frontend
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Detalles de la reunión obtenidos exitosamente",
            data={
                "meeting_id": meeting_details.meeting_id,
                "title": meeting_details.title,
                "description": meeting_details.description,
                "residential_unit": {
                    "id": meeting_details.residential_unit_id,
                    "name": meeting_details.residential_unit_name,
                    "nit": meeting_details.residential_unit_nit
                },
                "meeting_type": meeting_details.meeting_type,
                "status": meeting_details.status,
                "scheduled_date": meeting_details.scheduled_date.isoformat(),
                "actual_start_time": meeting_details.actual_start_time.isoformat() if meeting_details.actual_start_time else None,
                "actual_end_time": meeting_details.actual_end_time.isoformat() if meeting_details.actual_end_time else None,
                "total_invited": meeting_details.total_invited,
                "total_confirmed": meeting_details.total_confirmed,
                "quorum_reached": meeting_details.quorum_reached,
                "zoom_join_url": meeting_details.zoom_join_url,
                "zoom_meeting_id": meeting_details.zoom_meeting_id,
                "administrator": {
                    "user_id": meeting_details.administrator.user_id,
                    "full_name": meeting_details.administrator.full_name,
                    "email": meeting_details.administrator.email,
                    "phone": meeting_details.administrator.phone
                } if meeting_details.administrator else None,
                "connected_users": [
                    {
                        "user_id": user.user_id,
                        "full_name": user.full_name,
                        "email": user.email,
                        "apartment_number": user.apartment_number,
                        "voting_weight": float(user.voting_weight),
                        "is_present": user.is_present,
                        "joined_at": user.joined_at.isoformat() if user.joined_at else None,
                        "attendance_type": user.attendance_type
                    }
                    for user in meeting_details.connected_users
                ],
                "polls": [
                    {
                        "poll_id": poll.poll_id,
                        "title": poll.title,
                        "description": poll.description,
                        "poll_type": poll.poll_type,
                        "status": poll.status,
                        "started_at": poll.started_at.isoformat() if poll.started_at else None,
                        "ended_at": poll.ended_at.isoformat() if poll.ended_at else None,
                        "total_votes": poll.total_votes,
                        "requires_quorum": poll.requires_quorum,
                        "minimum_quorum_percentage": float(poll.minimum_quorum_percentage) if poll.minimum_quorum_percentage else 0
                    }
                    for poll in meeting_details.polls
                ]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener detalles de reunión activa: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al obtener detalles de reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/meeting-in-progress",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener reunión en curso",
    description="Obtiene la reunión actualmente en curso con todos los detalles: conectados, desconectados, quorum, encuestas"
)
async def get_meeting_in_progress(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la reunión actualmente en curso para la unidad residencial del admin.
    
    Retorna:
    - Información de la reunión
    - Lista de conectados con peso de quorum
    - Lista de desconectados con peso de quorum
    - Total quorum de invitados
    - Encuestas con estado
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        if user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a esta información"
            )

        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from sqlalchemy import select
        
        unit_query = select(UserResidentialUnitModel.int_residential_unit_id).where(
            UserResidentialUnitModel.int_user_id == user.id,
            UserResidentialUnitModel.bool_is_admin == True
        )
        unit_result = await db.execute(unit_query)
        residential_unit_id = unit_result.scalar_one_or_none()
        
        if not residential_unit_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes una unidad residencial asignada como administrador"
            )

        from app.services.active_meeting_service import ActiveMeetingService
        active_meeting_service = ActiveMeetingService(db)
        meeting_data = await active_meeting_service.get_meeting_in_progress_details(residential_unit_id)

        if not meeting_data:
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="No hay reuniones en curso",
                data=None
            )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reunión en curso obtenida",
            data=meeting_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener reunión en curso: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al obtener reunión en curso: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/meeting/{meeting_id}/close-user-session/{user_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Cerrar sesión de usuario en reunión",
    description="Cierra la sesión de un usuario en la reunión y en el sistema"
)
async def close_user_session(
    meeting_id: int,
    user_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cierra la sesión de un usuario específico en una reunión.
    
    Acciones:
    1. Registra la hora de salida en la invitación (dat_left_at)
    2. Invalida las sesiones del usuario en el sistema
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        if user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )

        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from sqlalchemy import select
        
        unit_query = select(UserResidentialUnitModel.int_residential_unit_id).where(
            UserResidentialUnitModel.int_user_id == user.id,
            UserResidentialUnitModel.bool_is_admin == True
        )
        unit_result = await db.execute(unit_query)
        residential_unit_id = unit_result.scalar_one_or_none()
        
        if not residential_unit_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes una unidad residencial asignada"
            )

        from app.services.active_meeting_service import ActiveMeetingService
        active_meeting_service = ActiveMeetingService(db)
        result = await active_meeting_service.close_user_session(meeting_id, user_id, residential_unit_id)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=result["message"],
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al cerrar sesión: {str(e)}")
        raise ServiceException(
            message=f"Error al cerrar sesión: {str(e)}",
            details={"original_error": str(e)}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS DE REPORTES PARA ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/meetings/{meeting_id}/report/attendance",
    response_model=SuccessResponse,
    summary="Reporte de asistencia de una reunión",
    description="Obtiene el reporte de asistencia de una reunión específica"
)
async def get_attendance_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el reporte de asistencia de una reunión"""
    try:
        from sqlalchemy import select
        from app.models.meeting_model import MeetingModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        
        user_service = UserService(db)
        admin_user = await user_service.get_user_by_username(current_user)
        
        if not admin_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        admin_unit_query = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == admin_user.id
        )
        admin_unit_result = await db.execute(admin_unit_query)
        admin_unit = admin_unit_result.scalar_one_or_none()
        
        if not admin_unit:
            raise HTTPException(
                status_code=403,
                detail="No tienes una unidad residencial asignada"
            )
        
        meeting_result = await db.execute(
            select(MeetingModel).where(MeetingModel.id == meeting_id)
        )
        meeting = meeting_result.scalar_one_or_none()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Reunión no encontrada")
        
        if meeting.int_id_residential_unit != admin_unit.int_residential_unit_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes acceso a esta reunión"
            )
        
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

            is_directly_present = inv.bln_actually_attended and inv.dat_left_at is None

            delegate_inv = inv_map.get(inv.int_delegated_id) if inv.int_delegated_id else None
            is_present_by_delegation = (
                not is_directly_present
                and delegate_inv is not None
                and delegate_inv.bln_actually_attended
                and delegate_inv.dat_left_at is None
            )

            person = {
                "id": user.id,
                "full_name": f"{data_user.str_firstname} {data_user.str_lastname}",
                "email": data_user.str_email,
                "apartment": inv.str_apartment_number,
                "quorum_base": float(inv.dec_quorum_base) if inv.dec_quorum_base else 0.0,
                "voting_weight": float(inv.dec_voting_weight) if inv.dec_voting_weight else 0.0,
                "attended_at": inv.dat_joined_at.isoformat() if inv.dat_joined_at else None,
                "attendance_type": (
                    "Titular" if is_directly_present
                    else "Delegado" if is_present_by_delegation
                    else "Ausente"
                ),
                "delegated_to": inv.int_delegated_id,
                "status": (
                    "Asistió" if is_directly_present
                    else "Asistió por delegación" if is_present_by_delegation
                    else "No asistió"
                )
            }

            if is_directly_present or is_present_by_delegation:
                attended.append(person)
            else:
                absent.append(person)

        total_quorum = sum(p["quorum_base"] for p in attended)
        
        return SuccessResponse(
            success=True,
            status_code=200,
            message="Reporte de asistencia obtenido",
            data={
                "meeting": {
                    "id": meeting.id,
                    "title": meeting.str_title,
                    "scheduled_date": meeting.dat_schedule_date.isoformat() if meeting.dat_schedule_date else None,
                    "status": meeting.str_status,
                    "modality": meeting.str_modality,
                },
                "summary": {
                    "total_invited": len(invitations),
                    "total_attended": len(attended),
                    "total_absent": len(absent),
                    "attendance_percentage": round((len(attended) / len(invitations) * 100) if invitations else 0, 2),
                    "quorum_achieved": total_quorum,
                },
                "attended": attended,
                "absent": absent,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener reporte de asistencia: {str(e)}")
        raise ServiceException(message=f"Error al obtener reporte: {str(e)}")


@router.get(
    "/meetings/{meeting_id}/report/quorum",
    response_model=SuccessResponse,
    summary="Reporte de quórum de una reunión",
    description="Obtiene el análisis de quórum de una reunión específica"
)
async def get_quorum_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el análisis de quórum de una reunión"""
    try:
        from sqlalchemy import select
        from app.models.meeting_model import MeetingModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        
        user_service = UserService(db)
        admin_user = await user_service.get_user_by_username(current_user)
        
        if not admin_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        admin_unit_query = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == admin_user.id
        )
        admin_unit_result = await db.execute(admin_unit_query)
        admin_unit = admin_unit_result.scalar_one_or_none()
        
        if not admin_unit:
            raise HTTPException(
                status_code=403,
                detail="No tienes una unidad residencial asignada"
            )
        
        meeting_result = await db.execute(
            select(MeetingModel).where(MeetingModel.id == meeting_id)
        )
        meeting = meeting_result.scalar_one_or_none()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Reunión no encontrada")
        
        if meeting.int_id_residential_unit != admin_unit.int_residential_unit_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes acceso a esta reunión"
            )
        
        inv_result = await db.execute(
            select(MeetingInvitationModel).where(
                MeetingInvitationModel.int_meeting_id == meeting_id
            )
        )
        invitations = inv_result.scalars().all()
        
        total_invited = len(invitations)
        total_quorum_base = sum(float(inv.dec_quorum_base or 0) for inv in invitations)
        
        inv_map = {inv.int_user_id: inv for inv in invitations}
        def is_effectively_present(inv):
            if inv.str_apartment_number == 'ADMIN':
                return False
            if inv.bln_actually_attended and inv.dat_left_at is None:
                return True
            if inv.int_delegated_id:
                delegate = inv_map.get(inv.int_delegated_id)
                if delegate and delegate.bln_actually_attended and delegate.dat_left_at is None:
                    return True
            return False

        attended = [inv for inv in invitations if is_effectively_present(inv)]
        attended_quorum = sum(float(inv.dec_quorum_base or 0) for inv in attended)
        
        quorum_percentage = (attended_quorum / total_quorum_base * 100) if total_quorum_base > 0 else 0
        
        return SuccessResponse(
            success=True,
            status_code=200,
            message="Reporte de quórum obtenido",
            data={
                "meeting": {
                    "id": meeting.id,
                    "title": meeting.str_title,
                    "scheduled_date": meeting.dat_schedule_date.isoformat() if meeting.dat_schedule_date else None,
                    "status": meeting.str_status,
                },
                "quorum_analysis": {
                    "total_invited": total_invited,
                    "total_attended": len(attended),
                    "total_quorum_base": total_quorum_base,
                    "quorum_achieved": attended_quorum,
                    "quorum_percentage": round(quorum_percentage, 2),
                    "quorum_reached": meeting.bln_quorum_reached if hasattr(meeting, 'bln_quorum_reached') else (quorum_percentage >= 50),
                    "required_percentage": 50,
                },
                "comparison": {
                    "invitations": {
                        "attended": len(attended),
                        "absent": total_invited - len(attended),
                    },
                    "quorum_weight": {
                        "attended": attended_quorum,
                        "missing": total_quorum_base - attended_quorum,
                    }
                }
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener reporte de quórum: {str(e)}")
        raise ServiceException(message=f"Error al obtener reporte: {str(e)}")


@router.get(
    "/meetings/{meeting_id}/report/polls",
    response_model=SuccessResponse,
    summary="Reporte de votaciones de una reunión",
    description="Obtiene el reporte de votaciones de una reunión específica"
)
async def get_polls_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el reporte de votaciones de una reunión"""
    try:
        from sqlalchemy import select
        from app.models.meeting_model import MeetingModel
        from app.models.poll_model import PollModel
        from app.models.poll_option_model import PollOptionModel
        from app.models.poll_response_model import PollResponseModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        
        user_service = UserService(db)
        admin_user = await user_service.get_user_by_username(current_user)
        
        if not admin_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        admin_unit_query = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == admin_user.id
        )
        admin_unit_result = await db.execute(admin_unit_query)
        admin_unit = admin_unit_result.scalar_one_or_none()
        
        if not admin_unit:
            raise HTTPException(
                status_code=403,
                detail="No tienes una unidad residencial asignada"
            )
        
        meeting_result = await db.execute(
            select(MeetingModel).where(MeetingModel.id == meeting_id)
        )
        meeting = meeting_result.scalar_one_or_none()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Reunión no encontrada")
        
        if meeting.int_id_residential_unit != admin_unit.int_residential_unit_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes acceso a esta reunión"
            )
        
        polls_result = await db.execute(
            select(PollModel).where(PollModel.int_meeting_id == meeting_id)
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
                .outerjoin(                                          #  join con invitación
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
            success=True,
            status_code=200,
            message="Reporte de votaciones obtenido",
            data={
                "meeting": {
                    "id": meeting.id,
                    "title": meeting.str_title,
                    "scheduled_date": meeting.dat_schedule_date.isoformat() if meeting.dat_schedule_date else None,
                    "status": meeting.str_status,
                },
                "total_polls": len(polls_data),
                "polls": polls_data,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener reporte de votaciones: {str(e)}")
        raise ServiceException(message=f"Error al obtener reporte: {str(e)}")


@router.get(
    "/meetings/{meeting_id}/report/delegations",
    response_model=SuccessResponse,
    summary="Reporte de poderes de una reunión",
    description="Obtiene el reporte de poderes/delegaciones de una reunión específica"
)
async def get_delegations_report(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el reporte de poderes de una reunión"""
    try:
        from sqlalchemy import select
        from app.models.meeting_model import MeetingModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        
        user_service = UserService(db)
        admin_user = await user_service.get_user_by_username(current_user)
        
        if not admin_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        admin_unit_query = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == admin_user.id
        )
        admin_unit_result = await db.execute(admin_unit_query)
        admin_unit = admin_unit_result.scalar_one_or_none()
        
        if not admin_unit:
            raise HTTPException(
                status_code=403,
                detail="No tienes una unidad residencial asignada"
            )
        
        meeting_result = await db.execute(
            select(MeetingModel).where(MeetingModel.id == meeting_id)
        )
        meeting = meeting_result.scalar_one_or_none()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Reunión no encontrada")
        
        if meeting.int_id_residential_unit != admin_unit.int_residential_unit_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes acceso a esta reunión"
            )
        
        delegations_result = await db.execute(
            select(MeetingInvitationModel, DataUserModel)
            .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .where(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.int_delegated_id.isnot(None)
            )
        )
        delegator_rows = delegations_result.all()
        
        delegations = []
        for inv, delegator_data in delegator_rows:
            delegate_result = await db.execute(
                select(DataUserModel)
                .join(UserModel, UserModel.int_data_user_id == DataUserModel.id)
                .where(UserModel.id == inv.int_delegated_id)
            )
            delegate_data = delegate_result.scalar_one_or_none()
            
            delegations.append({
                "id": inv.id,
                "delegator": {
                    "id": inv.int_user_id,
                    "full_name": f"{delegator_data.str_firstname} {delegator_data.str_lastname}",
                    "email": delegator_data.str_email,
                    "apartment": inv.str_apartment_number,
                    "original_weight": float(inv.dec_quorum_base) if inv.dec_quorum_base else 0.0,
                },
                "delegate": {
                    "id": inv.int_delegated_id,
                    "full_name": f"{delegate_data.str_firstname} {delegate_data.str_lastname}" if delegate_data else "—",
                    "email": delegate_data.str_email if delegate_data else "—",
                },
                "delegated_weight": float(inv.dec_quorum_base) if inv.dec_quorum_base else 0.0,
            })
        
        total_delegated_weight = sum(d["delegated_weight"] for d in delegations)
        
        return SuccessResponse(
            success=True,
            status_code=200,
            message="Reporte de poderes obtenido",
            data={
                "meeting": {
                    "id": meeting.id,
                    "title": meeting.str_title,
                    "scheduled_date": meeting.dat_schedule_date.isoformat() if meeting.dat_schedule_date else None,
                    "status": meeting.str_status,
                },
                "summary": {
                    "total_delegations": len(delegations),
                    "total_delegated_weight": total_delegated_weight,
                },
                "delegations": delegations,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener reporte de poderes: {str(e)}")
        raise ServiceException(message=f"Error al obtener reporte: {str(e)}")