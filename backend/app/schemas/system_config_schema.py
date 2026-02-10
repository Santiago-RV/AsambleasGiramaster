from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime

class SystemConfigBase(BaseModel):
    str_config_key: str = Field(..., max_length=100, description="Clave de configuración")
    str_config_value: str = Field(..., description="Valor de configuración")
    bln_is_encrypted: bool = Field(False, description="Si el valor está encriptado")
    str_description: Optional[str] = Field(None, max_length=500, description="Descripción")

class SystemConfigResponse(BaseModel):
    key: str
    value: str
    is_encrypted: bool
    description: Optional[str]
    updated_at: Optional[str]

class ZoomCredentialsResponse(BaseModel):
    sdk_key: Optional[str] = None
    sdk_secret: Optional[str] = Field(None, description="Valor enmascarado")
    account_id: Optional[str] = Field(None, description="Valor enmascarado")
    client_id: Optional[str] = Field(None, description="Valor enmascarado")
    client_secret: Optional[str] = Field(None, description="Valor enmascarado")
    last_updated: Optional[str] = None

class ZoomCredentialsUpdateRequest(BaseModel):
    sdk_key: Optional[str] = Field(None, description="Zoom SDK Key (público)")
    sdk_secret: Optional[str] = Field(None, description="Zoom SDK Secret")
    account_id: Optional[str] = Field(None, description="Zoom Account ID")
    client_id: Optional[str] = Field(None, description="Zoom Client ID")
    client_secret: Optional[str] = Field(None, description="Zoom Client Secret")

class ZoomTestConnectionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None

class SMTPCredentialsResponse(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = Field(None, description="Valor enmascarado")
    smtp_password: Optional[str] = Field(None, description="Valor enmascarado")
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    email_enabled: Optional[bool] = None
    last_updated: Optional[str] = None

class SMTPCredentialsUpdateRequest(BaseModel):
    smtp_host: str = Field(..., description="Dirección del servidor SMTP (ej: smtp.gmail.com)")
    smtp_port: int = Field(..., ge=1, le=65535, description="Puerto SMTP (común: 587 para TLS, 465 para SSL)")
    smtp_user: EmailStr = Field(..., description="Correo electrónico para autenticación SMTP")
    smtp_password: str = Field(..., min_length=1, description="Contraseña SMTP o App Password")
    smtp_from_email: Optional[EmailStr] = Field(None, description="Correo del remitente (opcional)")
    smtp_from_name: Optional[str] = Field(None, max_length=100, description="Nombre visible del remitente")
    email_enabled: bool = Field(True, description="Activar/desactivar envío de correos del sistema")

    @validator('smtp_from_email', pre=True, always=True)
    def empty_string_to_none_email(cls, v):
        """Convierte cadenas vacías a None para campos opcionales de email"""
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

    @validator('smtp_from_name', pre=True, always=True)
    def empty_string_to_none_name(cls, v):
        """Convierte cadenas vacías a None para campos opcionales de texto"""
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

class SMTPTestConnectionResponse(BaseModel):
    success: bool
    message: str
    recipient_email: Optional[str] = None
    timestamp: Optional[str] = None
