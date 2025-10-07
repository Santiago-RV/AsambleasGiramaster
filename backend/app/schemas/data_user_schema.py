from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class DataUserBase(BaseModel):
    """Esquema base para el usuario

    Args:
        BaseModel (_type_): _description_

    Returns:
        _type_: _description_
    """

    str_firstname: str = Field(
        ..., min_length=3, max_length=50, description="Nombre del usuario"
    )
    str_lastname: str = Field(
        ..., min_length=3, max_length=50, description="Apellido del usuario"
    )
    str_email: EmailStr = Field(..., format="email", description="Email del usuario")
    str_phone: Optional[str] = Field(None, description="Teléfono del usuario")

    class Config:
        from_attributes = True


class DataUserCreate(DataUserBase):
    """Esquema para crear un usuario

    Args:
        DataUserBase (_type_): _description_

    Returns:
        _type_: _description_
    """
    pass


class DataUserRegister(DataUserBase):
    """Esquema para registro de usuario con contraseña

    Args:
        DataUserBase (_type_): _description_

    Returns:
        _type_: _description_
    """
    password: str = Field(..., min_length=8, description="Contraseña del usuario")


class DataUserUpdate(DataUserBase):
    """Esquema para actualizar un usuario

    Args:
        DataUserBase (_type_): _description_

    Returns:
        _type_: _description_
    """
    pass


class DataUserResponse(DataUserBase):
    """Esquema para la respuesta de un usuario

    Args:
        DataUserBase (_type_): _description_

    Returns:
        _type_: _description_
    """

    id: int = Field(..., description="ID del usuario")
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")

    class Config:
        from_attributes = True
