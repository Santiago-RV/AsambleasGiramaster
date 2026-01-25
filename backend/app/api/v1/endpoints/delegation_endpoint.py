from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.auth.auth import get_current_user
from app.core.database import get_db
from app.schemas.responses_schema import SuccessResponse
from app.schemas.delegation_schema import (
    DelegationCreate,
    DelegationResponse,
    UserDelegationStatus
)
from app.services.voting_delegation_service import VotingDelegationService
from app.services.user_service import UserService
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    BusinessLogicException,
    UnauthorizedException
)

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== Endpoints de Delegación ====================

@router.post(
    "/meetings/{meeting_id}/delegations",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear delegación de poder",
    description="Permite a un admin crear una delegación de poder de votación para una reunión"
)
async def create_delegation(
    meeting_id: int,
    delegation_data: DelegationCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una delegación de poder para una reunión.

    Los delegadores ceden su peso de votación al delegado.

    - **delegator_ids**: Lista de IDs de usuarios que ceden su poder
    - **delegate_id**: ID del usuario que recibe el poder

    **Validaciones:**
    - Solo admins pueden crear delegaciones
    - La reunión debe estar activa ("En vivo")
    - No debe haber encuestas activas
    - Todos deben estar invitados a la reunión
    - Los delegadores no deben haber delegado previamente
    - Los delegadores no deben haber votado
    - El delegado no debe haber delegado (no se permiten cadenas)
    """
    try:
        delegation_service = VotingDelegationService(db)
        user_service = UserService(db)

        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        result = await delegation_service.create_delegation(
            meeting_id=meeting_id,
            delegator_ids=delegation_data.delegator_ids,
            delegate_id=delegation_data.delegate_id,
            admin_user_id=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message=result["message"],
            data=result
        )
    except UnauthorizedException as e:
        raise e
    except ValidationException as e:
        raise e
    except NotFoundException as e:
        raise e
    except Exception as e:
        logger.error(f"Error al crear delegación: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear delegación: {str(e)}"
        )


@router.get(
    "/meetings/{meeting_id}/delegations",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Listar delegaciones activas",
    description="Obtiene todas las delegaciones activas de una reunión"
)
async def get_meeting_delegations(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene todas las delegaciones activas de una reunión.

    Retorna una lista de delegaciones con información de:
    - Delegador (quien cedió el poder)
    - Delegado (quien recibió el poder)
    - Peso delegado
    - Fecha de delegación
    """
    try:
        delegation_service = VotingDelegationService(db)
        user_service = UserService(db)

        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        delegations = await delegation_service.get_meeting_delegations(meeting_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(delegations)} delegaciones activas",
            data=delegations
        )
    except Exception as e:
        logger.error(f"Error al obtener delegaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener delegaciones: {str(e)}"
        )


@router.delete(
    "/meetings/{meeting_id}/delegations/{delegator_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Revocar delegación",
    description="Revoca una delegación de poder específica"
)
async def revoke_delegation(
    meeting_id: int,
    delegator_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoca una delegación de poder.

    Restaura el peso original del delegador y reduce el peso del delegado.

    - **meeting_id**: ID de la reunión
    - **delegator_id**: ID del usuario que había delegado
    """
    try:
        delegation_service = VotingDelegationService(db)
        user_service = UserService(db)

        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        result = await delegation_service.revoke_delegation(
            meeting_id=meeting_id,
            delegator_id=delegator_id,
            admin_user_id=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=result["message"],
            data=result
        )
    except UnauthorizedException as e:
        raise e
    except ValidationException as e:
        raise e
    except NotFoundException as e:
        raise e
    except Exception as e:
        logger.error(f"Error al revocar delegación: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al revocar delegación: {str(e)}"
        )


@router.get(
    "/meetings/{meeting_id}/user-delegation-status",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Estado de delegación del usuario",
    description="Obtiene el estado de delegación del usuario actual (para copropietarios)"
)
async def get_user_delegation_status(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el estado de delegación del usuario actual.

    Para vista de copropietario (solo lectura).

    Retorna:
    - Si el usuario delegó su voto
    - A quién delegó (si delegó)
    - Delegaciones recibidas de otros usuarios
    - Peso total de votación actual
    - Peso original sin delegaciones
    """
    try:
        delegation_service = VotingDelegationService(db)
        user_service = UserService(db)

        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        status_data = await delegation_service.get_user_delegation_status(
            meeting_id=meeting_id,
            user_id=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estado de delegación obtenido exitosamente",
            data=status_data
        )
    except NotFoundException as e:
        raise e
    except Exception as e:
        logger.error(f"Error al obtener estado de delegación: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado de delegación: {str(e)}"
        )
