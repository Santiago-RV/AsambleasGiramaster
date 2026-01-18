from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class GuestCreate(BaseModel):
    """Schema para crear un invitado"""
    firstname: str = Field(..., min_length=1, max_length=250, description="Nombre del invitado")
    lastname: str = Field(..., min_length=1, max_length=250, description="Apellido del invitado")
    email: EmailStr = Field(..., description="Correo electrónico del invitado")
    
    class Config:
        from_attributes = True
        
class GuestResponse(BaseModel):
    """Schema de respuestas para un invitado creado"""
    id: int
    firstname: str
    lastname: str
    email: EmailStr
    residential_unit_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        
class GuestUpdate(BaseModel):
    """Schema para actualizar un invitado"""
    firstname: Optional[str] = Field(None, min_length=1, max_length=250, description="Nombre del invitado")
    lastname: Optional[str] = Field(None, min_length=1, max_length=250, description="Apellido del invitado")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico del invitado")
    
    class Config:
        from_attributes = True