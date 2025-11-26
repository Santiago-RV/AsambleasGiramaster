from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.auth.auth import get_current_user
from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.core.database import get_db
from app.core.exceptions import ServiceException

router = APIRouter()


@router.post(
    "/residential-units/{unit_id}/upload-residents-excel",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Carga masiva de copropietarios desde Excel",
    description="Permite al Super Admin cargar copropietarios masivamente desde un archivo Excel"
)
async def upload_residents_excel(
    unit_id: int,
    file: UploadFile = File(..., description="Archivo Excel con los copropietarios"),
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Carga masiva de copropietarios desde Excel para una unidad residencial.
    
    El Excel debe contener las siguientes columnas:
    - firstname: Nombre del copropietario (requerido)
    - lastname: Apellido del copropietario (requerido)
    - email: Email del copropietario (requerido, único)
    - phone: Teléfono del copropietario (opcional)
    - apartment_number: Número de apartamento (requerido)
    - password: Contraseña inicial (opcional, default: Temporal123!)
    
    Solo usuarios Super Admin pueden usar este endpoint.
    
    Returns:
        SuccessResponse con estadísticas de la carga:
        - total_rows: Total de filas procesadas
        - successful: Copropietarios creados exitosamente
        - failed: Filas que fallaron
        - errors: Lista de errores detallados
    """
    try:
        # Verificar que el usuario actual sea super admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción. Solo Super Admin puede cargar copropietarios."
            )

        # Validar que la unidad residencial exista
        residential_service = ResidentialUnitService(db)
        unit = await residential_service.get_residential_unit_by_id(unit_id)
        
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La unidad residencial con ID {unit_id} no existe"
            )

        # Validar tipo de archivo
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe ser un Excel (.xlsx o .xls)"
            )

        # Leer contenido del archivo
        file_content = await file.read()

        # Procesar el archivo usando el servicio
        results = await residential_service.process_residents_excel_file(
            file_content=file_content,
            unit_id=unit_id,
            created_by=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message=f"Proceso completado: {results['successful']} copropietarios creados, {results['failed']} fallidos",
            data={
                "total_rows": results['total_rows'],
                "successful": results['successful'],
                "failed": results['failed'],
                "users_created": results['users_created'],
                "errors": results['errors']
            }
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al procesar el archivo Excel: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/residential-units/{unit_id}/administrator",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener el administrador de una unidad residencial",
    description="Obtiene la información del administrador actual de la unidad residencial"
)
async def get_unit_administrator(
    unit_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el administrador actual de una unidad residencial.

    Args:
        unit_id: ID de la unidad residencial

    Returns:
        SuccessResponse con los datos del administrador o None si no hay
    """
    try:
        # Verificar que el usuario actual sea super admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción."
            )

        # Validar que la unidad residencial exista
        residential_service = ResidentialUnitService(db)
        unit = await residential_service.get_residential_unit_by_id(unit_id)

        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La unidad residencial con ID {unit_id} no existe"
            )

        # Obtener el administrador
        admin = await residential_service.get_unit_administrator(unit_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Administrador obtenido exitosamente" if admin else "No hay administrador asignado",
            data=admin
        )

    except HTTPException:
        raise
    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener el administrador: {str(e)}",
            details={"original_error": str(e)}
        )


@router.put(
    "/residential-units/{unit_id}/administrator/{new_admin_user_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Cambiar el administrador de una unidad residencial",
    description="Cambia el administrador de la unidad residencial, actualizando bool_is_admin y bln_allow_entry"
)
async def change_unit_administrator(
    unit_id: int,
    new_admin_user_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cambia el administrador de una unidad residencial.

    Realiza las siguientes acciones:
    1. Marca bool_is_admin = False para el administrador anterior
    2. Marca bool_is_admin = True para el nuevo administrador
    3. Actualiza bln_allow_entry = False para el anterior
    4. Actualiza bln_allow_entry = True para el nuevo

    Args:
        unit_id: ID de la unidad residencial
        new_admin_user_id: ID del usuario que será el nuevo administrador

    Returns:
        SuccessResponse con información del nuevo administrador
    """
    try:
        # Verificar que el usuario actual sea super admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción. Solo Super Admin puede cambiar administradores."
            )

        # Cambiar el administrador
        residential_service = ResidentialUnitService(db)
        result = await residential_service.change_unit_administrator(
            unit_id=unit_id,
            new_admin_user_id=new_admin_user_id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=result["message"],
            data=result
        )

    except HTTPException:
        raise
    except ServiceException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        raise ServiceException(
            message=f"Error al cambiar el administrador: {str(e)}",
            details={"original_error": str(e)}
        )