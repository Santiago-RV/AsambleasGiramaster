"""
Utilidad para el envío de correos electrónicos usando Gmail SMTP.
Soporta múltiples cuentas SMTP con failover automático al exceder límite diario.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Indicadores de error de límite diario de Gmail
_GMAIL_LIMIT_INDICATORS = [
    'daily user sending limit exceeded',
    '5.4.5',
    'sending limit exceeded',
    'too many messages',
    'quota exceeded',
    'user sending limit',
    'exceeded',
]


def _is_gmail_limit_error(error: Exception) -> bool:
    """Detecta si un error SMTP corresponde al límite diario de Gmail."""
    error_str = str(error).lower()
    return any(indicator in error_str for indicator in _GMAIL_LIMIT_INDICATORS)


class EmailSender:
    """
    Clase para manejar el envío de correos electrónicos.

    Soporta dos modos de operación:
    1. Sin DB (default): Carga credenciales desde .env (backward compatible)
    2. Con DB: Usa multi-cuenta SMTP con failover automático al exceder límite diario.
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self._credentials_loaded = False
        self._credentials = {}

        self.logo_path = Path(__file__).parent.parent / "templates" / "static" / "img" / "LogoGira.gif"

        if self.logo_path.exists():
            logger.debug(f"✅ Logo encontrado: {self.logo_path}")
        else:
            logger.warning(f"⚠️ Logo NO encontrado en: {self.logo_path}")

        if not db:
            self._load_credentials_from_env()
            self._credentials_loaded = True

    def _load_credentials_from_env(self):
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
        """Carga el primer set de credenciales disponible desde DB (para compatibilidad)."""
        try:
            from app.services.system_config_service import SystemConfigService

            logger.info("📧 Cargando credenciales SMTP desde base de datos")
            config_service = SystemConfigService(self.db)

            # Primero intenta multi-cuenta
            account = await config_service.get_available_smtp_account()
            if account:
                self._credentials = {
                    'smtp_host': account['host'],
                    'smtp_port': account['port'],
                    'smtp_user': account['user'],
                    'smtp_password': account['password'],
                    'from_email': account['from_email'],
                    'from_name': account['from_name'],
                    'email_enabled': True,
                }
                logger.info(f"✅ Credenciales SMTP cargadas (cuenta {account['id']}: {account['name']})")
                return

            # Fallback a legacy keys
            db_credentials = await config_service.get_smtp_credentials()
            if db_credentials and 'SMTP_HOST' in db_credentials:
                self._credentials = {
                    'smtp_host': db_credentials.get('SMTP_HOST'),
                    'smtp_port': int(db_credentials.get('SMTP_PORT', 587)),
                    'smtp_user': db_credentials.get('SMTP_USER'),
                    'smtp_password': db_credentials.get('SMTP_PASSWORD'),
                    'from_email': db_credentials.get('SMTP_FROM_EMAIL') or db_credentials.get('SMTP_USER'),
                    'from_name': db_credentials.get('SMTP_FROM_NAME', 'GIRAMASTER'),
                    'email_enabled': db_credentials.get('EMAIL_ENABLED', 'true').lower() == 'true',
                }
                logger.info("✅ Credenciales SMTP cargadas desde keys legacy")
                return

            logger.warning("⚠️ Credenciales SMTP no encontradas en DB, usando .env como fallback")
            self._load_credentials_from_env()

        except Exception as e:
            logger.error(f"❌ Error al cargar credenciales SMTP desde DB: {str(e)}")
            logger.info("🔄 Usando credenciales de .env como fallback")
            self._load_credentials_from_env()

    async def _ensure_credentials_loaded(self):
        if not self._credentials_loaded:
            if self.db:
                await self._load_credentials_from_db()
            else:
                self._load_credentials_from_env()
            self._credentials_loaded = True

    def _attach_logo(self, message: MIMEMultipart) -> bool:
        try:
            if not self.logo_path.exists():
                logger.warning("Logo no encontrado, correo se enviará sin logo")
                return False

            with open(self.logo_path, 'rb') as img_file:
                img = MIMEImage(img_file.read())
                img.add_header('Content-ID', '<logo>')
                img.add_header('Content-Disposition', 'inline', filename='LogoGira.gif')
                message.attach(img)

            return True

        except Exception as e:
            logger.error(f"Error al adjuntar logo: {str(e)}")
            return False

    def _build_message(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        from_email: str,
        from_name: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        attach_logo: bool = True,
        logo_data: Optional[bytes] = None
    ) -> MIMEMultipart:
        """Construye el objeto MIMEMultipart listo para enviar."""
        message = MIMEMultipart("related")
        message["Subject"] = subject
        message["From"] = f"{from_name} <{from_email}>"
        message["To"] = ", ".join(to_emails)

        if cc_emails:
            message["Cc"] = ", ".join(cc_emails)

        msg_alternative = MIMEMultipart("alternative")
        message.attach(msg_alternative)

        if text_content:
            msg_alternative.attach(MIMEText(text_content, "plain", "utf-8"))

        msg_alternative.attach(MIMEText(html_content, "html", "utf-8"))

        if attach_logo:
            if logo_data:
                img = MIMEImage(logo_data)
                img.add_header('Content-ID', '<logo>')
                img.add_header('Content-Disposition', 'inline', filename='LogoGira.gif')
                message.attach(img)
            else:
                self._attach_logo(message)

        return message

    def _load_logo_data(self) -> Optional[bytes]:
        if self.logo_path.exists():
            try:
                with open(self.logo_path, 'rb') as f:
                    return f.read()
            except Exception as e:
                logger.warning(f"No se pudo cargar el logo: {e}")
        return None

    # ------------------------------------------------------------------
    # Envío individual (sync — .env solamente, backward compatible)
    # ------------------------------------------------------------------

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
        """Envío síncrono. Usa credenciales de .env únicamente (backward compatible)."""
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
            account_creds = {
                'host': self._credentials.get('smtp_host'),
                'port': self._credentials.get('smtp_port'),
                'user': smtp_user,
                'password': smtp_password,
                'from_email': self._credentials.get('from_email'),
                'from_name': self._credentials.get('from_name'),
            }
            message = self._build_message(
                to_emails, subject, html_content,
                account_creds['from_email'], account_creds['from_name'],
                text_content, cc_emails, attach_logo
            )
            context = ssl.create_default_context()
            with smtplib.SMTP(account_creds['host'], account_creds['port']) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(account_creds['user'], account_creds['password'])
                all_recipients = to_emails.copy()
                if cc_emails:
                    all_recipients.extend(cc_emails)
                if bcc_emails:
                    all_recipients.extend(bcc_emails)
                server.sendmail(account_creds['from_email'], all_recipients, message.as_string())

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

    # ------------------------------------------------------------------
    # Envío individual async (con multi-cuenta y failover)
    # ------------------------------------------------------------------

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
        Envío async con failover multi-cuenta cuando hay DB disponible.
        Detecta límite diario de Gmail y cambia a la siguiente cuenta.
        """
        if not self.db:
            # Modo .env
            await self._ensure_credentials_loaded()
            return self._send_single_with_creds(
                self._credentials, to_emails, subject, html_content,
                text_content, cc_emails, bcc_emails, attach_logo
            )

        # Modo multi-cuenta con failover
        from app.services.system_config_service import SystemConfigService
        from app.core.exceptions import AllSmtpAccountsExceededException

        config_service = SystemConfigService(self.db)
        tried = set()

        while True:
            account = await config_service.get_available_smtp_account()

            if not account or account['id'] in tried:
                raise AllSmtpAccountsExceededException()

            tried.add(account['id'])
            success, rate_limited = self._send_single_with_account(
                account, to_emails, subject, html_content,
                text_content, cc_emails, bcc_emails, attach_logo
            )

            if rate_limited:
                await config_service.mark_smtp_account_exceeded(account['id'])
                logger.warning(
                    f"Cuenta SMTP {account['id']} ('{account['name']}') excedió límite. "
                    "Intentando siguiente cuenta..."
                )
                continue

            return success

    def _send_single_with_creds(
        self,
        creds: dict,
        to_emails, subject, html_content,
        text_content=None, cc_emails=None, bcc_emails=None, attach_logo=True
    ) -> bool:
        """Envía un email usando un diccionario de credenciales en formato legacy."""
        email_enabled = creds.get('email_enabled', False)
        smtp_user = creds.get('smtp_user')
        smtp_password = creds.get('smtp_password')

        if not email_enabled or not smtp_user or not smtp_password:
            logger.error("Credenciales de email no configuradas o deshabilitadas")
            return False

        account = {
            'host': creds.get('smtp_host'),
            'port': creds.get('smtp_port'),
            'user': smtp_user,
            'password': smtp_password,
            'from_email': creds.get('from_email'),
            'from_name': creds.get('from_name'),
        }
        success, _ = self._send_single_with_account(
            account, to_emails, subject, html_content,
            text_content, cc_emails, bcc_emails, attach_logo
        )
        return success

    def _send_single_with_account(
        self,
        account: dict,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attach_logo: bool = True
    ) -> Tuple[bool, bool]:
        """
        Envía un email con credenciales de cuenta específica.
        Retorna (success, rate_limited).
        """
        try:
            message = self._build_message(
                to_emails, subject, html_content,
                account['from_email'], account['from_name'],
                text_content, cc_emails, attach_logo
            )
            context = ssl.create_default_context()
            with smtplib.SMTP(account['host'], account['port']) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(account['user'], account['password'])
                all_recipients = to_emails.copy()
                if cc_emails:
                    all_recipients.extend(cc_emails)
                if bcc_emails:
                    all_recipients.extend(bcc_emails)
                server.sendmail(account['from_email'], all_recipients, message.as_string())

            logger.info(f"✅ Email enviado exitosamente a {len(to_emails)} destinatario(s)")
            return True, False

        except (smtplib.SMTPDataError, smtplib.SMTPSenderRefused, smtplib.SMTPRecipientsRefused) as e:
            if _is_gmail_limit_error(e):
                logger.warning(f"⚠️ Límite de Gmail detectado: {str(e)}")
                return False, True
            logger.error(f"❌ Error SMTP al enviar email: {str(e)}")
            return False, False
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Error de autenticación SMTP: {str(e)}")
            return False, False
        except smtplib.SMTPException as e:
            if _is_gmail_limit_error(e):
                return False, True
            logger.error(f"❌ Error SMTP: {str(e)}")
            return False, False
        except Exception as e:
            logger.error(f"❌ Error inesperado al enviar email: {str(e)}")
            return False, False

    # ------------------------------------------------------------------
    # Envío masivo (lote)
    # ------------------------------------------------------------------

    def send_bulk_emails(self, emails_data: List[dict]) -> dict:
        """Envío masivo síncrono. Usa credenciales de .env (backward compatible)."""
        stats = {"total": len(emails_data), "exitosos": 0, "fallidos": 0, "detalles": []}

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
                    stats["detalles"].append({"to": email_data["to_emails"], "status": "exitoso"})
                else:
                    stats["fallidos"] += 1
                    stats["detalles"].append({"to": email_data["to_emails"], "status": "fallido"})
            except Exception as e:
                logger.error(f"❌ Error al procesar email: {str(e)}")
                stats["fallidos"] += 1
                stats["detalles"].append({"to": email_data.get("to_emails", ["unknown"]), "status": "error", "error": str(e)})

        logger.info(f"📊 Envío masivo: {stats['exitosos']} exitosos, {stats['fallidos']} fallidos de {stats['total']}")
        return stats

    async def send_bulk_emails_async(self, emails_data: List[dict]) -> dict:
        """Envío masivo async con failover multi-cuenta."""
        stats = {"total": len(emails_data), "exitosos": 0, "fallidos": 0, "detalles": []}

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
                    stats["detalles"].append({"to": email_data["to_emails"], "status": "exitoso"})
                else:
                    stats["fallidos"] += 1
                    stats["detalles"].append({"to": email_data["to_emails"], "status": "fallido"})
            except Exception as e:
                logger.error(f"❌ Error al procesar email async: {str(e)}")
                stats["fallidos"] += 1
                stats["detalles"].append({"to": email_data.get("to_emails", ["unknown"]), "status": "error", "error": str(e)})

        logger.info(f"📊 Envío masivo async: {stats['exitosos']} exitosos, {stats['fallidos']} fallidos de {stats['total']}")
        return stats

    # ------------------------------------------------------------------
    # Envío en lote optimizado con conexión reutilizable + failover
    # ------------------------------------------------------------------

    async def send_batch_optimized(
        self,
        emails_data: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Envía correos en lote usando una conexión SMTP reutilizable.
        Con DB: soporta failover multi-cuenta cuando se excede el límite diario de Gmail.
        Sin DB: usa credenciales de .env (backward compatible).
        """
        stats = {
            "total": len(emails_data),
            "exitosos": 0,
            "fallidos": 0,
            "detalles": []
        }

        if not emails_data:
            return stats

        if not self.db:
            return await self._send_batch_single_account(emails_data, stats)

        # Multi-cuenta con failover
        return await self._send_batch_with_failover(emails_data, stats)

    async def _send_batch_single_account(
        self,
        emails_data: List[Dict[str, Any]],
        stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Implementación original: una sola cuenta, desde .env o credenciales cargadas."""
        await self._ensure_credentials_loaded()

        email_enabled = self._credentials.get('email_enabled', False)
        smtp_user = self._credentials.get('smtp_user')
        smtp_password = self._credentials.get('smtp_password')

        if not email_enabled:
            logger.warning("El envío de emails está deshabilitado")
            return stats

        if not smtp_user or not smtp_password:
            logger.error("Credenciales de email no configuradas")
            return stats

        account = {
            'host': self._credentials.get('smtp_host'),
            'port': self._credentials.get('smtp_port'),
            'user': smtp_user,
            'password': smtp_password,
            'from_email': self._credentials.get('from_email'),
            'from_name': self._credentials.get('from_name'),
        }

        logo_data = self._load_logo_data()
        stats, _ = await self._send_emails_via_connection(account, emails_data, stats, logo_data)
        return stats

    async def _send_batch_with_failover(
        self,
        emails_data: List[Dict[str, Any]],
        stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Envía en lote con failover: si se excede el límite de una cuenta,
        marca esa cuenta y continúa con la siguiente para los emails restantes.
        """
        from app.services.system_config_service import SystemConfigService
        from app.core.exceptions import AllSmtpAccountsExceededException

        config_service = SystemConfigService(self.db)
        logo_data = self._load_logo_data()

        # Lista de (índice_original, email_data) pendientes de enviar
        pending: List[Tuple[int, Dict]] = list(enumerate(emails_data))

        while pending:
            account = await config_service.get_available_smtp_account()

            if not account:
                # Todas las cuentas excedidas — marcar los restantes como fallidos
                for _, email_data in pending:
                    stats["fallidos"] += 1
                    stats["detalles"].append({
                        "to": email_data.get("to_emails", []),
                        "status": "limite_excedido",
                        "error": "Todas las cuentas SMTP han excedido su límite diario"
                    })
                logger.error(
                    f"❌ Todas las cuentas SMTP excedidas. "
                    f"{len(pending)} correos sin enviar."
                )
                raise AllSmtpAccountsExceededException(
                    details={"emails_no_enviados": len(pending)}
                )

            logger.info(
                f"📧 Usando cuenta SMTP {account['id']} ('{account['name']}') "
                f"para {len(pending)} correos pendientes"
            )

            rate_limited, stats, still_pending = await self._send_emails_via_connection(
                account, pending, stats, logo_data, indexed=True
            )

            if rate_limited:
                await config_service.mark_smtp_account_exceeded(account['id'])
                logger.warning(
                    f"⚠️ Cuenta SMTP {account['id']} excedió límite con "
                    f"{len(still_pending)} correos restantes. Cambiando cuenta..."
                )
                pending = still_pending
            else:
                break  # Todos los pendientes procesados (con éxito o error no-límite)

        return stats

    async def _send_emails_via_connection(
        self,
        account: dict,
        emails: List,
        stats: Dict,
        logo_data: Optional[bytes],
        indexed: bool = False
    ):
        """
        Abre una conexión SMTP y envía la lista de emails.

        indexed=False: emails es List[Dict]
        indexed=True:  emails es List[Tuple[int, Dict]] (con índice original)

        Retorna:
          - (stats, []) cuando indexed=False
          - (rate_limited: bool, stats, still_pending: List[Tuple]) cuando indexed=True
        """
        context = ssl.create_default_context()

        def _items():
            return emails if not indexed else emails

        try:
            with smtplib.SMTP(account['host'], account['port']) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(account['user'], account['password'])
                logger.info(
                    f"✅ Conexión SMTP establecida con cuenta {account.get('id', '?')}, "
                    f"enviando {len(emails)} emails..."
                )

                remaining_pending = []
                rate_limited = False

                for item in _items():
                    if indexed:
                        idx, email_data = item
                    else:
                        email_data = item

                    if rate_limited:
                        if indexed:
                            remaining_pending.append(item)
                        continue

                    try:
                        to_emails = email_data.get('to_emails', [])
                        subject = email_data.get('subject', '')
                        html_content = email_data.get('html_content', '')
                        text_content = email_data.get('text_content')

                        message = self._build_message(
                            to_emails, subject, html_content,
                            account['from_email'], account['from_name'],
                            text_content, None, True, logo_data
                        )

                        server.sendmail(account['from_email'], to_emails, message.as_string())
                        stats["exitosos"] += 1
                        stats["detalles"].append({"to": to_emails, "status": "exitoso"})

                    except (smtplib.SMTPDataError, smtplib.SMTPSenderRefused, smtplib.SMTPRecipientsRefused) as e:
                        if _is_gmail_limit_error(e):
                            logger.warning(f"⚠️ Límite Gmail detectado en item {idx if indexed else '?'}: {e}")
                            rate_limited = True
                            if indexed:
                                remaining_pending.append(item)
                        else:
                            logger.error(f"❌ Error SMTP al enviar a {to_emails}: {e}")
                            stats["fallidos"] += 1
                            stats["detalles"].append({"to": to_emails, "status": "error", "error": str(e)})

                    except Exception as e:
                        logger.error(f"❌ Error al enviar a {email_data.get('to_emails')}: {e}")
                        stats["fallidos"] += 1
                        stats["detalles"].append({"to": email_data.get('to_emails', []), "status": "error", "error": str(e)})

                logger.info(
                    f"📊 Lote completado (cuenta {account.get('id', '?')}): "
                    f"{stats['exitosos']} exitosos, {stats['fallidos']} fallidos"
                )

                if indexed:
                    return rate_limited, stats, remaining_pending
                return stats, []

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Error de autenticación SMTP (cuenta {account.get('id', '?')}): {e}")
            if indexed:
                # Auth failure — no retries, all pending fail
                for item in emails:
                    _, email_data = item
                    stats["fallidos"] += 1
                    stats["detalles"].append({
                        "to": email_data.get("to_emails", []),
                        "status": "error_autenticacion"
                    })
                return False, stats, []
            stats["fallidos"] = stats["total"]
            return stats, []

        except Exception as e:
            logger.error(f"❌ Error en conexión SMTP: {e}")
            if _is_gmail_limit_error(e):
                if indexed:
                    return True, stats, emails
                stats["fallidos"] += len(emails)
                return stats, []

            if indexed:
                for item in emails:
                    _, email_data = item
                    stats["fallidos"] += 1
                    stats["detalles"].append({
                        "to": email_data.get("to_emails", []),
                        "status": "error_conexion",
                        "error": str(e)
                    })
                return False, stats, []
            stats["fallidos"] += len(emails)
            return stats, []
