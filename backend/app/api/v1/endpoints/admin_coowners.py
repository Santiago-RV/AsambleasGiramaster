# backend/app/api/v1/endpoints/admin_coowners.py
"""
Endpoints para gestión de copropietarios desde el Dashboard del Administrador
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.schemas.responses_schema import SuccessResponse
from app.schemas.residential_unit_schema import ResidentUpdate
from app.core.exceptions import ServiceException, ResourceNotFoundException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/coowners",
    tags=["Admin - Copropietarios"]
)


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
        
        # Habilitar el copropietario
        result = await residential_service.enable_coowner_access(
            user_id=coowner_id,
            unit_id=admin_unit['id'],
            send_email=send_email
        )
        
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
        result = await residential_service.disable_coowner_access(
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
        result = await residential_service.enable_all_coowners(
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
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera una nueva contraseña temporal para el copropietario y la envía por correo.
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
        
        # Reenviar credenciales
        result = await residential_service.resend_resident_credentials(
            user_id=coowner_id,
            unit_id=admin_unit['id']
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Credenciales reenviadas exitosamente",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al reenviar credenciales: {str(e)}")
        raise ServiceException(
            message=f"Error al reenviar credenciales: {str(e)}",
            details={"original_error": str(e)}
        )