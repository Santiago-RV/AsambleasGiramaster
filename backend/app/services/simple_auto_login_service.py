from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import Optional, Dict
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class SimpleAutoLoginService:
    """
    Servicio para generar y validar JWT temporales para auto-login
    No requiere tabla en base de datos
    """
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
    
    def generate_auto_login_token(
        self,
        username: str,
        password: str,
        expiration_hours: int = 48
    ) -> str:
        """
        Genera un JWT temporal con las credenciales
        
        Args:
            username: Nombre de usuario
            password: Contraseña temporal en texto plano
            expiration_hours: Horas hasta expiración (default: 48)
            
        Returns:
            str: JWT token codificado
        """
        try:
            # Calcular fecha de expiración
            expire = datetime.utcnow() + timedelta(hours=expiration_hours)
            
            # Crear payload del JWT
            payload = {
                "sub": username,
                "pwd": password,  # Contraseña en texto plano (temporal)
                "exp": expire,
                "type": "auto_login",
                "iat": datetime.utcnow()
            }
            
            # Generar JWT
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            
            logger.info(f"🔐 Token de auto-login generado para {username}")
            
            return token
            
        except Exception as e:
            logger.error(f"Error al generar token de auto-login: {str(e)}")
            raise
    
    def decode_auto_login_token(self, token: str) -> Optional[Dict[str, str]]:
        """
        Decodifica y valida un JWT de auto-login
        
        Args:
            token: JWT token a decodificar
            
        Returns:
            Dict con username y password si es válido, None si no
        """
        try:
            # Decodificar y validar JWT
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            # Verificar que es un token de auto-login
            if payload.get("type") != "auto_login":
                logger.warning("Token no es de tipo auto_login")
                return None
            
            username = payload.get("sub")
            password = payload.get("pwd")
            
            if not username or not password:
                logger.warning("Token no contiene credenciales completas")
                return None
            
            logger.info(f"✅ Token de auto-login válido para {username}")
            
            return {
                "username": username,
                "password": password
            }
            
        except JWTError as e:
            logger.warning(f"Token inválido o expirado: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error al decodificar token: {str(e)}")
            return None


# Instancia global del servicio
simple_auto_login_service = SimpleAutoLoginService()