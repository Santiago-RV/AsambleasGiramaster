from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from app.schemas.user_schema import UserResponse
from app.schemas.residential_unit_schema import ResidentialUnitResponse

class UserResidentialUnitBase(BaseModel):
    """Schema base para UserResidentialUnit (relación usuario-unidad)"""
    int_user_id: int = Field(..., description="ID del usuario")
    int_residential_unit_id: int = Field(..., description="ID de la unidad residencial")
    str_apartment_number: str = Field(..., description="Número de apartamento")
    bool_is_admin: bool = Field(default=False, description="¿Es administrador de la unidad?")
    dec_default_voting_weight: Decimal = Field(
        default=Decimal('0.0000'), 
        description="Peso de votación por defecto"
    )

    model_config = ConfigDict(from_attributes=True)

class UserResidentialUnitCreate(UserResidentialUnitBase):
  """Esquema para crear una relación entre usuario y unidad residencial
  """
  pass

class UserResidentialUnitUpdate(BaseModel):
    """Schema para actualizar una relación usuario-unidad"""
    str_apartment_number: Optional[str] = Field(None, description="Número de apartamento")
    bool_is_admin: Optional[bool] = Field(None, description="¿Es administrador?")
    dec_default_voting_weight: Optional[Decimal] = Field(None, description="Peso de votación")

    model_config = ConfigDict(from_attributes=True)

class UserResidentialUnitResponse(UserResidentialUnitBase):
  """Esquema para la respuesta de una relación entre usuario y unidad residencial
  """
  id: int = Field(..., description="ID de la relación entre usuario y unidad residencial")
  user: UserResponse = Field(..., description="Usuario")
  residential_unit: ResidentialUnitResponse = Field(..., description="Unidad residencial")
  created_at: datetime = Field(..., description="Fecha de creación")
  updated_at: datetime = Field(..., description="Fecha de actualización")
  
class MyResidentialUnitResponse(BaseModel):
    """Schema simplificado para el endpoint /me/residential-unit"""
    residential_unit_id: int = Field(..., description="ID de la unidad residencial")
    user_id: int = Field(..., description="ID del usuario")
    apartment_number: str = Field(..., description="Número de apartamento")
    is_admin: bool = Field(..., description="¿Es administrador de la unidad?")
    voting_weight: float = Field(..., description="Peso de votación")

    model_config = ConfigDict(from_attributes=True)