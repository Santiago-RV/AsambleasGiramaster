from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.session_service import SessionService
from app.auth.auth import get_current_user_obj
from app.models.user_model import UserModel
from app.schemas.responses_schema import SuccessResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/admin/sessions", tags=["Admin - Sesiones"])


class SessionDeactivateResponse(BaseModel):
    success: bool
    message: str
    count: int = 1


@router.delete(
    "/{user_id}",
    response_model=SuccessResponse,
    summary="Cerrar todas las sesiones de un usuario",
    description="Permite al admin o superadmin cerrar todas las sesiones de un usuario específico"
)
async def admin_deactivate_user_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_obj)
):
    """
    Desactiva todas las sesiones de un usuario específico
    
    Solo accesible para Admin (rol 2) y Super Admin (rol 1)
    
    Args:
        user_id: ID del usuario objetivo
        
    Returns:
        Número de sesiones cerradas
    """
    if current_user.int_id_rol not in (1, 2):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción"
        )
    
    session_service = SessionService(db)
    result = await session_service.deactivate_user_session_by_admin(user_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message=result["message"],
        data={"count": result["count"]}
    )


@router.delete(
    "/{user_id}/{session_id}",
    response_model=SuccessResponse,
    summary="Cerrar sesión específica de un usuario",
    description="Permite al admin o superadmin cerrar una sesión específica de un usuario"
)
async def admin_deactivate_user_session(
    user_id: int,
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_obj)
):
    """
    Desactiva una sesión específica de un usuario
    
    Solo accesible para Admin (rol 2) y Super Admin (rol 1)
    
    Args:
        user_id: ID del usuario objetivo
        session_id: ID de la sesión a cerrar
        
    Returns:
        Resultado de la operación
    """
    if current_user.int_id_rol not in (1, 2):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción"
        )
    
    session_service = SessionService(db)
    result = await session_service.deactivate_user_session_by_admin(user_id, session_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message=result["message"],
        data={"session_id": session_id}
    )


@router.get(
    "/{user_id}",
    response_model=SuccessResponse,
    summary="Ver sesiones de un usuario",
    description="Permite al admin o superadmin ver las sesiones activas de un usuario específico"
)
async def admin_get_user_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_obj)
):
    """
    Obtiene las sesiones activas de un usuario específico
    
    Solo accesible para Admin (rol 2) y Super Admin (rol 1)
    
    Args:
        user_id: ID del usuario objetivo
        
    Returns:
        Lista de sesiones activas
    """
    if current_user.int_id_rol not in (1, 2):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción"
        )
    
    session_service = SessionService(db)
    sessions = await session_service.get_active_sessions(user_id)
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message=f"Se encontraron {len(sessions)} sesiones activas",
        data={"sessions": sessions, "user_id": user_id}
    )
