from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd
from decimal import Decimal

from app.models.meeting_invitation_model import MeetingInvitationModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.meeting_model import MeetingModel
from app.schemas.meeting_invitation_schema import MeetingInvitationCreate
from app.schemas.user_schema import UserCreate
from app.schemas.data_user_schema import DataUserCreate
from app.core.security import security_manager
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class MeetingInvitationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_invitation(self, invitation_data: MeetingInvitationCreate, created_by: int) -> MeetingInvitationModel:
        """Crea una invitación individual"""
        try:
            invitation = MeetingInvitationModel(
                int_meeting_id=invitation_data.int_meeting_id,
                int_user_id=invitation_data.int_user_id,
                dec_voting_weight=invitation_data.dec_voting_weight,
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
            return invitation
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al crear invitación: {e}")
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
        """Crea un usuario completo (DataUser + User) desde los datos del Excel"""
        try:
            email = str(row_data['email']).strip().lower()
            
            # Verificar si el usuario ya existe
            existing_user = await self.get_user_by_email(email)
            if existing_user:
                return existing_user

            # Crear DataUser
            data_user_data = DataUserCreate(
                str_firstname=str(row_data['firstname']).strip(),
                str_lastname=str(row_data['lastname']).strip(),
                str_email=email,
                str_phone=str(row_data.get('phone', '')).strip() if row_data.get('phone') else None
            )

            data_user = DataUserModel(
                str_firstname=data_user_data.str_firstname,
                str_lastname=data_user_data.str_lastname,
                str_email=data_user_data.str_email,
                str_phone=data_user_data.str_phone
            )
            
            self.db.add(data_user)
            await self.db.flush()  # Para obtener el ID sin hacer commit

            # Hashear contraseña (usa una temporal si no viene en el Excel)
            password = str(row_data.get('password', 'Temporal123!'))
            hashed_password = security_manager.create_password_hash(password)

            # Crear User
            user = UserModel(
                str_username=email,
                str_password_hash=hashed_password,
                int_data_user_id=data_user.id,
                int_id_rol=3,  # Rol de usuario por defecto
                bln_is_active=True,
                created_by=created_by,
                updated_by=created_by
            )

            self.db.add(user)
            await self.db.flush()
            
            return user

        except Exception as e:
            logger.error(f"Error al crear usuario desde Excel: {e}")
            raise

    async def process_excel_file(self, file_content: bytes, meeting_id: int, created_by: int) -> Dict:
        """
        Procesa el archivo Excel y crea usuarios e invitaciones masivamente
        
        El Excel debe tener las siguientes columnas:
        - email: Email del usuario
        - firstname: Nombre del usuario
        - lastname: Apellido del usuario
        - phone: (Opcional) Teléfono del usuario
        - apartment_number: Número de apartamento
        - voting_weight: Peso de votación (coeficiente)
        - password: (Opcional) Contraseña inicial (default: Temporal123!)
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

                    # Crear invitación
                    invitation = MeetingInvitationModel(
                        int_meeting_id=meeting_id,
                        int_user_id=user.id,
                        dec_voting_weight=voting_weight,
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

                except Exception as e:
                    results['errors'].append({
                        'row': index + 2,  # +2 porque Excel empieza en 1 y tiene header
                        'email': row_dict.get('email', 'N/A'),
                        'error': str(e)
                    })
                    results['failed'] += 1
                    logger.error(f"Error procesando fila {index + 2}: {e}")

            # Commit de todas las operaciones exitosas
            if results['successful'] > 0:
                await self.db.commit()
            else:
                await self.db.rollback()

            return results

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error procesando archivo Excel: {e}")
            raise

    async def get_invitations_by_meeting(self, meeting_id: int) -> List[MeetingInvitationModel]:
        """Obtiene todas las invitaciones de una reunión"""
        result = await self.db.execute(
            select(MeetingInvitationModel).where(
                MeetingInvitationModel.int_meeting_id == meeting_id
            )
        )
        return result.scalars().all()