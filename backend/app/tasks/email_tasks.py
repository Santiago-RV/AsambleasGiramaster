import asyncio
import secrets
import string
import threading
from typing import List, Dict, Any
from datetime import datetime
from app.utils.timezone_utils import colombia_now
from app.celery_app import celery_app
from app.utils.email_sender import EmailSender
from app.core.logging_config import get_logger
from app.core.config import settings
from app.core.security import security_manager
from pathlib import Path

logger = get_logger(__name__)


def generate_temp_password(firstname: str, lastname: str = None, identifier: str = None) -> str:
    """
    Genera una contraseña temporal basada en el nombre del usuario.
    Formato: 2 letras nombre + 2 letras identificador + 4 dígitos + !@
    Ejemplo: "Juan Perez 101" → "jupe101!@" o similar
    """
    name_part = firstname[:2].lower() if firstname else "us"
    lastname_part = lastname[:2].lower() if lastname else "ua"
    digits = ''.join(secrets.choice(string.digits) for _ in range(4))
    
    password = f"{name_part}{lastname_part}{digits}!@"
    
    if identifier and len(identifier) >= 2:
        id_part = ''.join(c for c in identifier[:4] if c.isalnum()).lower()
        if id_part:
            password = f"{name_part}{id_part}{digits}!@"
    
    return password


class EmailTaskProgress:
    """Clase para manejar el progreso de envío de emails"""
    
    @staticmethod
    def set_progress(task_id: str, current: int, total: int, status: str = 'processing'):
        """Actualiza el progreso en Redis"""
        import redis.asyncio as aioredis
        from app.core.config import settings
        
        async def _set():
            r = await aioredis.from_url(settings.REDIS_URL)
            key = f"email_task:{task_id}"
            await r.hset(key, mapping={
                'current': str(current),
                'total': str(total),
                'status': status,
                'progress': str(int((current / total) * 100)) if total > 0 else '0'
            })
            await r.expire(key, 3600)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_set())
        loop.close()
    
    @staticmethod
    def get_progress(task_id: str) -> Dict[str, Any]:
        """Obtiene el progreso desde Redis"""
        import redis.asyncio as aioredis
        from app.core.config import settings
        
        async def _get():
            r = await aioredis.from_url(settings.REDIS_URL)
            key = f"email_task:{task_id}"
            data = await r.hgetall(key)
            await r.close()
            
            if data:
                return {
                    'current': int(data.get(b'current', 0)),
                    'total': int(data.get(b'total', 0)),
                    'status': data.get(b'status', b'processing').decode(),
                    'progress': int(data.get(b'progress', 0))
                }
            return {'current': 0, 'total': 0, 'status': 'unknown', 'progress': 0}
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_get())
        loop.close()
        return result


def run_async(coro):
    """Ejecuta una corrutina en un nuevo event loop"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name='app.tasks.email_tasks.send_bulk_emails')
def send_bulk_emails(self, resident_ids: List[int], unit_id: int, task_id: str, frontend_url: str = None, template_name: str = 'email_coproprietario_credentials'):
    """
    Tarea Celery para enviar correos electrónicos de credenciales de forma masiva.
    Genera tokens y prepara emails dentro de la tarea (no en el endpoint).
    
    Args:
        resident_ids: Lista de IDs de usuarios
        unit_id: ID de la unidad residencial
        task_id: ID de la tarea para tracking
        frontend_url: URL del frontend
        template_name: Nombre de la plantilla a usar (default: 'email_coproprietario_credentials')
                      Opciones: 'email_coproprietario_credentials', 'email_guest_credentials'
    """
    logger.info(f"📧 Starting bulk credentials send: {len(resident_ids)} residents, unit_id={unit_id}, template={template_name}")
    
    async def _send_emails():
        import redis.asyncio as aioredis
        from sqlalchemy import select, and_
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.residential_unit_model import ResidentialUnitModel
        from app.services.email_notification_service import EmailNotificationService
        from app.services.simple_auto_login_service import SimpleAutoLoginService
        from jinja2 import Template
        
        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        r = await aioredis.from_url(settings.REDIS_URL)
        key = f"email_task:{task_id}"
        
        total = len(resident_ids)
        
        await r.hset(key, mapping={
            'current': '0',
            'total': str(total),
            'status': 'processing',
            'progress': '0'
        })
        await r.expire(key, 3600)
        
        async with async_session_maker() as db:
            query = select(ResidentialUnitModel).where(ResidentialUnitModel.id == unit_id)
            result = await db.execute(query)
            residential_unit = result.scalar_one_or_none()
            
            if not residential_unit:
                logger.error(f"Unidad residencial {unit_id} no encontrada")
                await r.hset(key, mapping={'status': 'failed', 'progress': '0'})
                await r.close()
                return {'error': 'Unidad no encontrada'}
            
            # Usar la plantilla especificada o la default
            valid_templates = {
                'email_coproprietario_credentials': 'email_coproprietario_credentials.html',
                'email_guest_credentials': 'email_guest_credentials.html'
            }
            template_filename = valid_templates.get(template_name, 'email_coproprietario_credentials.html')
            template_path = Path(__file__).parent.parent / "templates" / template_filename
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            template = Template(template_content)
            auto_login_service = SimpleAutoLoginService()
            notification_service = EmailNotificationService(db)
            
            # Obtener información de soporte técnico UNA SOLA VEZ antes del loop
            from app.services.support_service import SupportService
            support_service = SupportService(db)
            support_data = await support_service.get_support_info(unit_id)
            
            emails_data = []
            
            for idx, user_id in enumerate(resident_ids):
                try:
                    current = idx + 1
                    if current % 50 == 0 or current == total:
                        progress_pct = int((current / total) * 100) if total > 0 else 0
                        await r.hset(key, mapping={
                            'current': str(current),
                            'total': str(total),
                            'status': 'processing',
                            'progress': str(progress_pct)
                        })
                        await r.expire(key, 3600)
                    
                    query = (
                        select(UserModel, DataUserModel, UserResidentialUnitModel)
                        .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                        .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                        .where(
                            and_(
                                UserModel.id == user_id,
                                UserResidentialUnitModel.int_residential_unit_id == unit_id
                            )
                        )
                    )
                    result = await db.execute(query)
                    user_data = result.first()
                    
                    if not user_data:
                        logger.warning(f"Usuario {user_id} no encontrado en unidad {unit_id}")
                        continue
                    
                    user, data_user, user_unit = user_data
                    
                    # Generar contraseña temporal para el usuario
                    temp_password = generate_temp_password(
                        data_user.str_firstname,
                        data_user.str_lastname,
                        user_unit.str_apartment_number
                    )
                    
                    auto_login_token = auto_login_service.generate_auto_login_token(
                        username=user.str_username,
                        expiration_hours=24
                    )
                    
                    token_payload = auto_login_service.decode_auto_login_token(auto_login_token)
                    token_id = token_payload.get('token_id') if token_payload else None
                    
                    if token_id:
                        try:
                            await auto_login_service.upsert_user_token(db, token_id, user.id, None)
                            await db.flush()
                        except Exception as token_err:
                            logger.warning(f"Token ya existe o error guardando token: {token_err}")
                            await db.rollback()
                    
                    notification = await notification_service.create_notification(
                        user_id=user.id,
                        template="resend_credentials",
                        status="pending",
                        meeting_id=None
                    )
                    
                    if not frontend_url:
                        raise ValueError("frontend_url es requerido para generar URL de auto-login")
                    auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                    
                    html_content = template.render(
                        firstname=data_user.str_firstname,
                        lastname=data_user.str_lastname,
                        username=user.str_username,
                        password=temp_password,
                        residential_unit_name=residential_unit.str_name,
                        apartment_number=user_unit.str_apartment_number,
                        voting_weight=float(user_unit.dec_default_voting_weight or 0),
                        user_email=data_user.str_email,
                        phone=data_user.str_phone,
                        auto_login_url=auto_login_url,
                        support_name=support_data.get("str_support_name") if support_data else None,
                        support_email=support_data.get("str_support_email") if support_data else None,
                        support_phone=support_data.get("str_support_phone") if support_data else None,
                        support_whatsapp=support_data.get("str_support_whatsapp") if support_data else None,
                    )
                    
                    subject = f"Bienvenido a GIRAMASTER - {residential_unit.str_name}"
                    
                    emails_data.append({
                        'to_emails': [data_user.str_email],
                        'subject': subject,
                        'html_content': html_content,
                        'text_content': None,
                        'attach_logo': True,
                        'notification_id': notification.id
                    })
                    
                except Exception as e:
                    logger.error(f"Error preparing credentials for user_id={user_id}: {e}")
                    try:
                        await db.rollback()
                    except:
                        pass
            
            await db.commit()
            
            email_sender = EmailSender(db)
            
            all_successful = 0
            all_failed = 0
            all_details = []
            
            batch_size = 100
            for batch_start in range(0, len(emails_data), batch_size):
                batch_end = min(batch_start + batch_size, len(emails_data))
                batch = emails_data[batch_start:batch_end]
                
                logger.info(f"📦 Enviando batch {batch_start//batch_size + 1}: {len(batch)} emails")
                
                result = await email_sender.send_batch_optimized(batch, batch_size=len(batch))
                
                for i, detail in enumerate(result.get('detalles', [])):
                    idx = batch_start + i
                    if idx < len(emails_data):
                        notif_id = emails_data[idx].get('notification_id')
                        if notif_id:
                            status = "sent" if detail.get('status') == 'success' else "failed"
                            await notification_service.update_status(notif_id, status=status, commit=False)
                
                all_successful += result.get('exitosos', 0)
                all_failed += result.get('fallidos', 0)
                all_details.extend(result.get('detalles', []))
                
                current = batch_end
                progress_pct = int((current / total) * 100) if total > 0 else 0
                
                await r.hset(key, mapping={
                    'current': str(current),
                    'total': str(total),
                    'status': 'processing',
                    'progress': str(progress_pct)
                })
                await r.expire(key, 3600)
            
            await db.commit()
            await engine.dispose()
            
            await r.hset(key, mapping={
                'current': str(total),
                'total': str(total),
                'status': 'completed',
                'progress': '100',
                'successful': str(all_successful),
                'failed': str(all_failed)
            })
            await r.expire(key, 3600)
            await r.close()
            
            logger.info(f"✅ Bulk credentials send completed: {all_successful} successful, {all_failed} failed")
            
            return {
                'total': total,
                'successful': all_successful,
                'failed': all_failed,
                'details': all_details
            }
    
    return run_async(_send_emails())


@celery_app.task(bind=True, name='app.tasks.email_tasks.send_single_email')
def send_single_email(self, to_emails: List[str], subject: str, html_content: str, 
                      text_content: str = None, attach_logo: bool = True):
    """
    Tarea Celery para enviar un solo correo electrónico.
    """
    async def _send():
        email_sender = EmailSender(None)
        
        success = await email_sender.send_email_async(
            to_emails=to_emails,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            attach_logo=attach_logo
        )
        
        return {
            'success': success,
            'to': to_emails,
            'subject': subject
        }
    
    return run_async(_send())


@celery_app.task(bind=True, name='app.tasks.email_tasks.send_meeting_invitations')
def send_meeting_invitations(self, meeting_id: int, task_id: str, frontend_url: str = None, user_ids: list = None):
    """
    Tarea Celery para enviar invitaciones de reunión con auto-login.
    """
    logger.info(f"📧 Starting meeting invitations for meeting_id={meeting_id}, task_id={task_id}, user_ids={user_ids}")
    
    async def _send_invitations():
        import redis.asyncio as aioredis
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from app.models.meeting_model import MeetingModel
        from app.models.residential_unit_model import ResidentialUnitModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.services.email_notification_service import EmailNotificationService
        from app.services.simple_auto_login_service import SimpleAutoLoginService
        from jinja2 import Template
        
        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        r = await aioredis.from_url(settings.REDIS_URL)
        
        async with async_session_maker() as db:
            query = select(MeetingModel).where(MeetingModel.id == meeting_id)
            result = await db.execute(query)
            meeting = result.scalar_one_or_none()
            
            if not meeting:
                logger.error(f"Reunión {meeting_id} no encontrada")
                await r.hset(f"email_task:{task_id}", mapping={'status': 'failed', 'progress': '0'})
                await r.close()
                return {'error': 'Reunión no encontrada'}
            
            query = select(ResidentialUnitModel).where(ResidentialUnitModel.id == meeting.int_id_residential_unit)
            result = await db.execute(query)
            residential_unit = result.scalar_one_or_none()
            
            base_filter = UserResidentialUnitModel.int_residential_unit_id == meeting.int_id_residential_unit
            
            if user_ids and len(user_ids) > 0:
                query = select(UserModel, DataUserModel, UserResidentialUnitModel).join(
                    DataUserModel, UserModel.int_data_user_id == DataUserModel.id
                ).join(
                    UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id
                ).where(
                    base_filter & (UserModel.id.in_(user_ids))
                )
            else:
                query = select(UserModel, DataUserModel, UserResidentialUnitModel).join(
                    DataUserModel, UserModel.int_data_user_id == DataUserModel.id
                ).join(
                    UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id
                ).where(base_filter)
            
            result = await db.execute(query)
            users_data = result.all()
            
            total = len(users_data)
            successful = 0
            failed = 0
            
            logger.info(f"👥 Total usuarios a invitar: {total}")
            
            auto_login_service = SimpleAutoLoginService()
            notification_service = EmailNotificationService(db)
            
            template_path = Path(__file__).parent.parent / "templates" / "email_meeting_invitation.html"
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            meeting_date = meeting.dat_schedule_date.strftime('%d/%m/%Y') if meeting.dat_schedule_date else ''
            meeting_time = meeting.dat_schedule_date.strftime('%H:%M') if meeting.dat_schedule_date else ''
            
            template = Template(template_content)
            meeting_year = str(colombia_now().year)
            email_sender = EmailSender(db)
            
            # Obtener información de soporte técnico UNA SOLA VEZ antes del loop
            from app.services.support_service import SupportService
            support_service = SupportService(db)
            support_data = await support_service.get_support_info(meeting.int_id_residential_unit)
            
            for idx, (user, data_user, user_residential_unit) in enumerate(users_data):
                try:
                    current = idx + 1
                    progress_pct = int((current / total) * 100) if total > 0 else 0
                    
                    if current % 50 == 0 or current == total:
                        await r.hset(f"email_task:{task_id}", mapping={
                            'current': str(current),
                            'total': str(total),
                            'status': 'processing',
                            'progress': str(progress_pct),
                            'meeting_title': meeting.str_title
                        })
                        await r.expire(f"email_task:{task_id}", 3600)
                    
                    notification = await notification_service.create_notification(
                        user_id=user.id,
                        template="meeting_invite",
                        status="pending",
                        meeting_id=meeting_id
                    )
                    
                    auto_login_token = auto_login_service.generate_auto_login_token(
                        username=user.str_username,
                        expiration_hours=24,
                        meeting_id=meeting_id if meeting.str_modality == "presencial" else None
                    )

                    auto_login_url = None
                    if auto_login_token:
                        if not frontend_url:
                            raise ValueError("frontend_url es requerido para generar URL de auto-login")
                        auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                    
                    html_content = template.render(
                        user_name=f"{data_user.str_firstname} {data_user.str_lastname}",
                        meeting_title=meeting.str_title,
                        residential_unit=residential_unit.str_name if residential_unit else "",
                        meeting_date=meeting_date,
                        meeting_time=meeting_time,
                        duration=str(meeting.int_estimated_duration) if meeting.int_estimated_duration else "0",
                        meeting_type=meeting.str_meeting_type,
                        organizer_name="Administrador",
                        meeting_description=meeting.str_description or "",
                        zoom_meeting_id=str(meeting.int_zoom_meeting_id) if meeting.int_zoom_meeting_id else "",
                        zoom_password=meeting.str_zoom_password or "",
                        zoom_join_url=meeting.str_zoom_join_url or "",
                        str_modality=meeting.str_modality or "presencial",
                        current_year=meeting_year,
                        auto_login_url=auto_login_url,
                        auto_login_token=auto_login_token,
                        support_name=support_data.get("str_support_name") if support_data else None,
                        support_email=support_data.get("str_support_email") if support_data else None,
                        support_phone=support_data.get("str_support_phone") if support_data else None,
                        support_whatsapp=support_data.get("str_support_whatsapp") if support_data else None,
                    )
                    
                    success = await email_sender.send_email_async(
                        to_emails=[data_user.str_email],
                        subject=f"Invitación: {meeting.str_title}",
                        html_content=html_content
                    )
                    
                    if success:
                        successful += 1
                        await notification_service.update_status(notification.id, status="sent", commit=False)
                        
                        from decimal import Decimal
                        quorum_base = user_residential_unit.dec_default_voting_weight if user_residential_unit and user_residential_unit.dec_default_voting_weight else Decimal('1.0')
                        
                        existing_inv_query = select(MeetingInvitationModel).where(
                            MeetingInvitationModel.int_meeting_id == meeting_id,
                            MeetingInvitationModel.int_user_id == user.id
                        )
                        existing_result = await db.execute(existing_inv_query)
                        existing_invitation = existing_result.scalar_one_or_none()
                        
                        if existing_invitation:
                            existing_invitation.dat_sent_at = colombia_now()
                            existing_invitation.str_invitation_status = "sent"
                            existing_invitation.int_delivery_attemps += 1
                            existing_invitation.updated_at = colombia_now()
                        else:
                            invitation = MeetingInvitationModel(
                                int_meeting_id=meeting_id,
                                int_user_id=user.id,
                                dec_voting_weight=quorum_base,
                                dec_quorum_base=quorum_base,
                                str_apartment_number=user_residential_unit.str_apartment_number if user_residential_unit else "N/A",
                                str_invitation_status="sent",
                                str_response_status="no_response",
                                dat_sent_at=colombia_now(),
                                int_delivery_attemps=1,
                                bln_will_attend=False,
                                bln_actually_attended=False,
                                created_by=meeting.created_by,
                                updated_by=meeting.created_by
                            )
                            db.add(invitation)
                    else:
                        failed += 1
                        await notification_service.update_status(notification.id, status="failed", commit=False)
                    
                except Exception as e:
                    logger.error(f"❌ Error sending invitation to {data_user.str_email}: {str(e)}")
                    failed += 1
            
            await db.commit()
            
            meeting.int_total_invitated = total
            meeting.updated_at = colombia_now()
            await db.commit()
            await engine.dispose()
            
            await r.hset(f"email_task:{task_id}", mapping={
                'current': str(total),
                'total': str(total),
                'status': 'completed',
                'progress': '100',
                'successful': str(successful),
                'failed': str(failed)
            })
            await r.expire(f"email_task:{task_id}", 3600)
            await r.close()
            
            logger.info(f"✅ Meeting invitations completed: {successful} successful, {failed} failed")
            
            return {
                'total': total,
                'successful': successful,
                'failed': failed,
                'meeting_title': meeting.str_title
            }
    
    return run_async(_send_invitations())


@celery_app.task(bind=True, name='app.tasks.email_tasks.send_qr_email')
def send_qr_email(self, user_id: int, recipient_email: str = None, frontend_url: str = None):
    """
    Tarea Celery para enviar QR por correo electrónico.
    Genera QR, contraseña temporal y envía email.
    """
    logger.info(f"📧 Starting QR email send for user_id={user_id}")
    
    async def _send_qr():
        import redis.asyncio as aioredis
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.residential_unit_model import ResidentialUnitModel
        from app.services.qr_service import qr_service
        from app.services.email_service import EmailService
        from app.core.config import settings
        from app.core.security import security_manager
        from pathlib import Path
        
        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        try:
            async with async_session_maker() as db:
                query = (
                    select(UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
                    .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                    .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                    .join(ResidentialUnitModel, UserResidentialUnitModel.int_residential_unit_id == ResidentialUnitModel.id)
                    .where(UserModel.id == user_id)
                )
                result = await db.execute(query)
                user_data = result.first()
                
                if not user_data:
                    logger.error(f"Usuario {user_id} no encontrado")
                    return {'success': False, 'error': 'Usuario no encontrado'}
                
                user, data_user, user_residential_unit, residential_unit = user_data
                
                temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(12))
                hashed_password = security_manager.create_password_hash(temp_password)
                user.str_password_hash = hashed_password
                user.updated_at = colombia_now()
                await db.commit()
                
                user_info = {
                    'name': f"{data_user.str_firstname} {data_user.str_lastname}".strip(),
                    'apartment': user_residential_unit.str_apartment_number,
                    'residential_unit': residential_unit.str_name,
                    'email': data_user.str_email,
                    'role': 'Admin' if user.int_id_rol in [1, 2] else 'Resident'
                }
                
                qr_data = qr_service.generate_user_qr_data(
                    user_id=user.id,
                    username=user.str_username,
                    user_info=user_info,
                    expiration_hours=24,
                    frontend_url=frontend_url
                )
                
                to_email = recipient_email or data_user.str_email
                
                email_service = EmailService(db)
                success = await email_service.send_qr_access_email(
                    db=db,
                    to_email=to_email,
                    resident_name=user_info['name'],
                    apartment_number=user_info['apartment'],
                    username=user.str_username,
                    auto_login_url=qr_data['auto_login_url'],
                    auto_login_token=qr_data['auto_login_token'],
                    residential_unit_id=residential_unit.id,
                    qr_base64=qr_data['qr_base64']
                )
                
                logger.info(f"✅ QR email sent to {to_email}: {success}")
                return {'success': success, 'to': to_email}
                
        except Exception as e:
            logger.error(f"❌ Error sending QR email: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            await engine.dispose()
    
    return run_async(_send_qr())


@celery_app.task(bind=True, name='app.tasks.email_tasks.send_welcome_email')
def send_welcome_email(
    self,
    user_id: int,
    user_email: str,
    user_name: str,
    username: str,
    password: str,
    residential_unit_name: str,
    apartment_number: str,
    voting_weight: float,
    phone: str = None,
    auto_login_token: str = None,
    frontend_url: str = None
):
    """
    Tarea Celery para enviar email de bienvenida al crear un residente.
    """
    logger.info(f"📧 Starting welcome email for {user_email}")
    
    async def _send_welcome():
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.config import settings
        from jinja2 import Template
        from pathlib import Path
        
        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        try:
            async with async_session_maker() as db:
                template_path = Path(__file__).parent.parent / "templates" / "email_coproprietario_credentials.html"
                
                if not template_path.exists():
                    logger.error(f"Template de email no encontrado: {template_path}")
                    return {'success': False, 'error': 'Template no encontrado'}
                
                with open(template_path, 'r', encoding='utf-8') as f:
                    html_template = f.read()
                
                name_parts = user_name.split(' ', 1)
                firstname = name_parts[0] if name_parts else user_name
                lastname = name_parts[1] if len(name_parts) > 1 else ''
                
                auto_login_url = None
                if auto_login_token:
                    if not frontend_url:
                        raise ValueError("frontend_url es requerido para generar URL de auto-login")
                    auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                
                template = Template(html_template)
                voting_weight_percent = voting_weight * 100
                
                html_content = template.render(
                    firstname=firstname,
                    lastname=lastname,
                    username=username,
                    password=password,
                    residential_unit_name=residential_unit_name,
                    apartment_number=apartment_number,
                    voting_weight=f"{voting_weight_percent:.2f}",
                    user_email=user_email,
                    phone=phone,
                    current_year=str(colombia_now().year),
                    auto_login_url=auto_login_url
                )
                
                email_sender = EmailSender(db)
                success = await email_sender.send_email_async(
                    to_emails=[user_email],
                    subject=f"Bienvenido a GIRAMASTER - {residential_unit_name}",
                    html_content=html_content
                )
                
                logger.info(f"✅ Welcome email sent to {user_email}: {success}")
                return {'success': success, 'to': user_email}
                
        except Exception as e:
            logger.error(f"❌ Error sending welcome email: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            await engine.dispose()
    
    return run_async(_send_welcome())


@celery_app.task(bind=True, name='app.tasks.email_tasks.send_single_credential_email')
def send_single_credential_email(
    self,
    user_id: int,
    unit_id: int,
    frontend_url: str = None,
    template_name: str = 'email_coproprietario_credentials'
):
    """
    Tarea Celery para reenviar credenciales a un solo copropietario.
    """
    logger.info(f"📧 Starting single credential email for user_id={user_id}")
    
    async def _send_credential():
        from sqlalchemy import select, and_
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.residential_unit_model import ResidentialUnitModel
        from app.services.simple_auto_login_service import simple_auto_login_service
        from app.core.config import settings
        from jinja2 import Template
        from pathlib import Path
        
        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        try:
            async with async_session_maker() as db:
                query = (
                    select(UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
                    .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                    .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                    .join(ResidentialUnitModel, UserResidentialUnitModel.int_residential_unit_id == ResidentialUnitModel.id)
                    .where(
                        and_(
                            UserModel.id == user_id,
                            UserResidentialUnitModel.int_residential_unit_id == unit_id
                        )
                    )
                )
                result = await db.execute(query)
                user_data = result.first()
                
                if not user_data:
                    logger.error(f"Usuario {user_id} no encontrado en unit_id={unit_id}")
                    return {'success': False, 'error': 'Usuario no encontrado'}
                
                user, data_user, user_unit, residential_unit = user_data
                
                temp_password = generate_temp_password(
                    data_user.str_firstname,
                    data_user.str_lastname,
                    user_unit.str_apartment_number
                )
                
                hashed_password = security_manager.create_password_hash(temp_password)
                user.str_password_hash = hashed_password
                user.updated_at = colombia_now()
                await db.commit()
                
                auto_login_token = simple_auto_login_service.generate_auto_login_token(
                    username=user.str_username,
                    expiration_hours=24
                )
                
                token_payload = simple_auto_login_service.decode_auto_login_token(auto_login_token)
                token_id = token_payload.get('token_id') if token_payload else None
                
                if token_id:
                    try:
                        await simple_auto_login_service.upsert_user_token(db, token_id, user.id, None)
                        await db.flush()
                    except Exception as token_err:
                        logger.warning(f"Token ya existe o error guardando token: {token_err}")
                        await db.rollback()
                
                valid_templates = {
                    'email_coproprietario_credentials': 'email_coproprietario_credentials.html',
                    'email_guest_credentials': 'email_guest_credentials.html'
                }
                template_filename = valid_templates.get(template_name, 'email_coproprietario_credentials.html')
                template_path = Path(__file__).parent.parent / "templates" / template_filename
                
                with open(template_path, 'r', encoding='utf-8') as f:
                    template_content = f.read()
                
                template = Template(template_content)
                if not frontend_url:
                    raise ValueError("frontend_url es requerido para generar URL de auto-login")
                auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
                
                # Obtener información de soporte técnico
                from app.services.support_service import SupportService
                support_service = SupportService(db)
                support_data = await support_service.get_support_info(unit_id)
                
                voting_weight_percent = float(user_unit.dec_default_voting_weight or 0) * 100
                
                html_content = template.render(
                    firstname=data_user.str_firstname,
                    lastname=data_user.str_lastname,
                    username=user.str_username,
                    password=temp_password,
                    residential_unit_name=residential_unit.str_name,
                    apartment_number=user_unit.str_apartment_number,
                    voting_weight=f"{voting_weight_percent:.2f}",
                    user_email=data_user.str_email,
                    phone=data_user.str_phone,
                    current_year=str(colombia_now().year),
                    auto_login_url=auto_login_url,
                    support_name=support_data.get("str_support_name") if support_data else None,
                    support_email=support_data.get("str_support_email") if support_data else None,
                    support_phone=support_data.get("str_support_phone") if support_data else None,
                    support_whatsapp=support_data.get("str_support_whatsapp") if support_data else None,
                )
                
                email_sender = EmailSender(db)
                success = await email_sender.send_email_async(
                    to_emails=[data_user.str_email],
                    subject=f"Credenciales de Acceso - {residential_unit.str_name}",
                    html_content=html_content
                )
                
                logger.info(f"✅ Credential email sent to {data_user.str_email}: {success}")
                return {'success': success, 'to': data_user.str_email}
                
        except Exception as e:
            logger.error(f"❌ Error sending credential email: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            await engine.dispose()
    
    return run_async(_send_credential())