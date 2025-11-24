"""
Nuevo endpoint para cargar copropietarios desde Excel en una unidad residencial
Agregar este código al archivo: backend/app/api/v1/endpoints/super_admin.py
"""

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