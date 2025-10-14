from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MeetingInvitationBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_meeting_id: int = Field(..., description="ID de la reunión")
    int_user_id: int = Field(..., description="ID del usuario")
    dec_voting_weight: float = Field(..., description="Peso de votación")
    str_apartment_number: str = Field(..., description="Número de apartamento")
    str_invitation_status: str = Field(..., description="Estado de la invitación")
    str_response_status: str = Field(..., description="Estado de la respuesta")
    dat_sent_at: datetime = Field(..., description="Fecha de envío")
    dat_responded_at: datetime = Field(..., description="Fecha de respuesta")
    dat_reminder_sent_at: datetime = Field(..., description="Fecha de envío del recordatorio")
    int_delivery_attemps: int = Field(..., description="Cantidad de intentos de entrega")
    str_last_delivery_error: str = Field(..., description="Último error de entrega")
    bln_will_attend: bool = Field(..., description="Asistirá")
    int_delegated_id: int = Field(..., description="ID del delegado")
    bln_actually_attended: bool = Field(..., description="Asistió realmente")
    dat_joined_at: datetime = Field(..., description="Fecha de entrada")
    dat_left_at: datetime = Field(..., description="Fecha de salida")

class MeetingInvitationCreate(MeetingInvitationBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")

class MeetingInvitationUpdate(MeetingInvitationBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")