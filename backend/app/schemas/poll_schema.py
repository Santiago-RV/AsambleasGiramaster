from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

# Schema para crear opciones de encuesta
class PollOptionInput(BaseModel):
    str_option_text: str = Field(..., min_length=1, max_length=500, description="Texto de la opción")
    int_option_order: Optional[int] = Field(None, description="Orden de la opción")

# Schema para crear una encuesta
class PollCreate(BaseModel):
    int_meeting_id: int = Field(..., gt=0, description="ID de la reunión")
    str_title: str = Field(..., min_length=1, max_length=200, description="Título de la encuesta")
    str_description: Optional[str] = Field(None, max_length=1000, description="Descripción de la encuesta")
    str_poll_type: str = Field(..., description="Tipo de encuesta: single, multiple, text, numeric")
    bln_is_anonymous: bool = Field(default=False, description="Es anónima")
    bln_requires_quorum: bool = Field(default=False, description="Requiere quorum")
    dec_minimum_quorum_percentage: float = Field(default=0.0, ge=0, le=100, description="Porcentaje mínimo de quorum")
    bln_allows_abstention: bool = Field(default=True, description="Permite abstención")
    int_max_selections: Optional[int] = Field(default=1, gt=0, description="Máximo de selecciones (para tipo multiple)")
    int_duration_minutes: Optional[int] = Field(None, gt=0, description="Duración en minutos")
    options: List[PollOptionInput] = Field(default=[], description="Lista de opciones")

    @validator('str_poll_type')
    def validate_poll_type(cls, v):
        allowed_types = ['single', 'multiple', 'text', 'numeric']
        if v not in allowed_types:
            raise ValueError(f'Tipo de encuesta debe ser uno de: {", ".join(allowed_types)}')
        return v

    @validator('options')
    def validate_options(cls, v, values):
        poll_type = values.get('str_poll_type')
        if poll_type in ['single', 'multiple']:
            if len(v) < 2:
                raise ValueError('Las encuestas de tipo single/multiple requieren al menos 2 opciones')
        return v

# Schema para actualizar una encuesta
class PollUpdate(BaseModel):
    str_title: Optional[str] = Field(None, min_length=1, max_length=200, description="Título de la encuesta")
    str_description: Optional[str] = Field(None, max_length=1000, description="Descripción de la encuesta")
    bln_allows_abstention: Optional[bool] = Field(None, description="Permite abstención")
    int_duration_minutes: Optional[int] = Field(None, gt=0, description="Duración en minutos")

# Schema de respuesta
class PollBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_meeting_id: int = Field(..., description="ID de la reunión")
    str_poll_code: str = Field(..., description="Código de la encuesta")
    str_title: str = Field(..., description="Título de la encuesta")
    str_description: Optional[str] = Field(None, description="Descripción de la encuesta")
    str_poll_type: str = Field(..., description="Tipo de encuesta")
    bln_is_anonymous: bool = Field(..., description="Es anónima")
    bln_requires_quorum: bool = Field(..., description="Requiere quorum")
    dec_minimum_quorum_percentage: float = Field(..., description="Porcentaje mínimo de quorum")
    bln_allows_abstention: bool = Field(..., description="Permite abstención")
    int_max_selections: int = Field(..., description="Máximo de selecciones")
    dat_started_at: Optional[datetime] = Field(None, description="Fecha de inicio")
    dat_ended_at: Optional[datetime] = Field(None, description="Fecha de fin")
    int_duration_minutes: Optional[int] = Field(None, description="Duración en minutos")
    str_status: str = Field(..., description="Estado de la encuesta")
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")

    class Config:
        from_attributes = True