from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.auth.auth import get_current_user
from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.schemas.meeting_invitation_schema import (
    BulkUploadResponse,
    MeetingInvitationCreate,
    MeetingInvitationResponse,
    MeetingInvitationBatchCreate
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


# @router.get(
#     "/meeting/{meeting_id}",
#     response_model=SuccessResponse,
#     status_code=status.HTTP_200_OK,
#     summary="Obtener invitaciones de una reunión",
#     description="Obtiene todas las invitaciones de una reunión específica"
# )
# async def get_meeting_invitations(
#     meeting_id: int,
#     current_user: str = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Obtiene todas las invitaciones de una reunión"""
#     try:
#         invitation_service = MeetingInvitationService(db)
#         invitations = await invitation_service.get_invitations_by_meeting(meeting_id)

#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message="Invitaciones obtenidas correctamente",
#             data=[MeetingInvitationResponse.from_orm(inv).dict() for inv in invitations]
#         )

#     except Exception as e:
#         raise ServiceException(
#             message=f"Error al obtener las invitaciones: {str(e)}",
#             details={"original_error": str(e)}
#         )

# @router.get(
#     "/meeting/{meeting_id}",
#     response_model=SuccessResponse,
#     status_code=status.HTTP_200_OK,
#     summary="Obtener invitaciones de una reunión",
#     description="Obtiene todas las invitaciones de una reunión específica con quorum base"
# )
# async def get_meeting_invitations(
#     meeting_id: int,
#     current_user: str = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Obtiene todas las invitaciones de una reunión con el quorum base de cada copropietario"""
#     try:
#         from app.models.meeting_invitation_model import MeetingInvitationModel
#         from app.models.user_model import UserModel
#         from app.models.data_user_model import DataUserModel
#         from app.models.user_residential_unit_model import UserResidentialUnitModel
#         from app.models.meeting_model import MeetingModel
#         from sqlalchemy import select, and_
        
#         # Query con JOIN para obtener el quorum base
#         query = (
#             select(
#                 MeetingInvitationModel,
#                 UserModel.str_firstname,
#                 UserModel.str_lastname,
#                 DataUserModel.str_email,
#                 UserResidentialUnitModel.dec_default_voting_weight.label('dec_quorum_base')
#             )
#             .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
#             .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
#             .outerjoin(
#                 UserResidentialUnitModel,
#                 and_(
#                     UserResidentialUnitModel.int_user_id == UserModel.id,
#                     UserResidentialUnitModel.int_residential_unit_id == (
#                         select(MeetingModel.int_id_residential_unit)
#                         .where(MeetingModel.id == meeting_id)
#                         .scalar_subquery()
#                     )
#                 )
#             )
#             .where(MeetingInvitationModel.int_meeting_id == meeting_id)
#             .order_by(
#                 UserModel.str_firstname.asc(),
#                 UserModel.str_lastname.asc()
#             )
#         )

#         result = await db.execute(query)
#         invitations_data = result.all()

#         # Formatear respuesta
#         invitations = []
#         for invitation, firstname, lastname, email, quorum_base in invitations_data:
#             invitation_dict = {
#                 "id": invitation.id,
#                 "int_meeting_id": invitation.int_meeting_id,
#                 "int_user_id": invitation.int_user_id,
#                 "dec_voting_weight": float(invitation.dec_voting_weight),  # Peso actual en la reunión
#                 "dec_quorum_base": float(quorum_base) if quorum_base is not None else 0.0,  # NUEVO: Quorum base
#                 "str_apartment_number": invitation.str_apartment_number,
#                 "str_invitation_status": invitation.str_invitation_status,
#                 "str_response_status": invitation.str_response_status,
#                 "bln_will_attend": invitation.bln_will_attend,
#                 "int_delegated_id": invitation.int_delegated_id,
#                 "str_firstname": firstname,
#                 "str_lastname": lastname,
#                 "str_email": email,
#                 "dat_sent_at": invitation.dat_sent_at,
#                 "dat_responded_at": invitation.dat_responded_at,
#                 "bln_actually_attended": invitation.bln_actually_attended,
#                 "dat_joined_at": invitation.dat_joined_at,
#                 "dat_left_at": invitation.dat_left_at,
#                 "created_at": invitation.created_at,
#                 "updated_at": invitation.updated_at
#             }
#             invitations.append(invitation_dict)

#         logger.info(f"✅ Se encontraron {len(invitations)} invitaciones para meeting_id={meeting_id}")

#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message=f"Se encontraron {len(invitations)} invitaciones",
#             data=invitations
#         )

#     except Exception as e:
#         logger.error(f"❌ Error al obtener invitaciones: {str(e)}")
#         raise ServiceException(
#             message=f"Error al obtener las invitaciones: {str(e)}",
#             details={"original_error": str(e)}
#         )

@router.get(
    "/meeting/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener invitaciones de una reunión",
    description="Obtiene todas las invitaciones con quorum base desde UserResidentialUnitModel"
)
async def get_meeting_invitations(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene invitaciones con quorum base desde la relación user_residential_unit.
    """
    try:
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.meeting_model import MeetingModel
        from sqlalchemy import select, and_
        
        logger.info(f"📋 Obteniendo invitaciones de meeting_id={meeting_id}")
        
        # ✅ Query CON JOIN a UserResidentialUnitModel para obtener quorum base
        query = (
            select(
                MeetingInvitationModel,
                DataUserModel.str_firstname,
                DataUserModel.str_lastname,
                DataUserModel.str_email,
                UserResidentialUnitModel.dec_default_voting_weight.label('dec_quorum_base')  # ✅ QUORUM BASE
            )
            .join(UserModel, MeetingInvitationModel.int_user_id == UserModel.id)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .outerjoin(
                UserResidentialUnitModel,
                and_(
                    UserResidentialUnitModel.int_user_id == UserModel.id,
                    UserResidentialUnitModel.int_residential_unit_id == (
                        select(MeetingModel.int_id_residential_unit)
                        .where(MeetingModel.id == meeting_id)
                        .scalar_subquery()
                    )
                )
            )
            .where(MeetingInvitationModel.int_meeting_id == meeting_id)
            .order_by(
                DataUserModel.str_firstname.asc(),
                DataUserModel.str_lastname.asc()
            )
        )

        result = await db.execute(query)
        invitations_data = result.all()

        # ✅ Formatear respuesta con quorum base
        invitations = []
        for invitation, firstname, lastname, email, quorum_base in invitations_data:
            invitation_dict = {
                "id": invitation.id,
                "int_meeting_id": invitation.int_meeting_id,
                "int_user_id": invitation.int_user_id,
                
                # ✅ Quorum: actual (dec_voting_weight) y base (desde UserResidentialUnit)
                "dec_voting_weight": float(invitation.dec_voting_weight),  
                "dec_quorum_base": float(quorum_base) if quorum_base is not None else 0.0,  # ✅ QUORUM BASE
                
                "str_apartment_number": invitation.str_apartment_number,
                "str_invitation_status": invitation.str_invitation_status,
                "str_response_status": invitation.str_response_status,
                "bln_will_attend": invitation.bln_will_attend,
                "bln_actually_attended": invitation.bln_actually_attended,
                "int_delegated_id": invitation.int_delegated_id,
                
                # Info de usuario desde DataUserModel
                "str_firstname": firstname,
                "str_lastname": lastname,
                "str_email": email,
                
                # Fechas
                "dat_sent_at": invitation.dat_sent_at,
                "dat_responded_at": invitation.dat_responded_at,
                "dat_joined_at": invitation.dat_joined_at,
                "dat_left_at": invitation.dat_left_at,
                "created_at": invitation.created_at,
                "updated_at": invitation.updated_at
            }
            invitations.append(invitation_dict)

        logger.info(f"✅ Retornando {len(invitations)} invitaciones con quorum base")

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(invitations)} invitaciones",
            data=invitations
        )

    except Exception as e:
        logger.error(f"❌ Error al obtener invitaciones: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al obtener las invitaciones: {str(e)}",
            details={"original_error": str(e)}
        )


@router.post(
    "/invitations/batch",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear múltiples invitaciones a una reunión",
    description="Crea invitaciones para múltiples usuarios a una reunión programada"
)
async def create_batch_invitations(
    invitation_data: MeetingInvitationBatchCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea múltiples invitaciones a una reunión.
    
    Este endpoint permite invitar a múltiples copropietarios a una reunión programada.
    El peso de votación y número de apartamento se obtienen automáticamente desde
    UserResidentialUnitModel.
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado"
            )

        invitation_service = MeetingInvitationService(db)
        results = await invitation_service.create_batch_invitations(
            meeting_id=invitation_data.int_meeting_id,
            user_ids=invitation_data.user_ids,
            created_by=user.id
        )

        message = f"Se crearon {results['invitations_created']} invitaciones"
        if results['failed'] > 0:
            message += f", {results['failed']} fallidas"

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message=message,
            data=results
        )

    except ServiceException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error al crear invitaciones batch: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ServiceException(
            message=f"Error al crear las invitaciones: {str(e)}",
            details={"original_error": str(e)}
        )
