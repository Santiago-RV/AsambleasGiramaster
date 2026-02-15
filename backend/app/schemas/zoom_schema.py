from pydantic import BaseModel, Field, validator
from typing import Optional


class ZoomSignatureRequest(BaseModel):
    """Schema para solicitar un signature de Zoom"""
    meeting_number: str = Field(
        ..., 
        description="Numero de la reunion de Zoom (puede contener espacios o guiones)",
        example="123-456-7890"
    )
    role: int = Field(
        default=0, 
        ge=0, 
        le=1,
        description="Rol del usuario (0 = participante, 1 = anfitrion)"
    )
    zoom_account_id: Optional[int] = Field(
        None,
        ge=1,
        le=3,
        description="ID de la cuenta Zoom a usar para generar la firma (1-3). Si no se especifica, usa la primera disponible"
    )
    
    @validator('meeting_number')
    def validate_meeting_number(cls, v):
        """Valida que el número de reunión contenga al menos algunos dígitos"""
        clean_number = ''.join(filter(str.isdigit, v))
        if not clean_number:
            raise ValueError('El número de reunión debe contener al menos un dígito')
        return v


class ZoomSignatureResponse(BaseModel):
    """Schema de respuesta para el signature de Zoom"""
    signature: str = Field(..., description="JWT signature para el Zoom Meeting SDK")
    meeting_number: str = Field(..., description="Número de reunión limpio (solo dígitos)")
    role: int = Field(..., description="Rol del usuario")
    expires_in: int = Field(..., description="Tiempo de expiración en segundos")
    sdk_key: str = Field(..., description="SDK Key para el frontend")


class ZoomMeetingInfoRequest(BaseModel):
    """Schema para solicitar información de una reunión desde una URL"""
    zoom_url: str = Field(
        ..., 
        description="URL de la reunión de Zoom",
        example="https://zoom.us/j/1234567890?pwd=abc123"
    )


class ZoomMeetingInfoResponse(BaseModel):
    """Schema de respuesta con información de la reunión"""
    meeting_number: Optional[str] = Field(None, description="Número de reunión extraído")
    password: Optional[str] = Field(None, description="Contraseña de la reunión")
    is_valid: bool = Field(..., description="Indica si la URL es válida")

