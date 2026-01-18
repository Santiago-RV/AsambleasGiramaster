from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ConnectedUserSchema(BaseModel):
    """Schema para usuarios conectados a una reunión"""
    user_id: int
    full_name: str
    email: str
    apartment_number: str
    voting_weight: Decimal
    is_present: bool
    joined_at: Optional[datetime] = None
    attendance_type: Optional[str] = None  # "Titular", "Delegado", etc.

    class Config:
        from_attributes = True


class PollSummarySchema(BaseModel):
    """Schema para resumen de encuestas de una reunión"""
    poll_id: int
    title: str
    description: Optional[str] = None
    poll_type: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    total_votes: int
    requires_quorum: bool
    minimum_quorum_percentage: Decimal

    class Config:
        from_attributes = True


class AdministratorInfoSchema(BaseModel):
    """Schema para información del administrador"""
    user_id: int
    full_name: str
    email: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class ActiveMeetingCardSchema(BaseModel):
    """Schema para tarjeta de reunión activa (vista de lista)"""
    meeting_id: int
    title: str
    residential_unit_name: str
    meeting_type: str
    status: str
    started_at: Optional[datetime] = None
    connected_users_count: int
    total_invited: int
    quorum_reached: bool
    active_polls_count: int

    class Config:
        from_attributes = True


class ActiveMeetingDetailsSchema(BaseModel):
    """Schema para detalles completos de una reunión activa"""
    meeting_id: int
    title: str
    description: Optional[str] = None
    residential_unit_id: int
    residential_unit_name: str
    residential_unit_nit: str
    meeting_type: str
    status: str
    scheduled_date: datetime
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    total_invited: int
    total_confirmed: int
    quorum_reached: bool
    zoom_join_url: Optional[str] = None
    zoom_meeting_id: Optional[int] = None

    # Administrador de la unidad
    administrator: Optional[AdministratorInfoSchema] = None

    # Usuarios conectados
    connected_users: List[ConnectedUserSchema] = []

    # Encuestas de la reunión
    polls: List[PollSummarySchema] = []

    class Config:
        from_attributes = True


class ActiveMeetingsListResponse(BaseModel):
    """Schema para lista de reuniones activas"""
    active_meetings: List[ActiveMeetingCardSchema]
    total_count: int

    class Config:
        from_attributes = True
