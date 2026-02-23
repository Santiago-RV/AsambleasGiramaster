from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.session_service import SessionService
from app.auth.auth import get_current_user_obj
from app.models.user_model import UserModel
from app.schemas.responses_schema import SuccessResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/sessions", tags=["Sesiones"])


class SessionResponse(BaseModel):
    id: int
    token_jti: str
    device_info: Optional[str]
    ip_address: Optional[str]
    created_at: str
    expires_at: str
    is_active: bool


class SessionDeactivateResponse(BaseModel):
    success: bool
    message: str
    count: int = 1


@router.get(
    "",
    response_model=SuccessResponse,
    summary="Obtener mis sesiones activas",
    description="Retorna la lista de sesiones activas del usuario actual"
)
async def get_my_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_obj)
):
    """
    Obtiene las sesiones activas del usuario actual
    
    Returns:
        Lista de sesiones activas
    """
    session_service = SessionService(db)
    sessions = await session_service.get_active_sessions(current_user.id)
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message=f"Se encontraron {len(sessions)} sesiones activas",
        data={"sessions": sessions}
    )


@router.delete(
    "/{session_id}",
    response_model=SuccessResponse,
    summary="Cerrar mi sesión específica",
    description="Cierra una sesión específica del usuario actual"
)
async def deactivate_my_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_obj)
):
    """
    Desactiva una sesión específica del usuario actual
    
    Args:
        session_id: ID de la sesión a cerrar
        
    Returns:
        Resultado de la operación
    """
    session_service = SessionService(db)
    success = await session_service.deactivate_session(session_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message="Sesión cerrada exitosamente",
        data={"session_id": session_id}
    )


@router.delete(
    "",
    response_model=SuccessResponse,
    summary="Cerrar todas mis sesiones",
    description="Cierra todas las sesiones del usuario actual (excepto la actual)"
)
async def deactivate_all_my_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_obj)
):
    """
    Desactiva todas las sesiones del usuario actual
    
    Returns:
        Número de sesiones cerradas
    """
    session_service = SessionService(db)
    count = await session_service.deactivate_all_sessions(current_user.id)
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message=f"{count} sesiones cerradas exitosamente",
        data={"count": count}
    )
