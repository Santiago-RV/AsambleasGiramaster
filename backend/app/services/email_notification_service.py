"""
Servicio para gestionar el registro de notificaciones de email en la base de datos
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import logging

from app.models.email_notification_model import EmailNotificationModel

logger = logging.getLogger(__name__)


class EmailNotificationService:
    """Servicio para registrar notificaciones de email"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_notification(
        self,
        user_id: int,
        template: str,
        status: str = "pending",
        meeting_id: Optional[int] = None
    ) -> EmailNotificationModel:
        """
        Crea un registro de notificación de email
        
        Args:
            user_id: ID del usuario que recibirá el email
            template: Tipo de plantilla (welcome, meeting_invite, meeting_reminder, etc.)
            status: Estado de la notificación (pending, sent, failed)
            meeting_id: ID de la reunión (opcional, solo para emails de reuniones)
        
        Returns:
            EmailNotificationModel: Notificación creada
        """
        try:
            notification = EmailNotificationModel(
                int_user_id=user_id,
                int_meeting_id=meeting_id,
                str_template=template,
                str_status=status,
                dat_sent_at=datetime.now() if status == "sent" else None,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            self.db.add(notification)
            await self.db.flush()  # Para obtener el ID sin hacer commit
            
            logger.info(
                f"📧 Notificación creada: user_id={user_id}, "
                f"template={template}, status={status}, id={notification.id}"
            )
            
            return notification
            
        except Exception as e:
            logger.error(f"❌ Error al crear notificación: {str(e)}")
            raise
    
    async def update_status(
        self,
        notification_id: int,
        status: str,
        commit: bool = False
    ) -> Optional[EmailNotificationModel]:
        """
        Actualiza el estado de una notificación
        
        Args:
            notification_id: ID de la notificación
            status: Nuevo estado (sent, failed)
            commit: Si True, hace commit inmediatamente
        
        Returns:
            EmailNotificationModel: Notificación actualizada o None si no existe
        """
        try:
            query = select(EmailNotificationModel).where(
                EmailNotificationModel.id == notification_id
            )
            result = await self.db.execute(query)
            notification = result.scalar_one_or_none()
            
            if notification:
                notification.str_status = status
                notification.updated_at = datetime.now()
                
                if status == "sent":
                    notification.dat_sent_at = datetime.now()
                
                if commit:
                    await self.db.commit()
                    await self.db.refresh(notification)
                
                logger.info(
                    f"✅ Notificación {notification_id} actualizada a {status}"
                )
            else:
                logger.warning(
                    f"⚠️ Notificación {notification_id} no encontrada"
                )
            
            return notification
            
        except Exception as e:
            logger.error(
                f"❌ Error al actualizar notificación {notification_id}: {str(e)}"
            )
            raise
    
    async def get_user_notifications(
        self,
        user_id: int,
        limit: int = 50,
        template: Optional[str] = None
    ) -> List[EmailNotificationModel]:
        """
        Obtiene las notificaciones de un usuario
        
        Args:
            user_id: ID del usuario
            limit: Número máximo de registros
            template: Filtrar por tipo de plantilla (opcional)
        
        Returns:
            List[EmailNotificationModel]: Lista de notificaciones
        """
        try:
            query = select(EmailNotificationModel).where(
                EmailNotificationModel.int_user_id == user_id
            )
            
            if template:
                query = query.where(EmailNotificationModel.str_template == template)
            
            query = query.order_by(
                EmailNotificationModel.created_at.desc()
            ).limit(limit)
            
            result = await self.db.execute(query)
            notifications = result.scalars().all()
            
            return list(notifications)
            
        except Exception as e:
            logger.error(
                f"❌ Error al obtener notificaciones del usuario {user_id}: {str(e)}"
            )
            raise
    
    async def get_meeting_notifications(
        self,
        meeting_id: int
    ) -> List[EmailNotificationModel]:
        """
        Obtiene todas las notificaciones enviadas para una reunión
        
        Args:
            meeting_id: ID de la reunión
        
        Returns:
            List[EmailNotificationModel]: Lista de notificaciones
        """
        try:
            query = select(EmailNotificationModel).where(
                EmailNotificationModel.int_meeting_id == meeting_id
            ).order_by(EmailNotificationModel.created_at.desc())
            
            result = await self.db.execute(query)
            notifications = result.scalars().all()
            
            return list(notifications)
            
        except Exception as e:
            logger.error(
                f"❌ Error al obtener notificaciones de reunión {meeting_id}: {str(e)}"
            )
            raise