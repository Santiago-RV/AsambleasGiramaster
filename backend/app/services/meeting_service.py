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

    async def create_meeting(
        self,
        residential_unit_id: int,
        title: str,
        description: str,
        meeting_type: str,
        schedule_date: datetime,
        estimated_duration: int,
        allow_delegates: bool,
        user_id: int
    ) -> MeetingModel:
        """
        Crea una nueva reunión y genera la reunión en Zoom usando la API real
        """
        try:
            # Generar código de reunión
            meeting_code = self._generate_meeting_code(residential_unit_id, title)
            
            logger.info(f"Creando reunión de Zoom: {title}")
            
            # Intentar crear reunión REAL en Zoom usando OAuth API
            try:
                zoom_service = ZoomAPIService()
                zoom_meeting = zoom_service.create_meeting(
                    topic=title,
                    start_time=schedule_date,
                    duration=estimated_duration,
                    agenda=description,
                    timezone="America/Bogota"
                )
                
                # Extraer información de la reunión creada
                zoom_meeting_id = zoom_meeting.get('id')
                zoom_join_url = zoom_meeting.get('join_url')
                zoom_start_url = zoom_meeting.get('start_url')
                
                logger.info(f"✅ Reunión REAL de Zoom creada: ID {zoom_meeting_id}")
                
            except Exception as zoom_error:
                # Si falla, usar ID temporal
                logger.error(f"❌ Error al crear reunión en Zoom: {str(zoom_error)}")
                logger.warning("Usando ID temporal. La reunión no existirá realmente en Zoom.")
                
                zoom_meeting_id = int(time.time() * 1000) % 10000000000
                zoom_join_url = f"https://zoom.us/j/{zoom_meeting_id}"
                zoom_start_url = f"https://zoom.us/s/{zoom_meeting_id}"
                
                logger.info(
                    "SOLUCIÓN: Configura ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID y ZOOM_CLIENT_SECRET "
                    "en el .env para crear reuniones reales."
                )
            
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
                int_meeting_leader_id=user_id,
                int_zoom_meeting_id=zoom_meeting_id,
                str_zoom_join_url=zoom_join_url,
                str_zoom_start_url=zoom_start_url,
                bln_allow_delegates=allow_delegates,
                str_status="Programada",
                bln_quorum_reached=False,
                int_total_invitated=0,
                int_total_confirmed=0,
                created_by=user_id,
                updated_by=user_id
            )
            
            self.db.add(new_meeting)
            await self.db.commit()
            await self.db.refresh(new_meeting)
            
            # Recargar con la relación residential_unit
            result = await self.db.execute(
                select(MeetingModel).options(
                    selectinload(MeetingModel.residential_unit)
                ).where(MeetingModel.id == new_meeting.id)
            )
            meeting_with_relations = result.scalar_one()
            
            # Enviar invitaciones por correo automáticamente
            try:
                from app.services.email_service import email_service
                logger.info(f"📧 Enviando invitaciones automáticas para reunión ID {meeting_with_relations.id}")
                
                email_stats = await email_service.send_meeting_invitation(
                    db=self.db,
                    meeting_id=meeting_with_relations.id,
                    user_ids=None  # Enviar a todos los usuarios de la unidad residencial
                )
                
                if "error" in email_stats:
                    logger.warning(f"⚠️ Error al enviar invitaciones: {email_stats['error']}")
                else:
                    logger.info(
                        f"✅ Invitaciones enviadas: {email_stats.get('exitosos', 0)} exitosos, "
                        f"{email_stats.get('fallidos', 0)} fallidos"
                    )
            except Exception as email_error:
                # No fallar la creación de la reunión si falla el envío de emails
                logger.error(f"❌ Error al enviar invitaciones (no crítico): {str(email_error)}")
            
            return meeting_with_relations
            
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
        """Inicia una reunión"""
        try:
            meeting = await self.get_meeting_by_id(meeting_id)
            
            meeting.str_status = "En curso"
            meeting.dat_actual_start_time = datetime.now()
            meeting.updated_at = datetime.now()
            meeting.updated_by = user_id
            
            await self.db.commit()
            await self.db.refresh(meeting)
            
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
        """Finaliza una reunión"""
        try:
            meeting = await self.get_meeting_by_id(meeting_id)
            
            meeting.str_status = "Completada"
            meeting.dat_actual_end_time = datetime.now()
            meeting.updated_at = datetime.now()
            meeting.updated_by = user_id
            
            await self.db.commit()
            await self.db.refresh(meeting)
            
            return meeting
            
        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise ServiceException(
                message=f"Error al finalizar la reunión: {str(e)}",
                details={"original_error": str(e)}
            )

