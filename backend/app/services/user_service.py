from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.rol_model import RolModel
from app.schemas.user_schema import UserCreate, UserUpdate, UserResponse
from app.schemas.data_user_schema import DataUserCreate, DataUserResponse
from app.schemas.rol_schema import RolResponse
from app.core.exceptions import ServiceException

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

        # Obtener los datos del usuario asociado
        # data_user_query = select(DataUserModel).where(DataUserModel.id == result.int_data_user_id)
        # data_user_result = await self.db.execute(data_user_query)
        # data_user = data_user_result.scalar_one_or_none()
        
        # # Crear DataUserResponse si existe
        # data_user_response = None
        # if data_user:
        #     data_user_response = DataUserResponse(
        #         id=data_user.id,
        #         str_firstname=data_user.str_firstname,
        #         str_lastname=data_user.str_lastname,
        #         str_email=data_user.str_email,
        #         str_phone=data_user.str_phone,
        #         created_at=data_user.created_at,
        #         updated_at=data_user.updated_at
        #     )

        # # Obtener el rol asociado
        # rol_query = select(RolModel).where(RolModel.id == result.int_id_rol)
        # rol_result = await self.db.execute(rol_query)
        # rol = rol_result.scalar_one_or_none()
        
        # # Crear RolResponse si existe
        # rol_response = None
        # if rol:
        #     rol_response = RolResponse(
        #         id=rol.id,
        #         str_name=rol.str_name,
        #         str_description=rol.str_description,
        #         bln_is_active=rol.bln_is_active,
        #         created_at=rol.created_at,
        #         updated_at=rol.updated_at
        #     )

        # return UserResponse(
        #   id=result.id,
        #   str_username=result.str_username,
        #   bln_is_external_delegate=result.bln_is_external_delegate,
        #   bln_user_temporary=result.bln_user_temporary,
        #   dat_temporary_expiration_date=result.dat_temporary_expiration_date,
        #   bln_is_active=result.bln_is_active,
        #   data_user=data_user_response,
        #   rol=rol_response,
        #   created_at=result.created_at,
        #   updated_at=result.updated_at
        # )
      except Exception as e:
        raise ServiceException(
          message="Error al obtener el usuario",
          error_code="GET_USER_BY_USERNAME_ERROR"
        )