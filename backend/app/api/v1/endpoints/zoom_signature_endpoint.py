from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
import time
import hmac
import hashlib
import base64
import json

from app.core.config import settings
from app.auth.auth import get_current_user
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


class SignatureRequest(BaseModel):
    """Request para generar firma de Zoom"""
    meeting_number: str
    role: int = 0  # 0 = participante, 1 = host


@router.post(
    "/zoom/signature",
    response_model=Dict[str, Any],
    summary="Generar firma JWT para Zoom Meeting SDK"
)
async def generate_zoom_signature(
    request: SignatureRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Genera una firma JWT para autenticar con el Zoom Meeting SDK.
    
    La firma se genera en el backend por seguridad, ya que requiere
    el SDK Secret que NO debe exponerse en el frontend.
    
    Args:
        request: Datos de la reunión (número y rol)
        current_user: Usuario autenticado
        
    Returns:
        Firma JWT y SDK Key
    """
    try:
        # Obtener credenciales de Zoom desde variables de entorno
        # NOTA: Estas son diferentes de las credenciales OAuth que ya tienes
        sdk_key = getattr(settings, 'ZOOM_SDK_KEY', None)
        sdk_secret = getattr(settings, 'ZOOM_SDK_SECRET', None)
        
        if not sdk_key or not sdk_secret:
            logger.error("Zoom SDK credentials not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Zoom SDK credentials not configured. Add ZOOM_SDK_KEY and ZOOM_SDK_SECRET to .env"
            )
        
        # Timestamps
        iat = int(time.time())
        exp = iat + 60 * 60 * 2  # Expira en 2 horas
        
        # Crear header
        header = {
            "alg": "HS256",
            "typ": "JWT"
        }
        
        # Crear payload
        payload = {
            "sdkKey": sdk_key,
            "mn": request.meeting_number,
            "role": request.role,
            "iat": iat,
            "exp": exp,
            "tokenExp": exp
        }
        
        # Codificar header y payload en base64
        header_encoded = base64.urlsafe_b64encode(
            json.dumps(header).encode()
        ).decode().rstrip('=')
        
        payload_encoded = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode().rstrip('=')
        
        # Crear mensaje a firmar
        message = f"{header_encoded}.{payload_encoded}"
        
        # Crear firma HMAC-SHA256
        signature = hmac.new(
            sdk_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        
        signature_encoded = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        
        # JWT completo
        jwt_token = f"{message}.{signature_encoded}"
        
        logger.info(f"✅ Firma generada para reunión {request.meeting_number}")
        
        return {
            "success": True,
            "data": {
                "signature": jwt_token,
                "sdk_key": sdk_key
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Zoom signature: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Zoom signature: {str(e)}"
        )