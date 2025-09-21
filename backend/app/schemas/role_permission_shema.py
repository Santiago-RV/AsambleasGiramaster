from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.schemas.rol_schema import RolResponse
from app.schemas.permission_schema import PermissionResponse
from app.schemas.user_schema import UserResponse

class RolePermissionBase(BaseModel):
  """Esquema base para la relación entre rol y permiso

  Args:
      BaseModel (_type_): _description_
  """
  pass

class RolePermissionCreate(RolePermissionBase):
  """Esquema para crear una relación entre rol y permiso

  Args:
      RolePermissionBase (_type_): _description_
  """
  pass

class RolePermissionUpdate(RolePermissionBase):
  """Esquema para actualizar una relación entre rol y permiso

  Args:
      RolePermissionBase (_type_): _description_
  """
  pass

class RolePermissionResponse(RolePermissionBase):
  """Esquema para la respuesta de una relación entre rol y permiso

  Args:
      RolePermissionBase (_type_): _description_
  """
  id: int = Field(..., description="ID de la relación entre rol y permiso")
  rol: Optional[RolResponse] = Field(None, description="Rol")
  permission: Optional[PermissionResponse] = Field(None, description="Permiso")
  granted_at: datetime = Field(..., description="Fecha de asignación")
  granted_by: Optional[UserResponse] = Field(None, description="Usuario que asignó el permiso")

  class Config:
    from_attributes = True