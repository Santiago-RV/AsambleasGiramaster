from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd
from decimal import Decimal

from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.meeting_model import MeetingModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.schemas.meeting_invitation_schema import MeetingInvitationCreate
from app.schemas.user_schema import UserCreate
from app.schemas.data_user_schema import DataUserCreate
from app.core.security import security_manager
from app.core.logging_config import get_logger
from app.services.email_service import EmailService

logger = get_logger(__name__)

class MeetingInvitationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_invitation(self, invitation_data: MeetingInvitationCreate, created_by: int) -> MeetingInvitationModel:
        """
        Crea una invitación individual.
        
        IMPORTANTE: Inicializa dec_quorum_base y dec_voting_weight con el mismo valor.
        """
        try:
            invitation = MeetingInvitationModel(
                int_meeting_id=invitation_data.int_meeting_id,
                int_user_id=invitation_data.int_user_id,
                dec_voting_weight=invitation_data.dec_voting_weight,  # Peso actual
                dec_quorum_base=invitation_data.dec_voting_weight,    # 🔥 NUEVO: Peso base (mismo valor inicial)
                str_apartment_number=invitation_data.str_apartment_number,
                str_invitation_status=invitation_data.str_invitation_status,
                str_response_status=invitation_data.str_response_status,
                dat_sent_at=datetime.now(),
                int_delivery_attemps=0,
                bln_will_attend=invitation_data.bln_will_attend,
                int_delegated_id=invitation_data.int_delegated_id,
                bln_actually_attended=False,
                created_by=created_by,
                updated_by=created_by
            )
            
            self.db.add(invitation)
            await self.db.commit()
            await self.db.refresh(invitation)
            
            logger.info(
                f"✅ Invitación creada - User: {invitation_data.int_user_id}, "
                f"Quorum base: {invitation_data.dec_voting_weight}"
            )
            
            return invitation
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error al crear invitación: {e}")
            raise

    async def validate_meeting_exists(self, meeting_id: int) -> bool:
        """Valida que la reunión exista"""
        result = await self.db.execute(
            select(MeetingModel).where(MeetingModel.id == meeting_id)
        )
        return result.scalar_one_or_none() is not None

    async def get_user_by_email(self, email: str) -> Optional[UserModel]:
        """Obtiene un usuario por email"""
        result = await self.db.execute(
            select(UserModel).where(UserModel.str_username == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def create_user_from_excel(self, row_data: dict, created_by: int) -> UserModel:
        """
        Crea un usuario desde datos del Excel.
        Genera una contraseña temporal y crea el registro completo.
        """
        try:
            # Extraer y limpiar datos
            email = str(row_data['email']).strip().lower()
            firstname = str(row_data['firstname']).strip()
            lastname = str(row_data['lastname']).strip()
            
            # Generar contraseña temporal
            temp_password = security_manager.generate_temp_password()
            hashed_password = security_manager.hash_password(temp_password)
            
            # Crear DataUser
            data_user = DataUserModel(
                str_email=email,
                str_password=hashed_password,
                bln_is_temp_password=True,
                created_by=created_by,
                updated_by=created_by
            )
            self.db.add(data_user)
            await self.db.flush()
            
            # Crear User
            user = UserModel(
                str_username=email,
                str_firstname=firstname,
                str_lastname=lastname,
                int_id_rol=3,  # Rol de copropietario
                int_data_user_id=data_user.id,
                created_by=created_by,
                updated_by=created_by
            )
            self.db.add(user)
            await self.db.flush()
            
            logger.info(f"✅ Usuario creado desde Excel: {email}")
            return user
            
        except Exception as e:
            logger.error(f"❌ Error al crear usuario desde Excel: {e}")
            raise

    async def process_excel_file(self, file_content: bytes, meeting_id: int, created_by: int) -> Dict:
        """
        Procesa un archivo Excel para carga masiva de invitaciones.
        
        IMPORTANTE: Cada invitación inicializa dec_quorum_base = dec_voting_weight
        """
        try:
            # Validar que la reunión exista
            if not await self.validate_meeting_exists(meeting_id):
                raise ValueError(f"La reunión con ID {meeting_id} no existe")

            # Leer el archivo Excel
            df = pd.read_excel(file_content)
            
            # Validar columnas requeridas
            required_columns = ['email', 'firstname', 'lastname', 'apartment_number', 'voting_weight']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise ValueError(f"Columnas faltantes en el Excel: {', '.join(missing_columns)}")

            results = {
                'total_rows': len(df),
                'successful': 0,
                'failed': 0,
                'users_created': 0,
                'invitations_created': 0,
                'errors': []
            }

            # Procesar cada fila
            for index, row in df.iterrows():
                try:
                    row_dict = row.to_dict()
                    
                    # Validar datos básicos
                    email = str(row_dict['email']).strip().lower()
                    apartment_number = str(row_dict['apartment_number']).strip()
                    voting_weight = Decimal(str(row_dict['voting_weight']))

                    # Verificar si el usuario existe, si no, crearlo
                    user = await self.get_user_by_email(email)
                    user_was_created = False
                    
                    if not user:
                        user = await self.create_user_from_excel(row_dict, created_by)
                        user_was_created = True
                        results['users_created'] += 1

                    # 🔥 Crear invitación con dec_quorum_base
                    invitation = MeetingInvitationModel(
                        int_meeting_id=meeting_id,
                        int_user_id=user.id,
                        dec_voting_weight=voting_weight,      # Peso actual
                        dec_quorum_base=voting_weight,         # 🔥 NUEVO: Peso base (mismo valor inicial)
                        str_apartment_number=apartment_number,
                        str_invitation_status='pending',
                        str_response_status='no_response',
                        dat_sent_at=datetime.now(),
                        int_delivery_attemps=0,
                        bln_will_attend=False,
                        bln_actually_attended=False,
                        created_by=created_by,
                        updated_by=created_by
                    )
                    
                    self.db.add(invitation)
                    results['invitations_created'] += 1
                    results['successful'] += 1
                    
                    logger.info(
                        f"  ✅ Fila {index + 1}: {email} - Apto: {apartment_number} - "
                        f"Quorum: {voting_weight} - Usuario {'creado' if user_was_created else 'existente'}"
                    )

                except Exception as e:
                    results['failed'] += 1
                    error_msg = f"Fila {index + 1}: {str(e)}"
                    results['errors'].append(error_msg)
                    logger.error(f"  ❌ {error_msg}")
                    continue

            # Commit final
            await self.db.commit()
            
            logger.info(
                f"📊 Proceso completado - Total: {results['total_rows']}, "
                f"Exitosos: {results['successful']}, Fallidos: {results['failed']}, "
                f"Usuarios creados: {results['users_created']}"
            )

            return results

        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error al procesar Excel: {e}")
            raise

    async def get_meeting_invitations(self, meeting_id: int) -> List[MeetingInvitationModel]:
        """Obtiene todas las invitaciones de una reunión"""
        try:
            result = await self.db.execute(
                select(MeetingInvitationModel)
                .where(MeetingInvitationModel.int_meeting_id == meeting_id)
                .options(selectinload(MeetingInvitationModel.user))
            )
            invitations = result.scalars().all()
            return list(invitations)
        except Exception as e:
            logger.error(f"Error al obtener invitaciones: {e}")
            raise

    async def get_invitation_by_id(self, invitation_id: int) -> Optional[MeetingInvitationModel]:
        """Obtiene una invitación por su ID"""
        try:
            result = await self.db.execute(
                select(MeetingInvitationModel)
                .where(MeetingInvitationModel.id == invitation_id)
                .options(selectinload(MeetingInvitationModel.user))
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error al obtener invitación: {e}")
            raise

    async def update_invitation_status(
        self, 
        invitation_id: int, 
        new_status: str,
        updated_by: int
    ) -> Optional[MeetingInvitationModel]:
        """Actualiza el estado de una invitación"""
        try:
            invitation = await self.get_invitation_by_id(invitation_id)
            
            if not invitation:
                return None
            
            invitation.str_invitation_status = new_status
            invitation.updated_at = datetime.now()
            invitation.updated_by = updated_by
            
            await self.db.commit()
            await self.db.refresh(invitation)
            
            logger.info(f"✅ Invitación {invitation_id} actualizada a estado: {new_status}")
            return invitation
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al actualizar invitación: {e}")
            raise

    async def delete_invitation(self, invitation_id: int) -> bool:
        """Elimina una invitación"""
        try:
            invitation = await self.get_invitation_by_id(invitation_id)
            
            if not invitation:
                return False
            
            await self.db.delete(invitation)
            await self.db.commit()
            
            logger.info(f"✅ Invitación {invitation_id} eliminada")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al eliminar invitación: {e}")
            raise

    async def create_batch_invitations(
        self,
        meeting_id: int,
        user_ids: List[int],
        created_by: int
    ) -> Dict:
        """
        Crea múltiples invitaciones a una reunión para una lista de usuarios.
        
        Obtiene automáticamente el voting_weight y apartment_number desde
        UserResidentialUnitModel basado en la unidad residencial de la reunión.
        """
        from app.models.meeting_model import MeetingModel
        
        results = {
            "successful": 0,
            "failed": 0,
            "errors": [],
            "invitations_created": 0
        }
        
        try:
            # Obtener la reunión para saber la unidad residencial
            meeting_result = await self.db.execute(
                select(MeetingModel).where(MeetingModel.id == meeting_id)
            )
            meeting = meeting_result.scalar_one_or_none()
            
            if not meeting:
                raise ValueError(f"La reunión con ID {meeting_id} no existe")
            
            residential_unit_id = meeting.int_id_residential_unit
            
            # Obtener UserResidentialUnits de la unidad residencial
            units_result = await self.db.execute(
                select(UserResidentialUnitModel).where(
                    UserResidentialUnitModel.int_residential_unit_id == residential_unit_id,
                    UserResidentialUnitModel.int_user_id.in_(user_ids)
                )
            )
            user_units = {unit.int_user_id: unit for unit in units_result.scalars().all()}
            
            # Crear invitaciones para cada usuario
            for user_id in user_ids:
                try:
                    user_unit = user_units.get(user_id)
                    
                    if not user_unit:
                        results["failed"] += 1
                        results["errors"].append(f"Usuario {user_id}: No tiene relación con esta unidad residencial")
                        logger.warning(f"⚠️ Usuario {user_id} no tiene relación con la unidad residencial {residential_unit_id}")
                        continue
                    
                    # Verificar si ya existe una invitación
                    existing = await self.db.execute(
                        select(MeetingInvitationModel).where(
                            MeetingInvitationModel.int_meeting_id == meeting_id,
                            MeetingInvitationModel.int_user_id == user_id
                        )
                    )
                    if existing.scalar_one_or_none():
                        results["failed"] += 1
                        results["errors"].append(f"Usuario {user_id}: Ya tiene invitación a esta reunión")
                        logger.warning(f"⚠️ Usuario {user_id} ya tiene invitación a la reunión {meeting_id}")
                        continue
                    
                    invitation = MeetingInvitationModel(
                        int_meeting_id=meeting_id,
                        int_user_id=user_id,
                        dec_voting_weight=user_unit.dec_default_voting_weight or Decimal("0"),
                        dec_quorum_base=user_unit.dec_default_voting_weight or Decimal("0"),
                        str_apartment_number=user_unit.str_apartment_number or "N/A",
                        str_invitation_status="pending",
                        str_response_status="no_response",
                        dat_sent_at=datetime.now(),
                        int_delivery_attemps=0,
                        bln_will_attend=False,
                        bln_actually_attended=False,
                        created_by=created_by,
                        updated_by=created_by
                    )
                    
                    self.db.add(invitation)
                    results["successful"] += 1
                    results["invitations_created"] += 1
                    
                    logger.info(f"✅ Invitación creada para usuario {user_id}: Peso={user_unit.dec_default_voting_weight}, Apto={user_unit.str_apartment_number}")
                    
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append(f"Usuario {user_id}: {str(e)}")
                    logger.error(f"❌ Error al crear invitación para usuario {user_id}: {e}")
                    continue
            
            # Commit de todas las invitaciones
            await self.db.commit()
            
            # Actualizar contador de invitados en la reunión
            meeting = await self.db.get(MeetingModel, meeting_id)
            if meeting and results["invitations_created"] > 0:
                meeting.int_total_invitated = (meeting.int_total_invitated or 0) + results["invitations_created"]
                meeting.updated_at = datetime.now()
                await self.db.commit()
                logger.info(f"✅ Contador actualizado: {meeting.int_total_invitated} invitados")
            
            # Enviar correos de invitación a los usuarios exitosos
            if results["invitations_created"] > 0 and meeting:
                try:
                    email_service = EmailService(self.db)
                    # Obtener los IDs de usuarios que recibieron invitación exitosamente
                    successful_user_ids = []
                    for user_id in user_ids:
                        # Verificar si la invitación fue exitosa (no está en los errores)
                        user_has_error = any(str(user_id) in err for err in results.get("errors", []))
                        if not user_has_error:
                            successful_user_ids.append(user_id)
                    
                    if successful_user_ids:
                        email_stats = await email_service.send_meeting_invitation(
                            db=self.db,
                            meeting_id=meeting_id,
                            user_ids=successful_user_ids
                        )
                        logger.info(f"📧 Correos de invitación enviados: {email_stats}")
                except Exception as email_error:
                    logger.warning(f"⚠️ Error al enviar correos de invitación: {email_error}")
            
            logger.info(
                f"📊 Batch completado - Total: {len(user_ids)}, "
                f"Exitosas: {results['successful']}, Fallidas: {results['failed']}"
            )
            
            return results
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error al crear invitaciones batch: {e}")
            raise