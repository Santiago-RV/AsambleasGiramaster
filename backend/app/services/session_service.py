import uuid
from datetime import datetime, timedelta
from app.utils.timezone_utils import colombia_now
from typing import List, Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.user_session_model import UserSessionModel
from app.core.logging_config import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class SessionService:
    """
    Servicio para gestionar sesiones de usuarios
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_session(
        self,
        user_id: int,
        token_jti: str,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        expires_in_minutes: int = None
    ) -> UserSessionModel:
        """
        Crea una nueva sesión para el usuario
        
        Args:
            user_id: ID del usuario
            token_jti: JWT ID único
            ip_address: Dirección IP del cliente
            device_info: Información del dispositivo
            expires_in_minutes: Minutos hasta expiración (default: ACCESS_TOKEN_EXPIRE_MINUTES)
            
        Returns:
            UserSessionModel: La sesión creada
        """
        if expires_in_minutes is None:
            expires_in_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        
        expires_at = colombia_now() + timedelta(minutes=expires_in_minutes)
        
        session = UserSessionModel(
            user_id=user_id,
            token_jti=token_jti,
            ip_address=ip_address,
            device_info=device_info,
            expires_at=expires_at,
            is_active=True
        )
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        logger.info(f"✅ Sesión creada para usuario {user_id} (jti: {token_jti})")
        return session
    
    async def get_active_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Obtiene las sesiones activas de un usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Lista de sesiones activas
        """
        query = select(UserSessionModel).where(
            and_(
                UserSessionModel.user_id == user_id,
                UserSessionModel.is_active == True,
                UserSessionModel.expires_at > colombia_now()
            )
        ).order_by(UserSessionModel.created_at.desc())
        
        result = await self.db.execute(query)
        sessions = result.scalars().all()
        
        return [
            {
                "id": session.id,
                "token_jti": session.token_jti,
                "device_info": session.device_info,
                "ip_address": session.ip_address,
                "created_at": session.created_at.isoformat() if session.created_at else None,
                "expires_at": session.expires_at.isoformat() if session.expires_at else None,
                "is_active": session.is_active
            }
            for session in sessions
        ]
    
    async def get_session_by_jti(self, token_jti: str) -> Optional[UserSessionModel]:
        """
        Obtiene una sesión por su JTI
        
        Args:
            token_jti: JWT ID único
            
        Returns:
            UserSessionModel o None
        """
        query = select(UserSessionModel).where(UserSessionModel.token_jti == token_jti)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def deactivate_session(self, session_id: int, user_id: int) -> bool:
        """
        Desactiva una sesión específica
        
        Args:
            session_id: ID de la sesión
            user_id: ID del usuario (para verificación de propiedad)
            
        Returns:
            True si se desactivó, False si no se encontró
        """
        query = select(UserSessionModel).where(
            and_(
                UserSessionModel.id == session_id,
                UserSessionModel.user_id == user_id
            )
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        
        if not session:
            logger.warning(f"Sesión {session_id} no encontrada para usuario {user_id}")
            return False
        
        session.is_active = False
        await self.db.commit()
        
        logger.info(f"🔒 Sesión {session_id} desactivada para usuario {user_id}")
        return True
    
    async def deactivate_session_by_jti(self, token_jti: str) -> bool:
        """
        Desactiva una sesión por su JTI
        
        Args:
            token_jti: JWT ID único
            
        Returns:
            True si se desactivó, False si no se encontró
        """
        query = select(UserSessionModel).where(UserSessionModel.token_jti == token_jti)
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        
        if not session:
            logger.warning(f"Sesión con jti {token_jti} no encontrada")
            return False
        
        session.is_active = False
        await self.db.commit()
        
        logger.info(f"🔒 Sesión con jti {token_jti} desactivada")
        return True
    
    async def deactivate_all_sessions(self, user_id: int) -> int:
        """
        Desactiva todas las sesiones de un usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Número de sesiones desactivadas
        """
        query = select(UserSessionModel).where(
            and_(
                UserSessionModel.user_id == user_id,
                UserSessionModel.is_active == True
            )
        )
        result = await self.db.execute(query)
        sessions = result.scalars().all()
        
        count = 0
        for session in sessions:
            session.is_active = False
            count += 1
        
        await self.db.commit()
        
        logger.info(f"🔒 {count} sesiones desactivadas para usuario {user_id}")
        return count
    
    async def deactivate_user_session_by_admin(
        self, 
        target_user_id: int, 
        session_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Desactiva sesiones de un usuario (para uso por admin/superadmin)
        
        Args:
            target_user_id: ID del usuario objetivo
            session_id: ID de sesión específica (opcional)
            
        Returns:
            Dict con resultado
        """
        if session_id:
            query = select(UserSessionModel).where(
                and_(
                    UserSessionModel.id == session_id,
                    UserSessionModel.user_id == target_user_id
                )
            )
            result = await self.db.execute(query)
            session = result.scalar_one_or_none()
            
            if not session:
                return {"success": False, "message": "Sesión no encontrada"}
            
            session.is_active = False
            await self.db.commit()
            
            return {"success": True, "message": "Sesión cerrada exitosamente", "count": 1}
        else:
            count = await self.deactivate_all_sessions(target_user_id)
            return {"success": True, "message": f"{count} sesiones cerradas exitosamente", "count": count}
    
    async def cleanup_expired_sessions(self) -> int:
        """
        Limpia sesiones expiradas (para llamado periódico)
        
        Returns:
            Número de sesiones eliminadas
        """
        query = select(UserSessionModel).where(
            UserSessionModel.expires_at < colombia_now()
        )
        result = await self.db.execute(query)
        sessions = result.scalars().all()
        
        count = 0
        for session in sessions:
            await self.db.delete(session)
            count += 1
        
        if count > 0:
            await self.db.commit()
            logger.info(f"🧹 {count} sesiones expiradas eliminadas")
        
        return count
