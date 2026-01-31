from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.exceptions import ServiceException, ResourceNotFoundException
from app.schemas.responses_schema import SuccessResponse
from app.schemas.meeting_create_schema import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingUpdateRequest
)
from app.services.meeting_service import MeetingService
from app.services.email_service import email_service
from app.auth.auth import get_current_user
from app.services.user_service import UserService


class SendInvitationRequest(BaseModel):
    """Request para enviar invitaciones por correo"""
    user_ids: Optional[List[int]] = None  # Si es None, se envía a todos los usuarios de la unidad


router = APIRouter()


@router.get(
    "",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener todas las reuniones",
    description="Obtiene todas las reuniones del sistema"
)
async def get_meetings(
    db: AsyncSession = Depends(get_db),
):
    """Obtiene todas las reuniones"""
    try:
        meeting_service = MeetingService(db)
        meetings = await meeting_service.get_meetings()

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reuniones obtenidas correctamente",
            data=[MeetingResponse.from_orm(meeting).dict() for meeting in meetings]
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener las reuniones: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/residential-unit/{residential_unit_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener reuniones por unidad residencial",
    description="Obtiene todas las reuniones de una unidad residencial específica"
)
async def get_meetings_by_residential_unit(
    residential_unit_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene todas las reuniones de una unidad residencial"""
    try:
        meeting_service = MeetingService(db)
        meetings = await meeting_service.get_meetings_by_residential_unit(residential_unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reuniones obtenidas correctamente",
            data=[MeetingResponse.from_orm(meeting).dict() for meeting in meetings]
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener las reuniones: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener una reunión por ID",
    description="Obtiene una reunión específica por su ID"
)
async def get_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene una reunión por su ID"""
    try:
        meeting_service = MeetingService(db)
        meeting = await meeting_service.get_meeting_by_id(meeting_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reunión obtenida correctamente",
            data=MeetingResponse.from_orm(meeting).dict()
        )
    except ResourceNotFoundException as e:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva reunión",
    description="Crea una nueva reunión y genera la sesión de Zoom automáticamente"
)
async def create_meeting(
    meeting_data: MeetingCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Crea una nueva reunión de Zoom"""
    try:
        meeting_service = MeetingService(db)
        
        new_meeting = await meeting_service.create_meeting(
            residential_unit_id=meeting_data.int_id_residential_unit,
            title=meeting_data.str_title,
            description=meeting_data.str_description or "",
            meeting_type=meeting_data.str_meeting_type,
            schedule_date=meeting_data.dat_schedule_date,
            estimated_duration=meeting_data.int_estimated_duration,
            allow_delegates=meeting_data.bln_allow_delegates,
            user_id=1  # TODO: Obtener el ID del usuario actual
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Reunión creada exitosamente",
            data=MeetingResponse.from_orm(new_meeting).dict()
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al crear la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.put(
    "/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar una reunión",
    description="Actualiza una reunión existente"
)
async def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdateRequest,
    db: AsyncSession = Depends(get_db),
  
):
    """Actualiza una reunión existente"""
    try:
        meeting_service = MeetingService(db)
        
        updated_meeting = await meeting_service.update_meeting(
            meeting_id=meeting_id,
            title=meeting_data.str_title,
            description=meeting_data.str_description,
            meeting_type=meeting_data.str_meeting_type,
            schedule_date=meeting_data.dat_schedule_date,
            estimated_duration=meeting_data.int_estimated_duration,
            allow_delegates=meeting_data.bln_allow_delegates,
            status=meeting_data.str_status,
            user_id=1  # TODO: Obtener el ID del usuario actual
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reunión actualizada exitosamente",
            data=MeetingResponse.from_orm(updated_meeting).dict()
        )
    except ResourceNotFoundException as e:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al actualizar la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.delete(
    "/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Eliminar una reunión",
    description="Elimina una reunión existente"
)
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: str = Depends(get_current_user)  # Comentado temporalmente para pruebas
):
    """Elimina una reunión"""
    try:
        meeting_service = MeetingService(db)
        await meeting_service.delete_meeting(meeting_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reunión eliminada exitosamente",
            data=None
        )
    except ResourceNotFoundException as e:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al eliminar la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


# @router.post(
#     "/{meeting_id}/start",
#     response_model=SuccessResponse,
#     status_code=status.HTTP_200_OK,
#     summary="Iniciar una reunión",
#     description="Marca una reunión como iniciada"
# )
# async def start_meeting(
#     meeting_id: int,
#     db: AsyncSession = Depends(get_db),
#     # current_user: str = Depends(get_current_user)  # Comentado temporalmente para pruebas
# ):
#     """Inicia una reunión"""
#     try:
#         meeting_service = MeetingService(db)
#         meeting = await meeting_service.start_meeting(meeting_id, 1)  # TODO: Obtener el ID del usuario actual

#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message="Reunión iniciada exitosamente",
#             data=MeetingResponse.from_orm(meeting).dict()
#         )
#     except ResourceNotFoundException as e:
#         raise
#     except Exception as e:
#         raise ServiceException(
#             message=f"Error al iniciar la reunión: {str(e)}",
#             details={"original_error": str(e)}
#         )

@router.post(
    "/{meeting_id}/start",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar una reunión y enviar invitaciones",
    description="Marca una reunión como iniciada y crea invitaciones automáticamente"
)
async def start_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Inicia una reunión y crea invitaciones automáticamente.
    
    Proceso:
    1. Cambia el estado de la reunión a "En Curso"
    2. Obtiene todos los copropietarios de la unidad residencial
    3. Crea invitaciones automáticamente para cada copropietario
    """
    try:
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.meeting_model import MeetingModel
        from sqlalchemy import select
        import logging
        
        logger = logging.getLogger(__name__)
        
        # 1. Iniciar la reunión (cambiar estado)
        meeting_service = MeetingService(db)
        user_service = UserService(db)
        
        user = await user_service.get_user_by_username(current_user)
        meeting = await meeting_service.start_meeting(meeting_id, user.id)
        
        logger.info(f"✅ Reunión {meeting_id} iniciada con estado: {meeting.str_status}")
        
        # 2. Obtener la unidad residencial de la reunión
        residential_unit_id = meeting.int_id_residential_unit
        
        # 3. Verificar si ya existen invitaciones
        existing_invitations_query = select(MeetingInvitationModel).where(
            MeetingInvitationModel.int_meeting_id == meeting_id
        )
        result = await db.execute(existing_invitations_query)
        existing_invitations = result.scalars().all()
        
        if existing_invitations:
            logger.info(f"⚠️ Ya existen {len(existing_invitations)} invitaciones para esta reunión")
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message=f"Reunión iniciada. Ya existen {len(existing_invitations)} invitaciones.",
                data=MeetingResponse.from_orm(meeting).dict()
            )
        
        # 4. Obtener copropietarios de la unidad residencial
        coowners_query = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_residential_unit_id == residential_unit_id
        )
        result = await db.execute(coowners_query)
        coowners = result.scalars().all()
        
        if not coowners:
            logger.warning(f"⚠️ No hay copropietarios en la unidad residencial {residential_unit_id}")
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Reunión iniciada pero no hay copropietarios para invitar",
                data=MeetingResponse.from_orm(meeting).dict()
            )
        
        # 5. Crear invitaciones automáticamente
        invitations_created = 0
        for coowner in coowners:
            # ✅ Manejar NULL en quorum base
            quorum_base = coowner.dec_default_voting_weight if coowner.dec_default_voting_weight is not None else 0.0
            
            invitation = MeetingInvitationModel(
                int_meeting_id=meeting_id,
                int_user_id=coowner.int_user_id,
                dec_voting_weight=quorum_base,       # ✅ Peso actual
                dec_quorum_base=quorum_base,         # ✅ Quorum base (AGREGADO)
                str_apartment_number=coowner.str_apartment_number,
                str_invitation_status='sent',
                str_response_status='pending',
                bln_will_attend=False
            )
            db.add(invitation)
            invitations_created += 1
        
        await db.commit()
        
        logger.info(f"✅ Se crearon {invitations_created} invitaciones automáticamente")
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Reunión iniciada exitosamente. Se enviaron {invitations_created} invitaciones.",
            data=MeetingResponse.from_orm(meeting).dict()
        )
        
    except ResourceNotFoundException as e:
        raise
    except Exception as e:
        logger.error(f"❌ Error al iniciar reunión: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al iniciar la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{meeting_id}/end",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Finalizar una reunión",
    description="Marca una reunión como finalizada"
)
async def end_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: str = Depends(get_current_user)  # Comentado temporalmente para pruebas
):
    """Finaliza una reunión"""
    try:
        meeting_service = MeetingService(db)
        meeting = await meeting_service.end_meeting(meeting_id, 1)  # TODO: Obtener el ID del usuario actual

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reunión finalizada exitosamente",
            data=MeetingResponse.from_orm(meeting).dict()
        )
    except ResourceNotFoundException as e:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al finalizar la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{meeting_id}/register-attendance",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Registrar asistencia a reunión",
    description="Registra la hora de entrada de un usuario a una reunión"
)
async def register_attendance(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Registra la asistencia de un usuario cuando entra a una reunión.
    Actualiza dat_joined_at y bln_actually_attended en tbl_meeting_invitations.
    """
    try:
        meeting_service = MeetingService(db)
        user_id = current_user.get("user_id")

        result = await meeting_service.register_attendance(meeting_id, user_id)

        return SuccessResponse(
            success=result.get("success", False),
            status_code=status.HTTP_200_OK,
            message=result.get("message", ""),
            data=result
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al registrar asistencia: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{meeting_id}/register-leave",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Registrar salida de reunión",
    description="Registra la hora de salida de un usuario de una reunión"
)
async def register_leave(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Registra la hora de salida de un usuario de una reunión.
    Actualiza dat_left_at en tbl_meeting_invitations.
    """
    try:
        meeting_service = MeetingService(db)
        user_id = current_user.get("user_id")

        result = await meeting_service.register_leave(meeting_id, user_id)

        return SuccessResponse(
            success=result.get("success", False),
            status_code=status.HTTP_200_OK,
            message=result.get("message", ""),
            data=result
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al registrar salida: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{meeting_id}/send-invitations",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Enviar invitaciones por correo",
    description="Envía invitaciones por correo electrónico a los usuarios de la unidad residencial de la reunión"
)
async def send_meeting_invitations(
    meeting_id: int,
    request: SendInvitationRequest,
    db: AsyncSession = Depends(get_db),
    # current_user: str = Depends(get_current_user)  # Comentado temporalmente para pruebas
):
    """
    Envía invitaciones por correo electrónico a los usuarios de una reunión.
    
    Si no se especifican user_ids, se envía a todos los usuarios de la unidad residencial.
    Solo se envía a usuarios activos que pertenecen a la misma unidad residencial de la reunión.
    """
    try:
        stats = await email_service.send_meeting_invitation(
            db=db,
            meeting_id=meeting_id,
            user_ids=request.user_ids
        )
        
        if "error" in stats:
            raise ServiceException(
                message=stats["error"],
                details={"meeting_id": meeting_id}
            )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Invitaciones procesadas: {stats['exitosos']} exitosos, {stats['fallidos']} fallidos",
            data={
                "meeting_id": meeting_id,
                "statistics": stats
            }
        )
    except ServiceException:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al enviar invitaciones: {str(e)}",
            details={"original_error": str(e), "meeting_id": meeting_id}
        )
