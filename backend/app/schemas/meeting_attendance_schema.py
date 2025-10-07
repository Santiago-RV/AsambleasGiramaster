from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MeetingAttendanceBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_meeting_id: int = Field(..., description="ID de la reunión")
    int_user_id: int = Field(..., description="ID del usuario")
    str_attendance_type: str = Field(..., description="Tipo de asistencia")
    dec_voting_weight: float = Field(..., description="Peso de votación")
    dat_joined_at: datetime = Field(..., description="Fecha de entrada")
    dat_left_at: datetime = Field(..., description="Fecha de salida")
    int_total_duration_minutes: int = Field(..., description="Duración total en minutos")
    bln_is_present: bool = Field(..., description="Presente")
    bln_left_early: bool = Field(..., description="Salio temprano")
    int_rejoined_count: int = Field(..., description="Cantidad de veces que se unió de nuevo")

class MeetingAttendanceCreate(MeetingAttendanceBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")

class MeetingAttendanceUpdate(MeetingAttendanceBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")