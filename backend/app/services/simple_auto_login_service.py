import uuid
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
        expiration_hours: int = 24
    ) -> str:
        """
        Genera un JWT temporal para auto-login
        
        Args:
            username: Nombre de usuario
            expiration_hours: Horas hasta expiración (default: 24)
            
        Returns:
            str: JWT token codificado
        """
        try:
            now = datetime.utcnow()
            expire = now + timedelta(hours=expiration_hours)
            
            if expire <= now:
                logger.error(f"Error: La expiración calculada ({expire}) es menor que la hora actual ({now})")
                raise ValueError("La expiración del token no puede ser en el pasado")
            
            token_id = str(uuid.uuid4())
            
            payload = {
                "sub": username,
                "exp": expire,
                "type": "auto_login",
                "iat": now,
                "jti": token_id
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            
            logger.info(f"🔐 Token de auto-login generado para {username} (jti: {token_id})")
            
            return token
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error al generar token de auto-login: {str(e)}")
            raise
    
    def decode_auto_login_token(self, token: str) -> Optional[Dict[str, str]]:
        """
        Decodifica y valida un JWT de auto-login
        
        Args:
            token: JWT token a decodificar
            
        Returns:
            Dict con username y token_id si es válido, None si no
        """
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            if payload.get("type") != "auto_login":
                logger.warning("Token no es de tipo auto_login")
                return None
            
            username = payload.get("sub")
            token_id = payload.get("jti")
            
            if not username:
                logger.warning("Token no contiene username")
                return None
            
            logger.info(f"✅ Token de auto-login válido para {username} (jti: {token_id})")
            
            return {
                "username": username,
                "token_id": token_id
            }
            
        except JWTError as e:
            logger.warning(f"Token inválido o expirado: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error al decodificar token: {str(e)}")
            return None
    
    async def upsert_user_token(self, db, token_id: str, user_id: int, ip_address: str = None, expires_at = None):
        """
        Crea un nuevo token de auto-login para un usuario.
        Permite múltiples tokens válidos por usuario (uno por cada QR generado).
        
        Args:
            db: Sesión de base de datos
            token_id: UUID del nuevo token
            user_id: ID del usuario
            ip_address: Dirección IP del cliente
            expires_at: Fecha de expiración del token (si no se pasa, usa 24h por defecto)
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        
        # Calcular expiración si no se proporciona (24 horas por defecto)
        if expires_at is None:
            expires_at = datetime.now() + timedelta(hours=24)
        
        # Crear nuevo registro (no actualiza los existentes)
        new_token = UsedAutoLoginTokenModel(
            token_id=token_id,
            user_id=user_id,
            ip_address=ip_address,
            expires_at=expires_at
        )
        db.add(new_token)
        await db.commit()
        logger.info(f"🔐 Nuevo token creado para usuario {user_id} (token_id: {token_id})")
    
    async def is_token_valid_for_user(self, db, token_id: str, user_id: int) -> bool:
        """
        Verifica si el token es válido para el usuario específico.
        
        Args:
            db: Sesión de base de datos
            token_id: UUID del token a verificar
            user_id: ID del usuario
            
        Returns:
            bool: True si el token es válido para el usuario y no ha expirado
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        from sqlalchemy import select
        
        result = await db.execute(
            select(UsedAutoLoginTokenModel).where(
                UsedAutoLoginTokenModel.user_id == user_id,
                UsedAutoLoginTokenModel.token_id == token_id
            )
        )
        user_token = result.scalar_one_or_none()
        
        if not user_token:
            return False
        
        # Verificar que el token no haya expirado
        if user_token.expires_at and user_token.expires_at < datetime.now():
            logger.info(f"⛔ Token {token_id} ha expirado para usuario {user_id}")
            return False
        
        return True
    
    async def is_token_used(self, db, token_id: str) -> bool:
        """
        Verifica si un token existe en la base de datos (deprecated - usar is_token_valid_for_user)
        
        Args:
            db: Sesión de base de datos
            token_id: UUID del token
            
        Returns:
            bool: True si el token existe
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        from sqlalchemy import select
        
        result = await db.execute(
            select(UsedAutoLoginTokenModel).where(
                UsedAutoLoginTokenModel.token_id == token_id
            )
        )
        used_token = result.scalar_one_or_none()
        return used_token is not None
    
    async def cleanup_expired_tokens(self, db):
        """
        Elimina los tokens de auto-login que han expirado de la base de datos.
        Puede llamarse periódicamente para mantener la tabla limpia.
        
        Args:
            db: Sesión de base de datos
            
        Returns:
            int: Número de tokens eliminados
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        from sqlalchemy import delete
        
        result = await db.execute(
            delete(UsedAutoLoginTokenModel).where(
                UsedAutoLoginTokenModel.expires_at < datetime.now()
            )
        )
        await db.commit()
        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(f"🧹 Se eliminaron {deleted_count} tokens de auto-login expirados")
        return deleted_count


simple_auto_login_service = SimpleAutoLoginService()
