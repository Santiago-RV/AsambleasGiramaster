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

