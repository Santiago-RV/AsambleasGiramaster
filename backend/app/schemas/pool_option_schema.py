from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PollOptionBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_poll_id: int = Field(..., description="ID de la encuesta")
    str_option_text: str = Field(..., description="Texto de la opción")
    int_option_order: int = Field(..., description="Orden de la opción")
    bln_is_active: bool = Field(..., description="Activo")
    int_votes_count: int = Field(..., description="Cantidad de votos")
    dec_weight_total: float = Field(..., description="Peso total")
    dec_percentage: float = Field(..., description="Porcentaje")

class PollOptionCreate(PollOptionBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")
    created_by: int = Field(..., description="ID del usuario que creó la opción")
    updated_by: int = Field(..., description="ID del usuario que actualizó la opción")

class PollOptionUpdate(PollOptionBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")
    updated_by: int = Field(..., description="ID del usuario que actualizó la opción")