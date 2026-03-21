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
        to_email: str,
        resident_name: str,
        apartment_number: str,
        username: str,
        auto_login_url: str,
        auto_login_token: str,
        qr_base64: Optional[str] = None
    ):
        """
        Envía un correo electrónico con el código QR de acceso.
        
        Args:
            to_email: Email del destinatario
            resident_name: Nombre completo del residente
            apartment_number: Número de apartamento
            username: Nombre de usuario
            auto_login_url: URL de auto-login (debe apuntar al frontend)
            auto_login_token: Token JWT para auto-login
            qr_base64: QR en base64 ya generado (opcional)
        """
        try:
            # Usar el QR que viene del endpoint (ya generado correctamente)
            qr_image_url = qr_base64
            
            # Asunto del correo
            subject = "Tu Código de Acceso Directo - Asambleas Giramaster"
            
            # Determinar qué imagen QR usar
            if qr_image_url:
                qr_img_tag = f'<img src="{qr_image_url}" alt="Código QR de Acceso" style="max-width: 100%; height: auto;" />'
            else:
                # Fallback al servicio externo
                qr_img_tag = f'<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={auto_login_url}" alt="Código QR de Acceso" />'
            
            # HTML del correo con el QR incrustado
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Código de Acceso - Asambleas Giramaster</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .qr-container {{ text-align: center; margin: 30px 0; }}
                    .qr-info {{ background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }}
                    .button {{ background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
                    .info-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd; }}
                    .label {{ font-weight: bold; color: #2c3e50; }}
                    .value {{ color: #34495e; }}
                    .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏢 Tu Código de Acceso Directo</h1>
                    <p>Asambleas Giramaster</p>
                </div>
                
                <div class="content">
                    <p>¡Hola <strong>{resident_name}</strong>!</p>
                    
                    <p>Hemos generado un código QR para que accedas directamente al sistema de gestión de tu unidad residencial. Ya no necesitarás recordar tu contraseña.</p>
                    
                    <div class="info-box">
                        <h3>📋 Tus Datos:</h3>
                        <p><span class="label">Nombre Completo:</span> <span class="value">{resident_name}</span></p>
                        <p><span class="label">Usuario:</span> <span class="value">{username}</span></p>
                        <p><span class="label">Apartamento:</span> <span class="value">{apartment_number}</span></p>
                    </div>
                    
                    <div class="qr-info">
                        <h3>📱 ¿Cómo usar tu Código QR?</h3>
                        <ol>
                            <li>Abre la cámara de tu smartphone</li>
                            <li>Enfoca el código QR que aparece en este correo</li>
                            <li>Toca la notificación que aparece en tu pantalla</li>
                            <li>¡Listo! Serás redirigido directamente al sistema</li>
                        </ol>
                    </div>
                    
                    <div class="warning">
                         Este código QR es personal y no debe compartirse con personas no autorizadas. Tiene una validez de 48 horas.
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p style="margin-bottom: 10px;"><strong>Escanea este código QR:</strong></p>
                        <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            {qr_img_tag}
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{auto_login_url}" class="button">🚀 Acceder Directamente</a>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <p style="font-size: 12px; color: #666;">O copia y pega este enlace en tu navegador:</p>
                        <p style="font-size: 10px; color: #999; word-break: break-all; margin: 5px 0;">{auto_login_url}</p>
                    </div>
                    
                    <div class="footer">
                        <p>Este correo fue enviado automáticamente por Asambleas Giramaster</p>
                        <p>Si no solicitaste este acceso, por favor contacta al administrador de tu unidad residencial.</p>
                        <p>© 2026 Asambleas Giramaster - Todos los derechos reservados</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
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
        user_ids: Optional[List[int]] = None
    ) -> dict:
        """
        Envía invitaciones por correo a usuarios de una reunión.
        Registra cada envío en tbl_email_notifications.
        Si no se especifican user_ids, se envía a todos los usuarios de la unidad residencial.
        
        Args:
            db: Sesión de base de datos
            meeting_id: ID de la reunión
            user_ids: Lista opcional de IDs de usuarios específicos
            
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
                }
                
                # Generar token de auto-login
                from app.services.simple_auto_login_service import SimpleAutoLoginService
                auto_login_service = SimpleAutoLoginService()
                auto_login_token = auto_login_service.generate_auto_login_token(
                    username=user.str_username,
                    expiration_hours=24
                )
                if auto_login_token:
                    frontend_url = "https://app.giramaster.com"
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
        to_email: str,
        firstname: str,
        lastname: str,
        username: str,
        password: str,
        residential_unit_name: str,
        auto_login_token: Optional[str] = None
    ) -> bool:
        """
        Envía un email con las credenciales de acceso para un nuevo administrador.

        Args:
            to_email: Email del administrador
            firstname: Nombre del administrador
            lastname: Apellido del administrador
            username: Username para acceso
            password: Contraseña temporal
            residential_unit_name: Nombre de la unidad residencial
            auto_login_token: Token JWT para auto-login (opcional)

        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        try:
            # Cargar el template HTML
            template_path = self.templates_dir / "email_admin_credentials.html"
            
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
            
            # Construir URL de auto-login si hay JWT
            auto_login_url = None
            if auto_login_token:
                from app.core.config import settings
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
            
            # Renderizar el template con los datos usando Jinja2
            template = Template(template_content)
            html_content = template.render(
                firstname=firstname,
                lastname=lastname,
                username=username,
                password=password,
                residential_unit_name=residential_unit_name,
                auto_login_url=auto_login_url
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
        # ── Nuevos parámetros de soporte técnico ────────────────────────────────
        support_name: Optional[str] = None,
        support_email: Optional[str] = None,
        support_phone: Optional[str] = None,
        # ────────────────────────────────────────────────────────────────────────
    ) -> bool:
        try:
            template_path = self.templates_dir / "email_coproprietario_credentials.html"

            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()

            auto_login_url = None
            if auto_login_token:
                from app.core.config import settings
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
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
        to_email: str,
        firstname: str,
        lastname: str,
        username: str,
        password: str,
        residential_unit_name: str,
        auto_login_token: Optional[str] = None
    ) -> bool:
        """
        Envía email de bienvenida con credenciales para un invitado.
        
        Args:
            to_email: Email del invitado
            firstname: Nombre
            lastname: Apellido
            username: Usuario generado
            password: Contraseña temporal
            residential_unit_name: Nombre de la unidad residencial
            auto_login_token: Token JWT para auto-login (opcional)
        """
        try:
            # Cargar template
            template_path = self.templates_dir / "email_guest_credentials.html"
            
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
            
            # Construir URL de auto-login
            auto_login_url = None
            if auto_login_token:
                from app.core.config import settings
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                logger.info(f"🔗 URL de auto-login generada para invitado {to_email}")
            
            # Renderizar template
            template = Template(template_content)
            html_content = template.render(
                firstname=firstname,
                lastname=lastname,
                username=username,
                password=password,
                residential_unit_name=residential_unit_name,
                user_email=to_email,
                auto_login_url=auto_login_url
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