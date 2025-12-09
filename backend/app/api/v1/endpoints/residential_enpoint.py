from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ServiceException
from app.schemas.responses_schema import SuccessResponse

from app.schemas.residential_unit_schema import ResidentialUnitCreate, ResidentialUnitResponse
from app.services.residential_unit_service import ResidentialUnitService

from app.schemas.resident_update_schema import ResidentUpdate
from app.core.exceptions import ResourceNotFoundException
from app.auth.auth import get_current_user
from app.services.user_service import UserService


router = APIRouter()

@router.get(
    "/units",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener unidades residenciales",
    description="Obtiene todas las unidades residenciales"
)
async def get_residential_units(
    db: AsyncSession = Depends(get_db)
):
    """Obtiene todas las unidades residenciales"""
    try:
        residential_unit_service = ResidentialUnitService(db)
        residential_units = await residential_unit_service.get_residential_units()

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Unidades residenciales obtenidas correctamente",
            data=[ResidentialUnitResponse.from_orm(ru).dict() for ru in residential_units]
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener las unidades residenciales: {str(e)}",
            details={"original_error": str(e)}
        )

@router.get(
    "/units/{nit}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener una unidad residencial por su NIT",
    description="Obtiene una unidad residencial por su NIT"
)
async def get_residential_unit_by_nit(
    nit: str,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene una unidad residencial por su NIT"""
    try:
        residential_unit_service = ResidentialUnitService(db)
        residential_unit = await residential_unit_service.get_residential_unit_by_nit(nit)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Unidad residencial obtenida correctamente",
            data=ResidentialUnitResponse.from_orm(residential_unit).dict()
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener la unidad residencial por NIT: {str(e)}",
            details={"original_error": str(e)}
        )

@router.post(
  "/create_unit",
  response_model=SuccessResponse,
  status_code=status.HTTP_201_CREATED,
  summary="Crear una unidad residencial",
  description="Crea una unidad residencial"
)
async def create_residential_unit(
    residential_unit_data: ResidentialUnitCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea una unidad residencial"""
    try:
        residential_unit_service = ResidentialUnitService(db)
        residential_unit = await residential_unit_service.create_residential_unit(residential_unit_data)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Unidad residencial creada correctamente",
            data=ResidentialUnitResponse.from_orm(residential_unit).dict()
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al crear la unidad residencial: {str(e)}",
            details={"original_error": str(e)}
        )

@router.get(
    "/units/{residential_unit_id}/residents",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener residentes de una unidad residencial",
    description="Obtiene todos los residentes de una unidad residencial específica"
)
async def get_residents_by_residential_unit(
    residential_unit_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene todos los residentes de una unidad residencial"""
    try:
        residential_unit_service = ResidentialUnitService(db)
        residents = await residential_unit_service.get_residents_by_residential_unit(residential_unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Residentes obtenidos correctamente",
            data=residents
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener los residentes de la unidad residencial: {str(e)}",
            details={"original_error": str(e)}
        )

@router.get(
    "/available-users",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener usuarios disponibles para asignar",
    description="Obtiene todos los usuarios que NO tienen una unidad residencial asociada. Útil para seleccionar personal administrativo."
)
async def get_available_users(
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene usuarios sin unidad residencial asociada.
    Estos usuarios están disponibles para ser asignados como personal administrativo
    de una nueva unidad residencial.
    """
    try:
        residential_unit_service = ResidentialUnitService(db)
        users = await residential_unit_service.get_users_without_residential_unit()

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(users)} usuarios disponibles",
            data=users
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener usuarios disponibles: {str(e)}",
            details={"original_error": str(e)}
        )
        
@router.put(
    "/units/{unit_id}/residents/{user_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar copropietario",
    description="Actualiza los datos de un copropietario"
)
async def update_resident(
    unit_id: int,
    user_id: int,
    resident_data: ResidentUpdate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un copropietario"""
    try:
        # Verificar permisos
        user_service = UserService(db)
        current_user_data = await user_service.get_user_by_username(current_user)
        
        if current_user_data.int_id_rol not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos"
            )
        
        residential_unit_service = ResidentialUnitService(db)
        update_dict = resident_data.model_dump(exclude_unset=True, exclude_none=True)
        
        if not update_dict:
            raise ServiceException(
                message="No hay datos para actualizar",
                details={}
            )
        
        updated_resident = await residential_unit_service.update_resident(
            user_id=user_id,
            unit_id=unit_id,
            update_data=update_dict
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Copropietario actualizado exitosamente",
            data=updated_resident
        )
        
    except (ResourceNotFoundException, HTTPException, ServiceException):
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error: {str(e)}",
            details={"original_error": str(e)}
        )

@router.delete(
    "/units/{unit_id}/residents/{user_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Eliminar copropietario",
    description="Elimina un copropietario de una unidad residencial"
)
async def delete_resident(
    unit_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)  # Es un string (username)
):
    """Elimina un copropietario"""
    try:
        from sqlalchemy import select
        from app.models.user_model import UserModel
        
        residential_unit_service = ResidentialUnitService(db)
        
        # OBTENER EL ROL DEL USUARIO ACTUAL
        # Buscar el usuario por username para obtener su rol
        query = select(UserModel).where(UserModel.str_username == current_user)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        # Si no se encuentra el usuario o no está autenticado, usar rol 3 por defecto
        deleting_user_role = user.int_id_rol if user else 3
        
        # Llamar al servicio con el rol
        await residential_unit_service.delete_resident(
            user_id=user_id,
            unit_id=unit_id,
            deleting_user_role=deleting_user_role
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Usuario eliminado exitosamente",
            data=None
        )
    except ResourceNotFoundException as e:
        raise
    except ServiceException as e:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al eliminar el usuario: {str(e)}",
            details={"original_error": str(e)}
        )
        
@router.post(
    "/units/{unit_id}/residents",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear copropietario",
    description="Crea un nuevo copropietario para una unidad residencial"
)
async def create_resident(
    unit_id: int,
    resident_data: ResidentUpdate,  # Puedes crear un schema específico ResidentCreate si lo prefieres
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo copropietario para una unidad residencial"""
    try:
        # Verificar permisos (Super Admin o Admin)
        user_service = UserService(db)
        current_user_data = await user_service.get_user_by_username(current_user)
        
        if current_user_data.int_id_rol not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para crear copropietarios"
            )
        
        residential_unit_service = ResidentialUnitService(db)
        
        # Validar que vengan los datos obligatorios
        if not resident_data.firstname or not resident_data.lastname or not resident_data.email or not resident_data.apartment_number:
            raise ServiceException(
                message="Datos incompletos: firstname, lastname, email y apartment_number son obligatorios",
                details={}
            )
        
        # Crear el copropietario
        new_resident = await residential_unit_service.create_resident(
            unit_id=unit_id,
            resident_data=resident_data.model_dump(exclude_unset=True, exclude_none=False)
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Copropietario creado exitosamente",
            data=new_resident
        )
        
    except (ResourceNotFoundException, HTTPException, ServiceException):
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al crear copropietario: {str(e)}",
            details={"original_error": str(e)}
        )

@router.post(
    "/units/{unit_id}/residents/{user_id}/resend-credentials",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Reenviar credenciales por correo",
    description="Envía las credenciales de acceso al copropietario por correo electrónico"
)
async def resend_credentials(
    unit_id: int,
    user_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reenvía las credenciales de acceso por correo"""
    try:
        # Verificar permisos
        user_service = UserService(db)
        current_user_data = await user_service.get_user_by_username(current_user)
        
        if current_user_data.int_id_rol not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para enviar credenciales"
            )
        
        residential_unit_service = ResidentialUnitService(db)
        
        # Enviar credenciales
        result = await residential_unit_service.resend_resident_credentials(
            user_id=user_id,
            unit_id=unit_id
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Credenciales enviadas exitosamente",
            data=result
        )
        
    except (ResourceNotFoundException, HTTPException, ServiceException):
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al enviar credenciales: {str(e)}",
            details={"original_error": str(e)}
        )