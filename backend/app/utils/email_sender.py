"""
Utilidad para el envío de correos electrónicos usando Gmail SMTP.
Soporta envío asíncrono de emails con plantillas HTML.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailSender:
    """Clase para manejar el envío de correos electrónicos"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        self.from_name = settings.SMTP_FROM_NAME
        self.email_enabled = settings.EMAIL_ENABLED
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """
        Envía un correo electrónico a uno o más destinatarios.
        
        Args:
            to_emails: Lista de correos electrónicos de destinatarios
            subject: Asunto del correo
            html_content: Contenido HTML del correo
            text_content: Contenido de texto plano (opcional)
            cc_emails: Lista de correos para CC (opcional)
            bcc_emails: Lista de correos para BCC (opcional)
            
        Returns:
            bool: True si el envío fue exitoso, False en caso contrario
        """
        if not self.email_enabled:
            logger.warning("El envío de emails está deshabilitado")
            return False
        
        if not self.smtp_user or not self.smtp_password:
            logger.error("Credenciales de email no configuradas")
            return False
        
        try:
            # Crear mensaje
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = ", ".join(to_emails)
            
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)
            
            # Agregar contenido de texto plano si existe
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)
            
            # Agregar contenido HTML
            part2 = MIMEText(html_content, "html")
            message.attach(part2)
            
            # Crear contexto SSL seguro
            context = ssl.create_default_context()
            
            # Conectar al servidor SMTP y enviar
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.ehlo()  # Can be omitted
                server.starttls(context=context)
                server.ehlo()  # Can be omitted
                server.login(self.smtp_user, self.smtp_password)
                
                # Preparar lista de destinatarios
                all_recipients = to_emails.copy()
                if cc_emails:
                    all_recipients.extend(cc_emails)
                if bcc_emails:
                    all_recipients.extend(bcc_emails)
                
                server.sendmail(
                    self.from_email,
                    all_recipients,
                    message.as_string()
                )
            
            logger.info(f"Email enviado exitosamente a {len(to_emails)} destinatario(s)")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"Error de autenticación SMTP: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"Error SMTP: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error inesperado al enviar email: {str(e)}")
            return False
    
    def send_bulk_emails(
        self,
        emails_data: List[dict]
    ) -> dict:
        """
        Envía múltiples correos electrónicos.
        
        Args:
            emails_data: Lista de diccionarios con los datos de cada email
                        Cada dict debe contener: to_emails, subject, html_content
        
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
                    bcc_emails=email_data.get("bcc_emails")
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
                logger.error(f"Error al procesar email: {str(e)}")
                stats["fallidos"] += 1
                stats["detalles"].append({
                    "to": email_data.get("to_emails", ["unknown"]),
                    "status": "error",
                    "error": str(e)
                })
        
        return stats


# Instancia global del email sender
email_sender = EmailSender()

