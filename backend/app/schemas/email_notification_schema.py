from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class EmailNotificationBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    int_meeting_id: int = Field(..., description="ID de la reunión")
    int_user_id: int = Field(..., description="ID del usuario")
    str_status: str = Field(..., description="Estado")
    str_template: str = Field(..., description="Plantilla")
    dat_sent_at: datetime = Field(..., description="Fecha de envío")

class EmailNotificationCreate(EmailNotificationBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")

class EmailNotificationUpdate(EmailNotificationBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")