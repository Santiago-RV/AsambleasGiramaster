import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.utils.timezone_utils import colombia_now, utc_to_colombia
from typing import Optional, Dict, List
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
        expiration_hours: int = settings.QR_INDIVIDUAL_EXPIRATION_HOURS,
        meeting_id: int = None
    ) -> str:
        """
        Genera un JWT temporal para auto-login
        
        Args:
            username: Nombre de usuario
            expiration_hours: Horas hasta expiración (default: settings.QR_INDIVIDUAL_EXPIRATION_HOURS)
            meeting_id: ID de reunión presencial (opcional)
            
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
            
            if meeting_id is not None:
                payload["meeting_id"] = meeting_id
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            
            logger.info(f"🔐 Token de auto-login generado para {username} (jti: {token_id}, meeting_id: {meeting_id})")
            
            return token
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error al generar token de auto-login: {str(e)}")
            raise
    
    def generate_auto_login_token_with_id(
        self,
        username: str,
        token_id: str,
        expiration_hours: int = settings.QR_INDIVIDUAL_EXPIRATION_HOURS,
        meeting_id: int = None
    ) -> str:
        """
        Genera un JWT temporal para auto-login usando un token_id existente.
        Esto permite reutilizar tokens sin crear nuevos registros en la BD.
        
        Args:
            username: Nombre de usuario
            token_id: UUID del token existente a reutilizar
            expiration_hours: Horas hasta expiración (default: settings.QR_INDIVIDUAL_EXPIRATION_HOURS)
            meeting_id: ID de reunión presencial (opcional)
            
        Returns:
            str: JWT token codificado
        """
        try:
            now = datetime.utcnow()
            expire = now + timedelta(hours=expiration_hours)
            
            if expire <= now:
                logger.error(f"Error: La expiración calculada ({expire}) es menor que la hora actual ({now})")
                raise ValueError("La expiración del token no puede ser en el pasado")
            
            payload = {
                "sub": username,
                "exp": expire,
                "type": "auto_login",
                "iat": now,
                "jti": token_id
            }
            
            if meeting_id is not None:
                payload["meeting_id"] = meeting_id
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            
            logger.info(f"♻️ Token de auto-login regenerado para {username} (jti: {token_id}, reutilizado)")
            
            return token
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error al regenerar token de auto-login: {str(e)}")
            raise
    
    def decode_auto_login_token(self, token: str) -> Optional[Dict[str, str]]:
        """
        Decodifica y valida un JWT de auto-login
        
        Args:
            token: JWT token a decodificar
            
        Returns:
            Dict con username, token_id y meeting_id (opcional) si es válido, None si no
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
            meeting_id = payload.get("meeting_id")
            
            if not username:
                logger.warning("Token no contiene username")
                return None
            
            logger.info(f"✅ Token de auto-login válido para {username} (jti: {token_id}, meeting_id: {meeting_id})")
            
            result = {
                "username": username,
                "token_id": token_id
            }
            
            if meeting_id is not None:
                result["meeting_id"] = meeting_id
            
            return result
            
        except JWTError as e:
            logger.warning(f"Token inválido o expirado: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error al decodificar token: {str(e)}")
            return None
    
    async def upsert_user_token(self, db, token_id: str, user_id: int, ip_address: str = None, expires_at = None):
        """
        Registra o actualiza un token de auto-login para un usuario.
        Si el token ya existe, actualiza su expires_at (y ip_address si se pasa)
        en vez de reinsertarlo, para mantenerlo alineado con el JWT vigente.

        Args:
            db: Sesión de base de datos
            token_id: UUID del token
            user_id: ID del usuario
            ip_address: Dirección IP del cliente
            expires_at: Fecha de expiración del token (si no se pasa, usa settings.QR_INDIVIDUAL_EXPIRATION_HOURS por defecto)
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        from sqlalchemy import select

        result = await db.execute(
            select(UsedAutoLoginTokenModel).where(
                UsedAutoLoginTokenModel.token_id == token_id
            )
        )
        existing_token = result.scalar_one_or_none()

        if expires_at is None:
            expires_at = colombia_now() + timedelta(hours=settings.QR_INDIVIDUAL_EXPIRATION_HOURS)

        if existing_token:
            existing_token.expires_at = expires_at
            if ip_address is not None:
                existing_token.ip_address = ip_address
            await db.commit()
            logger.info(f"Token {token_id} actualizado para usuario {user_id} (nueva expiración: {expires_at})")
            return
        
        new_token = UsedAutoLoginTokenModel(
            token_id=token_id,
            user_id=user_id,
            ip_address=ip_address,
            expires_at=expires_at
        )
        db.add(new_token)
        await db.commit()
        logger.info(f"Token creado para usuario {user_id} (token_id: {token_id})")
    
    async def get_valid_tokens_for_users(self, db, user_ids: List[int]) -> Dict[int, Optional[Dict]]:
        """
        Obtiene los tokens válidos (no expirados) para una lista de usuarios.
        
        Args:
            db: Sesión de base de datos
            user_ids: Lista de IDs de usuarios
            
        Returns:
            Dict: {user_id: {"token_id": str, "expires_at": datetime} o None}
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        from sqlalchemy import select
        
        now = colombia_now()
        
        result = await db.execute(
            select(UsedAutoLoginTokenModel).where(
                UsedAutoLoginTokenModel.user_id.in_(user_ids),
                UsedAutoLoginTokenModel.expires_at > now
            )
        )
        tokens = result.scalars().all()
        
        # Convertir a diccionario por user_id
        user_tokens = {}
        for token in tokens:
            if token.user_id not in user_tokens or token.expires_at > user_tokens[token.user_id]["expires_at"]:
                user_tokens[token.user_id] = {
                    "token_id": token.token_id,
                    "expires_at": token.expires_at
                }
        
        return user_tokens
    
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
        if user_token.expires_at and user_token.expires_at < colombia_now():
            logger.info(f"⛔ Token {token_id} ha expirado para usuario {user_id}")
            return False
        
        return True
    
    def compute_device_fingerprint(
        self,
        device_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        accept_language: Optional[str] = None
    ) -> str:
        """
        Calcula la huella del dispositivo que abre el link de auto-login.

        Prioriza el device_id que el frontend guarda en localStorage; si no llega
        (QR abierto fuera de la app, storage bloqueado, curl), cae al User-Agent
        junto con el idioma del navegador.

        Returns:
            str: hash hexadecimal de 64 caracteres
        """
        if device_id:
            raw = f"did:{device_id.strip()}"
        else:
            raw = f"ua:{user_agent or ''}|{accept_language or ''}"

        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def consume_token_for_device(
        self,
        db,
        token_id: str,
        user_id: int,
        fingerprint: str,
        ip_address: str = None
    ) -> tuple:
        """
        Valida y consume un token de auto-login para un dispositivo concreto.

        El primer uso ata el token a la huella del dispositivo (TOFU). Los usos
        siguientes solo se permiten desde esa misma huella, salvo dentro de la
        ventana de gracia posterior al primer uso, donde el token se re-ata.

        A diferencia de upsert_user_token, NUNCA modifica expires_at: usar el
        link no debe extender su vigencia.

        Args:
            db: Sesión de base de datos
            token_id: UUID (jti) del token
            user_id: ID del usuario dueño del token
            fingerprint: Huella del dispositivo actual
            ip_address: IP del cliente

        Returns:
            tuple[bool, str]: (permitido, motivo). Motivos: "ok", "invalid",
            "expired", "other_device"
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
            return False, "invalid"

        now = colombia_now()

        if user_token.expires_at and user_token.expires_at < now:
            logger.info(f"⛔ Token {token_id} ha expirado para usuario {user_id}")
            return False, "expired"

        if not settings.AUTO_LOGIN_DEVICE_BINDING_ENABLED:
            user_token.use_count = (user_token.use_count or 0) + 1
            if ip_address:
                user_token.ip_address = ip_address
            await db.commit()
            return True, "ok"

        if not user_token.device_fingerprint:
            # Primer uso: el token queda atado a este dispositivo
            user_token.device_fingerprint = fingerprint
            user_token.first_used_at = now
            user_token.use_count = 1
            if ip_address:
                user_token.ip_address = ip_address
            await db.commit()
            logger.info(f"🔗 Token {token_id} atado al dispositivo del usuario {user_id}")
            return True, "ok"

        if user_token.device_fingerprint != fingerprint:
            grace_limit = (user_token.first_used_at or now) + timedelta(
                minutes=settings.AUTO_LOGIN_REBIND_GRACE_MINUTES
            )
            if now > grace_limit:
                logger.warning(
                    f"⛔ Token {token_id} usado desde otro dispositivo (usuario {user_id})"
                )
                return False, "other_device"

            # Dentro de la gracia: el usuario saltó del webview al navegador
            user_token.device_fingerprint = fingerprint
            logger.info(f"♻️ Token {token_id} re-atado dentro de la ventana de gracia")

        user_token.use_count = (user_token.use_count or 0) + 1
        if ip_address:
            user_token.ip_address = ip_address
        await db.commit()
        return True, "ok"

    async def revoke_user_tokens(self, db, user_id: int, except_token_id: str = None) -> int:
        """
        Revoca los tokens de auto-login de un usuario marcándolos como expirados.

        No borra las filas para conservar el rastro; is_token_valid_for_user y
        consume_token_for_device ya tratan un token vencido como inválido.

        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            except_token_id: token_id que NO debe revocarse (el recién emitido)

        Returns:
            int: Número de tokens revocados
        """
        from app.models.used_auto_login_token_model import UsedAutoLoginTokenModel
        from sqlalchemy import update

        now = colombia_now()
        conditions = [
            UsedAutoLoginTokenModel.user_id == user_id,
            UsedAutoLoginTokenModel.expires_at > now
        ]
        if except_token_id:
            conditions.append(UsedAutoLoginTokenModel.token_id != except_token_id)

        result = await db.execute(
            update(UsedAutoLoginTokenModel)
            .where(*conditions)
            .values(expires_at=now)
        )
        revoked = result.rowcount or 0
        if revoked > 0:
            logger.info(f"🚫 Revocados {revoked} tokens previos del usuario {user_id}")
        return revoked

    async def register_issued_token(
        self,
        db,
        token: str,
        user_id: int,
        revoke_previous: bool = True
    ) -> Optional[str]:
        """
        Punto único de registro de un link de auto-login recién emitido.

        Extrae el jti y el exp del propio JWT (en vez de recalcular la expiración
        desde settings, que desalinea el espejo en BD respecto al token real),
        persiste la fila y revoca los demás tokens vigentes del usuario.

        Todo emisor de links debe pasar por acá: si el jti no queda en la tabla,
        el endpoint de auto-login responde 410 y el link nace muerto.

        Args:
            db: Sesión de base de datos
            token: JWT de auto-login ya generado
            user_id: ID del usuario dueño del token
            revoke_previous: Si revoca los links anteriores del usuario

        Returns:
            str: token_id (jti) registrado, o None si el token no es válido
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except JWTError as e:
            logger.error(f"No se pudo registrar el token emitido: {str(e)}")
            return None

        token_id = payload.get("jti")
        exp = payload.get("exp")

        if not token_id or not exp:
            logger.error("El token emitido no contiene jti o exp; no se registra")
            return None

        expires_at = utc_to_colombia(datetime.fromtimestamp(exp, tz=timezone.utc))

        await self.upsert_user_token(db, token_id, user_id, expires_at=expires_at)

        if revoke_previous:
            await self.revoke_user_tokens(db, user_id, except_token_id=token_id)
            await db.commit()

        return token_id

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
                UsedAutoLoginTokenModel.expires_at < colombia_now()
            )
        )
        await db.commit()
        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(f"🧹 Se eliminaron {deleted_count} tokens de auto-login expirados")
        return deleted_count


simple_auto_login_service = SimpleAutoLoginService()
