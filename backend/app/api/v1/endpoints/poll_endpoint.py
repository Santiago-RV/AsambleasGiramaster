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

from sqlalchemy import select, and_
from app.models.poll_response_model import PollResponseModel
from app.models.poll_option_model import PollOptionModel

import logging

logger = logging.getLogger(__name__)

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


# @router.get(
#     "/meeting/{meeting_id}/polls",
#     response_model=SuccessResponse,
#     summary="Listar encuestas de reunión",
#     description="Obtiene todas las encuestas de una reunión"
# )
# async def get_meeting_polls(
#     meeting_id: int,
#     current_user: str = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Lista todas las encuestas de una reunión"""
#     try:
#         poll_service = PollService(db)
#         polls = await poll_service.get_polls_by_meeting(meeting_id)

#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message=f"Se encontraron {len(polls)} encuestas",
#             data=[
#                 {
#                     "id": poll.id,
#                     "str_poll_code": poll.str_poll_code,
#                     "str_title": poll.str_title,
#                     "str_description": poll.str_description,
#                     "str_poll_type": poll.str_poll_type,
#                     "str_status": poll.str_status,
#                     "bln_is_anonymous": poll.bln_is_anonymous,
#                     "bln_allows_abstention": poll.bln_allows_abstention,
#                     "bln_requires_quorum": poll.bln_requires_quorum,
#                     "dec_minimum_quorum_percentage": poll.dec_minimum_quorum_percentage,
#                     "int_max_selections": poll.int_max_selections,
#                     "int_duration_minutes": poll.int_duration_minutes,
#                     "created_at": poll.created_at,
#                     "dat_started_at": poll.dat_started_at,
#                     "dat_ended_at": poll.dat_ended_at,
#                     "options": [
#                         {
#                             "id": option.id,
#                             "str_option_text": option.str_option_text,
#                             "int_option_order": option.int_option_order
#                         } for option in poll.options
#                     ]
#                 } for poll in polls
#             ]
#         )
#     except Exception as e:
#         raise ServiceException(
#             message=f"Error al listar las encuestas: {str(e)}",
#             details={"original_error": str(e)}
#         )

@router.get(
    "/meeting/{meeting_id}/polls",
    response_model=SuccessResponse,
    summary="Listar encuestas de reunión",
    description="Obtiene todas las encuestas de una reunión con indicador de si el usuario ya votó y qué opciones seleccionó"
)
async def get_meeting_polls(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas las encuestas de una reunión con estado de voto del usuario y opciones votadas"""
    try:
        poll_service = PollService(db)
        user_service = UserService(db)
        
        # Obtener usuario actual
        user = await user_service.get_user_by_username(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )
        
        # ============================================================================
        # ✅ MODIFICACIÓN PRINCIPAL: Obtener todas las encuestas y filtrar por rol
        # ============================================================================
        all_polls = await poll_service.get_polls_by_meeting(meeting_id)
        
        # 🔒 FILTRO DE SEGURIDAD: Ocultar encuestas 'draft' a copropietarios e invitados
        # Roles del sistema:
        #   1 = Super Admin    → Ve TODAS las encuestas (incluyendo draft)
        #   2 = Administrador  → Ve TODAS las encuestas (incluyendo draft)
        #   3 = Copropietario  → NO ve encuestas en estado 'draft'
        #   4 = Invitado       → NO ve encuestas en estado 'draft'
        
        if user.int_id_rol in [3, 4]:  # Copropietario o Invitado
            # Filtrar: NO mostrar encuestas en estado 'draft'
            polls = [poll for poll in all_polls if poll.str_status != 'draft']
            
            # Log informativo para debugging
            logger.info(
                f"👥 Copropietario/Invitado '{current_user}' (rol={user.int_id_rol}) - "
                f"Filtrando encuestas draft. Total: {len(all_polls)} -> Visibles: {len(polls)}"
            )
        else:  # Super Admin (rol 1) o Administrador (rol 2)
            # Mostrar TODAS las encuestas sin filtrar
            polls = all_polls
            
            # Log informativo para debugging
            logger.info(
                f"👨‍💼 Admin '{current_user}' (rol={user.int_id_rol}) - "
                f"Mostrando todas las encuestas (incluyendo draft). Total: {len(polls)}"
            )
        # ============================================================================
        # FIN DE LA MODIFICACIÓN
        # ============================================================================

        # Preparar respuesta con has_voted y user_votes
        polls_data = []
        for poll in polls:
            # Verificar si el usuario ya votó en esta encuesta
            has_voted = await poll_service.user_has_voted(poll.id, user.id) if not poll.bln_is_anonymous else False
            
            # ✅ Obtener las opciones votadas por el usuario
            user_voted_options = []
            if has_voted and not poll.bln_is_anonymous:
                # Buscar los votos del usuario en esta encuesta
                from app.models.poll_response_model import PollResponseModel
                from app.models.poll_option_model import PollOptionModel
                
                vote_query = (
                    select(PollResponseModel, PollOptionModel)
                    .join(PollOptionModel, PollResponseModel.int_option_id == PollOptionModel.id)
                    .where(and_(
                        PollResponseModel.int_poll_id == poll.id,
                        PollResponseModel.int_user_id == user.id,
                        PollResponseModel.bln_is_abstention == False
                    ))
                )
                
                vote_result = await db.execute(vote_query)
                votes = vote_result.all()
                
                for vote_response, vote_option in votes:
                    user_voted_options.append({
                        "option_id": vote_option.id,
                        "option_text": vote_option.str_option_text,
                        "voted_at": vote_response.dat_response_at
                    })
            
            polls_data.append({
                "id": poll.id,
                "str_poll_code": poll.str_poll_code,
                "str_title": poll.str_title,
                "str_description": poll.str_description,
                "str_poll_type": poll.str_poll_type,
                "str_status": poll.str_status,
                "bln_is_anonymous": poll.bln_is_anonymous,
                "bln_requires_quorum": poll.bln_requires_quorum,
                "dec_minimum_quorum_percentage": float(poll.dec_minimum_quorum_percentage) if poll.dec_minimum_quorum_percentage else 0,
                "bln_allows_abstention": poll.bln_allows_abstention,
                "bln_allow_multiple_selection": poll.str_poll_type == 'multiple',
                "int_max_selections": poll.int_max_selections,
                "int_duration_minutes": poll.int_duration_minutes,
                "dat_started_at": poll.dat_started_at,
                "dat_ended_at": poll.dat_ended_at,
                "has_voted": has_voted,
                "user_votes": user_voted_options,
                "options": [
                    {
                        "id": opt.id,
                        "str_option_text": opt.str_option_text,
                        "int_option_order": opt.int_option_order,
                        "int_votes_count": opt.int_votes_count,
                        "dec_percentage": float(opt.dec_percentage) if opt.dec_percentage else 0
                    } for opt in sorted(poll.options, key=lambda x: x.int_option_order)
                ]
            })

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(polls)} encuestas",
            data=polls_data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener encuestas: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener las encuestas: {str(e)}",
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


@router.get(
    "/{poll_id}/votes",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener votos detallados de una encuesta",
    description="Retorna los votos individuales de cada opción de la encuesta, incluyendo quién votó y cuándo"
)
async def get_poll_votes(
    poll_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los detalles de todos los votos de una encuesta.
    
    Returns:
    - Información de la encuesta
    - Lista de opciones con sus votos individuales
    - Por cada voto: usuario, apartamento, fecha/hora
    """
    try:
        user_service = UserService(db)
        current = await user_service.get_user_by_username(current_user)
        
        if not current or current.int_id_rol not in (1, 2):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para ver los votos"
            )
        
        from app.models.poll_model import PollModel
        from app.models.poll_option_model import PollOptionModel
        from app.models.poll_response_model import PollResponseModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from sqlalchemy import select, and_
        
        poll_query = select(PollModel).where(PollModel.id == poll_id)
        poll_result = await db.execute(poll_query)
        poll = poll_result.scalar_one_or_none()
        
        if not poll:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Encuesta no encontrada"
            )
        
        options_query = select(PollOptionModel).where(
            PollOptionModel.int_poll_id == poll_id
        ).order_by(PollOptionModel.int_option_order)
        
        options_result = await db.execute(options_query)
        options = options_result.scalars().all()
        
        options_with_votes = []
        
        for option in options:
            votes_query = (
                select(
                    PollResponseModel,
                    UserModel.id.label("voter_id"),
                    DataUserModel.str_firstname,
                    DataUserModel.str_lastname,
                    UserResidentialUnitModel.str_apartment_number,
                    PollResponseModel.dat_response_at
                )
                .join(UserModel, PollResponseModel.int_user_id == UserModel.id)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .join(
                    UserResidentialUnitModel,
                    UserResidentialUnitModel.int_user_id == UserModel.id
                )
                .where(
                    and_(
                        PollResponseModel.int_option_id == option.id,
                        PollResponseModel.bln_is_abstention == False
                    )
                )
                .order_by(PollResponseModel.dat_response_at.desc())
            )
            
            votes_result = await db.execute(votes_query)
            votes = votes_result.all()
            
            votes_list = []
            for vote in votes:
                votes_list.append({
                    "user_id": vote.voter_id,
                    "full_name": f"{vote.str_firstname} {vote.str_lastname}".strip(),
                    "apartment_number": vote.str_apartment_number or "N/A",
                    "voted_at": vote.dat_response_at.isoformat() if vote.dat_response_at else None
                })
            
            options_with_votes.append({
                "option_id": option.id,
                "option_text": option.str_option_text,
                "votes_count": len(votes_list),
                "votes": votes_list
            })
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Votos obtenidos para encuesta {poll_id}",
            data={
                "poll_id": poll.id,
                "title": poll.str_title,
                "description": poll.str_description,
                "status": poll.str_status,
                "poll_type": poll.str_poll_type,
                "options": options_with_votes
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener votos: {str(e)}",
            details={"original_error": str(e)}
        )