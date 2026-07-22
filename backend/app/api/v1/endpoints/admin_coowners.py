# backend/app/api/v1/endpoints/admin_coowners.py
"""
Endpoints para gestión de copropietarios desde el Dashboard del Administrador
"""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.schemas.resident_update_schema import ResidentUpdate
from app.schemas.responses_schema import SuccessResponse
from app.schemas.residential_unit_schema import BulkDeleteRequest, BulkToggleAccessRequest
from app.core.exceptions import ServiceException, ResourceNotFoundException
from app.celery_app import celery_app
import logging
import uuid

from app.schemas.email_notification_schema import BulkSendCredentialsRequest


class ResendCredentialsRequest(BaseModel):
    frontend_url: Optional[str] = Field(None, description="URL base del frontend para construir auto-login URL")

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/residential-unit",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener copropietarios de la unidad del administrador",
    description="Obtiene todos los copropietarios de la unidad residencial que administra el usuario actual"
)
async def get_my_coowners(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene todos los copropietarios de la unidad residencial del administrador actual.
    Solo accesible para usuarios con rol de Administrador (rol 2).
    """
    try:
        # Verificar que el usuario actual sea administrador
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:  # 2: Administrador
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden acceder a esta función"
            )

        # Obtener la unidad residencial del administrador
        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada a este administrador"
            )

        # Obtener todos los copropietarios de la unidad
        residents = await residential_service.get_residents_by_unit(admin_unit['id'])

        # Filtrar para excluir al propio administrador de la lista
        coowners = [r for r in residents if r['id'] != user.id]

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Copropietarios obtenidos exitosamente",
            data={
                "residential_unit": admin_unit,
                "coowners": coowners,
                "total": len(coowners)
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener copropietarios: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener copropietarios: {str(e)}",
            details={"original_error": str(e)}
        )


# Celery status - debe estar ANTES de /{coowner_id} para evitar que se interprete como parámetro
@router.get("/celery-status", response_model=SuccessResponse)
async def check_celery_status(
    current_user: str = Depends(get_current_user)
):
    """
    Verifica si el servicio de Celery está activo y disponible.
    Por defecto asume disponible para no bloquear envios.
    """
    try:
        from app.celery_app import celery_app
        
        inspect = celery_app.control.inspect(timeout=2.0)
        
        # Intentar ping
        try:
            ping_result = inspect.ping()
            celery_available = ping_result is not None and len(ping_result) > 0
        except:
            # Si falla el ping, asumir disponible
            celery_available = True
        
        return SuccessResponse(
            success=True,
            status_code=200,
            data={
                "celery_available": celery_available,
                "message": "El servicio de correos está disponible" if celery_available else "El servicio de correos no está disponible"
            }
        )
    except Exception as e:
        # Si cualquier cosa falla, asumir disponible para no bloquear envios
        logger.warning(f"Celery check failed: {str(e)}, asumiendo disponible")
        return SuccessResponse(
            success=True,
            status_code=200,
            data={
                "celery_available": True,
                "message": "Servicio disponible"
            }
        )


@router.get(
    "/{coowner_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalles de un copropietario",
    description="Obtiene los detalles completos de un copropietario específico"
)
async def get_coowner_details(
    coowner_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los detalles completos de un copropietario.
    Verifica que el copropietario pertenezca a la unidad del administrador.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden acceder a esta función"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        # Obtener detalles del copropietario
        coowner = await residential_service.get_resident_details(
            user_id=coowner_id,
            unit_id=admin_unit['id']
        )

        if not coowner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Copropietario no encontrado en su unidad residencial"
            )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Detalles del copropietario obtenidos exitosamente",
            data=coowner
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener detalles del copropietario: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener detalles del copropietario: {str(e)}",
            details={"original_error": str(e)}
        )


@router.put(
    "/{coowner_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar datos de un copropietario",
    description="Actualiza la información de un copropietario y opcionalmente envía notificación por correo"
)
async def update_coowner(
    coowner_id: int,
    update_data: ResidentUpdate,
    send_email: bool = False,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza los datos de un copropietario.
    Si send_email=True, envía un correo con los cambios realizados.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden actualizar copropietarios"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        # Actualizar el copropietario
        updated_coowner = await residential_service.update_resident(
            user_id=coowner_id,
            unit_id=admin_unit['id'],
            update_data=update_data.model_dump(exclude_unset=True, exclude_none=False)
        )

        # Si se solicita, enviar correo de notificación
        if send_email:
            try:
                await residential_service.send_update_notification_email(
                    user_id=coowner_id,
                    unit_id=admin_unit['id'],
                    updated_fields=update_data.model_dump(exclude_unset=True)
                )
            except Exception as email_error:
                logger.warning(f"Error al enviar correo de notificación: {email_error}")
                # No fallar la actualización si el correo falla

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Copropietario actualizado exitosamente" +
                    (" y notificación enviada" if send_email else ""),
            data=updated_coowner
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar copropietario: {str(e)}")
        raise ServiceException(
            message=f"Error al actualizar copropietario: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{coowner_id}/enable",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Habilitar acceso de un copropietario",
    description="Habilita el acceso al sistema para un copropietario específico"
)
async def enable_coowner(
    coowner_id: int,
    send_email: bool = True,
    frontend_url: Optional[str] = None,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Habilita el acceso de un copropietario al sistema.
    Por defecto envía un correo notificando la habilitación.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden habilitar copropietarios"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        # Habilitar el copropietario (también crea invitación si hay reunión activa)
        result = await user_service.enable_coowner_access(
            user_id=coowner_id,
            unit_id=admin_unit['id'],
            send_email=send_email,
            created_by=user.id
        )

        # Si se creó invitación automática, enviar correo por Celery
        if result.get("meeting_invitation_created") and result.get("active_meeting_id"):
            task_id = str(uuid.uuid4())
            try:
                celery_app.send_task(
                    'app.tasks.email_tasks.send_meeting_invitations',
                    args=[result["active_meeting_id"], task_id, frontend_url, [coowner_id]],
                    task_id=task_id,
                    queue='email_tasks'
                )
                logger.info(f"📧 Correo de invitación encolado para user_id={coowner_id} en meeting_id={result['active_meeting_id']}")
            except Exception as celery_err:
                logger.warning(f"⚠️ No se pudo encolar correo de invitación: {celery_err}")

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Copropietario habilitado exitosamente",
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al habilitar copropietario: {str(e)}")
        raise ServiceException(
            message=f"Error al habilitar copropietario: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{coowner_id}/disable",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Deshabilitar acceso de un copropietario",
    description="Deshabilita el acceso al sistema para un copropietario específico"
)
async def disable_coowner(
    coowner_id: int,
    send_email: bool = True,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deshabilita el acceso de un copropietario al sistema.
    Por defecto envía un correo notificando la deshabilitación.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden deshabilitar copropietarios"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        # Deshabilitar el copropietario
        result = await user_service.disable_coowner_access(
            user_id=coowner_id,
            unit_id=admin_unit['id'],
            send_email=send_email
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Copropietario deshabilitado exitosamente",
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al deshabilitar copropietario: {str(e)}")
        raise ServiceException(
            message=f"Error al deshabilitar copropietario: {str(e)}",
            details={"original_error": str(e)}
        )

@router.post(
    "/enable-all",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Habilitar todos los copropietarios",
    description="Habilita el acceso al sistema para todos los copropietarios de la unidad"
)
async def enable_all_coowners(
    send_emails: bool = True,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Habilita el acceso de TODOS los copropietarios de la unidad residencial.
    Por defecto envía correos a todos notificando la habilitación.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden habilitar copropietarios"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        # Habilitar todos los copropietarios
        result = await user_service.enable_all_coowners(
            unit_id=admin_unit['id'],
            exclude_user_id=user.id,  # Excluir al administrador
            send_emails=send_emails
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se habilitaron {result['enabled_count']} copropietarios exitosamente",
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al habilitar todos los copropietarios: {str(e)}")
        raise ServiceException(
            message=f"Error al habilitar todos los copropietarios: {str(e)}",
            details={"original_error": str(e)}
        )

@router.post(
    "/{coowner_id}/resend-credentials",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Reenviar credenciales a un copropietario",
    description="Genera una nueva contraseña temporal y la envía por correo"
)
async def resend_coowner_credentials(
    coowner_id: int,
    request: ResendCredentialsRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera una nueva contraseña temporal para el copropietario y la envía por correo via Celery.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden reenviar credenciales"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        celery_app.send_task(
            'app.tasks.email_tasks.send_single_credential_email',
            args=[coowner_id, admin_unit['id']],
            kwargs={'frontend_url': request.frontend_url},
            queue='email_tasks'
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Credenciales reenviadas exitosamente",
            data={'sent_to_queue': True, 'user_id': coowner_id}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al reenviar credenciales: {str(e)}")
        raise ServiceException(
            message=f"Error al reenviar credenciales: {str(e)}",
            details={"original_error": str(e)}
        )

@router.post(
    "/send-bulk-credentials",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Enviar credenciales en masa a múltiples copropietarios",
    description="Genera nuevas contraseñas temporales y las envía por correo a múltiples copropietarios seleccionados"
)
async def send_bulk_credentials(
    request_data: BulkSendCredentialsRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Envía credenciales en masa a múltiples copropietarios SELECCIONADOS.
    Genera nuevas contraseñas temporales y las envía por correo.

    Body:
        {
            "resident_ids": [5, 8, 12]
        }
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden enviar credenciales"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        if not request_data.resident_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar al menos un ID de residente"
            )

        # Generar task_id único
        task_id = str(uuid.uuid4())

        # Pasar resident_ids y unit_id a Celery - Él hace todo el trabajo
        celery_app.send_task(
            'app.tasks.email_tasks.send_bulk_emails',
            args=[request_data.resident_ids, admin_unit['id'], task_id, request_data.frontend_url, 'email_copropietario_credentials'],
            task_id=task_id,
            queue='email_tasks'
        )

        logger.info(
            f"📧 Admin {current_user} envió tarea de credenciales masivas en unit_id={admin_unit['id']}: "
            f"{len(request_data.resident_ids)} residents, task_id={task_id} en cola email_tasks"
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_202_ACCEPTED,
            message=f"Proceso de envío de credenciales iniciado para {len(request_data.resident_ids)} copropietarios",
            data={
                "task_id": task_id,
                "total": len(request_data.resident_ids),
                "status": "processing"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al enviar credenciales masivas: {str(e)}")
        raise ServiceException(
            message=f"Error al enviar credenciales masivas: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/email-task-status/{task_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar estado de tarea de email",
    description="Retorna el progreso de una tarea de envío de emails masivos"
)
async def get_email_task_status(
    task_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Consulta el estado de una tarea de envío de emails masivos.
    Usa Redis para obtener el progreso en tiempo real.
    """
    import redis.asyncio as aioredis
    from app.core.config import settings

    try:
        r = await aioredis.from_url(settings.REDIS_URL)
        key = f"email_task:{task_id}"
        data = await r.hgetall(key)
        await r.close()

        if not data:
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Tarea no encontrada o expirada",
                data={
                    "status": "not_found",
                    "progress": 0,
                    "current": 0,
                    "total": 0
                }
            )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estado obtenido",
            data={
                "status": data.get(b'status', b'unknown').decode(),
                "progress": int(data.get(b'progress', b'0')),
                "current": int(data.get(b'current', b'0')),
                "total": int(data.get(b'total', b'0')),
                "successful": int(data.get(b'successful', b'0')) if b'successful' in data else None,
                "failed": int(data.get(b'failed', b'0')) if b'failed' in data else None
            }
        )
    except Exception as e:
        logger.error(f"Error consultando estado de tarea {task_id}: {str(e)}")
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Error consultando estado",
            data={
                "status": "error",
                "error": str(e)
            }
        )


@router.post(
    "/toggle-access-bulk",
    response_model=SuccessResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Habilitar/Deshabilitar acceso de múltiples copropietarios (Celery)",
    description="Encola una tarea Celery para modificar el acceso de múltiples copropietarios en batches de 50"
)
async def toggle_coowners_access_bulk(
    request_data: BulkToggleAccessRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden modificar el acceso de copropietarios"
            )

        residential_service = ResidentialUnitService(db)
        admin_unit = await residential_service.get_admin_residential_unit(user.id)

        if not admin_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una unidad residencial asignada"
            )

        if not request_data.user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar al menos un ID de usuario"
            )

        task_id = str(uuid.uuid4())
        celery_app.send_task(
            'app.tasks.coowner_tasks.bulk_toggle_access_task',
            args=[request_data.user_ids, admin_unit['id'], request_data.enabled, user.id, task_id, request_data.frontend_url],
            task_id=task_id,
            queue='email_tasks'
        )

        action_text = "habilitar" if request_data.enabled else "deshabilitar"
        logger.info(f"🔄 Admin {current_user} encoló toggle masivo en unit_id={admin_unit['id']}: {len(request_data.user_ids)} usuarios, task_id={task_id}")

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_202_ACCEPTED,
            message=f"Proceso de {action_text} iniciado para {len(request_data.user_ids)} copropietario(s)",
            data={
                "task_id": task_id,
                "total": len(request_data.user_ids),
                "status": "processing"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al encolar toggle masivo: {str(e)}")
        raise ServiceException(
            message=f"Error al encolar toggle masivo: {str(e)}",
            details={"original_error": str(e)}
        )

@router.delete(
    "/delete-bulk",
    response_model=SuccessResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Eliminar múltiples copropietarios (Celery)"
)
async def delete_coowners_bulk(
    request_data: BulkDeleteRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_service = UserService(db)
    user = await user_service.get_user_by_username(current_user)

    if not user or user.int_id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    residential_service = ResidentialUnitService(db)

    if user.int_id_rol == 2:
        admin_unit = await residential_service.get_admin_residential_unit(user.id)
        unit_id = admin_unit['id']
    else:
        unit_id = request_data.unit_id

    if not request_data.user_ids:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos un ID de usuario")

    task_id = str(uuid.uuid4())
    celery_app.send_task(
        'app.tasks.coowner_tasks.bulk_delete_task',
        args=[request_data.user_ids, unit_id, user.int_id_rol, task_id],
        task_id=task_id,
        queue='email_tasks'
    )

    logger.info(f"🗑️ {current_user} encoló eliminación masiva en unit_id={unit_id}: {len(request_data.user_ids)} usuarios, task_id={task_id}")

    return SuccessResponse(
        success=True,
        status_code=status.HTTP_202_ACCEPTED,
        message=f"Proceso de eliminación iniciado para {len(request_data.user_ids)} copropietario(s)",
        data={
            "task_id": task_id,
            "total": len(request_data.user_ids),
            "status": "processing"
        }
    )


@router.get(
    "/bulk-task-status/{task_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar estado de tarea masiva (toggle/delete)",
)
async def get_bulk_task_status(
    task_id: str,
    current_user: str = Depends(get_current_user)
):
    import redis.asyncio as aioredis
    from app.core.config import settings as _settings

    try:
        r = await aioredis.from_url(_settings.REDIS_URL)
        key = f"coowner_task:{task_id}"
        data = await r.hgetall(key)
        await r.close()

        if not data:
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Tarea no encontrada o expirada",
                data={"status": "not_found", "progress": 0, "current": 0, "total": 0}
            )

        def _int(k):
            return int(data.get(k, b'0'))

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estado obtenido",
            data={
                "status": data.get(b'status', b'unknown').decode(),
                "progress": _int(b'progress'),
                "current": _int(b'current'),
                "total": _int(b'total'),
                "successful": _int(b'successful'),
                "failed": _int(b'failed'),
                "already_in_state": _int(b'already_in_state'),
            }
        )
    except Exception as e:
        logger.error(f"Error consultando bulk-task-status {task_id}: {e}")
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Error consultando estado",
            data={"status": "error", "error": str(e)}
        )