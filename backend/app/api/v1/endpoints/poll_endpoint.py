from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.auth.auth import get_current_user
from app.core.database import get_db
from app.schemas.responses_schema import SuccessResponse
from app.schemas.poll_schema import PollCreate, PollBase
from app.schemas.pool_response_schema import PollResponseCreate
from app.services.pool_service import PollService
from app.services.user_service import UserService
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    BusinessLogicException,
    ServiceException
)

router = APIRouter()

# ==================== CRUD de Encuestas ====================

@router.post(
    "/",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear encuesta",
    description="Crea una nueva encuesta para una reunión"
)
async def create_poll(
    poll_data: PollCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva encuesta con sus opciones
    
    - **int_meeting_id**: ID de la reunión
    - **str_title**: Título de la encuesta
    - **str_poll_type**: Tipo (single, multiple, text, numeric)
    - **options**: Lista de opciones (mínimo 2 para single/multiple)
    """
    try:
        poll_service = PollService(db)
        user_service = UserService(db)
        
        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )
        
        poll = await poll_service.create_poll(poll_data, user.id)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Encuesta creada exitosamente",
            data={
                "id": poll.id,
                "poll_code": poll.str_poll_code,
                "title": poll.str_title,
                "status": poll.str_status,
                "options_count": len(poll.options)
            }
        )
    except NotFoundException as e:
        raise e
    except ValidationException as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al crear la encuesta: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/{poll_id}",
    response_model=SuccessResponse,
    summary="Obtener encuesta",
    description="Obtiene los detalles de una encuesta"
)
async def get_poll(
    poll_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene una encuesta por ID"""
    try:
        poll_service = PollService(db)
        poll = await poll_service.get_poll_by_id(poll_id)
        
        if not poll:
            raise NotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Encuesta obtenida exitosamente",
            data={
                "id": poll.id,
                "int_meeting_id": poll.int_meeting_id,
                "str_poll_code": poll.str_poll_code,
                "str_title": poll.str_title,
                "str_description": poll.str_description,
                "str_poll_type": poll.str_poll_type,
                "str_status": poll.str_status,
                "bln_is_anonymous": poll.bln_is_anonymous,
                "bln_requires_quorum": poll.bln_requires_quorum,
                "dec_minimum_quorum_percentage": float(poll.dec_minimum_quorum_percentage),
                "bln_allows_abstention": poll.bln_allows_abstention,
                "int_max_selections": poll.int_max_selections,
                "int_duration_minutes": poll.int_duration_minutes,
                "dat_started_at": poll.dat_started_at,
                "dat_ended_at": poll.dat_ended_at,
                "options": [
                    {
                        "id": opt.id,
                        "str_option_text": opt.str_option_text,
                        "int_option_order": opt.int_option_order,
                        "int_votes_count": opt.int_votes_count,
                        "dec_percentage": float(opt.dec_percentage)
                    } for opt in poll.options
                ]
            }
        )
    except NotFoundException as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener la encuesta: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/code/{poll_code}",
    response_model=SuccessResponse,
    summary="Obtener encuesta por código",
    description="Obtiene una encuesta usando su código único (público)"
)
async def get_poll_by_code(
    poll_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene una encuesta por código (no requiere autenticación)"""
    try:
        poll_service = PollService(db)
        poll = await poll_service.get_poll_by_code(poll_code)
        
        if not poll:
            raise NotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Encuesta obtenida exitosamente",
            data={
                "id": poll.id,
                "str_poll_code": poll.str_poll_code,
                "str_title": poll.str_title,
                "str_description": poll.str_description,
                "str_poll_type": poll.str_poll_type,
                "str_status": poll.str_status,
                "bln_allows_abstention": poll.bln_allows_abstention,
                "int_max_selections": poll.int_max_selections,
                "dat_ended_at": poll.dat_ended_at,
                "options": [
                    {
                        "id": opt.id,
                        "str_option_text": opt.str_option_text,
                        "int_option_order": opt.int_option_order
                    } for opt in sorted(poll.options, key=lambda x: x.int_option_order)
                ]
            }
        )
    except NotFoundException as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener la encuesta: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/meeting/{meeting_id}/polls",
    response_model=SuccessResponse,
    summary="Listar encuestas de reunión",
    description="Obtiene todas las encuestas de una reunión"
)
async def get_meeting_polls(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas las encuestas de una reunión"""
    try:
        poll_service = PollService(db)
        polls = await poll_service.get_polls_by_meeting(meeting_id)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(polls)} encuestas",
            data=[
                {
                    "id": poll.id,
                    "str_poll_code": poll.str_poll_code,
                    "str_title": poll.str_title,
                    "str_poll_type": poll.str_poll_type,
                    "str_status": poll.str_status,
                    "created_at": poll.created_at,
                    "dat_started_at": poll.dat_started_at,
                    "dat_ended_at": poll.dat_ended_at,
                    "options_count": len(poll.options)
                } for poll in polls
            ]
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al listar las encuestas: {str(e)}",
            details={"original_error": str(e)}
        )


# ==================== Control de Encuestas ====================

@router.post(
    "/{poll_id}/start",
    response_model=SuccessResponse,
    summary="Iniciar encuesta",
    description="Inicia una encuesta y la pone disponible para votación"
)
async def start_poll(
    poll_id: int,
    duration_minutes: Optional[int] = None,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Inicia una encuesta"""
    try:
        poll_service = PollService(db)
        user_service = UserService(db)
        
        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )
        
        poll = await poll_service.start_poll(poll_id, user.id, duration_minutes)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Encuesta iniciada exitosamente",
            data={
                "id": poll.id,
                "poll_code": poll.str_poll_code,
                "status": poll.str_status,
                "started_at": poll.dat_started_at,
                "ends_at": poll.dat_ended_at
            }
        )
    except (NotFoundException, BusinessLogicException) as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al iniciar la encuesta: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{poll_id}/end",
    response_model=SuccessResponse,
    summary="Finalizar encuesta",
    description="Finaliza una encuesta y calcula los resultados"
)
async def end_poll(
    poll_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Finaliza una encuesta"""
    try:
        poll_service = PollService(db)
        user_service = UserService(db)
        
        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )
        
        poll = await poll_service.end_poll(poll_id, user.id)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Encuesta finalizada exitosamente",
            data={
                "id": poll.id,
                "poll_code": poll.str_poll_code,
                "status": poll.str_status,
                "ended_at": poll.dat_ended_at
            }
        )
    except (NotFoundException, BusinessLogicException) as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al finalizar la encuesta: {str(e)}",
            details={"original_error": str(e)}
        )


# ==================== Votación ====================

@router.post(
    "/code/{poll_code}/vote",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Votar en encuesta (público)",
    description="Registra un voto en la encuesta usando el código (no requiere autenticación)"
)
async def vote_poll_by_code(
    poll_code: str,
    request: Request,
    response_data: PollResponseCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registra un voto en la encuesta usando el código (acceso público)"""
    try:
        poll_service = PollService(db)

        # Obtener la encuesta por código
        poll = await poll_service.get_poll_by_code(poll_code)
        if not poll:
            raise NotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )

        # Obtener IP y User-Agent
        client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
        user_agent = request.headers.get("User-Agent", "")

        # Registrar voto sin user_id (anónimo)
        response = await poll_service.submit_response(
            poll.id, None, response_data, client_ip, user_agent
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Voto registrado exitosamente",
            data={
                "id": response.id,
                "poll_id": response.int_poll_id,
                "voted_at": response.dat_response_at,
                "is_abstention": response.bln_is_abstention
            }
        )
    except (NotFoundException, ValidationException, BusinessLogicException) as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al registrar el voto: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{poll_id}/vote",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Votar en encuesta (autenticado)",
    description="Registra un voto en la encuesta (requiere autenticación)"
)
async def vote_poll(
    poll_id: int,
    request: Request,
    response_data: PollResponseCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Registra un voto en la encuesta (usuario autenticado)"""
    try:
        poll_service = PollService(db)
        user_service = UserService(db)

        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        # Obtener IP y User-Agent
        client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
        user_agent = request.headers.get("User-Agent", "")

        response = await poll_service.submit_response(
            poll_id, user.id, response_data, client_ip, user_agent
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Voto registrado exitosamente",
            data={
                "id": response.id,
                "poll_id": response.int_poll_id,
                "voted_at": response.dat_response_at,
                "is_abstention": response.bln_is_abstention
            }
        )
    except (NotFoundException, ValidationException, BusinessLogicException) as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al registrar el voto: {str(e)}",
            details={"original_error": str(e)}
        )


# ==================== Estadísticas ====================

@router.get(
    "/{poll_id}/statistics",
    response_model=SuccessResponse,
    summary="Estadísticas de encuesta",
    description="Obtiene estadísticas detalladas de una encuesta"
)
async def get_poll_statistics(
    poll_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene estadísticas detalladas de una encuesta"""
    try:
        poll_service = PollService(db)
        stats = await poll_service.get_poll_statistics(poll_id)
        
        poll = stats["poll"]
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estadísticas obtenidas exitosamente",
            data={
                "poll_info": {
                    "id": poll.id,
                    "str_title": poll.str_title,
                    "str_status": poll.str_status,
                    "str_poll_type": poll.str_poll_type
                },
                "statistics": {
                    "total_responses": stats["total_responses"],
                    "total_votes": stats["total_votes"],
                    "total_abstentions": stats["total_abstentions"],
                    "participation_percentage": stats["participation_percentage"],
                    "quorum_reached": stats["quorum_reached"],
                    "required_quorum": float(poll.dec_minimum_quorum_percentage)
                },
                "options": [
                    {
                        "id": opt.id,
                        "str_option_text": opt.str_option_text,
                        "int_votes_count": opt.int_votes_count,
                        "dec_weight_total": float(opt.dec_weight_total),
                        "dec_percentage": float(opt.dec_percentage)
                        } for opt in sorted(poll.options, key=lambda x: x.int_option_order)
                ]
            }
        )
    except NotFoundException as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener estadísticas: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/{poll_id}/results",
    response_model=SuccessResponse,
    summary="Resultados de encuesta",
    description="Obtiene los resultados detallados de una encuesta finalizada"
)
async def get_poll_results(
    poll_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene los resultados de una encuesta (solo si está cerrada)"""
    try:
        poll_service = PollService(db)
        poll = await poll_service.get_poll_by_id(poll_id)
        
        if not poll:
            raise NotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )
        
        # Verificar que la encuesta esté cerrada
        if poll.str_status != 'closed':
            raise BusinessLogicException(
                message="Solo se pueden ver resultados de encuestas finalizadas",
                error_code="POLL_NOT_CLOSED"
            )
        
        stats = await poll_service.get_poll_statistics(poll_id)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Resultados obtenidos exitosamente",
            data={
                "poll_info": {
                    "id": poll.id,
                    "str_title": poll.str_title,
                    "str_description": poll.str_description,
                    "str_poll_type": poll.str_poll_type,
                    "str_status": poll.str_status,
                    "dat_started_at": poll.dat_started_at,
                    "dat_ended_at": poll.dat_ended_at
                },
                "results": {
                    "total_responses": stats["total_responses"],
                    "total_votes": stats["total_votes"],
                    "total_abstentions": stats["total_abstentions"],
                    "participation_percentage": stats["participation_percentage"],
                    "quorum_reached": stats["quorum_reached"],
                    "required_quorum": float(poll.dec_minimum_quorum_percentage)
                },
                "options_results": [
                    {
                        "id": opt.id,
                        "str_option_text": opt.str_option_text,
                        "int_option_order": opt.int_option_order,
                        "int_votes_count": opt.int_votes_count,
                        "dec_weight_total": float(opt.dec_weight_total),
                        "dec_percentage": float(opt.dec_percentage)
                    } for opt in sorted(poll.options, key=lambda x: -float(x.dec_percentage))
                ]
            }
        )
    except (NotFoundException, BusinessLogicException) as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener resultados: {str(e)}",
            details={"original_error": str(e)}
        )