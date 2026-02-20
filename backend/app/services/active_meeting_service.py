from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from datetime import datetime

from app.models.meeting_model import MeetingModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.meeting_attendance_model import MeetingAttendanceModel
from app.models.poll_model import PollModel
from app.models.poll_response_model import PollResponseModel

from app.schemas.active_meeting_schema import (
    ActiveMeetingCardSchema,
    ActiveMeetingDetailsSchema,
    ActiveMeetingsListResponse,
    ConnectedUserSchema,
    PollSummarySchema,
    AdministratorInfoSchema
)


class ActiveMeetingService:
    """Servicio para gestionar reuniones activas"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_meetings_list(self) -> ActiveMeetingsListResponse:
        """
        Obtiene la lista de todas las reuniones activas (En Curso).

        Returns:
            ActiveMeetingsListResponse con lista de reuniones activas
        """
        query = (
            select(
                MeetingModel.id,
                MeetingModel.str_title,
                ResidentialUnitModel.str_name.label("residential_unit_name"),
                MeetingModel.str_meeting_type,
                MeetingModel.str_status,
                MeetingModel.dat_actual_start_time,
                MeetingModel.int_total_invitated,
                MeetingModel.bln_quorum_reached
            )
            .join(
                ResidentialUnitModel,
                MeetingModel.int_id_residential_unit == ResidentialUnitModel.id
            )
            .where(MeetingModel.str_status == "En Curso")
            .order_by(MeetingModel.dat_actual_start_time.desc())
        )

        result = await self.db.execute(query)
        meetings = result.all()

        active_meetings = []
        for meeting in meetings:
            # Contar usuarios conectados
            connected_count = await self._count_connected_users(meeting.id)

            # Contar encuestas activas
            active_polls_count = await self._count_active_polls(meeting.id)

            active_meetings.append(ActiveMeetingCardSchema(
                meeting_id=meeting.id,
                title=meeting.str_title,
                residential_unit_name=meeting.residential_unit_name,
                meeting_type=meeting.str_meeting_type,
                status=meeting.str_status,
                started_at=meeting.dat_actual_start_time,
                connected_users_count=connected_count,
                total_invited=meeting.int_total_invitated or 0,
                quorum_reached=meeting.bln_quorum_reached or False,
                active_polls_count=active_polls_count
            ))

        return ActiveMeetingsListResponse(
            active_meetings=active_meetings,
            total_count=len(active_meetings)
        )

    async def get_meeting_details(self, meeting_id: int) -> Optional[ActiveMeetingDetailsSchema]:
        """
        Obtiene los detalles completos de una reunión activa.

        Args:
            meeting_id: ID de la reunión

        Returns:
            ActiveMeetingDetailsSchema con todos los detalles o None si no existe
        """
        # Obtener información básica de la reunión
        query = (
            select(
                MeetingModel,
                ResidentialUnitModel.str_name.label("residential_unit_name"),
                ResidentialUnitModel.str_nit.label("residential_unit_nit")
            )
            .join(
                ResidentialUnitModel,
                MeetingModel.int_id_residential_unit == ResidentialUnitModel.id
            )
            .where(MeetingModel.id == meeting_id)
        )

        result = await self.db.execute(query)
        meeting_data = result.first()

        if not meeting_data:
            return None

        meeting = meeting_data[0]
        residential_unit_name = meeting_data[1]
        residential_unit_nit = meeting_data[2]

        # Obtener administrador de la unidad
        administrator = await self._get_unit_administrator(meeting.int_id_residential_unit)

        # Obtener usuarios conectados
        connected_users = await self._get_connected_users(meeting_id)

        # Obtener encuestas de la reunión
        polls = await self._get_meeting_polls(meeting_id)

        return ActiveMeetingDetailsSchema(
            meeting_id=meeting.id,
            title=meeting.str_title,
            description=meeting.str_description,
            residential_unit_id=meeting.int_id_residential_unit,
            residential_unit_name=residential_unit_name,
            residential_unit_nit=residential_unit_nit,
            meeting_type=meeting.str_meeting_type,
            status=meeting.str_status,
            scheduled_date=meeting.dat_schedule_date,
            actual_start_time=meeting.dat_actual_start_time,
            actual_end_time=meeting.dat_actual_end_time,
            total_invited=meeting.int_total_invitated or 0,
            total_confirmed=meeting.int_total_confirmed or 0,
            quorum_reached=meeting.bln_quorum_reached or False,
            zoom_join_url=meeting.str_zoom_join_url,
            zoom_meeting_id=meeting.int_zoom_meeting_id,
            administrator=administrator,
            connected_users=connected_users,
            polls=polls
        )

    async def _count_connected_users(self, meeting_id: int) -> int:
        """Cuenta usuarios actualmente conectados a la reunión"""
        query = select(func.count(MeetingInvitationModel.id)).where(
            and_(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.bln_actually_attended == True,
                MeetingInvitationModel.dat_left_at == None  # Aún no se han ido
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _count_active_polls(self, meeting_id: int) -> int:
        """Cuenta encuestas activas de la reunión"""
        query = select(func.count(PollModel.id)).where(
            and_(
                PollModel.int_meeting_id == meeting_id,
                or_(
                    PollModel.str_status == "Abierta",
                    PollModel.str_status == "En Curso"
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_unit_administrator(self, unit_id: int) -> Optional[AdministratorInfoSchema]:
        """Obtiene información del administrador de la unidad"""
        query = (
            select(
                UserModel.id,
                DataUserModel.str_firstname,
                DataUserModel.str_lastname,
                DataUserModel.str_email,
                DataUserModel.str_phone
            )
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(
                UserResidentialUnitModel,
                UserModel.id == UserResidentialUnitModel.int_user_id
            )
            .where(
                and_(
                    UserResidentialUnitModel.int_residential_unit_id == unit_id,
                    UserResidentialUnitModel.bool_is_admin == True,
                    UserModel.bln_allow_entry == True
                )
            )
        )

        result = await self.db.execute(query)
        admin = result.first()

        if not admin:
            return None

        return AdministratorInfoSchema(
            user_id=admin.id,
            full_name=f"{admin.str_firstname} {admin.str_lastname}",
            email=admin.str_email,
            phone=admin.str_phone
        )

    async def _get_connected_users(self, meeting_id: int) -> List[ConnectedUserSchema]:
        """Obtiene lista de usuarios conectados a la reunión"""
        query = (
            select(
                UserModel.id,
                DataUserModel.str_firstname,
                DataUserModel.str_lastname,
                DataUserModel.str_email,
                MeetingInvitationModel.str_apartment_number,
                MeetingInvitationModel.dec_voting_weight,
                MeetingInvitationModel.bln_actually_attended,
                MeetingInvitationModel.dat_joined_at,
                MeetingAttendanceModel.str_attendance_type,
                MeetingAttendanceModel.bln_is_present
            )
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(
                MeetingInvitationModel,
                UserModel.id == MeetingInvitationModel.int_user_id
            )
            .outerjoin(
                MeetingAttendanceModel,
                and_(
                    MeetingAttendanceModel.int_meeting_id == meeting_id,
                    MeetingAttendanceModel.int_user_id == UserModel.id
                )
            )
            .where(
                and_(
                    MeetingInvitationModel.int_meeting_id == meeting_id,
                    MeetingInvitationModel.bln_actually_attended == True
                )
            )
            .order_by(DataUserModel.str_firstname.asc())
        )

        result = await self.db.execute(query)
        users = result.all()

        connected_users = []
        for user in users:
            connected_users.append(ConnectedUserSchema(
                user_id=user.id,
                full_name=f"{user.str_firstname} {user.str_lastname}",
                email=user.str_email,
                apartment_number=user.str_apartment_number,
                voting_weight=user.dec_voting_weight,
                is_present=user.bln_is_present if user.bln_is_present is not None else True,
                joined_at=user.dat_joined_at,
                attendance_type=user.str_attendance_type or "Titular"
            ))

        return connected_users

    async def _get_meeting_polls(self, meeting_id: int) -> List[PollSummarySchema]:
        """Obtiene encuestas de la reunión"""
        query = (
            select(PollModel)
            .where(PollModel.int_meeting_id == meeting_id)
            .order_by(PollModel.created_at.desc())
        )

        result = await self.db.execute(query)
        polls = result.scalars().all()

        poll_summaries = []
        for poll in polls:
            # Contar votos de esta encuesta
            votes_query = select(func.count(PollResponseModel.id)).where(
                PollResponseModel.int_poll_id == poll.id
            )
            votes_result = await self.db.execute(votes_query)
            total_votes = votes_result.scalar() or 0

            poll_summaries.append(PollSummarySchema(
                poll_id=poll.id,
                title=poll.str_title,
                description=poll.str_description,
                poll_type=poll.str_poll_type,
                status=poll.str_status,
                started_at=poll.dat_started_at,
                ended_at=poll.dat_ended_at,
                total_votes=total_votes,
                requires_quorum=poll.bln_requires_quorum or False,
                minimum_quorum_percentage=poll.dec_minimum_quorum_percentage or 0
            ))

        return poll_summaries
