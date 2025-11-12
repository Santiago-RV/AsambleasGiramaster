from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class UserSimplifiedSchema(BaseModel):
  """Esquema simplificado de usuario para mostrar en relaciones
  """
  id: int = Field(..., description="ID del usuario")
  str_username: str = Field(..., description="Nombre de usuario")
  
  model_config = ConfigDict(from_attributes=True)

class ResidentialUnitBase(BaseModel):
  """Esquema base para la unidad residencial
  """
  str_residential_code: str = Field(..., description="Código de la unidad residencial")
  str_name: str = Field(..., description="Nombre de la unidad residencial")
  str_nit: str = Field(..., description="NIT de la unidad residencial")
  str_unit_type: str = Field(..., description="Tipo de unidad residencial")
  int_total_apartments: int = Field(..., description="Total de apartamentos")
  str_address: str = Field(..., description="Dirección de la unidad residencial")
  str_city: str = Field(..., description="Ciudad de la unidad residencial")
  str_state: str = Field(..., description="Estado de la unidad residencial")
  bln_is_active: bool = Field(default=True, description="Estado de la unidad residencial")
  int_max_concurrent_meetings: int = Field(..., description="Máximo de reuniones concurrentes")

  model_config = ConfigDict(from_attributes=True)

class ResidentialUnitCreate(ResidentialUnitBase):
  """Esquema para crear una unidad residencial
  """
  created_by: int = Field(..., description="ID del usuario que creó la unidad residencial")
  updated_by: int = Field(..., description="ID del usuario que actualizó la unidad residencial")

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
  creator: Optional[UserSimplifiedSchema] = Field(None, description="Usuario que creó la unidad residencial")
  updater: Optional[UserSimplifiedSchema] = Field(None, description="Usuario que actualizó la unidad residencial")