"""
Servicio para el envío de correos electrónicos de reuniones.
Maneja el envío de invitaciones y notificaciones relacionadas con reuniones.
Carga credenciales SMTP desde la base de datos (tbl_system_config).
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
from app.utils.email_sender import EmailSender
from app.services.email_notification_service import EmailNotificationService
from app.services.qr_service import qr_service
from jinja2 import Template
        
logger = logging.getLogger(__name__)


class EmailService:
    """
    Servicio para gestionar el envío de correos electrónicos.
    
    Requiere una sesión de base de datos para cargar credenciales SMTP
    desde tbl_system_config en vez de variables de entorno.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_sender = EmailSender(db)
        self.templates_dir = Path(__file__).parent.parent / "templates"
    
    async def send_qr_access_email(
        self,
        db: AsyncSession,
        to_email: str,
        resident_name: str,
        apartment_number: str,
        username: str,
        auto_login_url: str,
        auto_login_token: str,
        residential_unit_id: int,
        qr_base64: Optional[str] = None
    ):
        """
        Envía un correo electrónico con el código QR de acceso.
        
        Args:
            db: Sesión de base de datos
            to_email: Email del destinatario
            resident_name: Nombre completo del residente
            apartment_number: Número de apartamento
            username: Nombre de usuario
            auto_login_url: URL de auto-login (debe apuntar al frontend)
            auto_login_token: Token JWT para auto-login
            residential_unit_id: ID de la unidad residencial
            qr_base64: QR en base64 ya generado (opcional)
        """
        try:
            template_path = self.templates_dir / "email_qr_access.html"
            
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
            
            qr_image_url = qr_base64 or f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={auto_login_url}"
            
            # Obtener información de soporte técnico
            from app.services.support_service import SupportService
            support_service = SupportService(db)
            support_data = await support_service.get_support_info(residential_unit_id)
            
            # Renderizar template
            template = Template(template_content)
            html_content = template.render(
                resident_name=resident_name,
                username=username,
                apartment_number=apartment_number,
                auto_login_url=auto_login_url,
                qr_image_url=qr_image_url,
                current_year=str(datetime.now().year),
                support_name=support_data.get("str_support_name") if support_data else None,
                support_email=support_data.get("str_support_email") if support_data else None,
                support_phone=support_data.get("str_support_phone") if support_data else None,
                support_whatsapp=support_data.get("str_support_whatsapp") if support_data else None,
            )
            
            # Asunto del correo
            subject = "Tu Código de Acceso Directo - Asambleas Giramaster"
            
            # Enviar el correo usando credenciales de DB
            await self.email_sender.send_email_async(
                to_emails=[to_email],
                subject=subject,
                html_content=html_content
            )
            
            logger.info(f"✅ Correo con código QR enviado a {to_email}")
            
        except Exception as e:
            logger.error(f"❌ Error al enviar correo con QR a {to_email}: {str(e)}")
            raise
    
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
        Renderiza una plantilla con los datos proporcionados usando Jinja2.
        Soporta condicionales {% if %}, bucles {% for %}, y filtros de Jinja2.
        """
        template_obj = Template(template)
        return template_obj.render(**data)
    
    async def send_meeting_invitation(
        self,
        db: AsyncSession,
        meeting_id: int,
        user_ids: Optional[List[int]] = None,
        frontend_url: Optional[str] = None
    ) -> dict:
        """
        Envía invitaciones por correo a usuarios de una reunión.
        Registra cada envío en tbl_email_notifications.
        Si no se especifican user_ids, se envía a todos los usuarios de la unidad residencial.
        
        Args:
            db: Sesión de base de datos
            meeting_id: ID de la reunión
            user_ids: Lista opcional de IDs de usuarios específicos
            frontend_url: URL base del frontend para construir auto-login URL
            
        Returns:
            dict: Estadísticas del envío con notificaciones registradas
        """
        try:
            # Crear instancia del servicio de notificaciones
            notification_service = EmailNotificationService(db)
            
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
            
            # Obtener información de soporte técnico
            from app.services.support_service import SupportService
            support_service = SupportService(db)
            support_data = await support_service.get_support_info(meeting.int_id_residential_unit)
            
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
                    UserModel.id.in_(user_ids)
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
                    UserResidentialUnitModel.int_residential_unit_id == meeting.int_id_residential_unit
                )
            
            result = await db.execute(query)
            users_data = result.all()
            
            if not users_data:
                logger.warning(f"No se encontraron usuarios para la reunión {meeting_id}")
                return {"error": "No se encontraron usuarios"}
            
            # Cargar plantilla
            template = self._load_template("email_meeting_invitation.html")
            
            # Formatear fecha y hora
            meeting_date, meeting_time = self._format_datetime(meeting.dat_schedule_date)
            
            # Preparar emails para envío masivo Y crear notificaciones
            emails_to_send = []
            notification_mapping = {}  # {email: notification_id}
            
            for user, data_user in users_data:
                # CREAR NOTIFICACIÓN EN ESTADO "PENDING"
                notification = await notification_service.create_notification(
                    user_id=user.id,
                    template="meeting_invite",
                    status="pending",
                    meeting_id=meeting_id
                )
                
                # Guardar mapeo email -> notification_id para actualizar después
                notification_mapping[data_user.str_email] = notification.id
                
                # PREPARAR DATOS PARA LA PLANTILLA
                template_data = {
                    "user_name": f"{data_user.str_firstname} {data_user.str_lastname}",
                    "meeting_title": meeting.str_title,
                    "residential_unit": residential_unit.str_name if residential_unit else "No especificada",
                    "meeting_date": meeting_date,
                    "meeting_time": meeting_time,
                    "duration": str(meeting.int_estimated_duration) if meeting.int_estimated_duration else "0",
                    "meeting_type": meeting.str_meeting_type,
                    "organizer_name": organizer_name,
                    "meeting_description": meeting.str_description or "",
                    "zoom_meeting_id": str(meeting.int_zoom_meeting_id) if meeting.int_zoom_meeting_id else "",
                    "zoom_password": meeting.str_zoom_password or "",
                    "zoom_join_url": meeting.str_zoom_join_url or "",
                    "str_modality": meeting.str_modality or "presencial",
                    "current_year": str(datetime.now().year),
                    "auto_login_url": None,
                    "auto_login_token": None,
                    "support_name": support_data.get("str_support_name") if support_data else None,
                    "support_email": support_data.get("str_support_email") if support_data else None,
                    "support_phone": support_data.get("str_support_phone") if support_data else None,
                }
                
                # Generar token de auto-login
                from app.services.simple_auto_login_service import SimpleAutoLoginService
                auto_login_service = SimpleAutoLoginService()
                auto_login_token = auto_login_service.generate_auto_login_token(
                    username=user.str_username,
                    expiration_hours=24
                )
                if auto_login_token:
                    template_data["auto_login_url"] = f"{frontend_url}/auto-login/{auto_login_token}"
                    template_data["auto_login_token"] = auto_login_token
                    logger.info(f"Auto-login generado para {data_user.str_email}")
                else:
                    logger.warning(f"No se pudo generar auto-login token para {data_user.str_email}")
                
                # Renderizar plantilla
                html_content = self._render_template(template, template_data)
                
                # AGREGAR A LA LISTA DE ENVÍOS
                emails_to_send.append({
                    "to_emails": [data_user.str_email],
                    "subject": f"Invitación: {meeting.str_title}",
                    "html_content": html_content
                })
            
            # ENVIAR EMAILS usando credenciales de DB
            stats = await self.email_sender.send_bulk_emails_async(emails_to_send)
            
            # ACTUALIZAR ESTADO DE NOTIFICACIONES
            # Necesito identificar cuáles emails se enviaron exitosamente
            # send_bulk_emails retorna: {'exitosos': int, 'fallidos': int, 'detalles': list}
            
            # Si send_bulk_emails NO retorna detalles de cada email individual,
            # asumimos que todos se enviaron (o fallaron todos)
            if stats.get('exitosos', 0) > 0:
                # Marcar todas las notificaciones como "sent"
                for email, notification_id in notification_mapping.items():
                    await notification_service.update_status(
                        notification_id=notification_id,
                        status="sent",
                        commit=False  # No hacer commit individual
                    )
            
            if stats.get('fallidos', 0) > 0:
                # Si hay fallidos pero no tenemos detalles, log de advertencia
                logger.warning(
                    f" {stats['fallidos']} emails fallaron. "
                    f"No se puede actualizar estado individual de notificaciones."
                )
            
            # 6️⃣ ACTUALIZAR CONTADOR DE INVITADOS EN LA REUNIÓN
            total_invitados = len(notification_mapping)
            meeting.int_total_invitated = total_invitados
            meeting.updated_at = datetime.now()

            # 7️⃣ COMMIT DE TODAS LAS NOTIFICACIONES Y ACTUALIZACIÓN DE REUNIÓN
            await db.commit()

            logger.info(
                f"Invitaciones enviadas para reunión {meeting_id}: "
                f"{stats['exitosos']} exitosos, {stats['fallidos']} fallidos. "
                f"📧 {len(notification_mapping)} notificaciones registradas. "
                f"👥 Total de invitados registrados: {total_invitados}"
            )

            # Agregar info de notificaciones al resultado
            stats['notifications_created'] = len(notification_mapping)
            stats['total_invitados'] = total_invitados

            return stats
            
        except Exception as e:
            await db.rollback()
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
    
    async def send_administrator_credentials_email(
        self,
        db: AsyncSession,
        to_email: str,
        firstname: str,
        lastname: str,
        username: str,
        password: str,
        residential_unit_name: str,
        residential_unit_id: int,
        auto_login_token: Optional[str] = None,
        frontend_url: Optional[str] = None
    ) -> bool:
        """
        Envía un email con las credenciales de acceso para un nuevo administrador.

        Args:
            db: Sesión de base de datos
            to_email: Email del administrador
            firstname: Nombre del administrador
            lastname: Apellido del administrador
            username: Username para acceso
            password: Contraseña temporal
            residential_unit_name: Nombre de la unidad residencial
            residential_unit_id: ID de la unidad residencial
            auto_login_token: Token JWT para auto-login (opcional)
            frontend_url: URL base del frontend para construir auto-login URL

        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        try:
            template_path = self.templates_dir / "email_admin_credentials.html"
            
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
            
            auto_login_url = None
            if auto_login_token:
                auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
            
            # Obtener información de soporte técnico
            from app.services.support_service import SupportService
            support_service = SupportService(db)
            support_data = await support_service.get_support_info(residential_unit_id)
            
            # Renderizar el template con los datos usando Jinja2
            template = Template(template_content)
            html_content = template.render(
                firstname=firstname,
                lastname=lastname,
                username=username,
                password=password,
                residential_unit_name=residential_unit_name,
                auto_login_url=auto_login_url,
                support_name=support_data.get("str_support_name") if support_data else None,
                support_email=support_data.get("str_support_email") if support_data else None,
                support_phone=support_data.get("str_support_phone") if support_data else None,
                support_whatsapp=support_data.get("str_support_whatsapp") if support_data else None,
            )
            
            # Asunto del email
            subject = f"Credenciales de Acceso - Administrador {residential_unit_name}"
            
            # Enviar el email usando credenciales de DB
            result = await self.email_sender.send_email_async(
                to_emails=[to_email],
                subject=subject,
                html_content=html_content
            )
            
            if result:
                logger.info(f"Email de credenciales enviado exitosamente a {to_email}")
                return True
            else:
                logger.warning(f"No se pudo enviar email a {to_email}")
                return False
            
        except FileNotFoundError as e:
            logger.error(f"Template no encontrado: {e}")
            return False
        
        except Exception as e:
            logger.error(f"Error al enviar email de credenciales: {e}")
            return False
        
    async def send_coproprietor_credentials_email(
        self,
        to_email: str,
        firstname: str,
        lastname: str,
        username: str,
        password: str,
        residential_unit_name: str,
        apartment_number: str,
        voting_weight: float,
        phone: Optional[str] = None,
        auto_login_token: Optional[str] = None,
        support_name: Optional[str] = None,
        support_email: Optional[str] = None,
        support_phone: Optional[str] = None,
        frontend_url: Optional[str] = None,
    ) -> bool:
        try:
            template_path = self.templates_dir / "email_coproprietario_credentials.html"

            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()

            auto_login_url = None
            if auto_login_token:
                auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                logger.info(f"🔗 URL de auto-login generada para {to_email}")

            template = Template(template_content)
            html_content = template.render(
                firstname=firstname,
                lastname=lastname,
                username=username,
                password=password,
                residential_unit_name=residential_unit_name,
                apartment_number=apartment_number,
                voting_weight=float(voting_weight),
                user_email=to_email,
                phone=phone,
                auto_login_url=auto_login_url,
                # ── Soporte técnico ─────────────────────────────────────────────
                support_name=support_name,
                support_email=support_email,
                support_phone=support_phone,
                # ────────────────────────────────────────────────────────────────
            )

            subject = f"Credenciales de Acceso - {residential_unit_name}"

            result = await self.email_sender.send_email_async(
                to_emails=[to_email],
                subject=subject,
                html_content=html_content
            )

            if result:
                logger.info(f"✅ Email de credenciales enviado exitosamente a {to_email}")
                return True
            else:
                logger.warning(f"⚠️ No se pudo enviar email a {to_email}")
                return False

        except FileNotFoundError as e:
            logger.error(f"❌ Template no encontrado: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Error al enviar email de credenciales: {e}")
            return False
        
    async def send_guest_credentials_email(
        self,
        db: AsyncSession,
        to_email: str,
        firstname: str,
        lastname: str,
        username: str,
        password: str,
        residential_unit_name: str,
        residential_unit_id: int,
        auto_login_token: Optional[str] = None,
        frontend_url: Optional[str] = None
    ) -> bool:
        """
        Envía email de bienvenida con credenciales para un invitado.
        
        Args:
            db: Sesión de base de datos
            to_email: Email del invitado
            firstname: Nombre
            lastname: Apellido
            username: Usuario generado
            password: Contraseña temporal
            residential_unit_name: Nombre de la unidad residencial
            residential_unit_id: ID de la unidad residencial
            auto_login_token: Token JWT para auto-login (opcional)
            frontend_url: URL base del frontend para construir auto-login URL
        """
        try:
            template_path = self.templates_dir / "email_guest_credentials.html"
            
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
            
            auto_login_url = None
            if auto_login_token:
                auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                logger.info(f"🔗 URL de auto-login generada para invitado {to_email}")
            
            # Obtener información de soporte técnico
            from app.services.support_service import SupportService
            support_service = SupportService(db)
            support_data = await support_service.get_support_info(residential_unit_id)
            
            # Renderizar template
            template = Template(template_content)
            html_content = template.render(
                firstname=firstname,
                lastname=lastname,
                username=username,
                password=password,
                residential_unit_name=residential_unit_name,
                user_email=to_email,
                auto_login_url=auto_login_url,
                support_name=support_data.get("str_support_name") if support_data else None,
                support_email=support_data.get("str_support_email") if support_data else None,
                support_phone=support_data.get("str_support_phone") if support_data else None,
                support_whatsapp=support_data.get("str_support_whatsapp") if support_data else None,
            )
            
            # Enviar email
            subject = f"Invitación a GIRAMASTER - {residential_unit_name}"
            
            result = await self.email_sender.send_email_async(
                to_emails=[to_email],
                subject=subject,
                html_content=html_content
            )
            
            if result:
                logger.info(f"✅ Email de invitado enviado a {to_email}")
                return True
            else:
                logger.warning(f"❌ No se pudo enviar email a {to_email}")
                return False
                
        except Exception as e:
            logger.error(f"Error al enviar email de invitado: {e}")
            return False