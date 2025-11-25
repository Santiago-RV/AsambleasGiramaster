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
from app.schemas.residential_unit_schema import ResidentialUnitCreate, ResidentialUnitResponse
from app.core.exceptions import ServiceException, ResourceNotFoundException
from app.core.security import security_manager
from app.utils.email_sender import email_sender

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
        Envía correo de bienvenida al copropietario con sus credenciales
        
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
            html_content = html_content.replace('{{login_url}}', 'http://localhost:5173/login')  # Ajustar según tu URL
            
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
                logger.warning(f"⚠️ No se pudo enviar correo de bienvenida a {user_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error al enviar correo de bienvenida a {user_email}: {str(e)}")
            return False
        
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
        
        Después de crear cada usuario, envía un correo de bienvenida con sus credenciales.
        
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
            - emails_sent: Número de correos enviados exitosamente
            - emails_failed: Número de correos que fallaron
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
                'emails_sent': 0,
                'emails_failed': 0,
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
                    password_to_send = password  # Guardar contraseña antes de hashear
                    
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
                    if user_was_created:
                        email_sent = self._send_welcome_email(
                            user_email=email,
                            user_name=f"{firstname} {lastname}",
                            username=username,
                            password=password_to_send,  # Contraseña sin hashear
                            residential_unit_name=residential_unit_name,
                            apartment_number=apartment_number,
                            voting_weight=voting_weight,
                            phone=phone
                        )
                        
                        if email_sent:
                            results['emails_sent'] += 1
                            logger.info(f"✅ Correo enviado a {email}")
                        else:
                            results['emails_failed'] += 1
                            logger.warning(f"⚠️ No se pudo enviar correo a {email}")

                    results['successful'] += 1

                except Exception as e:
                    results['errors'].append({
                        'row': index + 2,  # +2 porque Excel empieza en 1 y tiene header
                        'email': row_dict.get('email', 'N/A'),
                        'apartment': row_dict.get('apartment_number', 'N/A'),
                        'error': str(e)
                    })
                    results['failed'] += 1
                    logger.error(f"❌ Error procesando fila {index + 2}: {e}")

            # Commit de todas las operaciones exitosas
            if results['successful'] > 0:
                await self.db.commit()
                logger.info(
                    f"✅ Proceso completado exitosamente: {results['successful']} copropietarios procesados, "
                    f"{results['users_created']} usuarios nuevos creados, "
                    f"{results['emails_sent']} correos enviados"
                )
            else:
                await self.db.rollback()
                logger.warning("⚠️ No se procesó ningún copropietario exitosamente")

            return results

        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error procesando archivo Excel: {e}")
            raise ServiceException(
                message=f"Error al procesar el archivo Excel: {str(e)}",
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
            
            logger.info(f"✅ Copropietario actualizado: {user.str_username}")
            
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
            
    async def delete_resident(self, user_id: int, unit_id: int):
        """Elimina un copropietario (eliminación en cascada)"""
        try:
            # Verificar que existe
            query = (
                select(UserModel, DataUserModel, UserResidentialUnitModel)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .where(
                    and_(
                        UserModel.id == user_id,
                        UserResidentialUnitModel.int_residential_unit_id == unit_id,
                        UserModel.int_id_rol == 3  # Solo copropietarios
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
            username = user.str_username
            email = data_user.str_email
            data_user_id = user.int_data_user_id
            
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
            
            logger.info(f"✅ Copropietario eliminado: {username} ({email})")
            
            return True
            
        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al eliminar: {str(e)}")
            raise ServiceException(
                message=f"Error al eliminar copropietario: {str(e)}",
                details={"original_error": str(e)}
            )