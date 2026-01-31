from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime
from typing import List, Dict, Optional
from decimal import Decimal

from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.meeting_model import MeetingModel
from app.models.poll_model import PollModel
from app.models.poll_response_model import PollResponseModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.delegation_history_model import DelegationHistoryModel, DelegationStatusEnum
from app.core.exceptions import (
    UnauthorizedException,
    ValidationException,
    BusinessLogicException,
    NotFoundException,
    UserNotFoundException
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class VotingDelegationService:
    """
    Servicio para gestión de delegaciones de poder de votación.
    
    Funcionalidades principales:
    - Crear delegaciones (uno o varios delegadores → un delegado)
    - Revocar delegaciones
    - Obtener histórico completo de delegaciones
    - Generar reportes de delegaciones
    
    Importante: TODAS las operaciones quedan registradas en delegation_history
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== MÉTODOS PRIVADOS DE VALIDACIÓN ====================

    async def _verify_admin_permissions(self, meeting_id: int, admin_user_id: int) -> MeetingModel:
        """Verifica que el usuario sea admin y retorna la reunión"""
        result = await self.db.execute(
            select(MeetingModel).where(MeetingModel.id == meeting_id)
        )
        meeting = result.scalar_one_or_none()

        if not meeting:
            raise NotFoundException(
                message=f"Reunión con ID {meeting_id} no encontrada",
                error_code="MEETING_NOT_FOUND"
            )

        # TODO: Aquí puedes agregar validación de permisos de admin si es necesario
        return meeting

    async def _verify_no_active_polls(self, meeting_id: int):
        """Verifica que no haya encuestas activas en la reunión"""
        result = await self.db.execute(
            select(PollModel)
            .where(
                and_(
                    PollModel.int_meeting_id == meeting_id,
                    PollModel.str_status == "active"
                )
            )
            .limit(1)
        )
        active_poll = result.scalar_one_or_none()

        if active_poll:
            raise ValidationException(
                message="No se puede gestionar poderes mientras hay encuestas activas",
                error_code="ACTIVE_POLL_EXISTS"
            )

    async def _get_invitation(self, meeting_id: int, user_id: int) -> Optional[MeetingInvitationModel]:
        """Obtiene la invitación de un usuario a una reunión"""
        result = await self.db.execute(
            select(MeetingInvitationModel)
            .where(
                and_(
                    MeetingInvitationModel.int_meeting_id == meeting_id,
                    MeetingInvitationModel.int_user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_user_info(self, user_id: int) -> Dict:
        """Obtiene información básica de un usuario"""
        result = await self.db.execute(
            select(UserModel, DataUserModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .where(UserModel.id == user_id)
        )
        user, data_user = result.one()

        return {
            "int_user_id": user.id,
            "str_firstname": data_user.str_firstname,
            "str_lastname": data_user.str_lastname,   
            "str_email": data_user.str_email
        }

    async def _get_original_weight(self, user_id: int, residential_unit_id: int) -> float:
        """Obtiene el peso original (dec_default_voting_weight) de un usuario en una unidad residencial"""
        result = await self.db.execute(
            select(UserResidentialUnitModel.dec_default_voting_weight)
            .where(
                and_(
                    UserResidentialUnitModel.int_user_id == user_id,
                    UserResidentialUnitModel.int_residential_unit_id == residential_unit_id
                )
            )
        )
        weight = result.scalar_one_or_none()
        return float(weight) if weight else 1.0

    async def _check_user_has_voted(self, meeting_id: int, user_id: int) -> bool:
        """Verifica si un usuario ya votó en alguna encuesta de la reunión"""
        result = await self.db.execute(
            select(PollResponseModel)
            .join(PollModel, PollModel.id == PollResponseModel.int_poll_id)
            .where(
                and_(
                    PollModel.int_meeting_id == meeting_id,
                    PollResponseModel.int_user_id == user_id
                )
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    # ==================== MÉTODOS DE REGISTRO DE HISTÓRICO ====================

    async def _register_delegation_history(
        self,
        meeting_id: int,
        delegator_id: int,
        delegate_id: int,
        delegated_weight: Decimal,
        admin_user_id: int
    ):
        """
        Registra una delegación en el histórico.
        Se llama DESPUÉS del commit de MeetingInvitationModel.
        """
        logger.info(f"📝 Registrando en histórico: delegator={delegator_id} → delegate={delegate_id}, weight={delegated_weight}")

        history_record = DelegationHistoryModel(
            int_meeting_id=meeting_id,
            int_delegator_user_id=delegator_id,
            int_delegate_user_id=delegate_id,
            dec_delegated_weight=delegated_weight,
            str_status=DelegationStatusEnum.ACTIVE,
            dat_delegated_at=datetime.now(),
            dat_revoked_at=None,
            created_by=admin_user_id,
            updated_by=admin_user_id
        )

        self.db.add(history_record)
        await self.db.commit()
        logger.info(f"✅ Delegación registrada en histórico con ID: {history_record.id}")

    async def _revoke_delegation_history(
        self,
        meeting_id: int,
        delegator_id: int,
        admin_user_id: int
    ):
        """
        Marca como revocada la delegación activa de un delegador.
        Se llama DESPUÉS del commit de MeetingInvitationModel.
        """
        logger.info(f"📝 Actualizando histórico: revocando delegación de delegator={delegator_id}")

        # Buscar la delegación activa del delegador
        result = await self.db.execute(
            select(DelegationHistoryModel)
            .where(
                and_(
                    DelegationHistoryModel.int_meeting_id == meeting_id,
                    DelegationHistoryModel.int_delegator_user_id == delegator_id,
                    DelegationHistoryModel.str_status == DelegationStatusEnum.ACTIVE
                )
            )
        )
        active_delegation = result.scalar_one_or_none()

        if active_delegation:
            active_delegation.str_status = DelegationStatusEnum.REVOKED
            active_delegation.dat_revoked_at = datetime.now()
            active_delegation.updated_by = admin_user_id
            active_delegation.updated_at = datetime.now()

            await self.db.commit()
            logger.info(f"✅ Delegación marcada como revocada en histórico")
        else:
            logger.warning(f"⚠️ No se encontró delegación activa en histórico para delegator={delegator_id}")

    # ==================== MÉTODOS PÚBLICOS ====================

    async def create_delegation(
        self,
        meeting_id: int,
        delegator_ids: List[int],
        delegate_id: int,
        admin_user_id: int
    ) -> Dict:
        """
        Crea delegación(es) de poder para una reunión.
        Los delegadores ceden su peso de votación al delegado.
        
        IMPORTANTE: Registra CADA delegación en delegation_history.
        """
        logger.info(f"🤝 Creando delegación: delegadores={delegator_ids} → delegado={delegate_id}")

        # 1. Verificar permisos de admin
        meeting = await self._verify_admin_permissions(meeting_id, admin_user_id)

        # 2. Permitir delegaciones en cualquier momento
        logger.info(f"✅ Delegación permitida en reunión con estado: {meeting.str_status}")

        # 3. Verificar que NO haya encuestas activas (SOLO si la reunión está En vivo)
        if meeting.str_status == "En vivo":
            await self._verify_no_active_polls(meeting_id)
        else:
            logger.info(f"⏭️ Reunión no está en vivo, omitiendo validación de encuestas activas")

        # 4. Validar que todos los usuarios estén invitados
        logger.info(f"📋 Validando invitaciones...")
        all_user_ids = delegator_ids + [delegate_id]
        for user_id in all_user_ids:
            invitation = await self._get_invitation(meeting_id, user_id)
            if not invitation:
                user_info = await self._get_user_info(user_id)
                raise ValidationException(
                    message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} no está invitado a esta reunión",
                    error_code="USER_NOT_INVITED"
                )

        # 5. Validar que los delegadores no hayan delegado previamente
        logger.info(f"🔍 Validando que delegadores no hayan delegado antes...")
        for delegator_id in delegator_ids:
            invitation = await self._get_invitation(meeting_id, delegator_id)
            if invitation.int_delegated_id is not None:
                user_info = await self._get_user_info(delegator_id)
                raise ValidationException(
                    message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} ya delegó su poder",
                    error_code="ALREADY_DELEGATED"
                )

        # 6. Validar que los delegadores no hayan votado
        logger.info(f"🗳️ Validando que delegadores no hayan votado...")
        for delegator_id in delegator_ids:
            has_voted = await self._check_user_has_voted(meeting_id, delegator_id)
            if has_voted:
                user_info = await self._get_user_info(delegator_id)
                raise ValidationException(
                    message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} ya votó en esta reunión",
                    error_code="ALREADY_VOTED"
                )

        # 7. Validar que el delegado no haya delegado (no permitir cadenas)
        logger.info(f"🔗 Validando que delegado no haya delegado...")
        delegate_invitation = await self._get_invitation(meeting_id, delegate_id)
        if delegate_invitation.int_delegated_id is not None:
            delegate_info = await self._get_user_info(delegate_id)
            raise ValidationException(
                message=f"El delegado {delegate_info['str_firstname']} {delegate_info['str_lastname']} ya delegó su poder (no se permiten cadenas)",
                error_code="DELEGATE_ALREADY_DELEGATED"
            )

        # 8. Calcular peso total a ceder (usar dec_quorum_base de cada delegador)
        logger.info(f"⚖️ Calculando pesos...")
        total_weight_to_delegate = Decimal('0.0')
        delegator_weights = {}

        for delegator_id in delegator_ids:
            invitation = await self._get_invitation(meeting_id, delegator_id)
            weight = Decimal(str(invitation.dec_quorum_base))  # ✅ Usar dec_quorum_base
            delegator_weights[delegator_id] = weight
            total_weight_to_delegate += weight

        logger.info(f"   Peso total a ceder: {total_weight_to_delegate}")

        # 9. Actualizar MeetingInvitationModel
        logger.info(f"💾 Actualizando invitaciones...")

        # Actualizar delegadores: marcar como delegados y peso = 0
        for delegator_id in delegator_ids:
            invitation = await self._get_invitation(meeting_id, delegator_id)
            invitation.int_delegated_id = delegate_id
            invitation.dec_voting_weight = Decimal('0.0')  # Peso actual = 0
            invitation.updated_at = datetime.now()
            invitation.updated_by = admin_user_id

        # Actualizar delegado: sumar peso delegado
        delegate_invitation = await self._get_invitation(meeting_id, delegate_id)
        current_weight = Decimal(str(delegate_invitation.dec_voting_weight))
        new_weight = current_weight + total_weight_to_delegate
        delegate_invitation.dec_voting_weight = new_weight
        delegate_invitation.updated_at = datetime.now()
        delegate_invitation.updated_by = admin_user_id

        # 10. Commit transacción de invitaciones
        await self.db.commit()
        logger.info(f"✅ Invitaciones actualizadas")

        # 11. 🔥 REGISTRAR EN HISTÓRICO (cada delegación individual)
        for delegator_id in delegator_ids:
            await self._register_delegation_history(
                meeting_id=meeting_id,
                delegator_id=delegator_id,
                delegate_id=delegate_id,
                delegated_weight=delegator_weights[delegator_id],
                admin_user_id=admin_user_id
            )

        # 12. Obtener información de usuarios para la respuesta
        delegator_infos = []
        for delegator_id in delegator_ids:
            user_info = await self._get_user_info(delegator_id)
            user_info['delegated_weight'] = float(delegator_weights[delegator_id])
            delegator_infos.append(user_info)

        delegate_info = await self._get_user_info(delegate_id)
        delegate_info['new_weight'] = float(new_weight)
        delegate_info['original_weight'] = float(current_weight)

        return {
            "success": True,
            "message": f"Se delegaron {float(total_weight_to_delegate)} votos exitosamente",
            "delegators": delegator_infos,
            "delegate": delegate_info,
            "total_delegated_weight": float(total_weight_to_delegate),
            "delegation_date": datetime.now()
        }

    async def revoke_delegation(
        self,
        meeting_id: int,
        delegator_id: int,
        admin_user_id: int
    ) -> Dict:
        """
        Revoca una delegación de poder.
        Restaura el peso original (dec_quorum_base) del delegador y reduce el peso del delegado.
        
        IMPORTANTE: Actualiza el registro en delegation_history a estado 'revoked'.
        """
        logger.info(f"🔙 Revocando delegación de delegator_id={delegator_id}")

        # 1. Verificar permisos
        meeting = await self._verify_admin_permissions(meeting_id, admin_user_id)

        # 2. Verificar que no haya encuestas activas (solo si está en vivo)
        if meeting.str_status == "En vivo":
            await self._verify_no_active_polls(meeting_id)

        # 3. Obtener invitación del delegador
        delegator_invitation = await self._get_invitation(meeting_id, delegator_id)
        if not delegator_invitation:
            raise NotFoundException(
                message="Invitación del delegador no encontrada",
                error_code="INVITATION_NOT_FOUND"
            )

        # 4. Verificar que el delegador haya delegado
        delegate_id = delegator_invitation.int_delegated_id
        if delegate_id is None:
            user_info = await self._get_user_info(delegator_id)
            raise ValidationException(
                message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} no tiene una delegación activa",
                error_code="NO_ACTIVE_DELEGATION"
            )

        # 5. Obtener peso original del delegador (dec_quorum_base)
        original_weight = Decimal(str(delegator_invitation.dec_quorum_base))
        logger.info(f"   Peso original a restaurar: {original_weight}")

        # 6. Obtener invitación del delegado
        delegate_invitation = await self._get_invitation(meeting_id, delegate_id)
        if not delegate_invitation:
            raise NotFoundException(
                message="Invitación del delegado no encontrada",
                error_code="DELEGATE_INVITATION_NOT_FOUND"
            )

        # 7. Actualizar invitaciones
        # Restaurar peso del delegador
        delegator_invitation.int_delegated_id = None
        delegator_invitation.dec_voting_weight = original_weight  # ✅ Restaurar al quorum base
        delegator_invitation.updated_at = datetime.now()
        delegator_invitation.updated_by = admin_user_id

        # Reducir peso del delegado
        current_delegate_weight = Decimal(str(delegate_invitation.dec_voting_weight))
        new_delegate_weight = current_delegate_weight - original_weight
        delegate_invitation.dec_voting_weight = max(Decimal('0.0'), new_delegate_weight)
        delegate_invitation.updated_at = datetime.now()
        delegate_invitation.updated_by = admin_user_id

        # 8. Commit transacción
        await self.db.commit()
        logger.info(f"✅ Invitaciones actualizadas")

        # 9. 🔥 ACTUALIZAR HISTÓRICO
        await self._revoke_delegation_history(
            meeting_id=meeting_id,
            delegator_id=delegator_id,
            admin_user_id=admin_user_id
        )

        # 10. Información para respuesta
        delegator_info = await self._get_user_info(delegator_id)
        delegate_info = await self._get_user_info(delegate_id)

        return {
            "success": True,
            "message": "Delegación revocada exitosamente",
            "delegator": delegator_info,
            "delegate": delegate_info,
            "restored_weight": float(original_weight),
            "revocation_date": datetime.now()
        }

    async def get_meeting_delegations(self, meeting_id: int) -> List[Dict]:
        """
        Obtiene todas las delegaciones ACTIVAS de una reunión.
        Se basa en meeting_invitations, NO en el histórico.
        """
        logger.info(f"📋 Obteniendo delegaciones activas de meeting_id={meeting_id}")

        result = await self.db.execute(
            select(MeetingInvitationModel)
            .where(
                and_(
                    MeetingInvitationModel.int_meeting_id == meeting_id,
                    MeetingInvitationModel.int_delegated_id.isnot(None)
                )
            )
        )
        delegations = result.scalars().all()

        logger.info(f"   Encontradas {len(delegations)} delegaciones activas")

        delegation_list = []
        for delegation in delegations:
            delegator_info = await self._get_user_info(delegation.int_user_id)
            delegate_info = await self._get_user_info(delegation.int_delegated_id)

            # Usar dec_quorum_base directamente
            delegated_weight = float(delegation.dec_quorum_base)

            delegation_list.append({
                "delegator": delegator_info,
                "delegate": delegate_info,
                "delegated_weight": delegated_weight,
                "delegation_date": delegation.updated_at or delegation.created_at
            })

        return delegation_list

    async def get_delegation_history(self, meeting_id: int) -> List[Dict]:
        """
        Obtiene el HISTÓRICO COMPLETO de delegaciones de una reunión.
        Incluye delegaciones activas Y revocadas.
        """
        logger.info(f"📚 Obteniendo histórico completo de meeting_id={meeting_id}")

        result = await self.db.execute(
            select(DelegationHistoryModel)
            .where(DelegationHistoryModel.int_meeting_id == meeting_id)
            .order_by(DelegationHistoryModel.dat_delegated_at.desc())
        )
        history_records = result.scalars().all()

        logger.info(f"   Encontrados {len(history_records)} registros en el histórico")

        history_list = []
        for record in history_records:
            delegator_info = await self._get_user_info(record.int_delegator_user_id)
            delegate_info = await self._get_user_info(record.int_delegate_user_id)

            history_list.append({
                "id": record.id,
                "delegator": delegator_info,
                "delegate": delegate_info,
                "delegated_weight": float(record.dec_delegated_weight),
                "status": record.str_status.value,
                "delegated_at": record.dat_delegated_at,
                "revoked_at": record.dat_revoked_at
            })

        return history_list

    async def get_user_delegation_status(
        self,
        meeting_id: int,
        user_id: int
    ) -> Dict:
        """
        Obtiene el estado de delegación de un usuario específico.
        Para vista de copropietario.
        """
        logger.info(f"👤 Obteniendo estado de delegación de user_id={user_id} en meeting_id={meeting_id}")

        # Obtener invitación del usuario
        user_invitation = await self._get_invitation(meeting_id, user_id)
        if not user_invitation:
            raise UserNotFoundException(
                message="No estás invitado a esta reunión",
                error_code="USER_NOT_INVITED"
            )

        # Verificar si el usuario delegó su voto
        has_delegated = user_invitation.int_delegated_id is not None
        delegated_to = None

        if has_delegated:
            delegated_to = await self._get_user_info(user_invitation.int_delegated_id)

        # Obtener delegaciones recibidas
        result = await self.db.execute(
            select(MeetingInvitationModel)
            .where(
                and_(
                    MeetingInvitationModel.int_meeting_id == meeting_id,
                    MeetingInvitationModel.int_delegated_id == user_id
                )
            )
        )
        received_delegations_models = result.scalars().all()

        received_delegations = []
        for delegation in received_delegations_models:
            delegator_info = await self._get_user_info(delegation.int_user_id)

            # Usar dec_quorum_base
            delegated_weight = float(delegation.dec_quorum_base)

            received_delegations.append({
                "delegator": delegator_info,
                "delegate": await self._get_user_info(user_id),
                "delegated_weight": delegated_weight,
                "delegation_date": delegation.updated_at or delegation.created_at
            })

        # Peso total actual
        total_weight = float(user_invitation.dec_voting_weight)

        # Peso original
        original_weight = float(user_invitation.dec_quorum_base)

        return {
            "has_delegated": has_delegated,
            "delegated_to": delegated_to,
            "received_delegations": received_delegations,
            "total_weight": total_weight,
            "original_weight": original_weight
        }