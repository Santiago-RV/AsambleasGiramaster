from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.auth import get_current_user
from app.schemas.guest_schema import GuestCreate, GuestResponse
from app.schemas.responses_schema import SuccessResponse
from app.services.residential_unit_service import ResidentialUnitService
from app.services.user_service import UserService
from app.core.exceptions import ServiceException, ResourceNotFoundException

router = APIRouter()

@router.post("/units/{unit_id}/guest",
             response_model=SuccessResponse,
             status_code=status.HTTP_201_CREATED,
             summary="Crear un nuevo invitado para una unidad residencial",
             description="Crear invitado con rol 4 de invitado, solo recibe el link de zoom."
)
async def create_guest(
    unit_id: int,
    guest_data: GuestCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
): 
    """
    Crea un nuevo invitado para la unidad residencial.
    
    Los invitados:
    - Tiene rol 4
    - Solor ecibe correos con links de asambleas
    - NO tiene derecho a votar ni acceder a la app
    """
    
    try:
        # Verificar permisos (Super admin o admin)
        user_service = UserService(db)
        current_user_data = await user_service.get_user_by_username(current_user)
        if current_user_data.role not in [1, 2]:  # 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para crear invitados."
            )
            
        residential_unit_service = ResidentialUnitService(db)
        
        # Crear invitado
        new_guest = await residential_unit_service.create_guest(
            unit_id=unit_id,
            guest_data=guest_data.model_dump()
        )
        
        # Retornar respuesta con respecto a la creación del invitación
        return SuccessResponse(
            message="Invitado creado exitosamente.",
            data=GuestResponse.model_validate(new_guest)
        )
        
    except (ResourceNotFoundException, HTTPException, ServiceException):
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al crear invitado: {str(e)}",
            details={"original_error": str(e)}
        )
        
@router.get(
    "/units/{unit_id}/guests",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener invitados de una unidad",
    description="Obtiene todos los invitados (rol 4) de una unidad residencial"
)
async def get_guests_by_unit(
    unit_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene todos los invitados de una unidad residencial"""
    try:
        # Verificar permisos
        user_service = UserService(db)
        current_user_data = await user_service.get_user_by_username(current_user)
        
        if current_user_data.int_id_rol not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para ver invitados"
            )
        
        residential_unit_service = ResidentialUnitService(db)
        guests = await residential_unit_service.get_guests_by_unit(unit_id)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(guests)} invitados",
            data=guests
        )
        
    except (ResourceNotFoundException, HTTPException, ServiceException):
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener invitados: {str(e)}",
            details={"original_error": str(e)}
        )
        
@router.delete("/units/{unit_id}/guest/{guest_id}",
               response_model=SuccessResponse,
               status_code=status.HTTP_200_OK,
               summary="Eliminar un invitado de una unidad residencial",
               description="Elimina un invitado (rol 4) de una unidad residencial"
)
async def delete_guest(
    unit_id: int,
    guest_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar un invitado de una unidad residencial"""
    try:
        # Verificar permisos
        user_service = UserService(db)
        current_user_data = await user_service.get_user_by_username(current_user)
        if current_user_data.role not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para eliminar invitados."
            )

        residential_unit_service = ResidentialUnitService(db)
        await residential_unit_service.delete_guest(unit_id, guest_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Invitado eliminado exitosamente"
        )

    except (ResourceNotFoundException, HTTPException, ServiceException):
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al eliminar invitado: {str(e)}",
            details={"original_error": str(e)}
        )
                