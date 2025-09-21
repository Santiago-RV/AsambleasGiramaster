from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ResidentialUnitBase(BaseModel):
  """Esquema base para la unidad residencial
  """
  str_residential_code: str = Field(..., description="Código de la unidad residencial")
  str_name: str = Field(..., description="Nombre de la unidad residencial")
  str_unit_type: str = Field(..., description="Tipo de unidad residencial")
  int_total_apartments: int = Field(..., description="Total de apartamentos")
  str_address: str = Field(..., description="Dirección de la unidad residencial")
  str_city: str = Field(..., description="Ciudad de la unidad residencial")
  str_state: str = Field(..., description="Estado de la unidad residencial")
  bln_is_active: bool = Field(..., description="Estado de la unidad residencial")
  str_max_concurrent_meetings: int = Field(..., description="Máximo de reuniones concurrentes")

class ResidentialUnitCreate(ResidentialUnitBase):
  """Esquema para crear una unidad residencial
  """
  pass

class ResidentialUnitUpdate(ResidentialUnitBase):
  """Esquema para actualizar una unidad residencial
  """
  pass

class ResidentialUnitResponse(ResidentialUnitBase):
  """Esquema para la respuesta de una unidad residencial
  """
  id: int = Field(..., description="ID de la unidad residencial")
  
  created_at: datetime = Field(..., description="Fecha de creación")
  updated_at: datetime = Field(..., description="Fecha de actualización")
  created_by: int = Field(..., description="ID del usuario que creó la unidad residencial")
  updated_by: int = Field(..., description="ID del usuario que actualizó la unidad residencial")