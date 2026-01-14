from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.auth.auth import get_current_user
from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.schemas.meeting_invitation_schema import (
    BulkUploadResponse,
    MeetingInvitationCreate,
    MeetingInvitationResponse
)
from app.services.meeting_invitation_service import MeetingInvitationService
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.core.database import get_db
from app.core.exceptions import ServiceException

from app.schemas.residential_unit_schema import BulkToggleAccessRequest, ResidentialUnitResponse

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/upload-excel",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Carga masiva de invitaciones desde Excel",
    description="Permite al administrador cargar invitaciones masivamente desde un archivo Excel"
)
async def upload_invitations_excel(
    meeting_id: int = Form(..., description="ID de la reunión"),
    file: UploadFile = File(..., description="Archivo Excel con las invitaciones"),
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Carga masiva de invitaciones desde Excel.
    
    El Excel debe contener las siguientes columnas:
    - email: Email del usuario (debe existir en la base de datos)
    - apartment_number: Número de apartamento
    - voting_weight: Peso de votación (coeficiente)
    - will_attend: (Opcional) Si asistirá (true/false)
    
    Solo usuarios administradores pueden usar este endpoint.
    """
    try:
        # Verificar que el usuario actual sea administrador
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user or user.int_id_rol not in [1, 2]:  # 1: Super Admin, 2: Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )

        # Validar tipo de archivo
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe ser un Excel (.xlsx o .xls)"
            )

        # Leer contenido del archivo
        file_content = await file.read()

        # Procesar el archivo
        invitation_service = MeetingInvitationService(db)
        results = await invitation_service.process_excel_file(
            file_content=file_content,
            meeting_id=meeting_id,
            created_by=user.id
        )

        # Preparar respuesta
        response_data = BulkUploadResponse(
            total_rows=results['total_rows'],
            successful=results['successful'],
            failed=results['failed'],
            errors=results['errors']
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message=f"Proceso completado: {results['successful']} invitaciones creadas, {results['failed']} fallidas",
            data=response_data.dict()
        )

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


@router.post(
    "/",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear invitación individual",
    description="Crea una invitación individual a una reunión"
)
async def create_invitation(
    invitation_data: MeetingInvitationCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una invitación individual"""
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        invitation_service = MeetingInvitationService(db)
        invitation = await invitation_service.create_invitation(
            invitation_data=invitation_data,
            created_by=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Invitación creada correctamente",
            data=MeetingInvitationResponse.from_orm(invitation).dict()
        )

    except Exception as e:
        raise ServiceException(
            message=f"Error al crear la invitación: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/meeting/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener invitaciones de una reunión",
    description="Obtiene todas las invitaciones de una reunión específica"
)
async def get_meeting_invitations(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene todas las invitaciones de una reunión"""
    try:
        invitation_service = MeetingInvitationService(db)
        invitations = await invitation_service.get_invitations_by_meeting(meeting_id)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Invitaciones obtenidas correctamente",
            data=[MeetingInvitationResponse.from_orm(inv).dict() for inv in invitations]
        )

    except Exception as e:
        raise ServiceException(
            message=f"Error al obtener las invitaciones: {str(e)}",
            details={"original_error": str(e)}
        )
        
@router.post(
    "/{unit_id}/residents/{user_id}/toggle-access",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle acceso individual (Super Admin)",
    description="Habilita o deshabilita el acceso de un residente específico"
)
async def toggle_resident_access(
    unit_id: int,
    user_id: int,
    enabled: bool = True,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle acceso individual de un residente (Super Admin).
    """
    try:
        from app.services.user_service import UserService
        
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los super administradores pueden acceder a esta función"
            )
        
        # Habilitar o deshabilitar según el parámetro
        if enabled:
            result = await user_service.enable_coowner_access(
                user_id=user_id,
                unit_id=unit_id,
                send_email=False
            )
        else:
            result = await user_service.disable_coowner_access(
                user_id=user_id,
                unit_id=unit_id,
                send_email=False
            )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Acceso {'habilitado' if enabled else 'deshabilitado'} exitosamente",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al modificar acceso: {str(e)}")
        raise ServiceException(
            message=f"Error al modificar acceso: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/{unit_id}/residents/toggle-access-bulk",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle acceso masivo (Super Admin)",
    description="Habilita o deshabilita el acceso de múltiples residentes seleccionados"
)
async def toggle_residents_access_bulk(
    unit_id: int,
    request_data: BulkToggleAccessRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle acceso masivo de residentes (Super Admin).
    """
    try:
        from app.services.user_service import UserService
        
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los super administradores pueden acceder a esta función"
            )
        
        if not request_data.user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar al menos un ID de usuario"
            )
        
        # Procesar cada residente
        successful = 0
        failed = 0
        already_in_state = 0
        errors = []
        processed_users = []
        
        for user_id in request_data.user_ids:
            try:
                if request_data.enabled:
                    result = await user_service.enable_coowner_access(
                        user_id=user_id,
                        unit_id=unit_id,
                        send_email=False
                    )
                else:
                    result = await user_service.disable_coowner_access(
                        user_id=user_id,
                        unit_id=unit_id,
                        send_email=False
                    )
                
                if result['status'] in ['already_enabled', 'already_disabled']:
                    already_in_state += 1
                else:
                    successful += 1
                
                processed_users.append({
                    "user_id": result["user_id"],
                    "username": result["username"],
                    "name": result["name"],
                    "email": result["email"],
                    "status": result["status"]
                })
                
            except Exception as e:
                failed += 1
                errors.append({
                    "user_id": user_id,
                    "error": str(e)
                })
        
        action_text = "habilitados" if request_data.enabled else "deshabilitados"
        
        if successful == len(request_data.user_ids):
            message = f"✅ {successful} residentes {action_text} exitosamente"
        elif successful > 0:
            message = f"⚠️ Proceso completado: {successful} exitosos"
            if already_in_state > 0:
                message += f", {already_in_state} sin cambios"
            if failed > 0:
                message += f", {failed} fallidos"
        elif already_in_state == len(request_data.user_ids):
            message = f"ℹ️ Todos los residentes ya estaban {action_text}"
        else:
            message = f"❌ No se pudo modificar el acceso de ningún residente"
        
        logger.info(
            f"✅ Super Admin {current_user} modificó acceso masivo en unit_id={unit_id}: "
            f"{successful} exitosos, {failed} fallidos, {already_in_state} sin cambios"
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=message,
            data={
                "total_processed": len(request_data.user_ids),
                "successful": successful,
                "failed": failed,
                "already_in_state": already_in_state,
                "errors": errors,
                "processed_users": processed_users,
                "action": "enabled" if request_data.enabled else "disabled"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al modificar acceso masivo: {str(e)}")
        raise ServiceException(
            message=f"Error al modificar acceso masivo: {str(e)}",
            details={"original_error": str(e)}
        )

