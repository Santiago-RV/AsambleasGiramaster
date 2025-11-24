from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import string

from app.models.poll_model import PollModel
from app.models.poll_response_model import PollResponseModel
from app.models.poll_option_model import PollOptionModel
from app.schemas.poll_schema import PollCreate, PollUpdate
from app.schemas.pool_response_schema import PollResponseCreate
from app.core.exceptions import (
    UserNotFoundException,
    ValidationException,
    BusinessLogicException,
    UnauthorizedException
)

class PollService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_poll_code(self) -> str:
        """Genera un código único para la encuesta"""
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

    async def _verify_admin_permissions(self, meeting_id: int, user_id: int):
        """Verifica que el usuario sea administrador de la reunión"""
        from app.models.meeting_model import MeetingModel

        result = await self.db.execute(
            select(MeetingModel)
            .where(MeetingModel.id == meeting_id)
        )
        meeting = result.scalar_one_or_none()

        if not meeting:
            raise UserNotFoundException(
                message="La reunión no existe",
                error_code="MEETING_NOT_FOUND"
            )

        # Verificar que el usuario sea el organizador o el líder de la reunión
        if meeting.int_organizer_id != user_id and meeting.int_meeting_leader_id != user_id:
            raise UnauthorizedException(
                message="No tienes permisos para administrar encuestas de esta reunión",
                error_code="INSUFFICIENT_PERMISSIONS"
            )

    async def create_poll(self, poll_data: PollCreate, user_id: int) -> PollModel:
        """Crea una nueva encuesta con sus opciones"""
        # Verificar permisos de administrador
        await self._verify_admin_permissions(poll_data.int_meeting_id, user_id)

        # Generar código único
        poll_code = self._generate_poll_code()
        while await self._poll_code_exists(poll_code):
            poll_code = self._generate_poll_code()

        # Crear encuesta
        db_poll = PollModel(
            int_meeting_id=poll_data.int_meeting_id,
            str_poll_code=poll_code,
            str_title=poll_data.str_title,
            str_description=poll_data.str_description,
            str_poll_type=poll_data.str_poll_type,
            bln_is_anonymous=poll_data.bln_is_anonymous,
            bln_requires_quorum=poll_data.bln_requires_quorum,
            dec_minimum_quorum_percentage=poll_data.dec_minimum_quorum_percentage,
            bln_allows_abstention=poll_data.bln_allows_abstention,
            int_max_selections=poll_data.int_max_selections,
            int_duration_minutes=poll_data.int_duration_minutes,
            dat_started_at=None,
            dat_ended_at=None,
            str_status='draft',
            created_by=user_id,
            updated_by=user_id
        )
        
        self.db.add(db_poll)
        await self.db.flush()

        # Crear opciones
        for idx, option_data in enumerate(poll_data.options):
            db_option = PollOptionModel(
                int_poll_id=db_poll.id,
                str_option_text=option_data.str_option_text,
                int_option_order=option_data.int_option_order if hasattr(option_data, 'int_option_order') else idx,
                bln_is_active=True,
                int_votes_count=0,
                dec_weight_total=0.0,
                dec_percentage=0.0
            )
            self.db.add(db_option)

        await self.db.commit()
        await self.db.refresh(db_poll)
        
        # Cargar relaciones
        result = await self.db.execute(
            select(PollModel)
            .options(selectinload(PollModel.options))
            .where(PollModel.id == db_poll.id)
        )
        return result.scalar_one()

    async def _poll_code_exists(self, poll_code: str) -> bool:
        """Verifica si un código de encuesta ya existe"""
        result = await self.db.execute(
            select(PollModel).where(PollModel.str_poll_code == poll_code)
        )
        return result.scalar_one_or_none() is not None

    async def get_poll_by_id(self, poll_id: int) -> Optional[PollModel]:
        """Obtiene una encuesta por ID"""
        result = await self.db.execute(
            select(PollModel)
            .options(selectinload(PollModel.options), selectinload(PollModel.responses))
            .where(PollModel.id == poll_id)
        )
        return result.scalar_one_or_none()

    async def get_poll_by_code(self, poll_code: str) -> Optional[PollModel]:
        """Obtiene una encuesta por código"""
        result = await self.db.execute(
            select(PollModel)
            .options(selectinload(PollModel.options), selectinload(PollModel.responses))
            .where(PollModel.str_poll_code == poll_code)
        )
        return result.scalar_one_or_none()

    async def get_polls_by_meeting(self, meeting_id: int) -> List[PollModel]:
        """Obtiene todas las encuestas de una reunión"""
        result = await self.db.execute(
            select(PollModel)
            .options(selectinload(PollModel.options))
            .where(PollModel.int_meeting_id == meeting_id)
            .order_by(PollModel.created_at.desc())
        )
        return result.scalars().all()

    async def start_poll(self, poll_id: int, user_id: int, duration_minutes: Optional[int] = None) -> PollModel:
        """Inicia una encuesta"""
        poll = await self.get_poll_by_id(poll_id)
        if not poll:
            raise UserNotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )

        # Verificar permisos de administrador
        await self._verify_admin_permissions(poll.int_meeting_id, user_id)

        if poll.str_status != 'draft':
            raise BusinessLogicException(
                message=f"No se puede iniciar una encuesta en estado {poll.str_status}",
                error_code="INVALID_POLL_STATUS"
            )

        # Actualizar estado
        poll.str_status = 'active'
        poll.dat_started_at = datetime.now()
        
        # Calcular fecha de fin si hay duración
        duration = duration_minutes if duration_minutes else poll.int_duration_minutes
        if duration:
            poll.dat_ended_at = datetime.now() + timedelta(minutes=duration)
            poll.int_duration_minutes = duration

        poll.updated_by = user_id
        
        await self.db.commit()
        await self.db.refresh(poll)
        
        return poll

    async def end_poll(self, poll_id: int, user_id: int) -> PollModel:
        """Finaliza una encuesta"""
        poll = await self.get_poll_by_id(poll_id)
        if not poll:
            raise UserNotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )

        # Verificar permisos de administrador
        await self._verify_admin_permissions(poll.int_meeting_id, user_id)

        if poll.str_status != 'active':
            raise BusinessLogicException(
                message=f"No se puede finalizar una encuesta en estado {poll.str_status}",
                error_code="INVALID_POLL_STATUS"
            )

        # Actualizar estado
        poll.str_status = 'closed'
        poll.dat_ended_at = datetime.now()
        poll.updated_by = user_id
        
        # Calcular estadísticas finales
        await self._calculate_poll_statistics(poll_id)
        
        await self.db.commit()
        await self.db.refresh(poll)
        
        return poll

    async def submit_response(self, poll_id: int, user_id: Optional[int], response_data: PollResponseCreate,
                             ip_address: str, user_agent: str) -> PollResponseModel:
        """Registra una respuesta a la encuesta"""
        poll = await self.get_poll_by_id(poll_id)
        if not poll:
            raise UserNotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )

        if poll.str_status != 'active':
            raise BusinessLogicException(
                message="La encuesta no está activa",
                error_code="POLL_NOT_ACTIVE"
            )

        # Verificar si ya votó (solo si no es anónima y tenemos user_id)
        if not poll.bln_is_anonymous and user_id:
            existing = await self._user_has_voted(poll_id, user_id)
            if existing:
                raise BusinessLogicException(
                    message="Ya has votado en esta encuesta",
                    error_code="ALREADY_VOTED"
                )

        # Validar respuesta según tipo de encuesta
        await self._validate_response(poll, response_data)

        # Obtener peso de votación del usuario (si está autenticado, sino 1.0)
        if user_id:
            voting_weight = await self._get_user_voting_weight(user_id, poll.int_meeting_id)
        else:
            # Para votos anónimos sin autenticación, peso por defecto
            voting_weight = 1.0

        # Crear respuesta
        db_response = PollResponseModel(
            int_poll_id=poll_id,
            int_user_id=user_id,
            int_option_id=response_data.int_option_id,
            str_response_text=response_data.str_response_text,
            dec_response_number=response_data.dec_response_number,
            dec_voting_weight=voting_weight,
            bln_is_abstention=response_data.bln_is_abstention,
            dat_response_at=datetime.now(),
            str_ip_address=ip_address,
            str_user_agent=user_agent
        )

        self.db.add(db_response)
        await self.db.commit()
        await self.db.refresh(db_response)

        # Actualizar estadísticas de la opción
        if response_data.int_option_id and not response_data.bln_is_abstention:
            await self._update_option_stats(response_data.int_option_id, voting_weight)

        return db_response

    async def _user_has_voted(self, poll_id: int, user_id: int) -> bool:
        """Verifica si el usuario ya votó"""
        result = await self.db.execute(
            select(PollResponseModel)
            .where(and_(
                PollResponseModel.int_poll_id == poll_id,
                PollResponseModel.int_user_id == user_id
            ))
        )
        return result.scalar_one_or_none() is not None

    async def _validate_response(self, poll: PollModel, response_data: PollResponseCreate):
        """Valida la respuesta según el tipo de encuesta"""
        if response_data.bln_is_abstention:
            if not poll.bln_allows_abstention:
                raise ValidationException(
                    message="Esta encuesta no permite abstenciones",
                    error_code="ABSTENTION_NOT_ALLOWED"
                )
            return

        if poll.str_poll_type in ['single', 'multiple']:
            if not response_data.int_option_id:
                raise ValidationException(
                    message="Debe seleccionar una opción",
                    error_code="OPTION_REQUIRED"
                )
            # Verificar que la opción existe y está activa
            option = await self.db.get(PollOptionModel, response_data.int_option_id)
            if not option or option.int_poll_id != poll.id or not option.bln_is_active:
                raise ValidationException(
                    message="Opción inválida",
                    error_code="INVALID_OPTION"
                )

        elif poll.str_poll_type == 'text':
            if not response_data.str_response_text:
                raise ValidationException(
                    message="Debe proporcionar una respuesta de texto",
                    error_code="TEXT_REQUIRED"
                )

        elif poll.str_poll_type == 'numeric':
            if response_data.dec_response_number is None:
                raise ValidationException(
                    message="Debe proporcionar una respuesta numérica",
                    error_code="NUMBER_REQUIRED"
                )

    async def _get_user_voting_weight(self, user_id: int, meeting_id: int) -> float:
        """Obtiene el peso de votación del usuario en la reunión"""
        from app.models.meeting_invitation_model import MeetingInvitationModel

        result = await self.db.execute(
            select(MeetingInvitationModel.dec_voting_weight)
            .where(and_(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.int_user_id == user_id
            ))
        )
        voting_weight = result.scalar_one_or_none()

        if voting_weight is None:
            raise ValidationException(
                message="El usuario no está invitado a esta reunión",
                error_code="USER_NOT_INVITED"
            )

        return float(voting_weight)

    async def _update_option_stats(self, option_id: int, voting_weight: float):
        """Actualiza las estadísticas de una opción"""
        option = await self.db.get(PollOptionModel, option_id)
        if option:
            option.int_votes_count += 1
            option.dec_weight_total = float(option.dec_weight_total) + voting_weight
            await self.db.commit()

    async def _calculate_poll_statistics(self, poll_id: int):
        """Calcula las estadísticas finales de la encuesta"""
        poll = await self.get_poll_by_id(poll_id)
        if not poll:
            return

        # Calcular totales
        total_weight = sum(float(option.dec_weight_total) for option in poll.options)
        
        # Calcular porcentajes
        for option in poll.options:
            if total_weight > 0:
                option.dec_percentage = (float(option.dec_weight_total) / total_weight) * 100
            else:
                option.dec_percentage = 0.0

        await self.db.commit()

    async def get_poll_statistics(self, poll_id: int) -> dict:
        """Obtiene estadísticas detalladas de una encuesta"""
        poll = await self.get_poll_by_id(poll_id)
        if not poll:
            raise UserNotFoundException(
                message="La encuesta no existe",
                error_code="POLL_NOT_FOUND"
            )

        # Contar respuestas
        total_responses_result = await self.db.execute(
            select(func.count(PollResponseModel.id))
            .where(PollResponseModel.int_poll_id == poll_id)
        )
        total_responses = total_responses_result.scalar()

        # Contar votos (sin abstenciones)
        total_votes_result = await self.db.execute(
            select(func.count(PollResponseModel.id))
            .where(and_(
                PollResponseModel.int_poll_id == poll_id,
                PollResponseModel.bln_is_abstention == False
            ))
        )
        total_votes = total_votes_result.scalar()

        # Contar abstenciones
        total_abstentions = total_responses - total_votes

        # Calcular participación real (total de invitados a la reunión)
        from app.models.meeting_invitation_model import MeetingInvitationModel

        total_participants_result = await self.db.execute(
            select(func.count(MeetingInvitationModel.id))
            .where(MeetingInvitationModel.int_meeting_id == poll.int_meeting_id)
        )
        total_participants = total_participants_result.scalar()

        # Calcular porcentaje de participación
        participation_percentage = (total_responses / total_participants * 100) if total_participants > 0 else 0

        # Verificar quorum
        quorum_reached = participation_percentage >= float(poll.dec_minimum_quorum_percentage)

        return {
            "poll": poll,
            "total_responses": total_responses,
            "total_votes": total_votes,
            "total_abstentions": total_abstentions,
            "quorum_reached": quorum_reached,
            "participation_percentage": participation_percentage
        }