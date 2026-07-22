from decimal import Decimal
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid
import logging

from app.core.database import get_db
from app.core.exceptions import ServiceException, ResourceNotFoundException
from app.schemas.responses_schema import SuccessResponse
from app.schemas.meeting_create_schema import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingUpdateRequest
)
from app.schemas.meeting_attendance_schema import QRAttendanceRequest
from app.services.meeting_service import MeetingService
from app.services.email_service import EmailService
from app.auth.auth import get_current_user
from app.services.user_service import UserService
from app.celery_app import celery_app
from app.core.config import settings
import asyncio
import json
import redis.asyncio as aioredis
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt

logger = logging.getLogger(__name__)


async def publish_attendance_event(meeting_id: int, user_id: int, status: str) -> None:
    """Publica un cambio de asistencia al canal Redis del meeting. status: connected|absent|disconnected"""
    try:
        r = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.publish(
            f"meeting:attendance:{meeting_id}",
            json.dumps({"type": "attendance_update", "user_id": user_id, "status": status})
        )
        await r.aclose()
    except Exception as e:
        logger.warning(f"[SSE] Error publicando evento de asistencia: {e}")


class SendInvitationRequest(BaseModel):
    """Request para enviar invitaciones por correo"""
    user_ids: Optional[List[int]] = None  # Si es None, se envía a todos los usuarios de la unidad
    frontend_url: Optional[str] = Field(None, description="URL base del frontend para construir auto-login URL")


router = APIRouter()
sse_router = APIRouter()


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
    """Obtiene todas las reuniones de una unidad residencial con quórum calculado"""
    try:
        meeting_service = MeetingService(db)
        meetings_with_quorum = await meeting_service.get_meetings_by_residential_unit_with_quorum(residential_unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Reuniones obtenidas correctamente",
            data=meetings_with_quorum  # Ya es lista de dicts, no necesita from_orm
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener las reuniones: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/zoom-account-conflicts",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Verificar conflictos de cuentas Zoom",
    description="Retorna los IDs de cuentas Zoom que ya tienen reunión virtual en el mismo día"
)
async def get_zoom_account_conflicts(
    schedule_date: datetime,
    exclude_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        meeting_service = MeetingService(db)
        conflicting_ids = await meeting_service.get_zoom_account_conflicts(
            schedule_date=schedule_date,
            exclude_meeting_id=exclude_id
        )
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Conflictos verificados",
            data={"conflicting_account_ids": conflicting_ids}
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al verificar conflictos: {str(e)}",
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
            user_id=1,  # TODO: Obtener el ID del usuario actual
            zoom_account_id=meeting_data.int_zoom_account_id,
            modality=meeting_data.str_modality,
            frontend_url=meeting_data.frontend_url
        )

        meeting_data_response = MeetingResponse.from_orm(new_meeting).dict()
        
        task_id = getattr(new_meeting, '_task_id', None)
        if task_id:
            meeting_data_response['invitation_task_id'] = task_id

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Reunión creada exitosamente",
            data=meeting_data_response
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

        # Serializar ANTES de cualquier commit adicional para evitar MissingGreenlet
        # (los commits expiran las relaciones lazy del objeto ORM)
        meeting_data = MeetingResponse.from_orm(meeting).dict()

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
                data=meeting_data
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
                data=meeting_data
            )

        # 5. Crear invitaciones automáticamente
        invitations_created = 0
        for coowner in coowners:
            quorum_base = coowner.dec_default_voting_weight if coowner.dec_default_voting_weight is not None else Decimal('0.0')

            invitation = MeetingInvitationModel(
                int_meeting_id=meeting_id,
                int_user_id=coowner.int_user_id,
                dec_voting_weight=quorum_base,
                dec_quorum_base=quorum_base,
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
            data=meeting_data
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


@router.get(
    "/{meeting_id}/host-start-url",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener start_url fresco para el anfitrión",
    description="Devuelve un start_url recién generado por Zoom (con ZAK válido) para que el administrador inicie la reunión como anfitrión"
)
async def get_host_start_url(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Obtiene un start_url fresco desde la API de Zoom para iniciar la reunión como anfitrión.

    El start_url guardado al crear la reunión caduca a las ~2 horas, por lo que para
    reuniones programadas con anticipación es necesario regenerarlo al momento de unirse.
    Esto evita que el administrador quede en "esperando a que el anfitrión inicie la reunión".
    """
    try:
        from app.services.zoom_api_service import ZoomAPIService
        from app.api.v1.endpoints.zoom_endpoint import _get_oauth_credentials_from_db

        meeting_service = MeetingService(db)
        meeting = await meeting_service.get_meeting_by_id(meeting_id)

        if not meeting or not meeting.int_zoom_meeting_id:
            raise ServiceException(
                message="La reunión no tiene una sesión de Zoom asociada",
                details={"meeting_id": meeting_id}
            )

        oauth_credentials = await _get_oauth_credentials_from_db(db, meeting.int_zoom_account_id)
        if oauth_credentials:
            zoom_api = ZoomAPIService(credentials=oauth_credentials)
        else:
            zoom_api = ZoomAPIService(db)

        start_url = await zoom_api.get_meeting_start_url(str(meeting.int_zoom_meeting_id))

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="start_url obtenido exitosamente",
            data={"start_url": start_url}
        )
    except ServiceException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener start_url del anfitrión: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener el start_url de la reunión: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{meeting_id}/end",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Finalizar una reunión",
    description="Marca una reunión como finalizada y registra la fecha/hora de finalización"
)
async def end_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Finaliza una reunión y registra la fecha/hora de finalización"""
    try:
        meeting_service = MeetingService(db)
        user_service = UserService(db)

        user = await user_service.get_user_by_username(current_user)
        meeting = await meeting_service.end_meeting(meeting_id, user.id)

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
    current_user: str = Depends(get_current_user)
):
    """
    Registra la asistencia de un usuario cuando entra a una reunión.
    Actualiza dat_joined_at y bln_actually_attended en tbl_meeting_invitations.
    """
    try:
        meeting_service = MeetingService(db)
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        user_id = user.id

        result = await meeting_service.register_attendance(meeting_id, user_id)
        if result.get("success"):
            await publish_attendance_event(meeting_id, user_id, "connected")

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
    current_user: str = Depends(get_current_user)
):
    """
    Registra la hora de salida de un usuario de una reunión.
    Actualiza dat_left_at en tbl_meeting_invitations.
    """
    try:
        meeting_service = MeetingService(db)
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        user_id = user.id

        result = await meeting_service.register_leave(meeting_id, user_id)
        if result.get("success"):
            await publish_attendance_event(meeting_id, user_id, "disconnected")

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
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enviar invitaciones por correo",
    description="Envía invitaciones por correo electrónico a los usuarios de la unidad residencial de la reunión usando Celery"
)
async def send_meeting_invitations(
    meeting_id: int,
    request: SendInvitationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Envía invitaciones por correo electrónico a los usuarios de una reunión.
    
    Si no se especifican user_ids, se envía a todos los usuarios de la unidad residencial.
    Solo se envía a usuarios activos que pertenecen a la misma unidad residencial de la reunión.
    
    Usa Celery para enviar en background y retorna inmediatamente.
    """
    try:
        from app.services.meeting_service import MeetingService
        meeting_service = MeetingService(db)
        
        meeting = await meeting_service.get_meeting_by_id(meeting_id)
        if not meeting:
            raise ServiceException(
                message="Reunión no encontrada",
                details={"meeting_id": meeting_id}
            )
        
        task_id = str(uuid.uuid4())
        frontend_url = request.frontend_url
        
        logger.info(f"📧 Creando tarea Celery para invitaciones de reunión {meeting_id}, task_id={task_id}")
        
        celery_app.send_task(
            'app.tasks.email_tasks.send_meeting_invitations',
            args=[meeting_id, task_id, frontend_url, request.user_ids],
            task_id=task_id,
            queue='email_tasks'
        )
        
        total = request.user_ids if request.user_ids else meeting.int_total_invitated or 0
        
        logger.info(f"✅ Tarea Celery creada para invitaciones de reunión {meeting_id} con task_id={task_id}")
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_202_ACCEPTED,
            message="Invitaciones enviadas a Celery para procesamiento",
            data={
                "meeting_id": meeting_id,
                "task_id": task_id,
                "total_invited": total
            }
        )
    except ServiceException:
        raise
    except Exception as e:
        logger.error(f"Error al crear tarea de invitaciones: {str(e)}")
        raise ServiceException(
            message=f"Error al enviar invitaciones: {str(e)}",
            details={"original_error": str(e), "meeting_id": meeting_id}
        )


@router.post(
    "/scan-qr-attendance",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Registrar asistencia presencial via escaneo QR",
    description="El administrador escanea el QR de un copropietario para registrar su asistencia en la reunion presencial activa"
)
async def scan_qr_attendance(
    request: QRAttendanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Registra la asistencia de un copropietario mediante escaneo de su codigo QR.
    
    Flujo:
    1. El admin escanea el QR del copropietario (contiene JWT de auto-login)
    2. Se decodifica el JWT para identificar al copropietario
    3. Se busca la reunion presencial "En Curso" de la unidad residencial del admin
    4. Se registra la asistencia del copropietario en esa reunion
    
    Requiere: Rol de Administrador (2) o Super Admin (1)
    """
    try:
        meeting_service = MeetingService(db)
        user_service = UserService(db)
        
        # Obtener el usuario admin autenticado
        admin_user = await user_service.get_user_by_username(current_user)
        
        if not admin_user:
            raise ServiceException(
                message="Usuario administrador no encontrado",
                details={"username": current_user}
            )
        
        # Verificar que sea admin (rol 1 o 2)
        if admin_user.int_id_rol not in (1, 2):
            raise ServiceException(
                message="Solo los administradores pueden registrar asistencia por QR",
                details={"user_role": admin_user.int_id_rol}
            )
        
        # Registrar asistencia por QR
        result = await meeting_service.register_attendance_by_qr(
            qr_token=request.qr_token,
            admin_user_id=admin_user.id
        )
        if result.get("success") and result.get("user_id"):
            await publish_attendance_event(result["meeting_id"], result["user_id"], "connected")

        return SuccessResponse(
            success=result.get("success", False),
            status_code=status.HTTP_200_OK,
            message=result.get("message", ""),
            data=result
        )
        
    except ServiceException:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al registrar asistencia por QR: {str(e)}",
            details={"original_error": str(e)}
        )


def _derive_attendance_status(inv) -> str:
    if inv.bln_marked_absent:
        return "absent"
    if inv.bln_actually_attended and not inv.dat_left_at:
        return "connected"
    return "disconnected"


@sse_router.get(
    "/{meeting_id}/attendance/events",
    summary="SSE: eventos de asistencia en tiempo real",
    tags=["Asistencia SSE"],
)
async def meeting_attendance_events(meeting_id: int, token: str):
    from sqlalchemy import select as sa_select
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.models.meeting_invitation_model import MeetingInvitationModel

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    async def event_generator():
        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        r = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        channel = f"meeting:attendance:{meeting_id}"
        await pubsub.subscribe(channel)

        try:
            # Estado inicial
            try:
                async with async_session() as db:
                    result = await db.execute(
                        sa_select(MeetingInvitationModel).where(
                            MeetingInvitationModel.int_meeting_id == meeting_id
                        )
                    )
                    invitations = result.scalars().all()
                    initial = [
                        {"user_id": inv.int_user_id, "status": _derive_attendance_status(inv)}
                        for inv in invitations
                    ]
                logger.info(f"[SSE] initial_state meeting={meeting_id}: {len(initial)} invitaciones")
            except Exception as e:
                logger.error(f"[SSE] Error consultando estado inicial meeting={meeting_id}: {e}")
                initial = []
            yield f"data: {json.dumps({'type': 'initial_state', 'attendances': initial})}\n\n"

            while True:
                try:
                    msg = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1),
                        timeout=30.0,
                    )
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
                    continue
                if msg is None:
                    await asyncio.sleep(0.1)
                    continue
                if msg["type"] == "message":
                    yield f"data: {msg['data']}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await r.aclose()
            await engine.dispose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
