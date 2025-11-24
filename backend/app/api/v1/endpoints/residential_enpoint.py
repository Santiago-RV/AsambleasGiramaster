from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ServiceException
from app.schemas.responses_schema import SuccessResponse

from app.schemas.residential_unit_schema import ResidentialUnitCreate, ResidentialUnitResponse
from app.services.residential_unit_service import ResidentialUnitService


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