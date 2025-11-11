"""
Servicio para el envío de correos electrónicos de reuniones.
Maneja el envío de invitaciones y notificaciones relacionadas con reuniones.
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
import logging

from app.models.meeting_model import MeetingModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.utils.email_sender import email_sender

logger = logging.getLogger(__name__)


class EmailService:
    """Servicio para gestionar el envío de correos electrónicos"""
    
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
    
    def _load_template(self, template_name: str) -> str:
        """Carga una plantilla HTML desde el sistema de archivos"""
        template_path = self.templates_dir / template_name
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Plantilla no encontrada: {template_path}")
            raise
    
    def _format_datetime(self, dt: datetime) -> tuple:
        """
        Formatea una fecha/hora en formato legible.
        
        Returns:
            tuple: (fecha_formateada, hora_formateada)
        """
        months = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        
        days = {
            0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves",
            4: "Viernes", 5: "Sábado", 6: "Domingo"
        }
        
        day_name = days[dt.weekday()]
        month_name = months[dt.month]
        
        date_str = f"{day_name}, {dt.day} de {month_name} de {dt.year}"
        time_str = dt.strftime("%I:%M %p")
        
        return date_str, time_str
    
    def _render_template(self, template: str, data: dict) -> str:
        """
        Renderiza una plantilla con los datos proporcionados.
        Implementación simple de reemplazo de placeholders.
        """
        rendered = template
        
        for key, value in data.items():
            placeholder = f"{{{{{key}}}}}"
            rendered = rendered.replace(placeholder, str(value) if value is not None else "")
        
        # Manejar condicionales simples {{#if field}}...{{/if}}
        # Para una implementación completa, considera usar Jinja2
        import re
        
        # Eliminar bloques condicionales si el campo está vacío
        conditional_pattern = r'\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}'
        matches = re.finditer(conditional_pattern, rendered, re.DOTALL)
        
        for match in matches:
            field_name = match.group(1)
            content = match.group(2)
            full_match = match.group(0)
            
            if field_name in data and data[field_name]:
                rendered = rendered.replace(full_match, content)
            else:
                rendered = rendered.replace(full_match, "")
        
        return rendered
    
    async def send_meeting_invitation(
        self,
        db: AsyncSession,
        meeting_id: int,
        user_ids: Optional[List[int]] = None
    ) -> dict:
        """
        Envía invitaciones por correo a usuarios de una reunión.
        Si no se especifican user_ids, se envía a todos los usuarios de la unidad residencial.
        
        Args:
            db: Sesión de base de datos
            meeting_id: ID de la reunión
            user_ids: Lista opcional de IDs de usuarios específicos
            
        Returns:
            dict: Estadísticas del envío
        """
        try:
            # Obtener información de la reunión
            query = select(MeetingModel).where(MeetingModel.id == meeting_id)
            result = await db.execute(query)
            meeting = result.scalar_one_or_none()
            
            if not meeting:
                logger.error(f"Reunión con ID {meeting_id} no encontrada")
                return {"error": "Reunión no encontrada"}
            
            # Obtener información de la unidad residencial
            query = select(ResidentialUnitModel).where(
                ResidentialUnitModel.id == meeting.int_id_residential_unit
            )
            result = await db.execute(query)
            residential_unit = result.scalar_one_or_none()
            
            # Obtener información del organizador
            query = select(UserModel, DataUserModel).join(
                DataUserModel,
                UserModel.int_data_user_id == DataUserModel.id
            ).where(UserModel.id == meeting.int_organizer_id)
            result = await db.execute(query)
            organizer_data = result.first()
            
            organizer_name = "No especificado"
            if organizer_data:
                organizer_user, organizer_info = organizer_data
                organizer_name = f"{organizer_info.str_firstname} {organizer_info.str_lastname}"
            
            # Obtener usuarios de la unidad residencial
            if user_ids:
                # Enviar solo a usuarios específicos
                query = select(UserModel, DataUserModel).join(
                    DataUserModel,
                    UserModel.int_data_user_id == DataUserModel.id
                ).join(
                    UserResidentialUnitModel,
                    UserModel.id == UserResidentialUnitModel.int_user_id
                ).where(
                    UserResidentialUnitModel.int_residential_unit_id == meeting.int_id_residential_unit,
                    UserModel.id.in_(user_ids),
                    UserModel.bln_is_active == True
                )
            else:
                # Enviar a todos los usuarios de la unidad residencial
                query = select(UserModel, DataUserModel).join(
                    DataUserModel,
                    UserModel.int_data_user_id == DataUserModel.id
                ).join(
                    UserResidentialUnitModel,
                    UserModel.id == UserResidentialUnitModel.int_user_id
                ).where(
                    UserResidentialUnitModel.int_residential_unit_id == meeting.int_id_residential_unit,
                    UserModel.bln_is_active == True
                )
            
            result = await db.execute(query)
            users_data = result.all()
            
            if not users_data:
                logger.warning(f"No se encontraron usuarios para la reunión {meeting_id}")
                return {"error": "No se encontraron usuarios"}
            
            # Cargar plantilla
            template = self._load_template("meeting_invitation_email.html")
            
            # Formatear fecha y hora
            meeting_date, meeting_time = self._format_datetime(meeting.dat_schedule_date)
            
            # Preparar emails para envío masivo
            emails_to_send = []
            
            for user, data_user in users_data:
                # Preparar datos para la plantilla
                template_data = {
                    "user_name": f"{data_user.str_firstname} {data_user.str_lastname}",
                    "meeting_title": meeting.str_title,
                    "residential_unit": residential_unit.str_name if residential_unit else "No especificada",
                    "meeting_date": meeting_date,
                    "meeting_time": meeting_time,
                    "duration": str(meeting.int_estimated_duration),
                    "meeting_type": meeting.str_meeting_type,
                    "organizer_name": organizer_name,
                    "meeting_description": meeting.str_description or "",
                    "zoom_meeting_id": str(meeting.int_zoom_meeting_id),
                    "zoom_password": meeting.str_zoom_password or "",
                    "zoom_join_url": meeting.str_zoom_join_url,
                    "current_year": str(datetime.now().year)
                }
                
                # Renderizar plantilla
                html_content = self._render_template(template, template_data)
                
                # Agregar a la lista de envíos
                emails_to_send.append({
                    "to_emails": [data_user.str_email],
                    "subject": f"Invitación: {meeting.str_title}",
                    "html_content": html_content
                })
            
            # Enviar emails
            stats = email_sender.send_bulk_emails(emails_to_send)
            
            logger.info(
                f"Invitaciones enviadas para reunión {meeting_id}: "
                f"{stats['exitosos']} exitosos, {stats['fallidos']} fallidos"
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error al enviar invitaciones: {str(e)}")
            return {"error": str(e)}
    
    async def send_meeting_reminder(
        self,
        db: AsyncSession,
        meeting_id: int,
        user_ids: Optional[List[int]] = None
    ) -> dict:
        """
        Envía recordatorio de reunión próxima a usuarios.
        Similar a send_meeting_invitation pero con mensaje diferente.
        """
        # Implementación similar a send_meeting_invitation
        # pero con una plantilla de recordatorio
        # Por ahora reutiliza el mismo método
        return await self.send_meeting_invitation(db, meeting_id, user_ids)


# Instancia global del servicio de email
email_service = EmailService()

