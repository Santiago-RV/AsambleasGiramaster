from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any


class MeetingCreateRequest(BaseModel):
    """Schema para crear una reunión"""
    int_id_residential_unit: int = Field(..., description="ID de la unidad residencial")
    str_title: str = Field(..., min_length=5, max_length=200, description="Título de la reunión")
    str_description: Optional[str] = Field(None, max_length=1000, description="Descripción de la reunión")
    str_meeting_type: str = Field(..., description="Tipo de reunión (Ordinaria, Extraordinaria, etc.)")
    dat_schedule_date: datetime = Field(..., description="Fecha y hora programada")
    int_estimated_duration: int = Field(..., ge=15, le=480, description="Duración estimada en minutos")
    bln_allow_delegates: bool = Field(default=False, description="Permite delegados")


class ResidentialUnitBasic(BaseModel):
    """Schema básico para unidad residencial en las respuestas de reuniones"""
    id: int
    str_name: str
    str_city: Optional[str] = None
    str_address: Optional[str] = None
    
    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    """Schema de respuesta para una reunión"""
    id: int
    int_id_residential_unit: int
    str_meeting_code: str
    str_title: str
    str_description: str
    str_meeting_type: str
    dat_schedule_date: datetime
    int_estimated_duration: int
    int_organizer_id: int
    int_meeting_leader_id: int
    int_zoom_meeting_id: int
    str_zoom_join_url: str
    str_zoom_start_url: str
    str_zoom_password: Optional[str]
    bln_allow_delegates: bool
    str_status: str
    bln_quorum_reached: bool
    int_total_invitated: int
    int_total_confirmed: int
    dat_actual_start_time: Optional[datetime]
    dat_actual_end_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: int
    updated_by: int
    residential_unit: Optional[ResidentialUnitBasic] = None
    
    class Config:
        from_attributes = True


class MeetingUpdateRequest(BaseModel):
    """Schema para actualizar una reunión"""
    str_title: Optional[str] = Field(None, min_length=5, max_length=200, description="Título de la reunión")
    str_description: Optional[str] = Field(None, max_length=1000, description="Descripción de la reunión")
    str_meeting_type: Optional[str] = Field(None, description="Tipo de reunión")
    dat_schedule_date: Optional[datetime] = Field(None, description="Fecha y hora programada")
    int_estimated_duration: Optional[int] = Field(None, ge=15, le=480, description="Duración estimada en minutos")
    bln_allow_delegates: Optional[bool] = Field(None, description="Permite delegados")
    str_status: Optional[str] = Field(None, description="Estado de la reunión")

