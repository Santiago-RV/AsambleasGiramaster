from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from decimal import Decimal

class ResidentUpdate(BaseModel):
    """Schema para actualizar un copropietario"""
    firstname: Optional[str] = Field(None, min_length=2, max_length=100, description="Nombre del copropietario")
    lastname: Optional[str] = Field(None, min_length=2, max_length=100, description="Apellido del copropietario")
    email: Optional[EmailStr] = Field(None, description="Email del copropietario")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono del copropietario")
    apartment_number: Optional[str] = Field(None, max_length=20, description="Número de apartamento")
    voting_weight: Optional[Decimal] = Field(None, ge=0, le=1, description="Peso de votación (0-1)")
    password: Optional[str] = Field(None, min_length=8, description="Nueva contraseña (opcional)")
    is_active: Optional[bool] = Field(None, description="Estado activo del usuario")

    class Config:
        from_attributes = True