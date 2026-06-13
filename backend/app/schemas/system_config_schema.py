from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
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

# ============================================
# Zoom Multi-Account Schemas
# ============================================

class ZoomAccountSummary(BaseModel):
    """Resumen de una cuenta Zoom configurada"""
    id: int = Field(..., ge=1, le=3, description="ID de la cuenta Zoom (1-3)")
    name: str = Field(..., description="Nombre amigable de la cuenta")
    is_configured: bool = Field(..., description="Si tiene todas las credenciales configuradas")
    last_updated: Optional[str] = None

class ZoomAccountsListResponse(BaseModel):
    """Respuesta con la lista de cuentas Zoom"""
    accounts: List[ZoomAccountSummary] = []
    max_accounts: int = 3

class ZoomAccountCreateRequest(BaseModel):
    """Request para crear/actualizar una cuenta Zoom"""
    name: str = Field(..., min_length=1, max_length=50, description="Nombre amigable de la cuenta")
    sdk_key: str = Field(..., min_length=10, description="Zoom SDK Key")
    sdk_secret: str = Field(..., min_length=15, description="Zoom SDK Secret")
    account_id: str = Field(..., min_length=10, description="Zoom Account ID")
    client_id: str = Field(..., min_length=10, description="Zoom Client ID")
    client_secret: str = Field(..., min_length=15, description="Zoom Client Secret")

class ZoomAccountUpdateRequest(BaseModel):
    """Request para actualizar una cuenta Zoom (campos opcionales)"""
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="Nombre amigable de la cuenta")
    sdk_key: Optional[str] = Field(None, min_length=10, description="Zoom SDK Key")
    sdk_secret: Optional[str] = Field(None, min_length=15, description="Zoom SDK Secret")
    account_id: Optional[str] = Field(None, min_length=10, description="Zoom Account ID")
    client_id: Optional[str] = Field(None, min_length=10, description="Zoom Client ID")
    client_secret: Optional[str] = Field(None, min_length=15, description="Zoom Client Secret")

class ZoomAccountDetailResponse(BaseModel):
    """Respuesta con los detalles de una cuenta Zoom (valores enmascarados)"""
    id: int
    name: str
    sdk_key: Optional[str] = None
    sdk_secret: Optional[str] = Field(None, description="Valor enmascarado")
    account_id: Optional[str] = Field(None, description="Valor enmascarado")
    client_id: Optional[str] = Field(None, description="Valor enmascarado")
    client_secret: Optional[str] = Field(None, description="Valor enmascarado")
    last_updated: Optional[str] = None

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
    smtp_host: Optional[str] = Field(None, description="Dirección del servidor SMTP (ej: smtp.gmail.com)")
    smtp_port: Optional[int] = Field(None, ge=1, le=65535, description="Puerto SMTP (común: 587 para TLS, 465 para SSL)")
    smtp_user: Optional[str] = Field(None, description="Correo electrónico para autenticación SMTP")
    smtp_password: Optional[str] = Field(None, min_length=1, description="Contraseña SMTP o App Password (opcional)")
    smtp_from_email: Optional[str] = Field(None, description="Correo del remitente (opcional)")
    smtp_from_name: Optional[str] = Field(None, max_length=100, description="Nombre visible del remitente")
    email_enabled: Optional[bool] = Field(True, description="Activar/desactivar envío de correos del sistema")

    @validator('smtp_host', 'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name', pre=True, always=True)
    def empty_string_to_none(cls, v):
        """Convierte cadenas vacías a None"""
        if isinstance(v, str) and v.strip() == '':
            return None
        # Detectar valores enmascarados y convertirlos a None para mantener los existentes
        if isinstance(v, str) and v.startswith('***'):
            return None
        return v

    @validator('smtp_from_email', pre=True, always=True)
    def validate_from_email(cls, v):
        """Valida que sea un email válido si se proporciona"""
        if v is None:
            return None
        if isinstance(v, str):
            if v.strip() == '' or v.startswith('***'):
                return None
            # Validar formato de email
            if '@' not in v or '.' not in v.split('@')[-1]:
                raise ValueError('Debe ser un correo electrónico válido')
        return v

    @validator('smtp_user', pre=True, always=True)
    def validate_smtp_user(cls, v):
        """Valida que sea un email válido si se proporciona"""
        if v is None:
            return None
        if isinstance(v, str):
            if v.strip() == '' or v.startswith('***'):
                return None
            if '@' not in v or '.' not in v.split('@')[-1]:
                raise ValueError('Debe ser un correo electrónico válido')
        return v

class SMTPTestConnectionResponse(BaseModel):
    success: bool
    message: str
    recipient_email: Optional[str] = None
    timestamp: Optional[str] = None


# ============================================
# SMTP Multi-Account Schemas
# ============================================

class SmtpAccountSummary(BaseModel):
    """Resumen de una cuenta SMTP configurada"""
    id: int = Field(..., ge=1, description="ID de la cuenta SMTP")
    name: str = Field(..., description="Nombre amigable de la cuenta")
    email: Optional[str] = Field(None, description="Email enmascarado")
    host: str = Field(..., description="Servidor SMTP")
    port: int = Field(..., description="Puerto SMTP")
    daily_limit: int = Field(..., description="Límite diario de envíos")
    is_exceeded_today: bool = Field(..., description="Si excedió el límite hoy")
    last_exceeded_date: Optional[str] = Field(None, description="Última fecha en que excedió el límite")


class SmtpAccountCreateRequest(BaseModel):
    """Request para crear una nueva cuenta SMTP"""
    name: str = Field(..., min_length=1, max_length=50, description="Nombre amigable de la cuenta")
    user: str = Field(..., description="Correo electrónico para autenticación SMTP")
    password: str = Field(..., min_length=1, description="Contraseña o App Password de Gmail")
    host: Optional[str] = Field("smtp.gmail.com", description="Servidor SMTP")
    port: Optional[int] = Field(587, ge=1, le=65535, description="Puerto SMTP")
    from_email: Optional[str] = Field(None, description="Email del remitente (opcional, usa 'user' si no se indica)")
    from_name: Optional[str] = Field("GIRAMASTER - Sistema de Asambleas", max_length=100, description="Nombre visible del remitente")
    daily_limit: Optional[int] = Field(500, ge=1, description="Límite diario de envíos (Gmail: ~500)")

    @validator('user', 'from_email', pre=True, always=True)
    def validate_email(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip():
            if '@' not in v or '.' not in v.split('@')[-1]:
                raise ValueError('Debe ser un correo electrónico válido')
        return v


class SmtpAccountUpdateRequest(BaseModel):
    """Request para actualizar una cuenta SMTP (todos los campos opcionales)"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    user: Optional[str] = Field(None, description="Correo electrónico")
    password: Optional[str] = Field(None, min_length=1, description="Contraseña SMTP")
    host: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    from_email: Optional[str] = None
    from_name: Optional[str] = Field(None, max_length=100)
    daily_limit: Optional[int] = Field(None, ge=1)

    @validator('user', 'from_email', 'password', 'name', 'from_name', pre=True, always=True)
    def empty_or_masked_to_none(cls, v):
        if isinstance(v, str) and (v.strip() == '' or v.startswith('***')):
            return None
        return v
