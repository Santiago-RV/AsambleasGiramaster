from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AuditLogBase(BaseModel):
    id: int = Field(..., description="ID del registro")
    str_action: str = Field(..., description="Acción realizada")
    int_user_id: int = Field(..., description="ID del usuario que realizó la acción")
    str_ip_address: str = Field(..., description="IP del usuario que realizó la acción")
    str_user_agent: str = Field(..., description="Agente del usuario")
    str_resource_type: str = Field(..., description="Tipo de recurso")
    int_resource_id: int = Field(..., description="ID del recurso")
    str_resource_name: str = Field(..., description="Nombre del recurso")
    json_old_data: Optional[dict] = Field(None, description="Datos antiguos")
    json_new_data: Optional[dict] = Field(None, description="Datos nuevos")
    str_changes_summary: str = Field(..., description="Resumen de los cambios")
    int_meeting_id: int = Field(..., description="ID de la reunión")
    str_severity: str = Field(..., description="Severidad")
    json_tags: Optional[dict] = Field(None, description="Tags")

class AuditLogCreate(AuditLogBase):
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")

class AuditLogUpdate(AuditLogBase):
    updated_at: datetime = Field(..., description="Fecha de actualización")