from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import Dict, List

from app.models.residential_unit_model import ResidentialUnitModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.user_model import UserModel
from app.models.meeting_model import MeetingModel
from app.schemas.dashboard_schema import (
    DashboardStatsResponse,
    RecentMeetingSchema,
    UpcomingMeetingSchema,
    DashboardDataResponse
)


class DashboardService:
    """Servicio para obtener estadísticas del dashboard de SuperAdmin"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_statistics(self) -> DashboardDataResponse:
        """
        Obtiene todas las estadísticas necesarias para el dashboard de SuperAdmin.

        Returns:
            DashboardDataResponse con estadísticas, reuniones recientes y próximas
        """
        # Obtener estadísticas generales
        stats = await self._get_general_stats()

        # Obtener reuniones recientes (últimas 5 completadas)
        recent_meetings = await self._get_recent_meetings(limit=5)

        # Obtener próximas reuniones (próximas 5 programadas)
        upcoming_meetings = await self._get_upcoming_meetings(limit=5)

        return DashboardDataResponse(
            stats=stats,
            recent_meetings=recent_meetings,
            upcoming_meetings=upcoming_meetings
        )

    async def _get_general_stats(self) -> DashboardStatsResponse:
        """Obtiene las estadísticas generales del sistema"""

        # Total de unidades residenciales activas
        total_units_query = select(func.count(ResidentialUnitModel.id)).where(
            ResidentialUnitModel.bln_is_active == True
        )
        total_units_result = await self.db.execute(total_units_query)
        total_units = total_units_result.scalar() or 0

        # Total de residentes (usuarios con rol 3 - Copropietario)
        total_residents_query = select(func.count(UserModel.id)).where(
            and_(
                UserModel.int_id_rol == 3,
                UserModel.bln_allow_entry == True
            )
        )
        total_residents_result = await self.db.execute(total_residents_query)
        total_residents = total_residents_result.scalar() or 0

        # Reuniones activas (En Curso o Programadas para hoy)
        now = datetime.now()
        today_start = datetime(now.year, now.month, now.day)
        today_end = today_start + timedelta(days=1)

        active_meetings_query = select(func.count(MeetingModel.id)).where(
            or_(
                MeetingModel.str_status == "En Curso",
                and_(
                    MeetingModel.str_status == "Programada",
                    MeetingModel.dat_schedule_date >= today_start,
                    MeetingModel.dat_schedule_date < today_end
                )
            )
        )
        active_meetings_result = await self.db.execute(active_meetings_query)
        active_meetings = active_meetings_result.scalar() or 0

        # Promedio de asistencia (últimas 10 reuniones completadas)
        attendance_avg = await self._calculate_average_attendance()

        return DashboardStatsResponse(
            total_residential_units=total_units,
            total_residents=total_residents,
            active_meetings=active_meetings,
            average_attendance=attendance_avg
        )

    async def _calculate_average_attendance(self) -> float:
        """
        Calcula el promedio de asistencia de las últimas reuniones completadas.

        Returns:
            Porcentaje promedio de asistencia (0-100)
        """
        # Obtener las últimas 10 reuniones completadas
        query = select(
            MeetingModel.int_total_invitated,
            MeetingModel.int_total_confirmed
        ).where(
            MeetingModel.str_status == "Completada"
        ).order_by(
            MeetingModel.dat_actual_end_time.desc()
        ).limit(10)

        result = await self.db.execute(query)
        meetings = result.all()

        if not meetings:
            return 0.0

        # Calcular promedio
        total_invited = 0
        total_confirmed = 0

        for meeting in meetings:
            total_invited += meeting.int_total_invitated or 0
            total_confirmed += meeting.int_total_confirmed or 0

        if total_invited == 0:
            return 0.0

        average_percentage = (total_confirmed / total_invited) * 100
        return round(average_percentage, 2)

    async def _get_recent_meetings(self, limit: int = 5) -> List[RecentMeetingSchema]:
        """
        Obtiene las reuniones completadas más recientes.

        Args:
            limit: Número máximo de reuniones a retornar

        Returns:
            Lista de RecentMeetingSchema
        """
        query = (
            select(
                MeetingModel.id,
                MeetingModel.str_title,
                ResidentialUnitModel.str_name.label("residential_unit_name"),
                MeetingModel.str_status,
                MeetingModel.dat_actual_end_time,
                MeetingModel.int_total_invitated,
                MeetingModel.int_total_confirmed
            )
            .join(
                ResidentialUnitModel,
                MeetingModel.int_id_residential_unit == ResidentialUnitModel.id
            )
            .where(MeetingModel.str_status == "Completada")
            .order_by(MeetingModel.dat_actual_end_time.desc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        meetings = result.all()

        recent_meetings = []
        for meeting in meetings:
            # Calcular porcentaje de asistencia
            attendance_percentage = 0.0
            if meeting.int_total_invitated and meeting.int_total_invitated > 0:
                attendance_percentage = round(
                    (meeting.int_total_confirmed / meeting.int_total_invitated) * 100,
                    2
                )

            recent_meetings.append(RecentMeetingSchema(
                id=meeting.id,
                title=meeting.str_title,
                residential_unit_name=meeting.residential_unit_name,
                status=meeting.str_status,
                completed_at=meeting.dat_actual_end_time,
                total_participants=meeting.int_total_confirmed or 0,
                attendance_percentage=attendance_percentage
            ))

        return recent_meetings

    async def _get_upcoming_meetings(self, limit: int = 5) -> List[UpcomingMeetingSchema]:
        """
        Obtiene las próximas reuniones programadas.

        Args:
            limit: Número máximo de reuniones a retornar

        Returns:
            Lista de UpcomingMeetingSchema
        """
        now = datetime.now()

        query = (
            select(
                MeetingModel.id,
                MeetingModel.str_title,
                ResidentialUnitModel.str_name.label("residential_unit_name"),
                MeetingModel.dat_schedule_date,
                MeetingModel.str_meeting_type,
                MeetingModel.int_total_invitated
            )
            .join(
                ResidentialUnitModel,
                MeetingModel.int_id_residential_unit == ResidentialUnitModel.id
            )
            .where(
                and_(
                    MeetingModel.str_status == "Programada",
                    MeetingModel.dat_schedule_date >= now
                )
            )
            .order_by(MeetingModel.dat_schedule_date.asc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        meetings = result.all()

        upcoming_meetings = []
        for meeting in meetings:
            upcoming_meetings.append(UpcomingMeetingSchema(
                id=meeting.id,
                title=meeting.str_title,
                residential_unit_name=meeting.residential_unit_name,
                scheduled_date=meeting.dat_schedule_date,
                meeting_type=meeting.str_meeting_type,
                total_invited=meeting.int_total_invitated or 0
            ))

        return upcoming_meetings
