from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.auth.auth import get_current_user
from app.core.database import get_db
from app.schemas.responses_schema import SuccessResponse
from app.services.voting_delegation_service import VotingDelegationService
from app.services.user_service import UserService

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/meetings/{meeting_id}/delegation-history",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener histórico de delegaciones",
    description="Obtiene el histórico completo de todas las delegaciones de una reunión (activas y revocadas)"
)
async def get_delegation_history(
    meeting_id: int,
    status_filter: Optional[str] = Query(
        None, 
        description="Filtrar por estado: 'active', 'revoked' o None para obtener todas"
    ),
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el histórico completo de delegaciones de una reunión.
    
    **Parámetros:**
    - **meeting_id**: ID de la reunión
    - **status_filter**: (Opcional) Filtrar por estado:
        - `active`: Solo delegaciones activas
        - `revoked`: Solo delegaciones revocadas
        - `null` o sin especificar: Todas las delegaciones
    
    **Respuesta incluye para cada delegación:**
    - Información del delegador (quien cedió el poder)
    - Información del delegado (quien recibió el poder)
    - Peso delegado
    - Estado (active/revoked)
    - Fecha de delegación
    - Fecha de revocación (si aplica)
    
    **Útil para:**
    - Generar reportes de quién delegó a quién
    - Auditoría de cambios en delegaciones
    - Historial completo de poderes cedidos
    """
    try:
        delegation_service = VotingDelegationService(db)
        user_service = UserService(db)

        # Verificar autenticación
        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        # Obtener histórico completo
        history = await delegation_service.get_delegation_history(meeting_id)
        
        # Filtrar por estado si se especifica
        if status_filter:
            status_filter_lower = status_filter.lower()
            if status_filter_lower not in ['active', 'revoked']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El filtro de estado debe ser 'active' o 'revoked'"
                )
            
            history = [h for h in history if h['status'] == status_filter_lower]
        
        # Estadísticas
        total_delegations = len(history)
        active_count = len([h for h in history if h['status'] == 'active'])
        revoked_count = len([h for h in history if h['status'] == 'revoked'])
        
        total_weight_active = sum(
            h['delegated_weight'] for h in history if h['status'] == 'active'
        )

        response_data = {
            "meeting_id": meeting_id,
            "statistics": {
                "total_delegations": total_delegations,
                "active_delegations": active_count,
                "revoked_delegations": revoked_count,
                "total_weight_delegated_active": round(total_weight_active, 6)
            },
            "history": history
        }

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {total_delegations} registros en el histórico",
            data=response_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener histórico de delegaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener histórico: {str(e)}"
        )