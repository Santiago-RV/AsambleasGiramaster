from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class MeetingInvitationBase(BaseModel):
    int_meeting_id: int = Field(..., description="ID de la reunión")
    int_user_id: int = Field(..., description="ID del usuario invitado")
    dec_voting_weight: Decimal = Field(..., description="Peso de votación (coeficiente)")
    str_apartment_number: str = Field(..., max_length=20, description="Número de apartamento")
    str_invitation_status: str = Field(default="pending", max_length=50, description="Estado de la invitación")
    str_response_status: str = Field(default="no_response", max_length=50, description="Estado de respuesta")
    bln_will_attend: bool = Field(default=False, description="Si asistirá")
    int_delegated_id: Optional[int] = Field(None, description="ID del delegado")
    
    @validator('str_invitation_status')
    def validate_invitation_status(cls, v):
        allowed_statuses = ['pending', 'sent', 'delivered', 'failed']
        if v not in allowed_statuses:
            raise ValueError(f"Estado debe ser uno de: {', '.join(allowed_statuses)}")
        return v
    
    @validator('str_response_status')
    def validate_response_status(cls, v):
        allowed_statuses = ['no_response', 'accepted', 'declined', 'maybe']
        if v not in allowed_statuses:
            raise ValueError(f"Estado debe ser uno de: {', '.join(allowed_statuses)}")
        return v

class MeetingInvitationCreate(MeetingInvitationBase):
    pass

class MeetingInvitationResponse(MeetingInvitationBase):
    id: int
    dat_sent_at: Optional[datetime]
    dat_responded_at: Optional[datetime]
    dat_reminder_sent_at: Optional[datetime]
    int_delivery_attemps: int
    str_last_delivery_error: Optional[str]
    bln_actually_attended: bool
    dat_joined_at: Optional[datetime]
    dat_left_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: int
    updated_by: int

    # Datos del usuario (para el frontend)
    str_firstname: Optional[str] = None
    str_lastname: Optional[str] = None
    str_email: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Personaliza la creación desde ORM para incluir datos del usuario"""
        data = super().from_orm(obj)

        # Si tiene relación con usuario y data_user, agregar los datos
        if hasattr(obj, 'user') and obj.user and hasattr(obj.user, 'data_user') and obj.user.data_user:
            data.str_firstname = obj.user.data_user.str_firstname
            data.str_lastname = obj.user.data_user.str_lastname
            data.str_email = obj.user.data_user.str_email

        return data

class ExcelUserRow(BaseModel):
    """Schema para validar cada fila del Excel"""
    email: EmailStr = Field(..., description="Email del usuario")
    firstname: str = Field(..., min_length=3, max_length=50, description="Nombre")
    lastname: str = Field(..., min_length=3, max_length=50, description="Apellido")
    phone: Optional[str] = Field(None, description="Teléfono")
    apartment_number: str = Field(..., max_length=20, description="Número de apartamento")
    voting_weight: Decimal = Field(..., description="Peso de votación")
    password: str = Field(default="Temporal123!", description="Contraseña inicial")

class BulkUploadResponse(BaseModel):
    """Respuesta de carga masiva"""
    total_rows: int
    successful: int
    failed: int
    users_created: int
    invitations_created: int
    errors: list[dict]

class MeetingInvitationBatchCreate(BaseModel):
    """Schema para crear múltiples invitaciones a una reunión"""
    int_meeting_id: int = Field(..., description="ID de la reunión")
    user_ids: List[int] = Field(..., description="Lista de IDs de usuarios a invitar")