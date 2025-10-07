from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PollBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_meeting_id: int = Field(..., description="ID de la reunión")
    str_poll_code: str = Field(..., description="Código de la encuesta")
    str_title: str = Field(..., description="Título de la encuesta")
    str_description: str = Field(..., description="Descripción de la encuesta")
    str_poll_type: str = Field(..., description="Tipo de encuesta")
    bln_is_anonymous: bool = Field(..., description="Es anónima")
    bln_requires_quorum: bool = Field(..., description="Requiere quorum")
    dec_minimum_quorum_percentage: float = Field(..., description="Porcentaje mínimo de quorum")
    bln_allows_abstention: bool = Field(..., description="Permite abstención")
    int_max_selections: int = Field(..., description="Máximo de selecciones")
    dat_started_at: datetime = Field(..., description="Fecha de inicio")
    dat_ended_at: datetime = Field(..., description="Fecha de fin")
    int_duration_minutes: int = Field(..., description="Duración en minutos")
    str_status: str = Field(..., description="Estado de la encuesta")

class PollCreate(PollBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")
    created_by: int = Field(..., description="ID del usuario que creó la encuesta")
    updated_by: int = Field(..., description="ID del usuario que actualizó la encuesta")

class PollUpdate(PollBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")
    updated_by: int = Field(..., description="ID del usuario que actualizó la encuesta")