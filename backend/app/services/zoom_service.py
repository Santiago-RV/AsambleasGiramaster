import jwt
import time
from typing import Optional
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ZoomService:
    """
    Servicio para interactuar con la API de Zoom
    y generar tokens de autenticación para el Meeting SDK
    """

    def __init__(self):
        self.sdk_key = settings.ZOOM_SDK_KEY
        self.sdk_secret = settings.ZOOM_SDK_SECRET

    def generate_signature(
        self, 
        meeting_number: str, 
        role: int = 0,
        expire_hours: int = 2
    ) -> str:
        """
        Genera un JWT signature para unirse a una reunión de Zoom
        
        Args:
            meeting_number: Número de la reunión de Zoom (sin espacios ni guiones)
            role: Rol del usuario (0 = participante, 1 = anfitrión)
            expire_hours: Horas hasta que expire el token (default: 2)
            
        Returns:
            str: JWT signature para el Zoom Meeting SDK
            
        Raises:
            ValueError: Si las credenciales de Zoom no están configuradas
        """
        if not self.sdk_key or not self.sdk_secret:
            logger.error("Credenciales de Zoom no configuradas")
            raise ValueError(
                "Las credenciales de Zoom SDK no están configuradas. "
                "Por favor, configura ZOOM_SDK_KEY y ZOOM_SDK_SECRET en las variables de entorno."
            )

        # Tiempo actual y expiración (en milisegundos para Zoom SDK 4.x)
        iat = int(time.time() * 1000)
        exp = iat + (60 * 60 * expire_hours * 1000)  # Expira en X horas (en milisegundos)

        # Payload del JWT para Zoom SDK 4.x
        # Documentación: https://developers.zoom.us/docs/meeting-sdk/auth/
        payload = {
            "sdkKey": self.sdk_key,
            "mn": meeting_number,
            "role": role,
            "iat": iat,
            "exp": exp,
            "tokenExp": exp
        }

        try:
            # Generar el JWT token
            token = jwt.encode(
                payload,
                self.sdk_secret,
                algorithm="HS256"
            )

            logger.info(
                f"JWT signature generado exitosamente para reunión {meeting_number}, "
                f"rol: {'anfitrión' if role == 1 else 'participante'}"
            )

            return token

        except Exception as e:
            logger.error(f"Error al generar JWT signature: {str(e)}")
            raise ValueError(f"Error al generar signature: {str(e)}")

    def validate_meeting_number(self, meeting_number: str) -> str:
        """
        Valida y limpia el número de reunión
        
        Args:
            meeting_number: Número de reunión (puede contener espacios o guiones)
            
        Returns:
            str: Número de reunión limpio (solo dígitos)
            
        Raises:
            ValueError: Si el número de reunión no es válido
        """
        # Limpiar el número de reunión (quitar espacios, guiones, etc.)
        clean_number = ''.join(filter(str.isdigit, meeting_number))

        if not clean_number:
            raise ValueError("Número de reunión inválido")

        if len(clean_number) < 9 or len(clean_number) > 11:
            logger.warning(
                f"Número de reunión con longitud inusual: {len(clean_number)} dígitos"
            )

        return clean_number

    def extract_meeting_number_from_url(self, zoom_url: str) -> Optional[str]:
        """
        Extrae el número de reunión de una URL de Zoom
        
        Args:
            zoom_url: URL de Zoom (ej: https://zoom.us/j/1234567890)
            
        Returns:
            Optional[str]: Número de reunión o None si no se puede extraer
        """
        import re

        # Patrón para extraer el número de reunión
        pattern = r'/j/(\d+)'
        match = re.search(pattern, zoom_url)

        if match:
            return match.group(1)

        logger.warning(f"No se pudo extraer el número de reunión de la URL: {zoom_url}")
        return None

    def extract_password_from_url(self, zoom_url: str) -> Optional[str]:
        """
        Extrae la contraseña de una URL de Zoom
        
        Args:
            zoom_url: URL de Zoom (ej: https://zoom.us/j/1234567890?pwd=abc123)
            
        Returns:
            Optional[str]: Contraseña o None si no se encuentra
        """
        import re

        # Patrón para extraer la contraseña
        pattern = r'pwd=([^&]+)'
        match = re.search(pattern, zoom_url)

        if match:
            return match.group(1)

        return None

