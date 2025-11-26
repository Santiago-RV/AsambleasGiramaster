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
from app.services.email_notification_service import EmailNotificationService

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
                    logger.info(f"✅ Correo de bienvenida enviado a {email}")
                else:
                    logger.warning(f"⚠️ No se pudo enviar correo de bienvenida a {email}")
            except Exception as e:
                # No fallar si el correo falla, solo registrar
                logger.error(f"❌ Error al enviar correo de bienvenida: {str(e)}")
            
            # 11. Retornar los datos del residente creado
            logger.info(f"✅ Copropietario creado exitosamente: {username}")
            
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
            logger.error(f"❌ Error al crear copropietario: {str(e)}")
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
        
        ⚠️ NOTA: Este método NO registra notificaciones en la BD.
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
                logger.warning(f"⚠️ No se pudo enviar correo de bienvenida a {user_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error al enviar correo de bienvenida a {user_email}: {str(e)}")
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
                        f"✅ Credenciales reenviadas a {data_user.str_email} "
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
                        f"⚠️ No se pudo enviar correo a {data_user.str_email} "
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
                logger.error(f"❌ Error al enviar correo/notificación: {str(e)}")
                raise ServiceException(
                    message=f"Error al procesar el envío de credenciales: {str(e)}",
                    details={"original_error": str(e)}
                )
                
        except (ResourceNotFoundException, ServiceException):
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error al reenviar credenciales: {str(e)}")
            raise ServiceException(
                message=f"Error al reenviar credenciales: {str(e)}",
                details={"original_error": str(e)}
            )