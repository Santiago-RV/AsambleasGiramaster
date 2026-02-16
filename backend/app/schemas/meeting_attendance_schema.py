from pydantic import BaseModel, Field
from typing import Optional, Dict
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


# ============================================
# SCHEMAS PARA REGISTRO DE ASISTENCIA VIA QR
# ============================================

class QRAttendanceRequest(BaseModel):
    """Request para registrar asistencia escaneando el QR de un copropietario"""
    qr_token: str = Field(
        ..., 
        description="Token JWT extraído del código QR del copropietario (parte final de la URL de auto-login)"
    )

class QRAttendanceResponse(BaseModel):
    """Response del registro de asistencia via QR"""
    success: bool = Field(..., description="Si el registro fue exitoso")
    already_registered: bool = Field(default=False, description="Si el usuario ya estaba registrado")
    message: str = Field(..., description="Mensaje descriptivo del resultado")
    user_info: Optional[Dict] = Field(default=None, description="Información del copropietario registrado")
    meeting_info: Optional[Dict] = Field(default=None, description="Información de la reunión")