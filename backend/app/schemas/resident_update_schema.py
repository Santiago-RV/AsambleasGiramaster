from pydantic import BaseModel, EmailStr
from typing import Optional
from decimal import Decimal

class ResidentUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    apartment_number: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    voting_weight: Optional[Decimal] = None
    
    class Config:
        from_attributes = True