"""
Utilidad para el envío de correos electrónicos usando Gmail SMTP.
Soporta envío asíncrono de emails con plantillas HTML y logos embebidos.
Soporta carga de credenciales desde base de datos o .env (fallback).
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import List, Optional
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailSender:
    """
    Clase para manejar el envío de correos electrónicos.
    
    Soporta dos modos de operación:
    1. Sin DB (default): Carga credenciales desde .env (backward compatible)
    2. Con DB: Carga credenciales desde base de datos de forma asíncrona
    """
    
    def __init__(self, db: Optional[AsyncSession] = None):
        """
        Inicializa el EmailSender.
        
        Args:
            db: Sesión de base de datos (opcional). Si se provee, carga credenciales desde DB.
                Si es None, usa credenciales de .env (modo compatible).
        """
        self.db = db
        self._credentials_loaded = False
        self._credentials = {}
        
        # Ruta del logo para embeber en los correos
        self.logo_path = Path(__file__).parent.parent / "templates" / "static" / "img" / "LogoGira.gif"
        
        # Verificar si el logo existe al inicializar
        if self.logo_path.exists():
            logger.debug(f"✅ Logo encontrado: {self.logo_path}")
        else:
            logger.warning(f"⚠️ Logo NO encontrado en: {self.logo_path}")
        
        # Si no hay DB, cargar desde .env inmediatamente (backward compatibility)
        if not db:
            self._load_credentials_from_env()
            self._credentials_loaded = True
    
    def _load_credentials_from_env(self):
        """
        Carga credenciales SMTP desde variables de entorno (.env).
        Método síncrono para backward compatibility.
        """
        logger.info("📧 Cargando credenciales SMTP desde .env")
        self._credentials = {
            'smtp_host': settings.SMTP_HOST,
            'smtp_port': settings.SMTP_PORT,
            'smtp_user': settings.SMTP_USER,
            'smtp_password': settings.SMTP_PASSWORD,
            'from_email': settings.SMTP_FROM_EMAIL or settings.SMTP_USER,
            'from_name': settings.SMTP_FROM_NAME,
            'email_enabled': settings.EMAIL_ENABLED
        }
    
    async def _load_credentials_from_db(self):
        """
        Carga credenciales SMTP desde la base de datos de forma asíncrona.
        Utiliza el servicio de configuración para obtener y desencriptar valores.
        """
        try:
            from app.services.system_config_service import SystemConfigService
            
            logger.info("📧 Cargando credenciales SMTP desde base de datos")
            
            config_service = SystemConfigService(self.db)
            db_credentials = await config_service.get_smtp_credentials()
            
            if not db_credentials or 'SMTP_HOST' not in db_credentials:
                logger.warning("⚠️ Credenciales SMTP no encontradas en DB, usando .env como fallback")
                self._load_credentials_from_env()
                return
            
            # Convertir a formato interno
            self._credentials = {
                'smtp_host': db_credentials.get('SMTP_HOST'),
                'smtp_port': int(db_credentials.get('SMTP_PORT', 587)),
                'smtp_user': db_credentials.get('SMTP_USER'),
                'smtp_password': db_credentials.get('SMTP_PASSWORD'),
                'from_email': db_credentials.get('SMTP_FROM_EMAIL') or db_credentials.get('SMTP_USER'),
                'from_name': db_credentials.get('SMTP_FROM_NAME', 'GIRAMASTER'),
                'email_enabled': db_credentials.get('EMAIL_ENABLED', 'true').lower() == 'true'
            }
            
            logger.info("✅ Credenciales SMTP cargadas exitosamente desde DB")
            
        except Exception as e:
            logger.error(f"❌ Error al cargar credenciales SMTP desde DB: {str(e)}")
            logger.info("🔄 Usando credenciales de .env como fallback")
            self._load_credentials_from_env()
    
    async def _ensure_credentials_loaded(self):
        """
        Asegura que las credenciales estén cargadas antes de usarlas.
        Carga desde DB si está disponible, o desde .env como fallback.
        """
        if not self._credentials_loaded:
            if self.db:
                await self._load_credentials_from_db()
            else:
                self._load_credentials_from_env()
            self._credentials_loaded = True
    
    def _attach_logo(self, message: MIMEMultipart) -> bool:
        """
        Adjunta el logo al mensaje con Content-ID para uso en HTML.
        
        Args:
            message: Mensaje MIME al que se adjuntará el logo
            
        Returns:
            bool: True si se adjuntó exitosamente, False si no existe el logo
        """
        try:
            if not self.logo_path.exists():
                logger.warning("Logo no encontrado, correo se enviará sin logo")
                return False
            
            with open(self.logo_path, 'rb') as img_file:
                img = MIMEImage(img_file.read())
                # El Content-ID debe coincidir con src="cid:logo" en el HTML
                img.add_header('Content-ID', '<logo>')
                img.add_header('Content-Disposition', 'inline', filename='LogoGira.gif')
                message.attach(img)
            
            return True
            
        except Exception as e:
            logger.error(f"Error al adjuntar logo: {str(e)}")
            return False
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attach_logo: bool = True
    ) -> bool:
        """
        Envía un correo electrónico a uno o más destinatarios (método síncrono).
        
        NOTA: Este método usa credenciales de .env solamente (backward compatible).
        Para usar credenciales de DB, use send_email_async().
        
        Args:
            to_emails: Lista de correos electrónicos de destinatarios
            subject: Asunto del correo
            html_content: Contenido HTML del correo
            text_content: Contenido de texto plano (opcional)
            cc_emails: Lista de correos para CC (opcional)
            bcc_emails: Lista de correos para BCC (opcional)
            attach_logo: Si True, adjunta el logo corporativo (default: True)
            
        Returns:
            bool: True si el envío fue exitoso, False en caso contrario
        """
        # Asegurar credenciales cargadas (desde .env si no hay DB)
        if not self._credentials_loaded:
            self._load_credentials_from_env()
            self._credentials_loaded = True
        
        email_enabled = self._credentials.get('email_enabled', False)
        smtp_user = self._credentials.get('smtp_user')
        smtp_password = self._credentials.get('smtp_password')
        
        if not email_enabled:
            logger.warning("El envío de emails está deshabilitado")
            return False
        
        if not smtp_user or not smtp_password:
            logger.error("Credenciales de email no configuradas")
            return False
        
        try:
            # Obtener credenciales del diccionario interno
            smtp_host = self._credentials.get('smtp_host')
            smtp_port = self._credentials.get('smtp_port')
            from_email = self._credentials.get('from_email')
            from_name = self._credentials.get('from_name')
            
            # Crear mensaje MIME 'related' para soportar imágenes embebidas
            message = MIMEMultipart("related")
            message["Subject"] = subject
            message["From"] = f"{from_name} <{from_email}>"
            message["To"] = ", ".join(to_emails)
            
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)
            
            # Crear contenedor alternativo para texto/HTML
            msg_alternative = MIMEMultipart("alternative")
            message.attach(msg_alternative)
            
            # Agregar contenido de texto plano si existe
            if text_content:
                part1 = MIMEText(text_content, "plain", "utf-8")
                msg_alternative.attach(part1)
            
            # Agregar contenido HTML
            part2 = MIMEText(html_content, "html", "utf-8")
            msg_alternative.attach(part2)
            
            # Adjuntar logo si está habilitado
            if attach_logo:
                logo_attached = self._attach_logo(message)
                if not logo_attached:
                    logger.info("Correo enviado sin logo (no disponible)")
            
            # Crear contexto SSL seguro
            context = ssl.create_default_context()
            
            # Conectar al servidor SMTP y enviar
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_password)
                
                # Preparar lista de destinatarios
                all_recipients = to_emails.copy()
                if cc_emails:
                    all_recipients.extend(cc_emails)
                if bcc_emails:
                    all_recipients.extend(bcc_emails)
                
                server.sendmail(
                    from_email,
                    all_recipients,
                    message.as_string()
                )
            
            logger.info(f"✅ Email enviado exitosamente a {len(to_emails)} destinatario(s)")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Error de autenticación SMTP: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"❌ Error SMTP: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Error inesperado al enviar email: {str(e)}")
            return False
    
    async def send_email_async(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attach_logo: bool = True
    ) -> bool:
        """
        Envía un correo electrónico de forma asíncrona (versión async).
        
        Esta versión carga credenciales desde DB si está disponible,
        con fallback automático a .env si falla.
        
        Args:
            to_emails: Lista de correos electrónicos de destinatarios
            subject: Asunto del correo
            html_content: Contenido HTML del correo
            text_content: Contenido de texto plano (opcional)
            cc_emails: Lista de correos para CC (opcional)
            bcc_emails: Lista de correos para BCC (opcional)
            attach_logo: Si True, adjunta el logo corporativo (default: True)
            
        Returns:
            bool: True si el envío fue exitoso, False en caso contrario
        """
        # Asegurar que las credenciales estén cargadas
        await self._ensure_credentials_loaded()
        
        email_enabled = self._credentials.get('email_enabled', False)
        smtp_user = self._credentials.get('smtp_user')
        smtp_password = self._credentials.get('smtp_password')
        
        if not email_enabled:
            logger.warning("El envío de emails está deshabilitado")
            return False
        
        if not smtp_user or not smtp_password:
            logger.error("Credenciales de email no configuradas")
            return False
        
        try:
            # Obtener credenciales del diccionario interno
            smtp_host = self._credentials.get('smtp_host')
            smtp_port = self._credentials.get('smtp_port')
            from_email = self._credentials.get('from_email')
            from_name = self._credentials.get('from_name')
            
            # Crear mensaje MIME 'related' para soportar imágenes embebidas
            message = MIMEMultipart("related")
            message["Subject"] = subject
            message["From"] = f"{from_name} <{from_email}>"
            message["To"] = ", ".join(to_emails)
            
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)
            
            # Crear contenedor alternativo para texto/HTML
            msg_alternative = MIMEMultipart("alternative")
            message.attach(msg_alternative)
            
            # Agregar contenido de texto plano si existe
            if text_content:
                part1 = MIMEText(text_content, "plain", "utf-8")
                msg_alternative.attach(part1)
            
            # Agregar contenido HTML
            part2 = MIMEText(html_content, "html", "utf-8")
            msg_alternative.attach(part2)
            
            # Adjuntar logo si está habilitado
            if attach_logo:
                logo_attached = self._attach_logo(message)
                if not logo_attached:
                    logger.info("Correo enviado sin logo (no disponible)")
            
            # Crear contexto SSL seguro
            context = ssl.create_default_context()
            
            # Conectar al servidor SMTP y enviar
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_password)
                
                # Preparar lista de destinatarios
                all_recipients = to_emails.copy()
                if cc_emails:
                    all_recipients.extend(cc_emails)
                if bcc_emails:
                    all_recipients.extend(bcc_emails)
                
                server.sendmail(
                    from_email,
                    all_recipients,
                    message.as_string()
                )
            
            logger.info(f"✅ Email enviado exitosamente a {len(to_emails)} destinatario(s)")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Error de autenticación SMTP: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"❌ Error SMTP: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Error inesperado al enviar email: {str(e)}")
            return False
    
    def send_bulk_emails(
        self,
        emails_data: List[dict]
    ) -> dict:
        """
        Envía múltiples correos electrónicos (método síncrono).
        
        NOTA: Este método usa send_email() síncrono (credenciales de .env).
        Para usar credenciales de DB, use send_bulk_emails_async().
        
        Args:
            emails_data: Lista de diccionarios con los datos de cada email
                        Cada dict debe contener: to_emails, subject, html_content
                        Opcionalmente: text_content, cc_emails, bcc_emails, attach_logo
        
        Returns:
            dict: Estadísticas del envío (exitosos, fallidos)
        """
        stats = {
            "total": len(emails_data),
            "exitosos": 0,
            "fallidos": 0,
            "detalles": []
        }
        
        for email_data in emails_data:
            try:
                success = self.send_email(
                    to_emails=email_data["to_emails"],
                    subject=email_data["subject"],
                    html_content=email_data["html_content"],
                    text_content=email_data.get("text_content"),
                    cc_emails=email_data.get("cc_emails"),
                    bcc_emails=email_data.get("bcc_emails"),
                    attach_logo=email_data.get("attach_logo", True)
                )
                
                if success:
                    stats["exitosos"] += 1
                    stats["detalles"].append({
                        "to": email_data["to_emails"],
                        "status": "exitoso"
                    })
                else:
                    stats["fallidos"] += 1
                    stats["detalles"].append({
                        "to": email_data["to_emails"],
                        "status": "fallido"
                    })
                    
            except Exception as e:
                logger.error(f"❌ Error al procesar email: {str(e)}")
                stats["fallidos"] += 1
                stats["detalles"].append({
                    "to": email_data.get("to_emails", ["unknown"]),
                    "status": "error",
                    "error": str(e)
                })
        
        logger.info(
            f"📊 Envío masivo completado: "
            f"{stats['exitosos']} exitosos, {stats['fallidos']} fallidos de {stats['total']} total"
        )
        
        return stats

    async def send_bulk_emails_async(
        self,
        emails_data: List[dict]
    ) -> dict:
        """
        Envía múltiples correos electrónicos de forma asíncrona.
        
        Carga credenciales desde DB si está disponible,
        con fallback automático a .env si falla.
        
        Args:
            emails_data: Lista de diccionarios con los datos de cada email
                        Cada dict debe contener: to_emails, subject, html_content
                        Opcionalmente: text_content, cc_emails, bcc_emails, attach_logo
        
        Returns:
            dict: Estadísticas del envío (exitosos, fallidos)
        """
        stats = {
            "total": len(emails_data),
            "exitosos": 0,
            "fallidos": 0,
            "detalles": []
        }
        
        for email_data in emails_data:
            try:
                success = await self.send_email_async(
                    to_emails=email_data["to_emails"],
                    subject=email_data["subject"],
                    html_content=email_data["html_content"],
                    text_content=email_data.get("text_content"),
                    cc_emails=email_data.get("cc_emails"),
                    bcc_emails=email_data.get("bcc_emails"),
                    attach_logo=email_data.get("attach_logo", True)
                )
                
                if success:
                    stats["exitosos"] += 1
                    stats["detalles"].append({
                        "to": email_data["to_emails"],
                        "status": "exitoso"
                    })
                else:
                    stats["fallidos"] += 1
                    stats["detalles"].append({
                        "to": email_data["to_emails"],
                        "status": "fallido"
                    })
                    
            except Exception as e:
                logger.error(f"❌ Error al procesar email async: {str(e)}")
                stats["fallidos"] += 1
                stats["detalles"].append({
                    "to": email_data.get("to_emails", ["unknown"]),
                    "status": "error",
                    "error": str(e)
                })
        
        logger.info(
            f"📊 Envío masivo async completado: "
            f"{stats['exitosos']} exitosos, {stats['fallidos']} fallidos de {stats['total']} total"
        )
        
        return stats