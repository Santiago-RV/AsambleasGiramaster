from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PermissionBase(BaseModel):
  """Esquema base para el permiso

  Args:
      BaseModel (_type_): _description_
      
  Returns:
      _type_: _description_
  """
  str_name: str = Field(..., min_length=3, max_length=50, description="Nombre del permiso")
  str_description: str = Field(..., min_length=3, max_length=255, description="Descripción del permiso")
  str_module: str = Field(..., min_length=3, max_length=50, description="Módulo del permiso")
  bln_is_active: bool = Field(True, description="Estado del permiso")

class PermissionCreate(PermissionBase):
  """Esquema para crear un permiso

  Args:
      PermissionBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  pass

class PermissionUpdate(PermissionBase):
  """Esquema para actualizar un permiso

  Args:
      PermissionBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  pass

class PermissionResponse(PermissionBase):
  """Esquema para la respuesta de un permiso

  Args:
      PermissionBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  id: int = Field(..., description="ID del permiso")
  created_at: datetime = Field(..., description="Fecha de creación")
  updated_at: datetime = Field(..., description="Fecha de actualización")