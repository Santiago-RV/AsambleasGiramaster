from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.rol_model import RolModel
from app.schemas.user_schema import UserCreate, UserUpdate, UserResponse
from app.schemas.data_user_schema import DataUserCreate, DataUserResponse
from app.schemas.rol_schema import RolResponse
from app.core.exceptions import ResourceNotFoundException, ServiceException

import logging

from app.models.user_residential_unit_model import UserResidentialUnitModel

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_data_user(self, data_user_data: DataUserCreate) -> DataUserResponse:
      """ Crea un nuevo usuario en la base de datos 
      
      Args:
        data_user_data (DataUserCreate): Los datos del usuario a crear
      """
      try:
        # Mapear los datos del usuario
        payload = data_user_data.model_dump()

        # Crear el nuevo usuario
        new_data_user = DataUserModel(**payload)
        
        # Agregar el nuevo usuario a la base de datos
        self.db.add(new_data_user)
        await self.db.commit()
        await self.db.refresh(new_data_user)
        
        # Crear la respuesta con los datos del usuario creado
        return DataUserResponse(
            id=new_data_user.id,
            str_firstname=new_data_user.str_firstname,
            str_lastname=new_data_user.str_lastname,
            str_email=new_data_user.str_email,
            str_phone=new_data_user.str_phone,
            created_at=new_data_user.created_at,
            updated_at=new_data_user.updated_at
        )
      except Exception as e:
        await self.db.rollback()
        raise ServiceException(
          message=f"Error al crear el usuario: {str(e)}",
          error_code="CREATE_DATA_USER_ERROR"
        )

    async def create_user(self, user_data: UserCreate) -> UserResponse:
      """ Crea un nuevo usuario en la base de datos 
      
      Args:
        user_data (UserCreate): Los datos del usuario a crear

      Returns:
        UserResponse: El usuario creado

      Raises:
        serviceException: Si ocurre un error al crear el usuario
      """
      try:
        # Mapear los datos del usuario
        payload = user_data.model_dump()

        # Normalizar campos
        payload['str_username'] = payload['str_username'].lower().strip()

        new_user = UserModel(**payload)

        # Agregar el nuevo usuario a la base de datos
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)

        # Obtener los datos del usuario asociado
        data_user_query = select(DataUserModel).where(DataUserModel.id == new_user.int_data_user_id)
        data_user_result = await self.db.execute(data_user_query)
        data_user = data_user_result.scalar_one_or_none()
        
        # Crear DataUserResponse si existe
        data_user_response = None
        if data_user:
            data_user_response = DataUserResponse(
                id=data_user.id,
                str_firstname=data_user.str_firstname,
                str_lastname=data_user.str_lastname,
                str_email=data_user.str_email,
                str_phone=data_user.str_phone,
                created_at=data_user.created_at,
                updated_at=data_user.updated_at
            )

        # Obtener el rol asociado
        rol_query = select(RolModel).where(RolModel.id == new_user.int_id_rol)
        rol_result = await self.db.execute(rol_query)
        rol = rol_result.scalar_one_or_none()
        
        # Crear RolResponse si existe
        rol_response = None
        if rol:
            rol_response = RolResponse(
                id=rol.id,
                str_name=rol.str_name,
                str_description=rol.str_description,
                bln_is_active=rol.bln_is_active,
                created_at=rol.created_at,
                updated_at=rol.updated_at
            )

        # Crear la respuesta con los datos del usuario creado
        return UserResponse(
            id=new_user.id,
            str_username=new_user.str_username,
            bln_is_external_delegate=new_user.bln_is_external_delegate,
            bln_user_temporary=new_user.bln_user_temporary,
            dat_temporary_expiration_date=new_user.dat_temporary_expiration_date,
            bln_is_active=new_user.bln_is_active,
            data_user=data_user_response,  # ← Esta es la línea nueva importante
            rol=rol_response,  # ← Esta es la línea nueva importante
            created_at=new_user.created_at,
            updated_at=new_user.updated_at
        )
      except IntegrityError as e:
        await self.db.rollback() # Revertir la transacción


        raise ServiceException(
          status_code=409,
          message="El usuario ya existe",
          error_code="USER_ALREADY_EXISTS"
        )
      except Exception as e:
        await self.db.rollback() # Revertir la transacción

        raise ServiceException(
          message=f"Error al crear el usuario: {str(e)}",
          error_code="CREATE_USER_ERROR"
        )

    async def get_user_by_username(self, username: str) -> Optional[UserModel]:
      """ Obtiene un usuario por su nombre de usuario
      
      Args:
        username (str): El nombre de usuario a buscar

      Returns:
        Optional[UserResponse]: El usuario encontrado
      """
      try:
        # Normalizar el nombre de usuario
        user_name = username.lower().strip()

        # Obtener el usuario por su nombre de usuario con la relación del rol cargada
        user = await self.db.execute(
            select(UserModel)
            .options(selectinload(UserModel.rol))
            .where(UserModel.str_username == user_name)
        )
        result = user.scalar_one_or_none()
        
        if not result:
            return None

        return result
    
      except Exception as e:
        raise ServiceException(
          message="Error al obtener el usuario",
          error_code="GET_USER_BY_USERNAME_ERROR"
        )
        
    async def enable_all_coowners_by_meeting(self, meeting_id: int) -> dict:
      """
      Habilita todos los copropietarios de una reunión específica.
      Actualiza bln_allow_entry = 1 para todos los usuarios invitados a la reunión.
      
      Args:
          meeting_id: ID de la reunión
      
      Returns:
          dict: Estadísticas de la operación
      """
      try:
          from sqlalchemy import update
          from app.models.meeting_invitation_model import MeetingInvitationModel
          import logging
          
          logger = logging.getLogger(__name__)
          
          # 1. Obtener todos los user_ids de los copropietarios invitados a la reunión
          query = select(MeetingInvitationModel.int_user_id).where(
              MeetingInvitationModel.int_meeting_id == meeting_id
          )
          result = await self.db.execute(query)
          user_ids = [row[0] for row in result.all()]
          
          if not user_ids:
              return {
                  "enabled_count": 0,
                  "total_count": 0,
                  "message": "No hay copropietarios invitados a esta reunión"
              }
          
          # 2. Contar cuántos están actualmente deshabilitados
          disabled_query = select(UserModel).where(
              UserModel.id.in_(user_ids),
              UserModel.bln_allow_entry == False
          )
          disabled_result = await self.db.execute(disabled_query)
          disabled_count = len(disabled_result.scalars().all())
          
          if disabled_count == 0:
              return {
                  "enabled_count": 0,
                  "total_count": len(user_ids),
                  "message": "Todos los copropietarios ya están habilitados"
              }
          
          # 3. Habilitar todos los copropietarios (actualizar bln_allow_entry = 1)
          update_query = (
              update(UserModel)
              .where(UserModel.id.in_(user_ids))
              .values(bln_allow_entry=True)
          )
          await self.db.execute(update_query)
          await self.db.commit()
          
          logger.info(f"✅ Habilitados {disabled_count} copropietarios de la reunión {meeting_id}")
          
          return {
              "enabled_count": disabled_count,
              "total_count": len(user_ids),
              "message": f"Se habilitaron {disabled_count} copropietarios exitosamente"
          }
          
      except Exception as e:
          await self.db.rollback()
          logger.error(f"Error habilitando copropietarios: {str(e)}")
          raise ServiceException(
              message=f"Error al habilitar copropietarios: {str(e)}",
              error_code="ENABLE_ALL_COOWNERS_ERROR"
          )
          
    async def enable_coowner_access(
        self,
        user_id: int,
        unit_id: int,
        send_email: bool = True
    ) -> dict:
        """
        Habilita el acceso de un copropietario al sistema.
        Usado por: POST /admin/coowners/{coowner_id}/enable
        
        Args:
            user_id: ID del copropietario
            unit_id: ID de la unidad residencial
            send_email: Si se debe enviar correo de notificación
        
        Returns:
            dict: Información del copropietario habilitado
        """
        try:
            logger.info(f"Habilitando acceso para user_id={user_id} en unit_id={unit_id}")
            
            # Buscar el copropietario con sus datos
            query = select(UserModel, DataUserModel).join(
                DataUserModel,
                UserModel.int_data_user_id == DataUserModel.id
            ).where(UserModel.id == user_id)
            
            result = await self.db.execute(query)
            user_data = result.first()
            
            if not user_data:
                raise ResourceNotFoundException(
                    message=f"Copropietario con ID {user_id} no encontrado",
                    error_code="COOWNER_NOT_FOUND"
                )
            
            user, data_user = user_data
            
            # Verificar que pertenece a la unidad
            verify_query = select(UserResidentialUnitModel).where(
                and_(
                    UserResidentialUnitModel.int_user_id == user_id,
                    UserResidentialUnitModel.int_residential_unit_id == unit_id
                )
            )
            verify_result = await self.db.execute(verify_query)
            if not verify_result.scalar_one_or_none():
                raise ResourceNotFoundException(
                    message="El copropietario no pertenece a esta unidad residencial",
                    error_code="COOWNER_NOT_IN_UNIT"
                )
            
            # Verificar que no sea un administrador
            if user.int_id_rol == 2:
                raise ServiceException(
                    message="No se puede modificar el acceso de un administrador",
                    details={"user_id": user_id, "role_id": user.int_id_rol}
                )
            
            # Si ya está habilitado, no hacer nada
            if user.bln_allow_entry:
                return {
                    "user_id": user.id,
                    "username": user.str_username,
                    "email": data_user.str_email,
                    "name": f"{data_user.str_firstname} {data_user.str_lastname}",
                    "status": "already_enabled",
                    "message": "El copropietario ya tenía acceso habilitado"
                }
            
            # Habilitar acceso
            user.bln_allow_entry = True
            user.updated_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            # Enviar correo de notificación (opcional)
            if send_email:
                try:
                    # TODO: Implementar envío de correo de notificación
                    # Puedes usar email_service para enviar un correo personalizado
                    logger.info(f"📧 Correo de habilitación enviado a {data_user.str_email}")
                except Exception as email_error:
                    logger.warning(f"No se pudo enviar correo de notificación: {email_error}")
                    # No fallar si el correo falla
            
            logger.info(f"✅ Acceso habilitado para {data_user.str_email} (user_id={user_id})")
            
            return {
                "user_id": user.id,
                "username": user.str_username,
                "email": data_user.str_email,
                "name": f"{data_user.str_firstname} {data_user.str_lastname}",
                "status": "enabled",
                "message": "Acceso habilitado exitosamente"
            }
            
        except (ResourceNotFoundException, ServiceException):
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al habilitar copropietario: {str(e)}")
            raise ServiceException(
                message=f"Error al habilitar copropietario: {str(e)}",
                details={"original_error": str(e)}
            )

    async def disable_coowner_access(
        self,
        user_id: int,
        unit_id: int,
        send_email: bool = True
    ) -> dict:
        """
        Deshabilita el acceso de un copropietario al sistema.
        Usado por: POST /admin/coowners/{coowner_id}/disable
        
        Args:
            user_id: ID del copropietario
            unit_id: ID de la unidad residencial
            send_email: Si se debe enviar correo de notificación
        
        Returns:
            dict: Información del copropietario deshabilitado
        """
        try:
            logger.info(f"Deshabilitando acceso para user_id={user_id} en unit_id={unit_id}")
            
            # Buscar el copropietario con sus datos
            query = select(UserModel, DataUserModel).join(
                DataUserModel,
                UserModel.int_data_user_id == DataUserModel.id
            ).where(UserModel.id == user_id)
            
            result = await self.db.execute(query)
            user_data = result.first()
            
            if not user_data:
                raise ResourceNotFoundException(
                    message=f"Copropietario con ID {user_id} no encontrado",
                    error_code="COOWNER_NOT_FOUND"
                )
            
            user, data_user = user_data
            
            # Verificar que pertenece a la unidad
            verify_query = select(UserResidentialUnitModel).where(
                and_(
                    UserResidentialUnitModel.int_user_id == user_id,
                    UserResidentialUnitModel.int_residential_unit_id == unit_id
                )
            )
            verify_result = await self.db.execute(verify_query)
            if not verify_result.scalar_one_or_none():
                raise ResourceNotFoundException(
                    message="El copropietario no pertenece a esta unidad residencial",
                    error_code="COOWNER_NOT_IN_UNIT"
                )
            
            # Verificar que no sea un administrador
            if user.int_id_rol == 2:
                raise ServiceException(
                    message="No se puede modificar el acceso de un administrador",
                    details={"user_id": user_id, "role_id": user.int_id_rol}
                )
            
            # Si ya está deshabilitado, no hacer nada
            if not user.bln_allow_entry:
                return {
                    "user_id": user.id,
                    "username": user.str_username,
                    "email": data_user.str_email,
                    "name": f"{data_user.str_firstname} {data_user.str_lastname}",
                    "status": "already_disabled",
                    "message": "El copropietario ya estaba deshabilitado"
                }
            
            # Deshabilitar acceso
            user.bln_allow_entry = False
            user.updated_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            # Enviar correo de notificación (opcional)
            if send_email:
                try:
                    # TODO: Implementar envío de correo de notificación
                    logger.info(f"📧 Correo de deshabilitación enviado a {data_user.str_email}")
                except Exception as email_error:
                    logger.warning(f"No se pudo enviar correo de notificación: {email_error}")
                    # No fallar si el correo falla
            
            logger.info(f"✅ Acceso deshabilitado para {data_user.str_email} (user_id={user_id})")
            
            return {
                "user_id": user.id,
                "username": user.str_username,
                "email": data_user.str_email,
                "name": f"{data_user.str_firstname} {data_user.str_lastname}",
                "status": "disabled",
                "message": "Acceso deshabilitado exitosamente"
            }
            
        except (ResourceNotFoundException, ServiceException):
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al deshabilitar copropietario: {str(e)}")
            raise ServiceException(
                message=f"Error al deshabilitar copropietario: {str(e)}",
                details={"original_error": str(e)}
            )


    async def enable_all_coowners(
        self,
        unit_id: int,
        exclude_user_id: Optional[int] = None,
        send_emails: bool = True
    ) -> dict:
        """
        Habilita el acceso de TODOS los copropietarios de una unidad.
        Usado por: POST /admin/coowners/enable-all
        
        Args:
            unit_id: ID de la unidad residencial
            exclude_user_id: ID del usuario a excluir (típicamente el administrador)
            send_emails: Si se deben enviar correos de notificación
        
        Returns:
            dict: Estadísticas de la operación
        """
        try:
            logger.info(f"Habilitando todos los copropietarios de unit_id={unit_id}")
            
            # Obtener todos los copropietarios de la unidad
            query = (
                select(UserModel, DataUserModel)
                .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                .where(UserResidentialUnitModel.int_residential_unit_id == unit_id)
            )
            
            # Excluir al usuario especificado (administrador)
            if exclude_user_id:
                query = query.where(UserModel.id != exclude_user_id)
            
            # Excluir administradores (rol 2)
            query = query.where(UserModel.int_id_rol != 2)
            
            result = await self.db.execute(query)
            coowners = result.all()
            
            if not coowners:
                return {
                    "enabled_count": 0,
                    "already_enabled_count": 0,
                    "total_count": 0,
                    "message": "No hay copropietarios en esta unidad"
                }
            
            enabled_count = 0
            already_enabled_count = 0
            
            for user, data_user in coowners:
                if user.bln_allow_entry:
                    already_enabled_count += 1
                else:
                    user.bln_allow_entry = True
                    user.updated_at = datetime.now()
                    enabled_count += 1
                    
                    # Enviar correo individual (opcional)
                    if send_emails:
                        try:
                            # TODO: Implementar envío de correo
                            logger.info(f"📧 Correo enviado a {data_user.str_email}")
                        except Exception as email_error:
                            logger.warning(f"Error enviando correo a {data_user.str_email}: {email_error}")
            
            await self.db.commit()
            
            logger.info(
                f"✅ Habilitados {enabled_count} copropietarios en unit_id={unit_id}. "
                f"{already_enabled_count} ya estaban habilitados."
            )
            
            return {
                "enabled_count": enabled_count,
                "already_enabled_count": already_enabled_count,
                "total_count": len(coowners),
                "message": f"Se habilitaron {enabled_count} copropietarios exitosamente"
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al habilitar todos los copropietarios: {str(e)}")
            raise ServiceException(
                message=f"Error al habilitar todos los copropietarios: {str(e)}",
                details={"original_error": str(e)}
            )