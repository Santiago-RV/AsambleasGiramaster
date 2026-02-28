# backend/app/api/v1/endpoints/support_endpoint.py
"""
Endpoints para gestión del contacto de soporte técnico por unidad residencial.

Lógica de almacenamiento:
  - Se reutilizan las tablas existentes: tbl_data_users, tbl_users y tbl_user_residential_units
  - El registro de soporte se identifica con str_apartment_number = 'SOPORTE'
  - El usuario de soporte tiene bln_allow_entry = False (sin acceso a la plataforma)
  - Aplica el mismo patrón que 'ADMIN' ya usado en el sistema

Acceso:
  - Super Admin (rol 1): puede gestionar el soporte de cualquier unidad mediante unit_id en la URL
  - Admin       (rol 2): puede gestionar solo el soporte de su propia unidad
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.core.database import get_db
from app.auth.auth import get_current_user
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.services.support_service import SupportService
from app.schemas.responses_schema import SuccessResponse
from app.core.exceptions import ServiceException, ResourceNotFoundException
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Schemas locales
# ─────────────────────────────────────────────────────────────────────────────

class SupportInfoRequest(BaseModel):
    """Datos del contacto de soporte técnico para una unidad residencial."""
    str_support_name: str = Field(..., min_length=2, max_length=200, description="Nombre del contacto de soporte")
    str_support_email: EmailStr = Field(..., description="Correo del contacto de soporte")
    str_support_phone: Optional[str] = Field(None, max_length=50, description="Teléfono del contacto de soporte")


# ─────────────────────────────────────────────────────────────────────────────
# Helper: resuelve unit_id según rol
# ─────────────────────────────────────────────────────────────────────────────

async def _resolve_unit_id(
    unit_id: Optional[int],
    user,
    residential_service: ResidentialUnitService
) -> int:
    """
    Super Admin  → requiere unit_id explícito en la URL.
    Admin        → obtiene su propia unidad; ignora unit_id si se pasa.
    """
    if user.int_id_rol == 1:
        if not unit_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El Super Admin debe indicar el unit_id de la unidad residencial"
            )
        unit = await residential_service.get_residential_unit_by_id(unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unidad residencial {unit_id} no encontrada"
            )
        return unit_id

    # Admin (rol 2)
    admin_unit = await residential_service.get_admin_residential_unit(user.id)
    if not admin_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tienes una unidad residencial asignada"
        )
    return admin_unit["id"]


# ─────────────────────────────────────────────────────────────────────────────
# GET  /support/{unit_id}   — obtener soporte de una unidad
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{unit_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener contacto de soporte técnico",
    description="Retorna los datos del contacto de soporte técnico de una unidad residencial"
)
async def get_support_info(
    unit_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden consultar el soporte técnico"
            )

        residential_service = ResidentialUnitService(db)
        resolved_unit_id = await _resolve_unit_id(unit_id, user, residential_service)

        support_service = SupportService(db)
        support_data = await support_service.get_support_info(resolved_unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Información de soporte obtenida exitosamente" if support_data else "No hay contacto de soporte configurado",
            data=support_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener soporte técnico: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener soporte técnico: {str(e)}",
            details={"original_error": str(e)}
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST  /support/{unit_id}  — crear o actualizar soporte
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{unit_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Crear o actualizar contacto de soporte técnico",
    description=(
        "Si ya existe un registro SOPORTE para la unidad, lo actualiza. "
        "Si no existe, lo crea. Upsert transparente."
    )
)
async def upsert_support_info(
    unit_id: int,
    support_data: SupportInfoRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden configurar el soporte técnico"
            )

        residential_service = ResidentialUnitService(db)
        resolved_unit_id = await _resolve_unit_id(unit_id, user, residential_service)

        support_service = SupportService(db)
        result = await support_service.upsert_support_info(
            unit_id=resolved_unit_id,
            name=support_data.str_support_name,
            email=support_data.str_support_email,
            phone=support_data.str_support_phone
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Contacto de soporte guardado exitosamente",
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al guardar soporte técnico: {str(e)}")
        raise ServiceException(
            message=f"Error al guardar soporte técnico: {str(e)}",
            details={"original_error": str(e)}
        )


# ─────────────────────────────────────────────────────────────────────────────
# DELETE  /support/{unit_id}  — eliminar soporte
# ─────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/{unit_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Eliminar contacto de soporte técnico",
    description="Elimina el registro de soporte técnico de la unidad residencial"
)
async def delete_support_info(
    unit_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden eliminar el soporte técnico"
            )

        residential_service = ResidentialUnitService(db)
        resolved_unit_id = await _resolve_unit_id(unit_id, user, residential_service)

        support_service = SupportService(db)
        await support_service.delete_support_info(resolved_unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Contacto de soporte eliminado exitosamente",
            data=None
        )

    except HTTPException:
        raise
    except ResourceNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error al eliminar soporte técnico: {str(e)}")
        raise ServiceException(
            message=f"Error al eliminar soporte técnico: {str(e)}",
            details={"original_error": str(e)}
        )