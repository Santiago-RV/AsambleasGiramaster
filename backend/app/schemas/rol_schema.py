from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RolBase(BaseModel):
  """Esquema base para el rol

  Args:
      BaseModel (_type_): _description_

  Returns:
      _type_: _description_
  """
  str_name: str = Field(..., min_length=3, max_length=50, description="Nombre del rol")
  str_description: str = Field(..., min_length=3, max_length=255, description="Descripción del rol")
  bln_is_active: bool = Field(True, description="Estado del rol")

class RolCreate(RolBase):
  """Esquema para crear un rol

  Args:
      RolBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  pass

class RolUpdate(RolBase):
  """Esquema para actualizar un rol

  Args:
      RolBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  pass

class RolResponse(RolBase):
  """Esquema para la respuesta de un rol

  Args:
      RolBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  id: int = Field(..., description="ID del rol")
  created_at: datetime = Field(..., description="Fecha de creación")
  updated_at: datetime = Field(..., description="Fecha de actualización")

  class Config:
    from_attributes = True