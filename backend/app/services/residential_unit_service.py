from ast import Dict
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
import logging

from app.models.residential_unit_model import ResidentialUnitModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.schemas.residential_unit_schema import ResidentialUnitCreate, ResidentialUnitResponse
from app.core.exceptions import ServiceException

from app.core.security import security_manager

logger = logging.getLogger(__name__)

class ResidentialUnitService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_residential_units(self) -> List[ResidentialUnitModel]:
        """Obtiene todas las unidades residenciales"""
        try:
            query = select(ResidentialUnitModel)
            result = await self.db.execute(query)
            residential_units = result.scalars().all()
            return residential_units
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener las unidades residenciales: {str(e)}",
                details={"original_error": str(e)}
            )

    async def get_residential_unit_by_nit(self, nit: str) -> Optional[ResidentialUnitModel]:
        """Obtiene una unidad residencial por su NIT"""
        try:
            query = select(ResidentialUnitModel).where(ResidentialUnitModel.str_nit == nit)
            result = await self.db.execute(query)
            residential_unit = result.scalar_one_or_none()
            return residential_unit
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener la unidad residencial por NIT: {str(e)}",
                details={"original_error": str(e)}
            )
    
    async def create_residential_unit(self, residential_unit_data: ResidentialUnitCreate) -> ResidentialUnitResponse:
        """Crea una unidad residencial"""
        try:
            residential_unit = ResidentialUnitModel(**residential_unit_data.model_dump())
            self.db.add(residential_unit)
            await self.db.commit()
            await self.db.refresh(residential_unit)
            return ResidentialUnitResponse.model_validate(residential_unit)
        except Exception as e:
            raise ServiceException(
                message=f"Error al crear la unidad residencial: {str(e)}",
                details={"original_error": str(e)}
            )

    async def get_residents_by_residential_unit(self, residential_unit_id: int):
        """Obtiene los residentes de una unidad residencial específica"""
        try:
            # Consulta para obtener usuarios con sus datos personales y número de apartamento
            query = (
                select(
                    UserModel,
                    DataUserModel,
                    UserResidentialUnitModel.str_apartment_number
                )
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .where(UserResidentialUnitModel.int_residential_unit_id == residential_unit_id)
            )
            
            result = await self.db.execute(query)
            residents_data = result.all()
            
            # Formatear la respuesta
            residents = []
            for user, data_user, apartment_number in residents_data:
                residents.append({
                    "id": user.id,
                    "username": user.str_username,
                    "firstname": data_user.str_firstname,
                    "lastname": data_user.str_lastname,
                    "email": data_user.str_email,
                    "phone": data_user.str_phone,
                    "apartment_number": apartment_number,
                    "is_external_delegate": user.bln_is_external_delegate,
                    "user_temporary": user.bln_user_temporary,
                    "created_at": user.created_at,
                })
            
            return residents
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener los residentes de la unidad residencial: {str(e)}",
                details={"original_error": str(e)}
            )
        
    async def process_residents_excel_file(
        self, 
        file_content: bytes, 
        unit_id: int, 
        created_by: int
    ) -> dict:  # Cambiado de Dict a dict para compatibilidad
        """
        Procesa el archivo Excel y crea copropietarios masivamente insertando en 3 tablas:
        - tbl_data_users: Información personal
        - tbl_users: Credenciales y permisos
        - tbl_user_residential_units: Relación con unidad residencial
        
        Args:
            file_content: Contenido del archivo Excel en bytes
            unit_id: ID de la unidad residencial
            created_by: ID del usuario que está creando los registros
        
        Returns:
            Dict con estadísticas del proceso:
            - total_rows: Total de filas procesadas
            - successful: Copropietarios creados exitosamente
            - failed: Filas que fallaron
            - users_created: Número de usuarios creados
            - errors: Lista de errores detallados
        
        El Excel debe tener las siguientes columnas:
        - email: Email del copropietario (único, requerido)
        - firstname: Nombre del copropietario (requerido)
        - lastname: Apellido del copropietario (requerido)
        - phone: Teléfono (opcional)
        - apartment_number: Número de apartamento (requerido)
        - voting_weight: Peso de votación/coeficiente (requerido, ej: 0.25 = 25%)
        - password: Contraseña inicial (opcional, default: Temporal123!)
        """
        try:
            # Leer el archivo Excel
            df = pd.read_excel(file_content)
            
            # Validar columnas requeridas
            required_columns = ['email', 'firstname', 'lastname', 'apartment_number', 'voting_weight']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise ValueError(
                    f"Columnas faltantes en el Excel: {', '.join(missing_columns)}. "
                    f"Columnas requeridas: email, firstname, lastname, apartment_number, voting_weight"
                )

            results = {
                'total_rows': len(df),
                'successful': 0,
                'failed': 0,
                'users_created': 0,
                'errors': []
            }

            # Procesar cada fila
            for index, row in df.iterrows():
                try:
                    row_dict = row.to_dict()
                    
                    # Validar y limpiar datos
                    email = str(row_dict['email']).strip().lower()
                    firstname = str(row_dict['firstname']).strip()
                    lastname = str(row_dict['lastname']).strip()
                    apartment_number = str(row_dict['apartment_number']).strip()
                    phone = str(row_dict.get('phone', '')).strip() if pd.notna(row_dict.get('phone')) else None
                    password = str(row_dict.get('password', 'Temporal123!')).strip()
                    
                    # Validar y convertir voting_weight
                    try:
                        voting_weight = Decimal(str(row_dict['voting_weight']))
                        if voting_weight <= 0 or voting_weight > 100:
                            raise ValueError("El peso de votación debe estar entre 0 y 100")
                    except (ValueError, TypeError) as e:
                        raise ValueError(f"Peso de votación inválido: {row_dict.get('voting_weight')}. Debe ser un número decimal (ej: 0.25)")

                    # Validaciones básicas
                    if len(firstname) < 2:
                        raise ValueError("El nombre debe tener al menos 2 caracteres")
                    if len(lastname) < 2:
                        raise ValueError("El apellido debe tener al menos 2 caracteres")
                    if '@' not in email:
                        raise ValueError("Email inválido")
                    if len(apartment_number) == 0:
                        raise ValueError("Número de apartamento requerido")

                    # Verificar si el usuario ya existe por email
                    existing_user = await self._get_user_by_email(email)
                    user_was_created = False
                    
                    if not existing_user:
                        # ============================================
                        # PASO 1: Crear registro en tbl_data_users
                        # ============================================
                        data_user = DataUserModel(
                            str_firstname=firstname,
                            str_lastname=lastname,
                            str_email=email,
                            str_phone=phone,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        
                        self.db.add(data_user)
                        await self.db.flush()  # Para obtener el ID sin hacer commit
                        
                        logger.info(f"DataUser creado: {email} (ID: {data_user.id})")

                        # ============================================
                        # PASO 2: Crear registro en tbl_users
                        # ============================================
                        # CAMBIO IMPORTANTE: Generar username como nombre.apellido.nroapartamento
                        username = f"{firstname.lower()}.{lastname.lower()}.{apartment_number}".replace(" ", "")
                        
                        # Hashear contraseña
                        hashed_password = security_manager.create_password_hash(password)

                        # Crear User con rol 3 (copropietario) y acceso DESHABILITADO
                        user = UserModel(
                            int_data_user_id=data_user.id,
                            str_username=username,  # ← CAMBIO: Ya no usa email
                            str_password_hash=hashed_password,
                            int_id_rol=3,  # 3: Copropietario (FIJO)
                            bln_allow_entry=False,  # ← NUEVO: Acceso deshabilitado (0)
                            bln_is_external_delegate=False,
                            bln_user_temporary=False,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                            # Nota: created_by y updated_by se omiten si no existen en el modelo
                        )

                        self.db.add(user)
                        await self.db.flush()  # Para obtener el ID sin hacer commit
                        
                        user_was_created = True
                        results['users_created'] += 1
                        logger.info(
                            f"Usuario creado: {username} - Email: {email} - "
                            f"Rol: 3 (Copropietario) - Acceso: Deshabilitado"
                        )
                    else:
                        user = existing_user
                        logger.info(f"Usuario ya existe: {email} (ID: {user.id})")

                    # ============================================
                    # PASO 3: Crear/actualizar registro en tbl_user_residential_units
                    # ============================================
                    # Verificar si ya está asignado a esta unidad residencial
                    existing_assignment = await self._check_user_unit_assignment(
                        user.id, 
                        unit_id
                    )
                    
                    if existing_assignment:
                        # Actualizar número de apartamento y voting_weight si son diferentes
                        needs_update = False
                        
                        if existing_assignment.str_apartment_number != apartment_number:
                            existing_assignment.str_apartment_number = apartment_number
                            needs_update = True
                            logger.info(
                                f"Apartamento actualizado para {email}: "
                                f"{existing_assignment.str_apartment_number} -> {apartment_number}"
                            )
                        
                        if existing_assignment.dec_default_voting_weight != voting_weight:
                            existing_assignment.dec_default_voting_weight = voting_weight
                            needs_update = True
                            logger.info(
                                f"Peso de votación actualizado para {email}: "
                                f"{existing_assignment.dec_default_voting_weight} -> {voting_weight}"
                            )
                        
                        if needs_update:
                            existing_assignment.updated_at = datetime.now()
                    else:
                        # Crear relación usuario-unidad residencial
                        user_unit = UserResidentialUnitModel(
                            int_user_id=user.id,
                            int_residential_unit_id=unit_id,
                            str_apartment_number=apartment_number,
                            dec_default_voting_weight=voting_weight,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        
                        self.db.add(user_unit)
                        logger.info(
                            f"Usuario asignado a unidad: {email} - "
                            f"Apt: {apartment_number} - Peso: {voting_weight}"
                        )

                    results['successful'] += 1

                except Exception as e:
                    results['errors'].append({
                        'row': index + 2,  # +2 porque Excel empieza en 1 y tiene header
                        'email': row_dict.get('email', 'N/A'),
                        'apartment': row_dict.get('apartment_number', 'N/A'),
                        'error': str(e)
                    })
                    results['failed'] += 1
                    logger.error(f"Error procesando fila {index + 2}: {e}")

            # Commit de todas las operaciones exitosas
            if results['successful'] > 0:
                await self.db.commit()
                logger.info(
                    f"Proceso completado exitosamente: {results['successful']} copropietarios procesados, "
                    f"{results['users_created']} usuarios nuevos creados"
                )
            else:
                await self.db.rollback()
                logger.warning("No se procesó ningún copropietario exitosamente")

            return results

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error procesando archivo Excel: {e}")
            raise ServiceException(
                message=f"Error al procesar el archivo Excel: {str(e)}",
                details={"original_error": str(e)}
            )
            
    async def get_residential_unit_by_id(self, unit_id: int) -> Optional[ResidentialUnitModel]:
        """
        Obtiene una unidad residencial por su ID
        
        Args:
            unit_id: ID de la unidad residencial
        
        Returns:
            ResidentialUnitModel o None si no existe
        """
        try:
            query = select(ResidentialUnitModel).where(ResidentialUnitModel.id == unit_id)
            result = await self.db.execute(query)
            residential_unit = result.scalar_one_or_none()
            return residential_unit
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener la unidad residencial por ID: {str(e)}",
                details={"original_error": str(e)}
            )


    async def _get_user_by_email(self, email: str):
        """Helper para obtener usuario por email"""
        from sqlalchemy import select
        
        result = await self.db.execute(
            select(UserModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .where(DataUserModel.str_email == email)
        )
        return result.scalar_one_or_none()


    async def _check_user_unit_assignment(self, user_id: int, unit_id: int):
        """Helper para verificar si un usuario ya está asignado a una unidad"""
        from sqlalchemy import select

        result = await self.db.execute(
            select(UserResidentialUnitModel)
            .where(
                UserResidentialUnitModel.int_user_id == user_id,
                UserResidentialUnitModel.int_residential_unit_id == unit_id
            )
        )
        return result.scalar_one_or_none()

    async def get_users_without_residential_unit(self) -> List[dict]:
        """
        Obtiene todos los usuarios que NO tienen una unidad residencial asociada.
        Útil para seleccionar personal administrativo al crear una unidad residencial.

        Returns:
            Lista de usuarios con sus datos personales que no tienen unidad residencial
        """
        try:
            # Subconsulta para obtener IDs de usuarios que SÍ tienen unidad residencial
            subquery = select(UserResidentialUnitModel.int_user_id).distinct()

            # Consulta principal: usuarios que NO están en la subconsulta
            query = (
                select(UserModel, DataUserModel)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .where(
                    UserModel.id.notin_(subquery)
                )
                .order_by(DataUserModel.str_firstname, DataUserModel.str_lastname)
            )

            result = await self.db.execute(query)
            users_data = result.all()

            # Formatear la respuesta
            users = []
            for user, data_user in users_data:
                users.append({
                    "id": user.id,
                    "username": user.str_username,
                    "firstname": data_user.str_firstname,
                    "lastname": data_user.str_lastname,
                    "email": data_user.str_email,
                    "phone": data_user.str_phone,
                    "full_name": f"{data_user.str_firstname} {data_user.str_lastname}",
                    "role_id": user.int_id_rol,
                    "is_external_delegate": user.bln_is_external_delegate
                })

            return users

        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener usuarios sin unidad residencial: {str(e)}",
                details={"original_error": str(e)}
            )

