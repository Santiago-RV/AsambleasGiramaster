from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
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
        """Verifica que el usuario sea administrador de la reunión y que la reunión esté en horario válido"""
        from app.models.meeting_model import MeetingModel
        from app.core.logging_config import get_logger

        logger = get_logger(__name__)

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

        # ============================================
        # VALIDACIONES TEMPORALES DESHABILITADAS PARA PRUEBAS
        # ============================================
        # Todas las validaciones de tiempo están comentadas para permitir
        # crear encuestas en cualquier momento para propósitos de testing

        logger.info(f"📅 Verificando acceso a reunión ID {meeting_id}")
        logger.info(f"   ⚠️ MODO PRUEBAS: Validaciones temporales deshabilitadas")
        logger.info(f"  Acceso permitido para crear encuestas (sin validaciones)")

        # COMENTADO: Verificación de reunión finalizada
        # now = datetime.now()
        # ONE_HOUR = timedelta(hours=1)
        # logger.info(f"   Hora actual: {now}")
        # logger.info(f"   Hora programada: {meeting.dat_schedule_date}")
        # logger.info(f"   Finalizó: {meeting.dat_actual_end_time}")

        # if meeting.dat_actual_end_time:
        #     raise BusinessLogicException(
        #         message="No se pueden crear encuestas para reuniones finalizadas",
        #         error_code="MEETING_ENDED"
        #     )

        # COMENTADO: Verificación de ventana de 1 hora antes
        # schedule_date_naive = meeting.dat_schedule_date
        # if hasattr(schedule_date_naive, 'tzinfo') and schedule_date_naive.tzinfo is not None:
        #     schedule_date_naive = schedule_date_naive.replace(tzinfo=None)

        # time_difference = schedule_date_naive - now
        # logger.info(f"   Diferencia de tiempo: {time_difference}")
        # logger.info(f"   Diferencia en horas: {time_difference.total_seconds() / 3600:.2f}")

        # if time_difference > ONE_HOUR:
        #     hours_until = time_difference.total_seconds() / 3600
        #     raise BusinessLogicException(
        #         message=f"Solo puedes crear encuestas desde 1 hora antes del inicio programado. Faltan {hours_until:.1f} horas.",
        #         error_code="MEETING_NOT_ACCESSIBLE_YET"
        #     )

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
    
    async def user_has_voted(self, poll_id: int, user_id: int) -> bool:
        """
        Verifica si un usuario ya votó en una encuesta (método público)
        
        Args:
            poll_id: ID de la encuesta
            user_id: ID del usuario
            
        Returns:
            bool: True si ya votó, False si no
        """
        return await self._user_has_voted(poll_id, user_id)

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
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.meeting_model import MeetingModel
        from app.models.user_model import UserModel
        from app.models.residential_unit_model import ResidentialUnitModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.core.logging_config import get_logger

        logger = get_logger(__name__)

        meeting_result = await self.db.execute(
            select(MeetingModel.int_organizer_id, MeetingModel.int_id_residential_unit, MeetingModel.created_by)
            .where(MeetingModel.id == meeting_id)
        )
        meeting_info = meeting_result.one_or_none()
        if not meeting_info:
            raise ValidationException(message="La reunión no existe", error_code="MEETING_NOT_FOUND")

        organizer_id, residential_unit_id, meeting_creator_id = meeting_info
        logger.info(f"🗳️ Peso de votación para user_id={user_id} en meeting_id={meeting_id}")

        # Organizador o creador de la reunión → peso administrativo
        if organizer_id == user_id or meeting_creator_id == user_id:
            logger.info(f"   Usuario es organizador/creador, peso=1.0")
            return 1.0

        # Administrador que creó la unidad residencial → peso administrativo
        user_role_result = await self.db.execute(
            select(UserModel.int_id_rol).where(UserModel.id == user_id)
        )
        user_role_id = user_role_result.scalar_one_or_none()
        if user_role_id == 2:
            ru_creator_result = await self.db.execute(
                select(ResidentialUnitModel.created_by)
                .where(ResidentialUnitModel.id == residential_unit_id)
            )
            if ru_creator_result.scalar_one_or_none() == user_id:
                logger.info(f"   Usuario es administrador de la unidad, peso=1.0")
                return 1.0

        # PRIORIDAD 1: Invitación a la reunión
        invitation_result = await self.db.execute(
            select(
                MeetingInvitationModel.dec_voting_weight,
                MeetingInvitationModel.dec_quorum_base,
                MeetingInvitationModel.int_delegated_id
            )
            .where(and_(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.int_user_id == user_id
            ))
            .execution_options(populate_existing=True)
        )
        invitation_data = invitation_result.one_or_none()
        logger.info(f"   Invitación encontrada: {invitation_data}")

        if invitation_data is not None:
            invitation_weight, quorum_base, delegated_id = invitation_data

            # Si delegó su poder → bloquear voto
            if delegated_id is not None:
                logger.warning(f"   🚫 user_id={user_id} delegó a user_id={delegated_id}, voto bloqueado")
                raise BusinessLogicException(
                    message="Has delegado tu poder de votación. No puedes votar directamente.",
                    error_code="VOTE_DELEGATED"
                )

            current_weight = float(invitation_weight)
            base_weight = float(quorum_base)

            # 🔥 REGLA DEFINITIVA:
            # - Si tiene delegaciones recibidas: dec_voting_weight > dec_quorum_base → usar dec_voting_weight
            # - Si es peso normal sin delegaciones: dec_voting_weight == dec_quorum_base → cualquiera
            # - Si dec_voting_weight = 0 sin delegación activa: dato corrupto → usar dec_quorum_base
            if current_weight > 0:
                weight = current_weight
                logger.info(f"   ✅ Peso desde dec_voting_weight: {weight}")
            else:
                weight = base_weight
                logger.warning(
                    f"   ⚠️ dec_voting_weight=0 sin delegación activa. "
                    f"Usando dec_quorum_base={base_weight} para user_id={user_id}"
                )

            return weight

        # PRIORIDAD 2: Peso por defecto en unidad residencial
        user_unit_result = await self.db.execute(
            select(UserResidentialUnitModel.dec_default_voting_weight)
            .where(and_(
                UserResidentialUnitModel.int_user_id == user_id,
                UserResidentialUnitModel.int_residential_unit_id == residential_unit_id
            ))
        )
        default_weight = user_unit_result.scalar_one_or_none()
        if default_weight is not None:
            weight = float(default_weight)
            logger.info(f"   Peso desde unidad residencial: {weight}")
            return weight

        logger.error(f"   ❌ Sin peso válido para user_id={user_id} en meeting_id={meeting_id}")
        raise BusinessLogicException(
            message="No tienes una invitación válida para votar en esta reunión.",
            error_code="NO_VOTING_WEIGHT"
        )

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

        # Calcular peso total votado (suma de dec_voting_weight de todas las respuestas)
        total_weight_result = await self.db.execute(
            select(func.sum(PollResponseModel.dec_voting_weight))
            .where(and_(
                PollResponseModel.int_poll_id == poll_id,
                PollResponseModel.bln_is_abstention == False
            ))
        )
        total_weight_voted = float(total_weight_result.scalar() or 0)

        # Calcular participación real (total de invitados a la reunión)
        from app.models.meeting_invitation_model import MeetingInvitationModel

        # Contar total de participantes invitados (excluye ADMIN)
        total_participants_result = await self.db.execute(
            select(func.count(MeetingInvitationModel.id))
            .where(
                and_(
                    MeetingInvitationModel.int_meeting_id == poll.int_meeting_id,
                    MeetingInvitationModel.str_apartment_number != 'ADMIN'
                )
            )
        )
        total_participants = total_participants_result.scalar()

        # Calcular peso total de participantes invitados (excluye ADMIN)
        total_weight_invited_result = await self.db.execute(
            select(func.sum(MeetingInvitationModel.dec_voting_weight))
            .where(
                and_(
                    MeetingInvitationModel.int_meeting_id == poll.int_meeting_id,
                    MeetingInvitationModel.str_apartment_number != 'ADMIN'
                )
            )
        )
        total_weight_invited = float(total_weight_invited_result.scalar() or 0)

        # Calcular porcentaje de participación por peso
        weight_participation_percentage = (total_weight_voted / total_weight_invited * 100) if total_weight_invited > 0 else 0

        # Calcular porcentaje de participación por personas
        participation_percentage = (total_responses / total_participants * 100) if total_participants > 0 else 0

        # Verificar quorum (basado en peso de votación)
        quorum_reached = weight_participation_percentage >= float(poll.dec_minimum_quorum_percentage)

        return {
            "poll": poll,
            "total_responses": total_responses,
            "total_votes": total_votes,
            "total_abstentions": total_abstentions,
            "total_weight_voted": total_weight_voted,
            "total_weight_invited": total_weight_invited,
            "weight_participation_percentage": weight_participation_percentage,
            "quorum_reached": quorum_reached,
            "participation_percentage": participation_percentage
        }