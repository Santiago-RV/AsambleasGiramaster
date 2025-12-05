from ast import Dict
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
import logging
from pathlib import Path

from app.models.residential_unit_model import ResidentialUnitModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.schemas.residential_unit_schema import AdministratorData, ResidentialUnitCreate, ResidentialUnitResponse
from app.core.exceptions import ServiceException, ResourceNotFoundException
from app.core.security import security_manager
from app.utils.email_sender import email_sender
from app.services.email_notification_service import EmailNotificationService

from app.models.email_notification_model import EmailNotificationModel
from app.services.email_service import EmailService
from sqlalchemy import select
from datetime import datetime
import logging

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
    
    async def get_residential_unit_by_id(self, unit_id: int) -> Optional[ResidentialUnitModel]:
        """Obtiene una unidad residencial por su ID"""
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
    
    async def create_residential_unit(self, residential_unit_data: ResidentialUnitCreate) -> ResidentialUnitResponse:
        """
        Crea una unidad residencial y opcionalmente asigna un administrador.

        Si se proporciona información del administrador:
        1. Busca si el usuario ya existe por email
        2. Si existe: lo asigna como administrador de la unidad
        3. Si no existe: crea un nuevo usuario con rol Administrador y lo asigna
        """
        try:
            # Extraer datos del administrador antes de crear la unidad
            admin_data = residential_unit_data.administrator

            # Crear la unidad residencial (sin el campo administrator)
            unit_dict = residential_unit_data.model_dump(exclude={'administrator'})
            residential_unit = ResidentialUnitModel(**unit_dict)
            self.db.add(residential_unit)
            await self.db.flush()  # Obtener el ID de la unidad sin hacer commit final

            logger.info(f"Unidad residencial creada: {residential_unit.str_name} (ID: {residential_unit.id})")

            # Si se proporcionó información del administrador, procesarla
            if admin_data and admin_data.str_email:
                try:
                    # Verificar si el usuario ya existe por email
                    existing_user = await self._get_user_by_email(admin_data.str_email)

                    if existing_user:
                        # Usuario existente: asignarlo como administrador
                        logger.info(f"Usuario existente encontrado: {admin_data.str_email} (ID: {existing_user.id})")

                        # Crear relación en tbl_user_residential_units con bool_is_admin = True
                        user_unit = UserResidentialUnitModel(
                            int_user_id=existing_user.id,
                            int_residential_unit_id=residential_unit.id,
                            str_apartment_number="ADMIN",  # Identificador especial para administradores
                            bool_is_admin=True,
                            dec_default_voting_weight=0,  # Los admins no votan por defecto
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        self.db.add(user_unit)

                        # Actualizar bln_allow_entry en tbl_users
                        existing_user.bln_allow_entry = True
                        existing_user.updated_at = datetime.now()

                        logger.info(f"Usuario {existing_user.id} asignado como administrador de la unidad {residential_unit.id}")

                    else:
                        # Usuario nuevo: crear en las 3 tablas
                        logger.info(f"Creando nuevo usuario administrador: {admin_data.str_email}")

                        # 1. Crear en tbl_data_users
                        data_user = DataUserModel(
                            str_firstname=admin_data.str_firstname,
                            str_lastname=admin_data.str_lastname,
                            str_email=admin_data.str_email,
                            str_phone=admin_data.str_phone,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        self.db.add(data_user)
                        await self.db.flush()

                        logger.info(f"DataUser creado para administrador: {admin_data.str_email} (ID: {data_user.id})")

                        # 2. Crear en tbl_users con rol 2 (Administrador)
                        username = f"{admin_data.str_firstname.lower()}.{admin_data.str_lastname.lower()}".replace(" ", "")
                        default_password = "Admin123!"  # Contraseña temporal para administradores
                        hashed_password = security_manager.create_password_hash(default_password)

                        user = UserModel(
                            int_data_user_id=data_user.id,
                            str_username=username,
                            str_password_hash=hashed_password,
                            int_id_rol=2,  # 2: Administrador
                            bln_allow_entry=True,  # Administrador tiene acceso habilitado
                            bln_is_external_delegate=False,
                            bln_user_temporary=False,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        self.db.add(user)
                        await self.db.flush()

                        logger.info(
                            f"Usuario administrador creado: {username} - Email: {admin_data.str_email} - "
                            f"Rol: 2 (Administrador) - Acceso: Habilitado"
                        )

                        # 3. Crear relación en tbl_user_residential_units con bool_is_admin = True
                        user_unit = UserResidentialUnitModel(
                            int_user_id=user.id,
                            int_residential_unit_id=residential_unit.id,
                            str_apartment_number="ADMIN",  # Identificador especial
                            bool_is_admin=True,
                            dec_default_voting_weight=0,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        self.db.add(user_unit)

                        logger.info(
                            f"Usuario {user.id} asignado como administrador de la unidad {residential_unit.id} "
                            f"con contraseña temporal: {default_password}"
                        )

                except Exception as admin_error:
                    logger.error(f"Error al procesar administrador: {admin_error}")
                    # Continuar sin fallar la creación de la unidad
                    logger.warning("La unidad se creó pero hubo un problema asignando el administrador")

            # Commit de todas las operaciones
            await self.db.commit()
            await self.db.refresh(residential_unit)

            return ResidentialUnitResponse.model_validate(residential_unit)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al crear la unidad residencial: {e}")
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
                    UserResidentialUnitModel.str_apartment_number,
                    UserResidentialUnitModel.dec_default_voting_weight
                )
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .where(UserResidentialUnitModel.int_residential_unit_id == residential_unit_id)
            )
            
            result = await self.db.execute(query)
            residents_data = result.all()
            
            # Formatear la respuesta
            residents = []
            for user, data_user, apartment_number, voting_weight  in residents_data:
                residents.append({
                    "id": user.id,
                    "username": user.str_username,
                    "firstname": data_user.str_firstname,
                    "lastname": data_user.str_lastname,
                    "email": data_user.str_email,
                    "phone": data_user.str_phone,
                    "apartment_number": apartment_number,
                    "voting_weight": float(voting_weight) if voting_weight else 0.0,
                    "is_external_delegate": user.bln_is_external_delegate,
                    "user_temporary": user.bln_user_temporary,
                    "is_active": user.bln_allow_entry,  # ← CAMBIO: usar bln_allow_entry
                    "created_at": user.created_at,
                })
            
            return residents
        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener los residentes de la unidad residencial: {str(e)}",
                details={"original_error": str(e)}
            )
            
    async def get_users_without_residential_unit(self, unit_id: Optional[int] = None):
        """
        Obtiene usuarios que NO están asignados a una unidad residencial específica
        o que no tienen ninguna unidad asignada
        
        Args:
            unit_id: ID de la unidad residencial (opcional)
                    - Si se proporciona: retorna usuarios NO en esa unidad
                    - Si es None: retorna usuarios SIN ninguna unidad
        
        Returns:
            Lista de usuarios no asignados
        """
        try:
            from sqlalchemy import and_, not_
            
            if unit_id is not None:
                # Caso 1: Usuarios NO asignados a una unidad específica
                subquery = (
                    select(UserResidentialUnitModel.int_user_id)
                    .where(UserResidentialUnitModel.int_residential_unit_id == unit_id)
                )
                
                query = (
                    select(UserModel, DataUserModel)
                    .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                    .where(
                        and_(
                            UserModel.int_id_rol == 3,  # Solo copropietarios
                            UserModel.id.not_in(subquery)  # No están en esta unidad
                        )
                    )
                )
            else:
                # Caso 2: Usuarios SIN ninguna unidad asignada
                subquery = select(UserResidentialUnitModel.int_user_id).distinct()
                
                query = (
                    select(UserModel, DataUserModel)
                    .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                    .where(
                        and_(
                            UserModel.int_id_rol == 3,  # Solo copropietarios
                            UserModel.id.not_in(subquery)  # No tienen ninguna unidad
                        )
                    )
                )
            
            result = await self.db.execute(query)
            users_data = result.all()
            
            # Formatear respuesta
            users = []
            for user, data_user in users_data:
                users.append({
                    "id": user.id,
                    "username": user.str_username,
                    "firstname": data_user.str_firstname,
                    "lastname": data_user.str_lastname,
                    "email": data_user.str_email,
                    "phone": data_user.str_phone,
                })
            
            logger.info(
                f"Usuarios sin unidad obtenidos: {len(users)} "
                f"(unit_id: {unit_id if unit_id else 'ninguna'})"
            )
            
            return users
            
        except Exception as e:
            logger.error(f"Error al obtener usuarios sin unidad residencial: {str(e)}")
            raise ServiceException(
                message=f"Error al obtener usuarios sin unidad residencial: {str(e)}",
                details={"original_error": str(e)}
            )
            
    async def process_residents_excel_file(
        self, 
        file_content: bytes, 
        unit_id: int, 
        created_by: int
    ) -> dict:
        """
        Procesa el archivo Excel y crea copropietarios masivamente insertando en 3 tablas:
        - tbl_data_users: Información personal
        - tbl_users: Credenciales y permisos
        - tbl_user_residential_units: Relación con unidad residencial

        Los copropietarios se crean con acceso deshabilitado. El Super Admin puede 
        habilitar el acceso y enviar credenciales posteriormente mediante selección masiva.

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
        """
        try:
            # Obtener información de la unidad residencial para los correos
            residential_unit = await self.get_residential_unit_by_id(unit_id)
            if not residential_unit:
                raise ValueError(f"Unidad residencial con ID {unit_id} no encontrada")
            
            residential_unit_name = residential_unit.str_name
            
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
                # 'emails_sent': 0,
                # 'emails_failed': 0,
                'errors': []
            }
            
            # Crear instancia del servicio de notificaciones
            # notification_service = EmailNotificationService(self.db)

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
                    # password_to_send = password  # Guardar contraseña antes de hashear
                    
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
                        await self.db.flush()
                        
                        logger.info(f"📝 DataUser creado: {email} (ID: {data_user.id})")

                        # ============================================
                        # PASO 2: Crear registro en tbl_users
                        # ============================================
                        # Generar username como nombre.apellido.nroapartamento
                        username = f"{firstname.lower()}.{lastname.lower()}.{apartment_number}".replace(" ", "")
                        
                        # Hashear contraseña
                        hashed_password = security_manager.create_password_hash(password)

                        # Crear User con rol 3 (copropietario) y acceso DESHABILITADO
                        user = UserModel(
                            int_data_user_id=data_user.id,
                            str_username=username,
                            str_password_hash=hashed_password,
                            int_id_rol=3,  # 3: Copropietario (FIJO)
                            bln_allow_entry=False,  # Acceso deshabilitado (0)
                            bln_is_external_delegate=False,
                            bln_user_temporary=False,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )

                        self.db.add(user)
                        await self.db.flush()
                        
                        user_was_created = True
                        results['users_created'] += 1
                        logger.info(
                            f"👤 Usuario creado: {username} - Email: {email} - "
                            f"Rol: 3 (Copropietario) - Acceso: Deshabilitado"
                        )
                    else:
                        user = existing_user
                        username = user.str_username
                        logger.info(f"ℹ️ Usuario ya existe: {email} (ID: {user.id})")

                    # ============================================
                    # PASO 3: Crear/actualizar registro en tbl_user_residential_units
                    # ============================================
                    existing_assignment = await self._check_user_unit_assignment(
                        user.id, 
                        unit_id
                    )
                    
                    if existing_assignment:
                        # Actualizar si hay cambios
                        needs_update = False
                        
                        if existing_assignment.str_apartment_number != apartment_number:
                            existing_assignment.str_apartment_number = apartment_number
                            needs_update = True
                            logger.info(
                                f"🏠 Apartamento actualizado para {email}: "
                                f"{existing_assignment.str_apartment_number} -> {apartment_number}"
                            )
                        
                        if existing_assignment.dec_default_voting_weight != voting_weight:
                            existing_assignment.dec_default_voting_weight = voting_weight
                            needs_update = True
                            logger.info(
                                f"⚖️ Peso de votación actualizado para {email}: "
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
                            bool_is_admin=False,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        
                        self.db.add(user_unit)
                        logger.info(
                            f"🔗 Usuario asignado a unidad: {email} - "
                            f"Apt: {apartment_number} - Peso: {voting_weight}"
                        )

                    # ============================================
                    # PASO 4: Enviar correo de bienvenida (solo si es usuario nuevo)
                    # ============================================
                    # if user_was_created:
                    #     try:
                    #         # Crear notificación en estado "pending"
                    #         notification = await notification_service.create_notification(
                    #             user_id=user.id,
                    #             template="welcome_coproprietario_bulk",
                    #             status="pending",
                    #             meeting_id=None
                    #         )
                            
                    #         # Enviar correo de bienvenida
                    #         email_sent = self._send_welcome_email(
                    #             user_email=email,
                    #             user_name=f"{firstname} {lastname}",
                    #             username=username,
                    #             password=password_to_send,  # Contraseña sin hashear
                    #             residential_unit_name=residential_unit_name,
                    #             apartment_number=apartment_number,
                    #             voting_weight=voting_weight,
                    #             phone=phone
                    #         )
                            
                    #         # Actualizar estado de la notificación
                    #         status = "sent" if email_sent else "failed"
                    #         await notification_service.update_status(
                    #             notification_id=notification.id,
                    #             status=status,
                    #             commit=False  # No hacer commit individual
                    #         )
                            
                    #         if email_sent:
                    #             results['emails_sent'] += 1
                    #             logger.info(
                    #                 f"Correo enviado a {email} - "
                    #                 f"Notificación ID: {notification.id}"
                    #             )
                    #         else:
                    #             results['emails_failed'] += 1
                    #             logger.warning(
                    #                 f"No se pudo enviar correo a {email} - "
                    #                 f"Notificación ID: {notification.id} marcada como 'failed'"
                    #             )
                                
                    #     except Exception as email_error:
                    #         results['emails_failed'] += 1
                    #         logger.error(
                    #             f"Error al enviar correo/notificación a {email}: {str(email_error)}"
                    #         )

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
    
    async def create_resident(self, unit_id: int, resident_data: dict):
        """
        Crea un nuevo copropietario para una unidad residencial
        Inserta en 3 tablas: tbl_data_users, tbl_users, tbl_user_residential_units
        """
        try:
            # 1. Verificar que la unidad residencial existe
            residential_unit = await self.get_residential_unit_by_id(unit_id)
            if not residential_unit:
                raise ResourceNotFoundException(
                    message=f"Unidad residencial con ID {unit_id} no encontrada",
                    error_code="RESIDENTIAL_UNIT_NOT_FOUND"
                )
            
            # 2. Extraer y validar datos
            firstname = resident_data.get('firstname', '').strip()
            lastname = resident_data.get('lastname', '').strip()
            email = resident_data.get('email', '').strip().lower()
            phone = resident_data.get('phone', '').strip() if resident_data.get('phone') else None
            apartment_number = resident_data.get('apartment_number', '').strip()
            password = resident_data.get('password', 'Temporal123!')
            is_active = resident_data.get('is_active', False)  # Por defecto deshabilitado
            voting_weight = resident_data.get('voting_weight', Decimal('0.0'))
            
            # Validaciones básicas
            if not firstname or len(firstname) < 2:
                raise ServiceException(
                    message="El nombre debe tener al menos 2 caracteres",
                    details={"field": "firstname"}
                )
            
            if not lastname or len(lastname) < 2:
                raise ServiceException(
                    message="El apellido debe tener al menos 2 caracteres",
                    details={"field": "lastname"}
                )
            
            if not email or '@' not in email:
                raise ServiceException(
                    message="Email inválido",
                    details={"field": "email"}
                )
            
            if not apartment_number:
                raise ServiceException(
                    message="El número de apartamento es obligatorio",
                    details={"field": "apartment_number"}
                )
            
            # 3. Generar username si no viene (formato: nombre.apellido.apartamento)
            username = resident_data.get('username')
            if not username:
                username = f"{firstname.lower()}.{lastname.lower()}.{apartment_number}".replace(" ", "")
            
            # 4. Verificar que el email no exista
            existing_email = await self.db.execute(
                select(DataUserModel).where(DataUserModel.str_email == email)
            )
            if existing_email.scalar_one_or_none():
                raise ServiceException(
                    message=f"El email {email} ya está registrado",
                    details={"field": "email"}
                )
            
            # 5. Verificar que el username no exista
            existing_username = await self.db.execute(
                select(UserModel).where(UserModel.str_username == username)
            )
            if existing_username.scalar_one_or_none():
                raise ServiceException(
                    message=f"El usuario {username} ya existe",
                    details={"field": "username"}
                )
            
            # 6. Crear registro en tbl_data_users
            data_user = DataUserModel(
                str_firstname=firstname,
                str_lastname=lastname,
                str_email=email,
                str_phone=phone,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            self.db.add(data_user)
            await self.db.flush()  # Para obtener el ID
            
            logger.info(f"📝 DataUser creado: {email} (ID: {data_user.id})")
            
            # 7. Crear registro en tbl_users
            # Hashear contraseña
            hashed_password = security_manager.create_password_hash(password)
            
            user = UserModel(
                int_data_user_id=data_user.id,
                str_username=username,
                str_password_hash=hashed_password,
                int_id_rol=3,  # 3: Copropietario (FIJO)
                bln_allow_entry=is_active,  # Usar el valor proporcionado
                bln_is_external_delegate=False,
                bln_user_temporary=False,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            self.db.add(user)
            await self.db.flush()  # Para obtener el ID
            
            logger.info(
                f"👤 Usuario creado: {username} - Email: {email} - "
                f"Rol: 3 (Copropietario) - Acceso: {'Habilitado' if is_active else 'Deshabilitado'}"
            )
            
            # 8. Crear registro en tbl_user_residential_units
            user_unit = UserResidentialUnitModel(
                int_user_id=user.id,
                int_residential_unit_id=unit_id,
                str_apartment_number=apartment_number,
                dec_default_voting_weight=voting_weight,
                bool_is_admin=False,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            self.db.add(user_unit)
            
            logger.info(
                f"🔗 Usuario asignado a unidad: {email} - "
                f"Apt: {apartment_number} - Peso: {voting_weight}"
            )
            
            # 9. Commit de la transacción
            await self.db.commit()
            await self.db.refresh(user)
            await self.db.refresh(data_user)
            await self.db.refresh(user_unit)
            
            # 10. Enviar correo de bienvenida (opcional)
            try:
                email_sent = self._send_welcome_email(
                    user_email=email,
                    user_name=f"{firstname} {lastname}",
                    username=username,
                    password=password,  # Contraseña sin hashear
                    residential_unit_name=residential_unit.str_name,
                    apartment_number=apartment_number,
                    voting_weight=voting_weight,
                    phone=phone
                )
                
                if email_sent:
                    logger.info(f"Correo de bienvenida enviado a {email}")
                else:
                    logger.warning(f"No se pudo enviar correo de bienvenida a {email}")
            except Exception as e:
                # No fallar si el correo falla, solo registrar
                logger.error(f"Error al enviar correo de bienvenida: {str(e)}")
            
            # 11. Retornar los datos del residente creado
            logger.info(f"Copropietario creado exitosamente: {username}")
            
            return {
                "id": user.id,
                "username": username,
                "firstname": firstname,
                "lastname": lastname,
                "email": email,
                "phone": phone,
                "apartment_number": apartment_number,
                "voting_weight": float(voting_weight) if voting_weight else 0.0,
                "is_active": is_active,
                "created_at": user.created_at
            }
            
        except (ResourceNotFoundException, ServiceException):
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al crear copropietario: {str(e)}")
            raise ServiceException(
                message=f"Error al crear copropietario: {str(e)}",
                details={"original_error": str(e)}
            )
            
    def _send_welcome_email(
        self,
        user_email: str,
        user_name: str,
        username: str,
        password: str,
        residential_unit_name: str,
        apartment_number: str,
        voting_weight: Decimal,
        phone: Optional[str] = None
    ) -> bool:
        """
        Envía correo de bienvenida al copropietario con sus credenciales.
        
        NOTA: Este método NO registra notificaciones en la BD.
        Las notificaciones deben ser manejadas por el método que llama a esta función.
        
        Args:
            user_email: Email del copropietario
            user_name: Nombre completo del copropietario
            username: Usuario para login
            password: Contraseña en texto plano
            residential_unit_name: Nombre de la unidad residencial
            apartment_number: Número de apartamento
            voting_weight: Peso de votación (coeficiente)
            phone: Teléfono (opcional)
        
        Returns:
            bool: True si el envío fue exitoso, False en caso contrario
        """
        try:
            # Leer template HTML
            template_path = Path(__file__).parent.parent / "templates" / "welcome_coproprietario.html"
            
            if not template_path.exists():
                logger.error(f"Template de email no encontrado: {template_path}")
                return False
            
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            # Convertir voting_weight a porcentaje para mostrar
            voting_weight_percent = float(voting_weight) * 100
            
            # Reemplazar variables en el template
            html_content = html_template.replace('{{user_name}}', user_name)
            html_content = html_content.replace('{{residential_unit_name}}', residential_unit_name)
            html_content = html_content.replace('{{apartment_number}}', apartment_number)
            html_content = html_content.replace('{{user_email}}', user_email)
            html_content = html_content.replace('{{username}}', username)
            html_content = html_content.replace('{{password}}', password)
            html_content = html_content.replace('{{voting_weight}}', f"{voting_weight_percent:.2f}")
            html_content = html_content.replace('{{current_year}}', str(datetime.now().year))
            html_content = html_content.replace('{{login_url}}', 'http://localhost:5173/login')
            
            # Manejar teléfono opcional
            if phone:
                html_content = html_content.replace('{{#if phone}}', '')
                html_content = html_content.replace('{{/if}}', '')
                html_content = html_content.replace('{{phone}}', phone)
            else:
                # Remover sección de teléfono si no existe
                import re
                html_content = re.sub(r'{{#if phone}}.*?{{/if}}', '', html_content, flags=re.DOTALL)
            
            # Enviar email
            success = email_sender.send_email(
                to_emails=[user_email],
                subject=f"Bienvenido a GIRAMASTER - {residential_unit_name}",
                html_content=html_content,
                text_content=f"""
    Estimado(a) {user_name},

    Se ha creado exitosamente su cuenta como copropietario de {residential_unit_name}.

    CREDENCIALES DE ACCESO:
    - Usuario: {username}
    - Contraseña: {password}

    Información de su cuenta:
    - Apartamento: {apartment_number}
    - Email: {user_email}
    - Peso de votación: {voting_weight_percent:.2f}%

    IMPORTANTE: Su cuenta ha sido creada con acceso DESHABILITADO por motivos de seguridad.
    El Super Administrador debe habilitar su acceso antes de que pueda iniciar sesión.

    Por seguridad, le recomendamos cambiar su contraseña después del primer inicio de sesión.

    Saludos,
    Sistema GIRAMASTER
                """
            )
            
            if success:
                logger.info(f"✉️ Correo de bienvenida enviado exitosamente a {user_email}")
            else:
                logger.warning(f"No se pudo enviar correo de bienvenida a {user_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error al enviar correo de bienvenida a {user_email}: {str(e)}")
            return False


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
    
    async def update_resident(self, user_id: int, unit_id: int, update_data: dict):
        """Actualiza un copropietario"""
        try:
            # Verificar que el usuario existe y pertenece a la unidad
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
            
            result = await self.db.execute(query)
            user_data = result.first()
            
            if not user_data:
                raise ResourceNotFoundException(
                    message=f"Copropietario no encontrado",
                    error_code="RESIDENT_NOT_FOUND"
                )
            
            user, data_user, user_unit = user_data
            
            # Actualizar datos personales
            if 'firstname' in update_data and update_data['firstname']:
                data_user.str_firstname = update_data['firstname']
            
            if 'lastname' in update_data and update_data['lastname']:
                data_user.str_lastname = update_data['lastname']
            
            if 'email' in update_data and update_data['email']:
                # Verificar que el email no esté en uso
                existing = await self.db.execute(
                    select(DataUserModel).where(
                        and_(
                            DataUserModel.str_email == update_data['email'],
                            DataUserModel.id != data_user.id
                        )
                    )
                )
                if existing.scalar_one_or_none():
                    raise ServiceException(
                        message=f"El email ya está en uso",
                        details={"field": "email"}
                    )
                data_user.str_email = update_data['email']
            
            if 'phone' in update_data:
                data_user.str_phone = update_data['phone']
            
            data_user.updated_at = datetime.now()
            
            # Actualizar contraseña si se proporciona
            if 'password' in update_data and update_data['password']:
                hashed_password = security_manager.create_password_hash(update_data['password'])
                user.str_password_hash = hashed_password
                logger.info(f"🔐 Contraseña actualizada para {user.str_username}")
            
            # Actualizar estado de acceso
            if 'is_active' in update_data and update_data['is_active'] is not None:
                user.bln_allow_entry = update_data['is_active']
            
            user.updated_at = datetime.now()
            
            # Actualizar datos de la unidad
            if 'apartment_number' in update_data and update_data['apartment_number']:
                user_unit.str_apartment_number = update_data['apartment_number']
            
            if 'voting_weight' in update_data and update_data['voting_weight'] is not None:
                user_unit.dec_default_voting_weight = update_data['voting_weight']
            
            user_unit.updated_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(user)
            await self.db.refresh(data_user)
            await self.db.refresh(user_unit)
            
            logger.info(f"Copropietario actualizado: {user.str_username}")
            
            return {
                "id": user.id,
                "username": user.str_username,
                "firstname": data_user.str_firstname,
                "lastname": data_user.str_lastname,
                "email": data_user.str_email,
                "phone": data_user.str_phone,
                "apartment_number": user_unit.str_apartment_number,
                "voting_weight": float(user_unit.dec_default_voting_weight),
                "is_active": user.bln_allow_entry,
                "updated_at": user.updated_at
            }
            
        except ResourceNotFoundException:
            raise
        except ServiceException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al actualizar: {str(e)}")
            raise ServiceException(
                message=f"Error al actualizar copropietario: {str(e)}",
                details={"original_error": str(e)}
            )
            
    # async def delete_resident(self, user_id: int, unit_id: int):
    #     """Elimina un copropietario (eliminación en cascada)"""
    #     try:
    #         # Verificar que existe
    #         query = (
    #             select(UserModel, DataUserModel, UserResidentialUnitModel)
    #             .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
    #             .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
    #             .where(
    #                 and_(
    #                     UserModel.id == user_id,
    #                     UserResidentialUnitModel.int_residential_unit_id == unit_id,
    #                     UserModel.int_id_rol == 3  # Solo copropietarios
    #                 )
    #             )
    #         )
            
    #         result = await self.db.execute(query)
    #         user_data = result.first()
            
    #         if not user_data:
    #             raise ResourceNotFoundException(
    #                 message=f"Copropietario no encontrado",
    #                 error_code="RESIDENT_NOT_FOUND"
    #             )
            
    #         user, data_user, user_unit = user_data
    #         username = user.str_username
    #         email = data_user.str_email
    #         data_user_id = user.int_data_user_id
            
    #         # Eliminar en orden: relación -> usuario -> datos
    #         await self.db.execute(
    #             delete(UserResidentialUnitModel).where(
    #                 and_(
    #                     UserResidentialUnitModel.int_user_id == user_id,
    #                     UserResidentialUnitModel.int_residential_unit_id == unit_id
    #                 )
    #             )
    #         )
            
    #         await self.db.execute(delete(UserModel).where(UserModel.id == user_id))
    #         await self.db.execute(delete(DataUserModel).where(DataUserModel.id == data_user_id))
            
    #         await self.db.commit()
            
    #         logger.info(f"Copropietario eliminado: {username} ({email})")
            
    #         return True
            
    #     except ResourceNotFoundException:
    #         raise
    #     except Exception as e:
    #         await self.db.rollback()
    #         logger.error(f"Error al eliminar: {str(e)}")
    #         raise ServiceException(
    #             message=f"Error al eliminar copropietario: {str(e)}",
    #             details={"original_error": str(e)}
    #         )
    
    async def delete_resident(self, user_id: int, unit_id: int):
        """Elimina un copropietario (eliminación en cascada)"""
        try:
            # PASO 1: Verificar que existe la relación usuario-unidad
            query = (
                select(UserModel, DataUserModel, UserResidentialUnitModel)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .where(
                    and_(
                        UserModel.id == user_id,
                        UserResidentialUnitModel.int_residential_unit_id == unit_id,
                        # 🔥 CAMBIO: Verificar que NO sea administrador en lugar de verificar rol
                        UserResidentialUnitModel.bool_is_admin == False
                    )
                )
            )
            
            result = await self.db.execute(query)
            user_data = result.first()
            
            if not user_data:
                # 🔥 NUEVO: Query de diagnóstico para dar mejor información del error
                diagnostic_query = (
                    select(UserModel, UserResidentialUnitModel)
                    .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                    .where(
                        and_(
                            UserModel.id == user_id,
                            UserResidentialUnitModel.int_residential_unit_id == unit_id
                        )
                    )
                )
                diagnostic_result = await self.db.execute(diagnostic_query)
                diagnostic_data = diagnostic_result.first()
                
                if diagnostic_data:
                    user, user_unit = diagnostic_data
                    if user_unit.bool_is_admin:
                        raise ServiceException(
                            message="No se puede eliminar: el usuario es administrador de esta unidad",
                            details={
                                "user_id": user_id,
                                "unit_id": unit_id,
                                "is_admin": True
                            }
                        )
                    else:
                        raise ServiceException(
                            message=f"Usuario encontrado pero no se puede eliminar (Rol: {user.int_id_rol})",
                            details={
                                "user_id": user_id,
                                "unit_id": unit_id,
                                "role": user.int_id_rol
                            }
                        )
                else:
                    raise ResourceNotFoundException(
                        message=f"Copropietario no encontrado en esta unidad",
                        error_code="RESIDENT_NOT_FOUND"
                    )
            
            user, data_user, user_unit = user_data
            username = user.str_username
            email = data_user.str_email
            data_user_id = user.int_data_user_id
            
            # 🔥 VALIDACIÓN ADICIONAL: No permitir eliminar si es admin
            if user_unit.bool_is_admin:
                raise ServiceException(
                    message="No se puede eliminar un administrador. Primero debe remover sus privilegios.",
                    details={"user_id": user_id, "is_admin": True}
                )
            
            # Eliminar en orden: relación -> usuario -> datos
            await self.db.execute(
                delete(UserResidentialUnitModel).where(
                    and_(
                        UserResidentialUnitModel.int_user_id == user_id,
                        UserResidentialUnitModel.int_residential_unit_id == unit_id
                    )
                )
            )
            
            await self.db.execute(delete(UserModel).where(UserModel.id == user_id))
            await self.db.execute(delete(DataUserModel).where(DataUserModel.id == data_user_id))
            
            await self.db.commit()
            
            logger.info(f"Copropietario eliminado: {username} ({email})")
            
            return True
            
        except ResourceNotFoundException:
            raise
        except ServiceException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al eliminar: {str(e)}")
            raise ServiceException(
                message=f"Error al eliminar copropietario: {str(e)}",
                details={"original_error": str(e)}
            )
                
    async def resend_resident_credentials(self, user_id: int, unit_id: int):
        """
        Reenvía las credenciales de acceso por correo electrónico a un copropietario.
        Genera una nueva contraseña temporal y registra la notificación en BD.
        """
        try:
            # Verificar que el usuario existe y pertenece a la unidad
            query = (
                select(UserModel, DataUserModel, UserResidentialUnitModel)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .where(
                    and_(
                        UserModel.id == user_id,
                        UserResidentialUnitModel.int_residential_unit_id == unit_id,
                        (UserModel.int_id_rol == 3) | (UserResidentialUnitModel.bool_is_admin == False)  # Solo copropietarios
                    )
                )
            )
            
            result = await self.db.execute(query)
            user_data = result.first()
            
            if not user_data:
                raise ResourceNotFoundException(
                    message=f"Copropietario no encontrado",
                    error_code="RESIDENT_NOT_FOUND"
                )
            
            user, data_user, user_unit = user_data
            
            # Obtener información de la unidad residencial
            residential_unit = await self.get_residential_unit_by_id(unit_id)
            if not residential_unit:
                raise ResourceNotFoundException(
                    message=f"Unidad residencial no encontrada",
                    error_code="RESIDENTIAL_UNIT_NOT_FOUND"
                )
            
            # Generar nueva contraseña temporal
            import secrets
            import string
            
            # Generar contraseña aleatoria de 12 caracteres
            alphabet = string.ascii_letters + string.digits + "!@#$%"
            temporary_password = ''.join(secrets.choice(alphabet) for i in range(12))
            
            # Actualizar contraseña en la base de datos
            hashed_password = security_manager.create_password_hash(temporary_password)
            user.str_password_hash = hashed_password
            user.updated_at = datetime.now()
            
            await self.db.commit()
            
            # 🔥 REGISTRAR NOTIFICACIÓN Y ENVIAR CORREO
            notification_service = EmailNotificationService(self.db)
            
            try:
                # Crear notificación en estado "pending"
                notification = await notification_service.create_notification(
                    user_id=user.id,
                    template="resend_credentials",
                    status="pending",
                    meeting_id=None
                )
                
                # Enviar correo con las nuevas credenciales
                email_sent = self._send_welcome_email(
                    user_email=data_user.str_email,
                    user_name=f"{data_user.str_firstname} {data_user.str_lastname}",
                    username=user.str_username,
                    password=temporary_password,  # Contraseña sin hashear
                    residential_unit_name=residential_unit.str_name,
                    apartment_number=user_unit.str_apartment_number,
                    voting_weight=user_unit.dec_default_voting_weight or Decimal('0.0'),
                    phone=data_user.str_phone
                )
                
                # Actualizar estado de la notificación según resultado
                status = "sent" if email_sent else "failed"
                await notification_service.update_status(
                    notification_id=notification.id,
                    status=status,
                    commit=True  # Commit de la notificación
                )
                
                if email_sent:
                    logger.info(
                        f"Credenciales reenviadas a {data_user.str_email} "
                        f"- Notificación ID: {notification.id} registrada como '{status}'"
                    )
                    return {
                        "email": data_user.str_email,
                        "username": user.str_username,
                        "email_sent": True,
                        "notification_id": notification.id,
                        "message": f"Credenciales enviadas a {data_user.str_email}"
                    }
                else:
                    logger.warning(
                        f"No se pudo enviar correo a {data_user.str_email} "
                        f"- Notificación ID: {notification.id} marcada como 'failed'"
                    )
                    raise ServiceException(
                        message=f"No se pudo enviar el correo a {data_user.str_email}",
                        details={
                            "email": data_user.str_email,
                            "notification_id": notification.id
                        }
                    )
                    
            except ServiceException:
                raise
            except Exception as e:
                logger.error(f"Error al enviar correo/notificación: {str(e)}")
                raise ServiceException(
                    message=f"Error al procesar el envío de credenciales: {str(e)}",
                    details={"original_error": str(e)}
                )
                
        except (ResourceNotFoundException, ServiceException):
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al reenviar credenciales: {str(e)}")
            raise ServiceException(
                message=f"Error al reenviar credenciales: {str(e)}",
                details={"original_error": str(e)}
            )    
            
    async def get_unit_administrator(self, unit_id: int) -> Optional[dict]:
        """
        Obtiene el administrador actual de una unidad residencial.

        Args:
            unit_id: ID de la unidad residencial

        Returns:
            Diccionario con datos del administrador o None si no hay administrador
        """
        try:
            query = (
                select(UserModel, DataUserModel, UserResidentialUnitModel)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .where(
                    UserResidentialUnitModel.int_residential_unit_id == unit_id,
                    UserResidentialUnitModel.bool_is_admin == True
                )
            )

            result = await self.db.execute(query)
            admin_data = result.first()

            if not admin_data:
                return None

            user, data_user, user_unit = admin_data

            return {
                "id": user.id,
                "username": user.str_username,
                "firstname": data_user.str_firstname,
                "lastname": data_user.str_lastname,
                "email": data_user.str_email,
                "phone": data_user.str_phone,
                "apartment_number": user_unit.str_apartment_number,
                "role": "Administrador"
            }

        except Exception as e:
            raise ServiceException(
                message=f"Error al obtener el administrador de la unidad: {str(e)}",
                details={"original_error": str(e)}
            )
    
    async def create_manual_administrator(
        self,
        unit_id: int,
        admin_data: AdministratorData,
        created_by_user_id: int
    ) -> dict:
        """
        Crea un administrador manual (sin ser copropietario) y lo asigna a una unidad residencial.
        """
        
        try:
            # ============================================
            # PASO 1: Validar que el email no exista
            # ============================================
            query_email_check = select(DataUserModel).where(
                DataUserModel.str_email == admin_data.str_email
            )
            result_email = await self.db.execute(query_email_check)
            existing_email = result_email.scalar_one_or_none()

            if existing_email:
                raise ValueError(
                    f"Ya existe un usuario con el email {admin_data.str_email}. "
                    "Por favor utiliza otro email o asigna ese usuario existente como administrador."
                )

            logger.info(f"Email {admin_data.str_email} disponible para nuevo administrador")

            # ============================================
            # PASO 2: Crear registro en tbl_data_users
            # ============================================
            data_user = DataUserModel(
                str_firstname=admin_data.str_firstname,
                str_lastname=admin_data.str_lastname,
                str_email=admin_data.str_email,
                str_phone=admin_data.str_phone,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.db.add(data_user)
            await self.db.flush()

            logger.info(f"DataUser creado: ID {data_user.id}")

            # ============================================
            # PASO 3: Generar username y contraseña
            # ============================================
            # Username: nombre.apellido (sin espacios, minúsculas)
            username = f"{admin_data.str_firstname.lower()}.{admin_data.str_lastname.split()[0].lower()}".replace(" ", "")

            # Verificar que el username no exista
            counter = 1
            original_username = username
            while True:
                query_username = select(UserModel).where(UserModel.str_username == username)
                result_username = await self.db.execute(query_username)
                existing_username = result_username.scalar_one_or_none()

                if not existing_username:
                    break

                username = f"{original_username}{counter}"
                counter += 1

            # Contraseña temporal para administradores
            default_password = "Admin123!"
            hashed_password = security_manager.create_password_hash(default_password)

            logger.info(f"Username generado: {username}")

            # ============================================
            # PASO 4: Crear registro en tbl_users
            # ============================================
            user = UserModel(
                int_data_user_id=data_user.id,
                str_username=username,
                str_password_hash=hashed_password,
                int_id_rol=2,  # 2: Administrador
                bln_allow_entry=True,  # Acceso HABILITADO
                bln_is_external_delegate=False,
                bln_user_temporary=False,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.db.add(user)
            await self.db.flush()

            logger.info(
                f"Usuario creado: {username} - Rol: 2 (Administrador) - "
                f"Acceso: Habilitado - ID: {user.id}"
            )

            # ============================================
            # PASO 5: Desactivar administrador anterior (si existe)
            # ============================================
            query_old_admin = (
                select(UserResidentialUnitModel, UserModel)
                .join(UserModel, UserResidentialUnitModel.int_user_id == UserModel.id)
                .where(
                    UserResidentialUnitModel.int_residential_unit_id == unit_id,
                    UserResidentialUnitModel.bool_is_admin == True
                )
            )
            result_old = await self.db.execute(query_old_admin)
            old_admin_data = result_old.first()

            if old_admin_data:
                old_admin_unit, old_admin_user = old_admin_data

                # Marcar como NO administrador
                old_admin_unit.bool_is_admin = False
                old_admin_unit.updated_at = datetime.now()

                # Deshabilitar acceso (solo si NO es copropietario de la unidad)
                # Si str_apartment_number es "ADMIN", significa que es admin puro, no copropietario
                if old_admin_unit.str_apartment_number == "ADMIN":
                    old_admin_user.bln_allow_entry = False
                    old_admin_user.updated_at = datetime.now()

                logger.info(
                    f"Administrador anterior removido: Usuario ID {old_admin_user.id}"
                )

            # ============================================
            # PASO 6: Crear relación en tbl_user_residential_units
            # ============================================
            user_unit = UserResidentialUnitModel(
                int_user_id=user.id,
                int_residential_unit_id=unit_id,
                str_apartment_number="ADMIN",  # Identificador especial para administradores
                bool_is_admin=True,
                dec_default_voting_weight=0,  # Administradores no votan
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.db.add(user_unit)

            logger.info(
                f"Administrador asignado a unidad {unit_id} con bool_is_admin=True"
            )

            # ============================================
            # PASO 7: Enviar email con credenciales
            # ============================================
            email_service = EmailService()

            # Obtener el nombre de la unidad residencial para el email
            unit = await self.get_residential_unit_by_id(unit_id)
            unit_name = unit.str_name if unit else "la unidad residencial"

            try:
                await email_service.send_administrator_credentials_email(
                    to_email=admin_data.str_email,
                    firstname=admin_data.str_firstname,
                    lastname=admin_data.str_lastname,
                    username=username,
                    password=default_password,
                    residential_unit_name=unit_name
                )

                logger.info(f"Email de credenciales enviado a {admin_data.str_email}")

                # Registrar el envío del email
                email_notification = EmailNotificationModel(
                    int_meeting_id=None,  # No está asociado a una reunión
                    int_user_id=user.id,
                    str_status="sent",  
                    str_template="admin_credentials",  
                    dat_sent_at=datetime.now(),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.db.add(email_notification)

            except Exception as email_error:
                logger.error(f"Error al enviar email: {email_error}")
                # No fallar la creación si el email falla
                # Registrar intento fallido
                email_notification = EmailNotificationModel(
                    int_meeting_id=None,
                    int_user_id=user.id,
                    str_status="failed",  
                    str_template="admin_credentials",  
                    dat_sent_at=None,  # No se envió
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.db.add(email_notification)

            # ============================================
            # PASO 8: Commit de todas las operaciones
            # ============================================
            await self.db.commit()
            await self.db.refresh(user)
            await self.db.refresh(data_user)

            logger.info(
                f"Administrador creado exitosamente: {username} para unidad {unit_id}"
            )

            # ============================================
            # PASO 9: Retornar información del administrador
            # ============================================
            return {
                "user_id": user.id,
                "username": username,
                "firstname": data_user.str_firstname,
                "lastname": data_user.str_lastname,
                "email": data_user.str_email,
                "phone": data_user.str_phone,
                "role": "Administrador",
                "residential_unit_id": unit_id,
                "is_admin": True,
                "allow_entry": True,
                "temporary_password": default_password,
                "message": "Administrador creado exitosamente. Se envió un email con las credenciales de acceso."
            }

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al crear administrador manual: {e}")
            raise ServiceException(
                message=f"Error al crear el administrador: {str(e)}",
                details={"original_error": str(e)}
            )

    async def change_unit_administrator(self, unit_id: int, new_admin_user_id: int) -> dict:
        """
        Cambia el administrador de una unidad residencial.

        - Marca bool_is_admin = False para el administrador anterior
        - Marca bool_is_admin = True para el nuevo administrador
        - Actualiza bln_allow_entry = True para el nuevo administrador
        - Actualiza bln_allow_entry = False para el anterior (solo si era admin)
        - Actualiza int_id_rol = 2 (Administrador) para el nuevo administrador
        - Actualiza int_id_rol = 3 (Copropietario) para el anterior administrador

        Args:
            unit_id: ID de la unidad residencial
            new_admin_user_id: ID del usuario que será el nuevo administrador

        Returns:
            Diccionario con información del resultado
        """
        try:
            # Verificar que la unidad residencial existe
            unit = await self.get_residential_unit_by_id(unit_id)
            if not unit:
                raise ValueError(f"No existe la unidad residencial con ID {unit_id}")

            # Verificar que el nuevo administrador existe y pertenece a esta unidad
            query_new_admin = (
                select(UserResidentialUnitModel, UserModel)
                .join(UserModel, UserResidentialUnitModel.int_user_id == UserModel.id)
                .where(
                    UserResidentialUnitModel.int_user_id == new_admin_user_id,
                    UserResidentialUnitModel.int_residential_unit_id == unit_id
                )
            )
            result_new = await self.db.execute(query_new_admin)
            new_admin_data = result_new.first()

            if not new_admin_data:
                raise ValueError(
                    f"El usuario {new_admin_user_id} no pertenece a la unidad residencial {unit_id}"
                )

            new_admin_unit, new_admin_user = new_admin_data

            # Buscar al administrador anterior (si existe)
            query_old_admin = (
                select(UserResidentialUnitModel, UserModel)
                .join(UserModel, UserResidentialUnitModel.int_user_id == UserModel.id)
                .where(
                    UserResidentialUnitModel.int_residential_unit_id == unit_id,
                    UserResidentialUnitModel.bool_is_admin == True
                )
            )
            result_old = await self.db.execute(query_old_admin)
            old_admin_data = result_old.first()

            # Si existe un administrador anterior, quitarle privilegios
            if old_admin_data:
                old_admin_unit, old_admin_user = old_admin_data

                # No hacer nada si es el mismo usuario
                if old_admin_user.id == new_admin_user_id:
                    return {
                        "message": "El usuario ya es el administrador actual",
                        "changed": False
                    }

                # Quitar privilegios al anterior
                old_admin_unit.bool_is_admin = False
                old_admin_unit.updated_at = datetime.now()

                old_admin_user.bln_allow_entry = False
                old_admin_user.int_id_rol = 3  # Cambiar rol a Copropietario
                old_admin_user.updated_at = datetime.now()

                logger.info(
                    f"Privilegios de administrador removidos del usuario {old_admin_user.id} "
                    f"en la unidad {unit_id}. Rol cambiado a Copropietario (3)"
                )

            # Asignar privilegios al nuevo administrador
            new_admin_unit.bool_is_admin = True
            new_admin_unit.updated_at = datetime.now()

            new_admin_user.bln_allow_entry = True
            new_admin_user.int_id_rol = 2  # Cambiar rol a Administrador
            new_admin_user.updated_at = datetime.now()

            logger.info(
                f"Usuario {new_admin_user_id} asignado como administrador "
                f"de la unidad {unit_id}. Rol cambiado a Administrador (2)"
            )

            # Confirmar cambios
            await self.db.commit()

            # Obtener datos del nuevo administrador para respuesta
            await self.db.refresh(new_admin_user)
            await self.db.refresh(new_admin_unit)

            query_data = (
                select(DataUserModel)
                .where(DataUserModel.id == new_admin_user.int_data_user_id)
            )
            result_data = await self.db.execute(query_data)
            data_user = result_data.scalar_one()

            return {
                "message": "Administrador cambiado exitosamente",
                "changed": True,
                "new_administrator": {
                    "id": new_admin_user.id,
                    "username": new_admin_user.str_username,
                    "firstname": data_user.str_firstname,
                    "lastname": data_user.str_lastname,
                    "email": data_user.str_email,
                    "phone": data_user.str_phone,
                    "apartment_number": new_admin_unit.str_apartment_number,
                    "role": "Administrador"
                }
            }

        except ValueError as e:
            await self.db.rollback()
            raise ServiceException(
                message=str(e),
                details={"unit_id": unit_id, "new_admin_user_id": new_admin_user_id}
            )
        except Exception as e:
            await self.db.rollback()
            raise ServiceException(
                message=f"Error al cambiar el administrador: {str(e)}",
                details={"original_error": str(e)}
            )

