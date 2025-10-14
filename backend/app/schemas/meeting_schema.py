from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MeetingBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_id_residential_unit: int = Field(..., description="ID de la unidad residencial")
    str_meeting_code: str = Field(..., description="Código de la reunión")
    str_title: str = Field(..., description="Título de la reunión")
    str_description: str = Field(..., description="Descripción de la reunión")
    str_meeting_type: str = Field(..., description="Tipo de reunión")
    dat_schedule_date: datetime = Field(..., description="Fecha de la reunión")
    int_estimated_duration: int = Field(..., description="Duración estimada de la reunión")
    int_organizer_id: int = Field(..., description="ID del organizador")
    int_meeting_leader_id: int = Field(..., description="ID del líder de la reunión")
    int_zoom_meeting_id: int = Field(..., description="ID de la reunión en Zoom")
    str_zoom_join_url: str = Field(..., description="URL de unión a la reunión en Zoom")
    str_zoom_start_url: str = Field(..., description="URL de inicio de la reunión en Zoom")
    bln_allow_delegates: bool = Field(..., description="Permite delegados")
    str_status: str = Field(..., description="Estado de la reunión")
    bln_quorum_reached: bool = Field(..., description="Quorum alcanzado")
    int_total_invitated: int = Field(..., description="Total invitados")
    int_total_confirmed: int = Field(..., description="Total confirmados")
    dat_actual_start_time: datetime = Field(..., description="Fecha y hora de inicio real")
    dat_actual_end_time: datetime = Field(..., description="Fecha y hora de fin real")

class MeetingCreate(MeetingBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")
    created_by: int = Field(..., description="ID del usuario que creó la reunión")
    updated_by: int = Field(..., description="ID del usuario que actualizó la reunión")
    
class MeetingUpdate(MeetingBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")
    updated_by: int = Field(..., description="ID del usuario que actualizó la reunión")