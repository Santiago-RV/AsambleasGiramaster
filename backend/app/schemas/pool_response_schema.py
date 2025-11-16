from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

# Schema para crear una respuesta (voto)
class PollResponseCreate(BaseModel):
    int_option_id: Optional[int] = Field(None, description="ID de la opción seleccionada (para single/multiple)")
    str_response_text: Optional[str] = Field(None, max_length=2000, description="Respuesta de texto (para tipo text)")
    dec_response_number: Optional[float] = Field(None, description="Respuesta numérica (para tipo numeric)")
    bln_is_abstention: bool = Field(default=False, description="Es una abstención")

    @validator('int_option_id')
    def validate_option_id(cls, v, values):
        if values.get('bln_is_abstention'):
            return None  # Las abstenciones no tienen opción
        return v

# Schema para respuestas múltiples (cuando int_max_selections > 1)
class PollMultipleResponseCreate(BaseModel):
    int_option_ids: List[int] = Field(..., min_items=1, description="IDs de las opciones seleccionadas")
    bln_is_abstention: bool = Field(default=False, description="Es una abstención")

# Schema de respuesta (para devolver al cliente)
class PollResponseBase(BaseModel):
    id: int = Field(..., description="ID de la respuesta")
    int_poll_id: int = Field(..., description="ID de la encuesta")
    int_user_id: Optional[int] = Field(None, description="ID del usuario (null si es anónima)")
    int_option_id: Optional[int] = Field(None, description="ID de la opción")
    str_response_text: Optional[str] = Field(None, description="Texto de la respuesta")
    dec_response_number: Optional[float] = Field(None, description="Número de la respuesta")
    dec_voting_weight: float = Field(..., description="Peso de votación")
    bln_is_abstention: bool = Field(..., description="Es abstención")
    dat_response_at: datetime = Field(..., description="Fecha de la respuesta")
    str_ip_address: Optional[str] = Field(None, description="IP del votante")
    str_user_agent: Optional[str] = Field(None, description="User agent")

    class Config:
        from_attributes = True