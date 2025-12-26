from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DashboardStatsResponse(BaseModel):
    """Schema para las estadísticas del dashboard de SuperAdmin"""
    total_residential_units: int
    total_residents: int
    active_meetings: int
    average_attendance: float

    class Config:
        from_attributes = True


class RecentMeetingSchema(BaseModel):
    """Schema para reuniones recientes"""
    id: int
    title: str
    residential_unit_name: str
    status: str
    completed_at: Optional[datetime] = None
    total_participants: int
    attendance_percentage: float

    class Config:
        from_attributes = True


class UpcomingMeetingSchema(BaseModel):
    """Schema para próximas reuniones"""
    id: int
    title: str
    residential_unit_name: str
    scheduled_date: datetime
    meeting_type: str
    total_invited: int

    class Config:
        from_attributes = True


class DashboardDataResponse(BaseModel):
    """Schema completo para los datos del dashboard"""
    stats: DashboardStatsResponse
    recent_meetings: list[RecentMeetingSchema]
    upcoming_meetings: list[UpcomingMeetingSchema]

    class Config:
        from_attributes = True
