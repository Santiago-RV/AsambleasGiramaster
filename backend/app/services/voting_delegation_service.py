from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Dict, Optional
from datetime import datetime
from decimal import Decimal

from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.meeting_model import MeetingModel
from app.models.user_model import UserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.poll_model import PollModel
from app.models.poll_response_model import PollResponseModel
from app.core.exceptions import (
    UserNotFoundException,
    ValidationException,
    BusinessLogicException,
    UnauthorizedException
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class VotingDelegationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _verify_admin_permissions(self, meeting_id: int, user_id: int) -> MeetingModel:
        """Verifica que el usuario sea administrador de la reunión"""
        logger.info(f"🔐 Verificando permisos de admin para user_id={user_id} en meeting_id={meeting_id}")

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
                message="No tienes permisos para administrar esta reunión",
                error_code="INSUFFICIENT_PERMISSIONS"
            )

        logger.info(f"✅ Permisos verificados correctamente")
        return meeting

    async def _verify_no_active_polls(self, meeting_id: int):
        """Verifica que no haya encuestas activas en la reunión"""
        logger.info(f"📊 Verificando encuestas activas en meeting_id={meeting_id}")

        result = await self.db.execute(
            select(PollModel)
            .where(
                and_(
                    PollModel.int_meeting_id == meeting_id,
                    PollModel.str_status == 'active'
                )
            )
        )
        active_poll = result.scalar_one_or_none()

        if active_poll:
            raise ValidationException(
                message="No se pueden gestionar poderes mientras hay encuestas activas. Finaliza las encuestas activas primero.",
                error_code="ACTIVE_POLLS_EXIST"
            )

        logger.info(f"✅ No hay encuestas activas")

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
            select(UserModel)
            .where(UserModel.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise UserNotFoundException(
                message=f"Usuario con ID {user_id} no encontrado",
                error_code="USER_NOT_FOUND"
            )

        # Obtener número de apartamento si existe
        apartment_result = await self.db.execute(
            select(UserResidentialUnitModel.str_apartment_number)
            .where(UserResidentialUnitModel.int_user_id == user_id)
            .limit(1)
        )
        apartment_number = apartment_result.scalar_one_or_none()

        return {
            "id": user.id,
            "str_firstname": user.str_firstname,
            "str_lastname": user.str_lastname,
            "str_email": user.str_email,
            "str_apartment_number": apartment_number
        }

    async def _get_original_weight(self, user_id: int, residential_unit_id: int) -> float:
        """Obtiene el peso original del usuario desde UserResidentialUnitModel"""
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
        """
        logger.info(f"🤝 Creando delegación: delegadores={delegator_ids} → delegado={delegate_id}")

        # 1. Verificar permisos de admin
        meeting = await self._verify_admin_permissions(meeting_id, admin_user_id)

        # 2. Verificar que la reunión esté activa
        if meeting.str_status != "En vivo":
            raise ValidationException(
                message="Solo se pueden gestionar poderes en reuniones activas (estado 'En vivo')",
                error_code="MEETING_NOT_ACTIVE"
            )

        # 3. Verificar que NO haya encuestas activas
        await self._verify_no_active_polls(meeting_id)

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

        # 5. Validar que delegadores no hayan delegado previamente
        logger.info(f"🔍 Validando delegaciones previas...")
        for delegator_id in delegator_ids:
            invitation = await self._get_invitation(meeting_id, delegator_id)
            if invitation.int_delegated_id is not None:
                user_info = await self._get_user_info(delegator_id)
                raise ValidationException(
                    message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} ya delegó su poder",
                    error_code="ALREADY_DELEGATED"
                )

        # 6. Validar que delegadores no hayan votado
        logger.info(f"🗳️ Validando votos previos...")
        for delegator_id in delegator_ids:
            if await self._check_user_has_voted(meeting_id, delegator_id):
                user_info = await self._get_user_info(delegator_id)
                raise ValidationException(
                    message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} ya votó en esta reunión",
                    error_code="USER_ALREADY_VOTED"
                )

        # 7. Validar que delegado no esté delegando (evitar cadenas A→B→C)
        logger.info(f"⛓️ Validando cadenas de delegación...")
        delegate_invitation = await self._get_invitation(meeting_id, delegate_id)
        if delegate_invitation.int_delegated_id is not None:
            user_info = await self._get_user_info(delegate_id)
            raise ValidationException(
                message=f"El receptor {user_info['str_firstname']} {user_info['str_lastname']} ya delegó su poder. No se permiten cadenas de delegación.",
                error_code="DELEGATE_ALREADY_DELEGATED"
            )

        # 8. Calcular peso total a ceder
        logger.info(f"⚖️ Calculando pesos...")
        total_weight_to_delegate = 0.0
        delegator_weights = {}

        for delegator_id in delegator_ids:
            invitation = await self._get_invitation(meeting_id, delegator_id)
            weight = float(invitation.dec_voting_weight)
            delegator_weights[delegator_id] = weight
            total_weight_to_delegate += weight

        logger.info(f"   Peso total a ceder: {total_weight_to_delegate}")

        # 9. Actualizar MeetingInvitationModel
        logger.info(f"💾 Actualizando invitaciones...")

        # Actualizar delegadores: marcar como delegados y peso = 0
        for delegator_id in delegator_ids:
            invitation = await self._get_invitation(meeting_id, delegator_id)
            invitation.int_delegated_id = delegate_id
            invitation.dec_voting_weight = 0
            invitation.updated_at = datetime.now()
            invitation.updated_by = admin_user_id

        # Actualizar delegado: sumar peso delegado
        delegate_invitation = await self._get_invitation(meeting_id, delegate_id)
        current_weight = float(delegate_invitation.dec_voting_weight)
        new_weight = current_weight + total_weight_to_delegate
        delegate_invitation.dec_voting_weight = new_weight
        delegate_invitation.updated_at = datetime.now()
        delegate_invitation.updated_by = admin_user_id

        # 10. Commit transacción
        await self.db.commit()

        logger.info(f"✅ Delegación creada exitosamente")

        # Obtener información de usuarios para la respuesta
        delegator_infos = []
        for delegator_id in delegator_ids:
            user_info = await self._get_user_info(delegator_id)
            user_info['delegated_weight'] = delegator_weights[delegator_id]
            delegator_infos.append(user_info)

        delegate_info = await self._get_user_info(delegate_id)
        delegate_info['new_weight'] = new_weight
        delegate_info['original_weight'] = current_weight

        return {
            "success": True,
            "message": f"Se delegaron {total_weight_to_delegate} votos exitosamente",
            "delegators": delegator_infos,
            "delegate": delegate_info,
            "total_delegated_weight": total_weight_to_delegate,
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
        Restaura el peso original del delegador y reduce el peso del delegado.
        """
        logger.info(f"🔙 Revocando delegación de delegator_id={delegator_id}")

        # 1. Verificar permisos
        meeting = await self._verify_admin_permissions(meeting_id, admin_user_id)

        # 2. Obtener invitación del delegador
        delegator_invitation = await self._get_invitation(meeting_id, delegator_id)
        if not delegator_invitation:
            raise UserNotFoundException(
                message="El usuario no está invitado a esta reunión",
                error_code="USER_NOT_INVITED"
            )

        # 3. Verificar que tenga delegación activa
        if delegator_invitation.int_delegated_id is None:
            user_info = await self._get_user_info(delegator_id)
            raise ValidationException(
                message=f"El usuario {user_info['str_firstname']} {user_info['str_lastname']} no tiene una delegación activa",
                error_code="NO_DELEGATION_TO_REVOKE"
            )

        # 4. Obtener peso original del delegador
        original_weight = await self._get_original_weight(
            delegator_id,
            meeting.int_id_residential_unit
        )

        # 5. Obtener delegado actual
        delegate_id = delegator_invitation.int_delegated_id
        delegate_invitation = await self._get_invitation(meeting_id, delegate_id)

        # 6. Restaurar delegador
        delegator_invitation.int_delegated_id = None
        delegator_invitation.dec_voting_weight = original_weight
        delegator_invitation.updated_at = datetime.now()
        delegator_invitation.updated_by = admin_user_id

        # 7. Reducir peso del delegado
        current_delegate_weight = float(delegate_invitation.dec_voting_weight)
        new_delegate_weight = current_delegate_weight - original_weight
        delegate_invitation.dec_voting_weight = max(0, new_delegate_weight)  # No permitir negativos
        delegate_invitation.updated_at = datetime.now()
        delegate_invitation.updated_by = admin_user_id

        # 8. Commit transacción
        await self.db.commit()

        logger.info(f"✅ Delegación revocada exitosamente")

        # Información para respuesta
        delegator_info = await self._get_user_info(delegator_id)
        delegate_info = await self._get_user_info(delegate_id)

        return {
            "success": True,
            "message": "Delegación revocada exitosamente",
            "delegator": delegator_info,
            "delegate": delegate_info,
            "restored_weight": original_weight,
            "revocation_date": datetime.now()
        }

    async def get_meeting_delegations(self, meeting_id: int) -> List[Dict]:
        """
        Obtiene todas las delegaciones activas de una reunión.
        """
        logger.info(f"📋 Obteniendo delegaciones de meeting_id={meeting_id}")

        # Obtener todas las invitaciones con delegación activa
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

        logger.info(f"   Encontradas {len(delegations)} delegaciones")

        # Construir respuesta con información de usuarios
        delegation_list = []
        for delegation in delegations:
            delegator_info = await self._get_user_info(delegation.int_user_id)
            delegate_info = await self._get_user_info(delegation.int_delegated_id)

            # Obtener peso original del delegador
            meeting_result = await self.db.execute(
                select(MeetingModel.int_id_residential_unit)
                .where(MeetingModel.id == meeting_id)
            )
            residential_unit_id = meeting_result.scalar_one()

            original_weight = await self._get_original_weight(
                delegation.int_user_id,
                residential_unit_id
            )

            delegation_list.append({
                "delegator": delegator_info,
                "delegate": delegate_info,
                "delegated_weight": original_weight,
                "delegation_date": delegation.updated_at or delegation.created_at
            })

        return delegation_list

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

        # Obtener delegaciones recibidas (otros que delegaron a este usuario)
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

            # Obtener peso original
            meeting_result = await self.db.execute(
                select(MeetingModel.int_id_residential_unit)
                .where(MeetingModel.id == meeting_id)
            )
            residential_unit_id = meeting_result.scalar_one()

            original_weight = await self._get_original_weight(
                delegation.int_user_id,
                residential_unit_id
            )

            received_delegations.append({
                "delegator": delegator_info,
                "delegate": await self._get_user_info(user_id),
                "delegated_weight": original_weight,
                "delegation_date": delegation.updated_at or delegation.created_at
            })

        # Peso total actual
        total_weight = float(user_invitation.dec_voting_weight)

        # Peso original (sin delegaciones)
        meeting_result = await self.db.execute(
            select(MeetingModel.int_id_residential_unit)
            .where(MeetingModel.id == meeting_id)
        )
        residential_unit_id = meeting_result.scalar_one()
        original_weight = await self._get_original_weight(user_id, residential_unit_id)

        return {
            "has_delegated": has_delegated,
            "delegated_to": delegated_to,
            "received_delegations": received_delegations,
            "total_weight": total_weight,
            "original_weight": original_weight
        }
