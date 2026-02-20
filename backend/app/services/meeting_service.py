from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import secrets
import string
import time

from app.models.meeting_model import MeetingModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.meeting_attendance_model import MeetingAttendanceModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.core.exceptions import ResourceNotFoundException, ServiceException
from app.services.zoom_api_service import ZoomAPIService
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class MeetingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_meeting_code(self, residential_unit_id: int, title: str) -> str:
        """Genera un código único para la reunión"""
        # Generar un código único con formato: RU{id}_MTG_{random}
        random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        return f"RU{residential_unit_id}_MTG_{random_part}"

    async def get_meetings(self) -> List[MeetingModel]:
        """Obtiene todas las reuniones con sus unidades residenciales"""
        try:
            result = await self.db.execute(
                select(MeetingModel).options(
                    selectinload(MeetingModel.residential_unit)
                )
            )
            meetings = result.scalars().all()
            return list(meetings)
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener las reuniones: {str(e)}",
                details={"original_error": str(e)}
            )

    async def get_meeting_by_id(self, meeting_id: int) -> Optional[MeetingModel]:
        """Obtiene una reunión por su ID con su unidad residencial"""
        try:
            result = await self.db.execute(
                select(MeetingModel).options(
                    selectinload(MeetingModel.residential_unit)
                ).where(MeetingModel.id == meeting_id)
            )
            meeting = result.scalar_one_or_none()

            if not meeting:
                raise ResourceNotFoundException(
                    message=f"Reunión con ID {meeting_id} no encontrada",
                    details={"meeting_id": meeting_id}
                )

            return meeting
        except ResourceNotFoundException:
            raise
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

    async def get_meetings_by_residential_unit(self, residential_unit_id: int) -> List[MeetingModel]:
        """
        Obtiene todas las reuniones de una unidad residencial.
        Retorna reuniones en curso y programadas (para encuestas).
        """
        try:
            result = await self.db.execute(
                select(MeetingModel).options(
                    selectinload(MeetingModel.residential_unit)
                ).where(
                    MeetingModel.int_id_residential_unit == residential_unit_id
                ).order_by(MeetingModel.dat_schedule_date.desc())
            )
            meetings = result.scalars().all()
            return list(meetings)
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener las reuniones de la unidad residencial: {str(e)}",
                details={"original_error": str(e), "residential_unit_id": residential_unit_id}
            )

    async def create_meeting(
        self,
        residential_unit_id: int,
        title: str,
        description: str,
        meeting_type: str,
        schedule_date: datetime,
        estimated_duration: int,
        allow_delegates: bool,
        user_id: int,
        zoom_account_id: Optional[int] = None,
        modality: str = "virtual"
    ) -> MeetingModel:
        """
        Crea una nueva reunión y genera la reunión en Zoom usando la API real.
        El líder de la reunión se asigna automáticamente al administrador de la unidad residencial.
        """
        try:
            # Obtener el administrador de la unidad residencial
            from app.models.user_residential_unit_model import UserResidentialUnitModel
            from app.models.user_model import UserModel
            from app.models.rol_model import RolModel

            admin_query = select(UserModel).join(
                UserResidentialUnitModel,
                UserModel.id == UserResidentialUnitModel.int_user_id
            ).join(
                RolModel,
                UserModel.int_id_rol == RolModel.id
            ).where(
                UserResidentialUnitModel.int_residential_unit_id == residential_unit_id,
                RolModel.str_name == 'Administrador',
                UserModel.bln_allow_entry == True
            )
            admin_result = await self.db.execute(admin_query)
            admin_user = admin_result.scalars().first()

            if not admin_user:
                raise ServiceException(
                    message=f"No se encontró un administrador activo para la unidad residencial {residential_unit_id}",
                    details={"residential_unit_id": residential_unit_id}
                )

            meeting_leader_id = admin_user.id
            logger.info(f"Líder de reunión asignado automáticamente: {admin_user.str_username} (ID: {meeting_leader_id})")

            # Generar código de reunión
            meeting_code = self._generate_meeting_code(residential_unit_id, title)

            # Inicializar variables de Zoom
            zoom_meeting_id = None
            zoom_join_url = None
            zoom_start_url = None
            resolved_zoom_account_id = zoom_account_id

            # Solo crear reunión en Zoom si la modalidad es virtual
            if modality == "virtual":
                logger.info(f"Creando reunión de Zoom: {title}")

                try:
                    # Si se especifica una cuenta Zoom, cargar sus credenciales
                    zoom_credentials = None
                    if zoom_account_id:
                        from app.services.system_config_service import SystemConfigService
                        config_service = SystemConfigService(self.db)
                        zoom_credentials = await config_service.get_zoom_account_credentials(zoom_account_id)
                        if not zoom_credentials:
                            logger.warning(f"Cuenta Zoom {zoom_account_id} sin credenciales, usando cuenta por defecto")
                            zoom_credentials = None
                            resolved_zoom_account_id = None
                    else:
                        # Si no se especifica, intentar usar la cuenta 1
                        from app.services.system_config_service import SystemConfigService
                        config_service = SystemConfigService(self.db)
                        accounts = await config_service.get_zoom_accounts()
                        if accounts:
                            first_account = accounts[0]
                            resolved_zoom_account_id = first_account["id"]
                            zoom_credentials = await config_service.get_zoom_account_credentials(resolved_zoom_account_id)
                    
                    zoom_service = ZoomAPIService(self.db, credentials=zoom_credentials)

                    # Determinar duración: si es 0, usar 60 min por defecto para Zoom
                    # 0 = duración indefinida en la aplicación
                    zoom_duration = estimated_duration if estimated_duration > 0 else 60

                    zoom_meeting = await zoom_service.create_meeting(
                        topic=title,
                        start_time=schedule_date,
                        duration=zoom_duration,
                        agenda=description,
                        timezone="America/Bogota"
                    )

                    # Extraer información de la reunión creada
                    zoom_meeting_id = zoom_meeting.get('id')
                    zoom_join_url = zoom_meeting.get('join_url')
                    zoom_start_url = zoom_meeting.get('start_url')

                    if estimated_duration > 0:
                        logger.info(f"Reunion REAL de Zoom creada: ID {zoom_meeting_id} (duracion: {estimated_duration} min)")
                    else:
                        logger.info(f"Reunion REAL de Zoom creada: ID {zoom_meeting_id} (duracion indefinida, creada con {zoom_duration} min en Zoom)")

                except Exception as zoom_error:
                    # Si falla, usar ID temporal
                    logger.error(f"Error al crear reunion en Zoom: {str(zoom_error)}")
                    logger.warning("Usando ID temporal. La reunion no existira realmente en Zoom.")

                    zoom_meeting_id = int(time.time() * 1000) % 10000000000
                    zoom_join_url = f"https://zoom.us/j/{zoom_meeting_id}"
                    zoom_start_url = f"https://zoom.us/s/{zoom_meeting_id}"

                    logger.info(
                        "SOLUCION: Configura ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID y ZOOM_CLIENT_SECRET "
                        "en el .env para crear reuniones reales."
                    )
            else:
                # Reunión presencial - no se crea en Zoom
                logger.info(f"Reunion presencial creada: {title} - Sin integracion Zoom")
                resolved_zoom_account_id = None

            # Obtener copropietarios de la unidad residencial con sus datos
            copropietarios_query = select(
                UserModel,
                UserResidentialUnitModel
            ).join(
                UserResidentialUnitModel,
                UserModel.id == UserResidentialUnitModel.int_user_id
            ).where(
                UserResidentialUnitModel.int_residential_unit_id == residential_unit_id,
                UserModel.bln_allow_entry == True
            )
            copropietarios_result = await self.db.execute(copropietarios_query)
            copropietarios_data = copropietarios_result.all()
            total_copropietarios = len(copropietarios_data)

            logger.info(f"📊 Total de copropietarios en la unidad residencial: {total_copropietarios}")

            # Crear el modelo de reunión en la base de datos
            new_meeting = MeetingModel(
                int_id_residential_unit=residential_unit_id,
                str_meeting_code=meeting_code,
                str_title=title,
                str_description=description or "",
                str_meeting_type=meeting_type,
                dat_schedule_date=schedule_date,
                int_estimated_duration=estimated_duration,
                int_organizer_id=user_id,
                int_meeting_leader_id=meeting_leader_id,
                int_zoom_meeting_id=zoom_meeting_id,
                str_zoom_join_url=zoom_join_url,
                str_zoom_start_url=zoom_start_url,
                int_zoom_account_id=resolved_zoom_account_id,
                str_modality=modality,
                bln_allow_delegates=allow_delegates,
                str_status="Programada",
                bln_quorum_reached=False,
                int_total_invitated=total_copropietarios,
                int_total_confirmed=0,
                created_by=user_id,
                updated_by=user_id
            )
            
            self.db.add(new_meeting)
            await self.db.commit()
            await self.db.refresh(new_meeting)

            # Crear invitaciones en tbl_meeting_invitations para cada copropietario
            logger.info(f"📨 Creando {total_copropietarios} invitaciones en base de datos...")
            invitations_created = 0
            for user, user_residential_unit in copropietarios_data:
                try:
                    # Calcular quorum base
                    quorum_base = user_residential_unit.dec_default_voting_weight or Decimal('1.0')

                    invitation = MeetingInvitationModel(
                        int_meeting_id=new_meeting.id,
                        int_user_id=user.id,
                        dec_voting_weight=quorum_base,           
                        dec_quorum_base=quorum_base,             
                        str_apartment_number=user_residential_unit.str_apartment_number or "N/A",
                        str_invitation_status="pending",
                        str_response_status="no_response",
                        dat_sent_at=datetime.now(),
                        int_delivery_attemps=0,
                        bln_will_attend=False,
                        bln_actually_attended=False,
                        created_by=user_id,
                        updated_by=user_id
                    )
                    self.db.add(invitation)
                    invitations_created += 1
                except Exception as inv_error:
                    logger.warning(f"Error al crear invitación para usuario {user.id}: {inv_error}")

            await self.db.commit()
            logger.info(f"✅ {invitations_created} invitaciones creadas en base de datos")

            # Recargar con la relación residential_unit
            result = await self.db.execute(
                select(MeetingModel).options(
                    selectinload(MeetingModel.residential_unit)
                ).where(MeetingModel.id == new_meeting.id)
            )
            meeting_with_relations = result.scalar_one()

            # Enviar invitaciones por correo automáticamente
            try:
                from app.services.email_service import EmailService
                email_svc = EmailService(self.db)
                logger.info(f"📧 Enviando invitaciones automáticas para reunión ID {meeting_with_relations.id}")

                email_stats = await email_svc.send_meeting_invitation(
                    db=self.db,
                    meeting_id=meeting_with_relations.id,
                    user_ids=None  # Enviar a todos los usuarios de la unidad residencial
                )

                if "error" in email_stats:
                    logger.warning(f"Error al enviar invitaciones: {email_stats['error']}")
                else:
                    logger.info(
                        f"Invitaciones enviadas: {email_stats.get('exitosos', 0)} exitosos, "
                        f"{email_stats.get('fallidos', 0)} fallidos"
                    )
            except Exception as email_error:
                # No fallar la creación de la reunión si falla el envío de emails
                logger.error(f"Error al enviar invitaciones (no crítico): {str(email_error)}")

            # Refrescar el objeto después del envío de emails para evitar MissingGreenlet
            await self.db.refresh(meeting_with_relations)

            # Recargar completamente con todas las relaciones necesarias
            result = await self.db.execute(
                select(MeetingModel).options(
                    selectinload(MeetingModel.residential_unit)
                ).where(MeetingModel.id == meeting_with_relations.id)
            )
            final_meeting = result.scalar_one()

            return final_meeting
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al crear la reunión: {str(e)}")
            raise ServiceException(
                message=f"Error al crear la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

    async def update_meeting(
        self,
        meeting_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        meeting_type: Optional[str] = None,
        schedule_date: Optional[datetime] = None,
        estimated_duration: Optional[int] = None,
        allow_delegates: Optional[bool] = None,
        status: Optional[str] = None,
        user_id: int = None
    ) -> MeetingModel:
        """Actualiza una reunión existente"""
        try:
            meeting = await self.get_meeting_by_id(meeting_id)
            
            if title is not None:
                meeting.str_title = title
            if description is not None:
                meeting.str_description = description
            if meeting_type is not None:
                meeting.str_meeting_type = meeting_type
            if schedule_date is not None:
                meeting.dat_schedule_date = schedule_date
            if estimated_duration is not None:
                meeting.int_estimated_duration = estimated_duration
            if allow_delegates is not None:
                meeting.bln_allow_delegates = allow_delegates
            if status is not None:
                meeting.str_status = status
            
            meeting.updated_at = datetime.now()
            if user_id:
                meeting.updated_by = user_id
            
            await self.db.commit()
            await self.db.refresh(meeting)
            
            return meeting
            
        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise ServiceException(
                message=f"Error al actualizar la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

    async def delete_meeting(self, meeting_id: int) -> None:
        """Elimina una reunión"""
        try:
            meeting = await self.get_meeting_by_id(meeting_id)
            
            # TODO: Cancelar reunión en Zoom
            
            await self.db.delete(meeting)
            await self.db.commit()
            
        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise ServiceException(
                message=f"Error al eliminar la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

    async def start_meeting(self, meeting_id: int, user_id: int) -> MeetingModel:
        """
        Inicia una reunión.
        Solo cambia el estado si la reunión está en estado 'Programada'.
        Si ya está 'En Curso', simplemente retorna la reunión sin modificar.
        """
        try:
            meeting = await self.get_meeting_by_id(meeting_id)

            # Solo iniciar si está en estado Programada
            if meeting.str_status == "Programada":
                meeting.str_status = "En Curso"
                meeting.dat_actual_start_time = datetime.now()
                meeting.updated_at = datetime.now()
                meeting.updated_by = user_id

                await self.db.commit()
                await self.db.refresh(meeting)
                logger.info(f"✅ Reunión {meeting_id} iniciada - Estado: En Curso")
            else:
                logger.info(f"ℹ️ Reunión {meeting_id} ya está en estado: {meeting.str_status}")

            return meeting

        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise ServiceException(
                message=f"Error al iniciar la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

    async def end_meeting(self, meeting_id: int, user_id: int) -> MeetingModel:
        """
        Finaliza una reunión.
        Solo cambia el estado si la reunión está 'En Curso'.
        Si ya está 'Completada', simplemente retorna la reunión sin modificar.
        
        Para reuniones presenciales, actualiza dat_left_at y calcula la duración
        en todos los registros de MeetingAttendanceModel.
        """
        try:
            meeting = await self.get_meeting_by_id(meeting_id)

            # Solo finalizar si está en curso
            if meeting.str_status == "En Curso":
                meeting.str_status = "Completada"
                meeting.dat_actual_end_time = datetime.now()
                meeting.updated_at = datetime.now()
                meeting.updated_by = user_id

                # Si es reunion presencial, actualizar asistencias
                if meeting.str_modality == "presencial":
                    await self._finalize_presential_attendances(meeting_id, meeting.dat_actual_end_time)

                await self.db.commit()
                await self.db.refresh(meeting)
                logger.info(f"✅ Reunión {meeting_id} finalizada - Estado: Completada")
            else:
                logger.info(f"ℹ️ Reunión {meeting_id} no está en curso, estado actual: {meeting.str_status}")

            return meeting

        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise ServiceException(
                message=f"Error al finalizar la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

    async def _finalize_presential_attendances(self, meeting_id: int, end_time: datetime) -> int:
        """
        Actualiza dat_left_at y calcula la duración para todos los registros
        de asistencia de una reunión presencial que se está finalizando.
        
        Args:
            meeting_id: ID de la reunión
            end_time: Hora de finalización de la reunión
            
        Returns:
            int: Número de registros actualizados
        """
        try:
            # Buscar todos los registros de asistencia de la reunión
            attendances_query = select(MeetingAttendanceModel).where(
                MeetingAttendanceModel.int_meeting_id == meeting_id
            )
            result = await self.db.execute(attendances_query)
            attendances = result.scalars().all()
            
            updated_count = 0
            for attendance in attendances:
                # Actualizar hora de salida
                attendance.dat_left_at = end_time
                
                # Calcular duración en minutos
                if attendance.dat_joined_at:
                    duration = (end_time - attendance.dat_joined_at).total_seconds() / 60
                    attendance.int_total_duration_minutes = int(duration)
                else:
                    attendance.int_total_duration_minutes = 0
                
                updated_count += 1
            
            logger.info(
                f"✅ Finalizadas {updated_count} asistencias para reunión presencial {meeting_id}"
            )
            
            return updated_count
            
        except Exception as e:
            logger.error(f"Error al finalizar asistencias: {str(e)}")
            raise

    async def register_attendance(self, meeting_id: int, user_id: int) -> dict:
        """
        Registra la asistencia de un usuario a una reunión.
        Actualiza dat_joined_at y bln_actually_attended en tbl_meeting_invitations.
        Solo registra si el usuario no ha sido registrado previamente.
        """
        try:
            # Buscar la invitación del usuario para esta reunión
            query = select(MeetingInvitationModel).where(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.int_user_id == user_id
            )
            result = await self.db.execute(query)
            invitation = result.scalar_one_or_none()

            if not invitation:
                logger.warning(f"⚠️ No se encontró invitación para usuario {user_id} en reunión {meeting_id}")
                return {
                    "success": False,
                    "message": "No se encontró invitación para este usuario",
                    "already_registered": False
                }

            # Solo registrar si no se ha registrado antes
            if invitation.dat_joined_at is None:
                invitation.dat_joined_at = datetime.now()
                invitation.bln_actually_attended = True
                invitation.str_response_status = "attended"
                invitation.updated_at = datetime.now()
                invitation.updated_by = user_id

                await self.db.commit()
                await self.db.refresh(invitation)

                logger.info(f"✅ Asistencia registrada: Usuario {user_id} en reunión {meeting_id} a las {invitation.dat_joined_at}")

                return {
                    "success": True,
                    "message": "Asistencia registrada correctamente",
                    "already_registered": False,
                    "joined_at": invitation.dat_joined_at.isoformat()
                }
            else:
                logger.info(f"ℹ️ Usuario {user_id} ya registrado en reunión {meeting_id} desde {invitation.dat_joined_at}")
                return {
                    "success": True,
                    "message": "Usuario ya registrado previamente",
                    "already_registered": True,
                    "joined_at": invitation.dat_joined_at.isoformat()
                }

        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error al registrar asistencia: {str(e)}")
            raise ServiceException(
                message=f"Error al registrar asistencia: {str(e)}",
                details={"original_error": str(e), "meeting_id": meeting_id, "user_id": user_id}
            )

    async def register_leave(self, meeting_id: int, user_id: int) -> dict:
        """
        Registra la hora de salida de un usuario de una reunión.
        Actualiza dat_left_at en tbl_meeting_invitations.
        """
        try:
            # Buscar la invitación del usuario para esta reunión
            query = select(MeetingInvitationModel).where(
                MeetingInvitationModel.int_meeting_id == meeting_id,
                MeetingInvitationModel.int_user_id == user_id
            )
            result = await self.db.execute(query)
            invitation = result.scalar_one_or_none()

            if not invitation:
                logger.warning(f"⚠️ No se encontró invitación para usuario {user_id} en reunión {meeting_id}")
                return {
                    "success": False,
                    "message": "No se encontró invitación para este usuario"
                }

            invitation.dat_left_at = datetime.now()
            invitation.updated_at = datetime.now()
            invitation.updated_by = user_id

            await self.db.commit()
            await self.db.refresh(invitation)

            logger.info(f"👋 Salida registrada: Usuario {user_id} de reunión {meeting_id} a las {invitation.dat_left_at}")

            return {
                "success": True,
                "message": "Hora de salida registrada correctamente",
                "left_at": invitation.dat_left_at.isoformat()
            }

        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error al registrar salida: {str(e)}")
            raise ServiceException(
                message=f"Error al registrar salida: {str(e)}",
                details={"original_error": str(e), "meeting_id": meeting_id, "user_id": user_id}
            )

    async def register_attendance_by_qr(self, qr_token: str, admin_user_id: int) -> dict:
        """
        Registra la asistencia de un copropietario escaneando su QR.
        
        Flujo:
        1. Decodifica el JWT del QR para obtener las credenciales del copropietario
        2. Valida que el usuario existe y las credenciales son correctas
        3. Obtiene la unidad residencial del admin que escanea
        4. Busca la reunión presencial "En Curso" para esa unidad
        5. Crea invitación si no existe y registra la asistencia
        
        Args:
            qr_token: JWT de auto-login extraído del QR del copropietario
            admin_user_id: ID del usuario admin que está escaneando
            
        Returns:
            dict con resultado del registro, info del usuario y de la reunión
        """
        try:
            from app.services.simple_auto_login_service import simple_auto_login_service
            from app.core.security import security_manager
            
            # 1. Decodificar el JWT del QR
            credentials = simple_auto_login_service.decode_auto_login_token(qr_token)
            
            if not credentials:
                logger.warning("QR Attendance: Token QR invalido o expirado")
                return {
                    "success": False,
                    "already_registered": False,
                    "message": "El codigo QR es invalido o ha expirado. El copropietario debe solicitar un nuevo QR.",
                    "user_info": None,
                    "meeting_info": None
                }
            
            username = credentials["username"]
            password = credentials["password"]
            
            # 2. Buscar al usuario por username
            user_query = select(UserModel).where(UserModel.str_username == username.lower().strip())
            user_result = await self.db.execute(user_query)
            target_user = user_result.scalar_one_or_none()
            
            if not target_user:
                logger.warning(f"QR Attendance: Usuario no encontrado: {username}")
                return {
                    "success": False,
                    "already_registered": False,
                    "message": "El usuario del codigo QR no fue encontrado en el sistema.",
                    "user_info": None,
                    "meeting_info": None
                }
            
            # 3. Verificar la contrasena (el QR puede haber sido regenerado)
            if not security_manager.verify_password(password, target_user.str_password_hash):
                logger.warning(f"QR Attendance: Credenciales invalidas para usuario {username}")
                return {
                    "success": False,
                    "already_registered": False,
                    "message": "El codigo QR tiene credenciales obsoletas. El copropietario debe solicitar un nuevo QR.",
                    "user_info": None,
                    "meeting_info": None
                }
            
            # 4. Obtener datos personales del usuario
            data_user_query = select(DataUserModel).where(DataUserModel.id == target_user.int_data_user_id)
            data_user_result = await self.db.execute(data_user_query)
            data_user = data_user_result.scalar_one_or_none()
            
            full_name = "Sin nombre"
            if data_user:
                full_name = f"{data_user.str_firstname} {data_user.str_lastname}".strip()
            
            # 5. Obtener la unidad residencial del admin que escanea
            admin_unit_query = select(UserResidentialUnitModel).where(
                UserResidentialUnitModel.int_user_id == admin_user_id
            )
            admin_unit_result = await self.db.execute(admin_unit_query)
            admin_unit = admin_unit_result.scalar_one_or_none()
            
            if not admin_unit:
                logger.warning(f"QR Attendance: Admin {admin_user_id} no tiene unidad residencial asignada")
                return {
                    "success": False,
                    "already_registered": False,
                    "message": "El administrador no tiene una unidad residencial asignada.",
                    "user_info": None,
                    "meeting_info": None
                }
            
            residential_unit_id = admin_unit.int_residential_unit_id
            
            # 6. Buscar reunion presencial "En Curso" para esa unidad residencial
            meeting_query = select(MeetingModel).where(
                MeetingModel.int_id_residential_unit == residential_unit_id,
                MeetingModel.str_status == "En Curso",
                MeetingModel.str_modality == "presencial"
            )
            meeting_result = await self.db.execute(meeting_query)
            active_meeting = meeting_result.scalar_one_or_none()
            
            if not active_meeting:
                logger.info(f"QR Attendance: No hay reunion presencial activa para unidad {residential_unit_id}")
                return {
                    "success": False,
                    "already_registered": False,
                    "message": "No hay ninguna reunion presencial en curso para esta unidad residencial.",
                    "user_info": {"name": full_name, "user_id": target_user.id},
                    "meeting_info": None
                }
            
            # 7. Verificar que el copropietario pertenece a la misma unidad residencial
            coowner_unit_query = select(UserResidentialUnitModel).where(
                UserResidentialUnitModel.int_user_id == target_user.id,
                UserResidentialUnitModel.int_residential_unit_id == residential_unit_id
            )
            coowner_unit_result = await self.db.execute(coowner_unit_query)
            coowner_unit = coowner_unit_result.scalar_one_or_none()
            
            if not coowner_unit:
                logger.warning(f"QR Attendance: Usuario {target_user.id} no pertenece a unidad {residential_unit_id}")
                return {
                    "success": False,
                    "already_registered": False,
                    "message": "El copropietario no pertenece a esta unidad residencial.",
                    "user_info": {"name": full_name, "user_id": target_user.id},
                    "meeting_info": {"id": active_meeting.id, "title": active_meeting.str_title}
                }
            
            apartment_number = coowner_unit.str_apartment_number
            voting_weight = coowner_unit.dec_default_voting_weight or Decimal("1.000000")
            
            # 8. Verificar si ya tiene invitacion; si no, crearla
            invitation_query = select(MeetingInvitationModel).where(
                MeetingInvitationModel.int_meeting_id == active_meeting.id,
                MeetingInvitationModel.int_user_id == target_user.id
            )
            invitation_result = await self.db.execute(invitation_query)
            invitation = invitation_result.scalar_one_or_none()
            
            if not invitation:
                # Crear invitacion automaticamente
                invitation = MeetingInvitationModel(
                    int_meeting_id=active_meeting.id,
                    int_user_id=target_user.id,
                    dec_voting_weight=voting_weight,
                    dec_quorum_base=voting_weight,
                    str_apartment_number=apartment_number,
                    str_invitation_status="delivered",
                    str_response_status="no_response",
                    dat_sent_at=datetime.now(),
                    int_delivery_attemps=0,
                    bln_will_attend=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    created_by=admin_user_id,
                    updated_by=admin_user_id
                )
                self.db.add(invitation)
                await self.db.flush()
                logger.info(f"QR Attendance: Invitacion creada para usuario {target_user.id} en reunion {active_meeting.id}")
            
            # 9. Registrar la asistencia
            result = await self.register_attendance(active_meeting.id, target_user.id)
            
            # 10. Construir respuesta con informacion completa
            user_info = {
                "user_id": target_user.id,
                "name": full_name,
                "username": target_user.str_username,
                "apartment_number": apartment_number,
                "email": data_user.str_email if data_user else None
            }
            
            meeting_info = {
                "id": active_meeting.id,
                "title": active_meeting.str_title,
                "type": active_meeting.str_meeting_type,
                "modality": active_meeting.str_modality,
                "started_at": active_meeting.dat_actual_start_time.isoformat() if active_meeting.dat_actual_start_time else None
            }
            
            return {
                "success": result.get("success", False),
                "already_registered": result.get("already_registered", False),
                "message": result.get("message", ""),
                "user_info": user_info,
                "meeting_info": meeting_info,
                "joined_at": result.get("joined_at")
            }
            
        except ServiceException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al registrar asistencia por QR: {str(e)}")
            raise ServiceException(
                message=f"Error al registrar asistencia por QR: {str(e)}",
                details={"original_error": str(e)}
            )

    async def auto_register_attendance_on_login(self, user_id: int) -> Optional[dict]:
        """
        Registra automaticamente la asistencia de un usuario al hacer auto-login via QR,
        si existe una reunion presencial "En Curso" en su unidad residencial.
        
        Si el usuario no tiene invitacion, la crea automaticamente.
        Tambien crea un registro en tbl_meeting_attendances para consistencia.
        
        Este metodo es tolerante a fallos: si algo sale mal, retorna None
        en lugar de lanzar excepciones, para no interrumpir el flujo de auto-login.
        
        Args:
            user_id: ID del usuario que se esta auto-logeando
            
        Returns:
            dict con info de la reunion y asistencia si se registro, None si no aplica
        """
        try:
            # 1. Obtener la unidad residencial del usuario
            user_unit_query = select(UserResidentialUnitModel).where(
                UserResidentialUnitModel.int_user_id == user_id
            )
            user_unit_result = await self.db.execute(user_unit_query)
            user_unit = user_unit_result.scalar_one_or_none()
            
            if not user_unit:
                logger.debug(f"Auto-attendance: Usuario {user_id} no tiene unidad residencial asignada")
                return None
            
            residential_unit_id = user_unit.int_residential_unit_id
            
            # 2. Buscar reunion presencial "En Curso" para esa unidad residencial
            meeting_query = select(MeetingModel).where(
                MeetingModel.int_id_residential_unit == residential_unit_id,
                MeetingModel.str_status == "En Curso",
                MeetingModel.str_modality == "presencial"
            )
            meeting_result = await self.db.execute(meeting_query)
            active_meeting = meeting_result.scalar_one_or_none()
            
            if not active_meeting:
                logger.debug(f"Auto-attendance: No hay reunion presencial activa para unidad {residential_unit_id}")
                return None
            
            # 3. Verificar si el usuario ya tiene invitacion para esta reunion
            invitation_query = select(MeetingInvitationModel).where(
                MeetingInvitationModel.int_meeting_id == active_meeting.id,
                MeetingInvitationModel.int_user_id == user_id
            )
            invitation_result = await self.db.execute(invitation_query)
            invitation = invitation_result.scalar_one_or_none()
            
            # 4. Si no tiene invitacion, crearla automaticamente
            if not invitation:
                voting_weight = user_unit.dec_default_voting_weight or Decimal("1.0")
                
                invitation = MeetingInvitationModel(
                    int_meeting_id=active_meeting.id,
                    int_user_id=user_id,
                    dec_voting_weight=voting_weight,
                    dec_quorum_base=voting_weight,
                    str_apartment_number=user_unit.str_apartment_number or "N/A",
                    str_invitation_status="pending",
                    str_response_status="no_response",
                    dat_sent_at=datetime.now(),
                    int_delivery_attemps=0,
                    bln_will_attend=True,
                    bln_actually_attended=False,
                    created_by=user_id,
                    updated_by=user_id
                )
                self.db.add(invitation)
                await self.db.flush()
                
                logger.info(
                    f"Auto-attendance: Invitacion creada automaticamente para usuario {user_id} "
                    f"en reunion {active_meeting.id}"
                )
            
            # 5. Registrar asistencia solo si no se ha registrado antes
            # Verificar en tbl_meeting_invitations
            if invitation.dat_joined_at is not None:
                logger.info(
                    f"Auto-attendance: Usuario {user_id} ya registrado en reunion "
                    f"{active_meeting.id} desde {invitation.dat_joined_at}"
                )
                return {
                    "registered": True,
                    "already_registered": True,
                    "meeting_id": active_meeting.id,
                    "meeting_title": active_meeting.str_title,
                    "meeting_type": active_meeting.str_meeting_type,
                    "joined_at": invitation.dat_joined_at.isoformat()
                }
            
            # 5.1 Verificar si ya existe registro en tbl_meeting_attendances
            existing_attendance_query = select(MeetingAttendanceModel).where(
                MeetingAttendanceModel.int_meeting_id == active_meeting.id,
                MeetingAttendanceModel.int_user_id == user_id
            )
            existing_attendance_result = await self.db.execute(existing_attendance_query)
            existing_attendance = existing_attendance_result.scalar_one_or_none()
            
            if existing_attendance:
                logger.info(
                    f"Auto-attendance: Usuario {user_id} ya tiene registro de asistencia "
                    f"en tbl_meeting_attendances para reunion {active_meeting.id}"
                )
                # Actualizar la invitación también
                invitation.dat_joined_at = existing_attendance.dat_joined_at
                invitation.bln_actually_attended = True
                invitation.str_response_status = "attended"
                invitation.updated_at = datetime.now()
                await self.db.commit()
                return {
                    "registered": True,
                    "already_registered": True,
                    "meeting_id": active_meeting.id,
                    "meeting_title": active_meeting.str_title,
                    "meeting_type": active_meeting.str_meeting_type,
                    "joined_at": existing_attendance.dat_joined_at.isoformat()
                }
            
            # 6. Registrar la asistencia en la invitacion
            now = datetime.now()
            invitation.dat_joined_at = now
            invitation.bln_actually_attended = True
            invitation.str_response_status = "attended"
            invitation.str_invitation_status = "attended"
            invitation.updated_at = now
            invitation.updated_by = user_id
            
            # 7. Crear registro en tbl_meeting_attendances para consistencia
            attendance = MeetingAttendanceModel(
                int_meeting_id=active_meeting.id,
                int_user_id=user_id,
                str_attendance_type="presencial",
                dec_voting_weight=invitation.dec_voting_weight,
                dat_joined_at=now,
                # dat_left_at queda NULL hasta que el admin finalize la reunion
                int_total_duration_minutes=0,  # Se calcula al finalizar
                bln_is_present=True,
                bln_left_early=False,
                int_rejoined_count=0
            )
            self.db.add(attendance)
            
            await self.db.commit()
            await self.db.refresh(invitation)
            await self.db.refresh(attendance)
            
            logger.info(
                f"Auto-attendance: Asistencia registrada automaticamente - "
                f"Usuario {user_id} en reunion presencial {active_meeting.id} "
                f"({active_meeting.str_title}) a las {invitation.dat_joined_at}. "
                f"Attendance ID: {attendance.id}"
            )
            
            return {
                "registered": True,
                "already_registered": False,
                "meeting_id": active_meeting.id,
                "meeting_title": active_meeting.str_title,
                "meeting_type": active_meeting.str_meeting_type,
                "joined_at": invitation.dat_joined_at.isoformat(),
                "attendance_id": attendance.id
            }
            
        except Exception as e:
            # No propagamos la excepcion para no interrumpir el auto-login
            try:
                await self.db.rollback()
            except Exception:
                pass
            logger.error(
                f"Auto-attendance: Error al registrar asistencia automatica "
                f"para usuario {user_id}: {str(e)}"
            )
            return None
