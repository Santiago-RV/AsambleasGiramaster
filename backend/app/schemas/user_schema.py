from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

from app.schemas.data_user_schema import DataUserResponse
from app.schemas.rol_schema import RolResponse

class UserBase(BaseModel):
  """Esquema base para el usuario

  Args:
    BaseModel (_type_): _description_

  Returns:
    _type_: _description_
  """
  str_username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario")
  bln_is_active: bool = Field(True, description="Estado del usuario")
  bln_is_external_delegate: bool = Field(False, description="Usuario externo")
  bln_user_temporary: bool = Field(False, description="Usuario temporal")
  dat_temporary_expiration_date: datetime = Field(None, description="Fecha de expiración del usuario temporal")


class UserCreate(UserBase):
  """Esquema para crear un usuario

  Args:
      UserBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  str_password_hash: str = Field(..., min_length=8, description="Contraseña hash del usuario")

  @validator('str_password_hash')
  def validate_password_hash(cls, v):
    """Validar la contraseña hash

    Args:
        v (_type_): _description_

    Returns:
        _type_: _description_
    """
    if not v or len(v) < 8:
      raise ValueError("La contraseña debe tener al menos 8 caracteres")
    return v

class UserUpdate(UserBase):
  """Esquema para actualizar un usuario

  Args:
      UserBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  str_password_hash: Optional[str] = Field(None, min_length=8, description="Contraseña hash del usuario")
  int_id_rol: Optional[int] = Field(None, description="ID del rol")
  
  @validator('str_password_hash')
  def validate_password_hash(cls, v):
    """Validar la contraseña hash

    Args:
        v (_type_): _description_

    Returns:
        _type_: _description_
    """
    if not v or len(v) < 8:
      raise ValueError("La contraseña debe tener al menos 8 caracteres")
    return v

class UserResponse(UserBase):
  """Esquema para la respuesta de un usuario

  Args:
      UserBase (_type_): _description_

  Returns:
      _type_: _description_
  """
  id: int = Field(..., description="ID del usuario")
  data_user: Optional[DataUserResponse] = Field(None, description="Usuario")
  rol: Optional[RolResponse] = Field(None, description="Rol")
  created_at: datetime = Field(..., description="Fecha de creación")
  updated_at: datetime = Field(..., description="Fecha de actualización")

  class Config:
    from_attributes = True

class UserLogin(BaseModel):
  """Esquema para el login de un usuario

  Args:
      BaseModel (_type_): _description_

  Returns:
      _type_: _description_
  """
  str_username: str = Field(..., description="Nombre de usuario")
  str_password: str = Field(..., description="Contraseña")

class Token(BaseModel):
  """Esquema para el token de un usuario

  Args:
      BaseModel (_type_): _description_

  Returns:
      _type_: _description_
  """
  access_token: str = Field(..., description="Token de acceso")
  refresh_token: str = Field(..., description="Token de refresco")
  token_type: str = Field(..., description="Tipo de token")
  expires_in: int = Field(..., description="Tiempo de expiración del token")

  class Config:
    json_schema_extra = {
      "example": {
        "access_token": "token",
        "refresh_token": "token",
        "token_type": "bearer",
        "expires_in": 3600
      }
    }

class RefreshToken(BaseModel):
  """Esquema para el refresh token de un usuario

  Args:
      BaseModel (_type_): _description_

  Returns:
      _type_: _description_
  """
  refresh_token: str = Field(..., description="Token de refresco")

  class Config:
    json_schema_extra = {
      "example": {
        "refresh_token": "token"
      }
    }