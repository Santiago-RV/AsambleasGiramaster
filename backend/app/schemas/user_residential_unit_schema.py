from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.schemas.user_schema import UserResponse
from app.schemas.residential_unit_schema import ResidentialUnitResponse

class UserResidentialUnitBase(BaseModel):
  """Esquema base para la relación entre usuario y unidad residencial
  """
  pass

class UserResidentialUnitCreate(UserResidentialUnitBase):
  """Esquema para crear una relación entre usuario y unidad residencial
  """
  pass

class UserResidentialUnitUpdate(UserResidentialUnitBase):
  """Esquema para actualizar una relación entre usuario y unidad residencial
  """
  pass

class UserResidentialUnitResponse(UserResidentialUnitBase):
  """Esquema para la respuesta de una relación entre usuario y unidad residencial
  """
  id: int = Field(..., description="ID de la relación entre usuario y unidad residencial")
  user: UserResponse = Field(..., description="Usuario")
  residential_unit: ResidentialUnitResponse = Field(..., description="Unidad residencial")
  created_at: datetime = Field(..., description="Fecha de creación")
  updated_at: datetime = Field(..., description="Fecha de actualización")