from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime

# Schema para crear una delegación
class DelegationCreate(BaseModel):
    delegator_ids: List[int] = Field(..., min_items=1, description="IDs de los copropietarios que ceden su poder")
    delegate_id: int = Field(..., gt=0, description="ID del copropietario que recibe el poder")

    @validator('delegator_ids')
    def validate_delegator_ids(cls, v):
        if len(v) == 0:
            raise ValueError('Debe haber al menos un delegador')
        if len(v) != len(set(v)):
            raise ValueError('No puede haber IDs de delegadores duplicados')
        return v

    @validator('delegate_id')
    def validate_delegate_not_in_delegators(cls, v, values):
        delegator_ids = values.get('delegator_ids', [])
        if v in delegator_ids:
            raise ValueError('El receptor del poder no puede estar en la lista de cedentes')
        return v

# Schema de respuesta para información de usuario en delegación
class DelegationUserInfo(BaseModel):
    id: int
    str_firstname: str
    str_lastname: str
    str_email: str
    str_apartment_number: Optional[str] = None

    class Config:
        orm_mode = True

# Schema de respuesta para una delegación
class DelegationResponse(BaseModel):
    delegator: DelegationUserInfo
    delegate: DelegationUserInfo
    delegated_weight: float
    delegation_date: datetime

# Schema de respuesta para el estado de delegación de un usuario
class UserDelegationStatus(BaseModel):
    has_delegated: bool = Field(..., description="Si el usuario ha delegado su voto")
    delegated_to: Optional[DelegationUserInfo] = Field(None, description="A quién delegó (si delegó)")
    received_delegations: List[DelegationResponse] = Field(default=[], description="Delegaciones recibidas")
    total_weight: float = Field(..., description="Peso total de votación del usuario")
    original_weight: float = Field(..., description="Peso original sin delegaciones")

# Schema para revocación de delegación (vacío, solo para documentación)
class DelegationRevoke(BaseModel):
    pass
