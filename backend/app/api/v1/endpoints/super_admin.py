from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.auth.auth import get_current_user
from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.services.user_service import UserService
from app.services.residential_unit_service import ResidentialUnitService
from app.services.dashboard_service import DashboardService
from app.services.active_meeting_service import ActiveMeetingService
from app.core.database import get_db
from app.core.exceptions import ServiceException
from app.schemas.residential_unit_schema import AdministratorData
from app.schemas.email_notification_schema import BulkSendCredentialsRequest
from app.schemas.dashboard_schema import DashboardDataResponse
from app.schemas.active_meeting_schema import (
    ActiveMeetingsListResponse,
    ActiveMeetingDetailsSchema
)
import logging

logger = logging.getLogger(__name__)

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
        
@router.post(
    "/residential-units/{unit_id}/administrator/manual",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear administrador manual y asignarlo a la unidad",
    description="Crea un nuevo usuario con rol Administrador y lo asigna a la unidad residencial"
)
async def create_manual_administrator(
    unit_id: int,
    admin_data: AdministratorData,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un administrador manual (no copropietario) y lo asigna a una unidad residencial.

    Realiza las siguientes acciones:
    1. Valida que el email no exista en el sistema
    2. Crea registro en tbl_data_users
    3. Crea registro en tbl_users con rol 2 (Administrador)
    4. Crea registro en tbl_user_residential_units con bool_is_admin = True
    5. Marca como False al administrador anterior (si existe)
    6. Envía email con credenciales de acceso

    Args:
        unit_id: ID de la unidad residencial
        admin_data: Datos del nuevo administrador (nombre, apellido, email, teléfono)

    Returns:
        SuccessResponse con información del administrador creado
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

        # Crear el administrador manual
        result = await residential_service.create_manual_administrator(
            unit_id=unit_id,
            admin_data=admin_data,
            created_by_user_id=user.id
        )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Administrador creado y asignado exitosamente",
            data=result
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
            message=f"Error al crear el administrador: {str(e)}",
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
        
# @router.post(
#     "/residential-units/{unit_id}/residents/send-credentials-bulk",
#     response_model=SuccessResponse,
#     status_code=status.HTTP_200_OK,
#     summary="Enviar credenciales a múltiples copropietarios",
#     description="Envía credenciales por correo a múltiples copropietarios seleccionados"
# )
# async def send_credentials_bulk(
#     unit_id: int,
#     request_data: BulkSendCredentialsRequest,
#     current_user: str = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db)
# ):
#     """
#     Envía credenciales por correo a múltiples copropietarios.
    
#     Procesa cada copropietario de forma individual y retorna:
#     - Total de copropietarios procesados
#     - Correos enviados exitosamente
#     - Correos fallidos
#     - Lista detallada de errores (si los hay)
    
#     Args:
#         unit_id: ID de la unidad residencial
#         request_data: Lista de IDs de copropietarios (resident_ids)
        
#     Returns:
#         SuccessResponse con estadísticas del envío masivo
#     """
#     try:
#         # Verificar que el usuario actual sea Super Admin
#         user_service = UserService(db)
#         user = await user_service.get_user_by_username(current_user)
        
#         if not user or user.int_id_rol != 1:  # 1: Super Admin
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="No tienes permisos para realizar esta acción. Solo Super Admin puede enviar credenciales."
#             )
        
#         # Validar que la unidad residencial exista
#         residential_service = ResidentialUnitService(db)
#         unit = await residential_service.get_residential_unit_by_id(unit_id)
        
#         if not unit:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"La unidad residencial con ID {unit_id} no existe"
#             )
        
#         # Validar que se hayan enviado IDs
#         if not request_data.resident_ids or len(request_data.resident_ids) == 0:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Debe proporcionar al menos un ID de copropietario"
#             )
        
#         # Inicializar contadores
#         results = {
#             'total': len(request_data.resident_ids),
#             'successful': 0,
#             'failed': 0,
#             'errors': []
#         }
        
#         # Procesar cada copropietario
#         for resident_id in request_data.resident_ids:
#             try:
#                 # Intentar enviar credenciales usando el método existente
#                 await residential_service.resend_resident_credentials(
#                     user_id=resident_id,
#                     unit_id=unit_id
#                 )
#                 results['successful'] += 1
                
#             except Exception as e:
#                 results['failed'] += 1
#                 results['errors'].append({
#                     'resident_id': resident_id,
#                     'error': str(e)
#                 })
        
#         # Preparar mensaje de respuesta
#         if results['successful'] == results['total']:
#             message = f"✅ Credenciales enviadas exitosamente a {results['successful']} copropietarios"
#         elif results['successful'] > 0:
#             message = f"⚠️ Proceso completado: {results['successful']} exitosos, {results['failed']} fallidos"
#         else:
#             message = f"❌ No se pudo enviar credenciales a ningún copropietario"
        
#         return SuccessResponse(
#             success=True,
#             status_code=status.HTTP_200_OK,
#             message=message,
#             data={
#                 "total_processed": results['total'],
#                 "successful": results['successful'],
#                 "failed": results['failed'],
#                 "errors": results['errors'],
#                 "residential_unit": unit.str_name
#             }
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise ServiceException(
#             message=f"Error al enviar credenciales masivamente: {str(e)}",
#             details={"original_error": str(e)}
#         )
#     # Implementación similar a resend_credentials pero para múltiples usuarios

@router.post(
    "/residential-units/{unit_id}/residents/send-credentials-bulk",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Enviar credenciales a múltiples copropietarios",
    description="Envía credenciales por correo a múltiples copropietarios seleccionados"
)
async def send_credentials_bulk(
    unit_id: int,
    request_data: BulkSendCredentialsRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verificar que el usuario actual sea Super Admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user or user.int_id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción. Solo Super Admin puede enviar credenciales."
            )
        
        # Validar que la unidad residencial exista
        residential_service = ResidentialUnitService(db)
        unit = await residential_service.get_residential_unit_by_id(unit_id)
        
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La unidad residencial con ID {unit_id} no existe"
            )
        
        # Validar que se hayan enviado IDs
        if not request_data.resident_ids or len(request_data.resident_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar al menos un ID de copropietario"
            )
        
        # Inicializar contadores
        results = {
            'total': len(request_data.resident_ids),
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        # Procesar cada copropietario
        for resident_id in request_data.resident_ids:
            try:
                #Pasar auto_commit=False para NO cerrar la sesión
                await residential_service.resend_resident_credentials(
                    user_id=resident_id,
                    unit_id=unit_id,
                    auto_commit=False  # ⚠️ IMPORTANTE
                )
                results['successful'] += 1
                
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'resident_id': resident_id,
                    'error': str(e)
                })
                logger.error(f"Error enviando credenciales a resident_id {resident_id}: {str(e)}")
        
        #UN SOLO COMMIT al final
        await db.commit()
        
        # Preparar mensaje de respuesta
        if results['successful'] == results['total']:
            message = f"✅ Credenciales enviadas exitosamente a {results['successful']} copropietarios"
        elif results['successful'] > 0:
            message = f"⚠️ Proceso completado: {results['successful']} exitosos, {results['failed']} fallidos"
        else:
            message = f"❌ No se pudo enviar credenciales a ningún copropietario"
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=message,
            data={
                "total_processed": results['total'],
                "successful": results['successful'],
                "failed": results['failed'],
                "errors": results['errors'],
                "residential_unit": unit.str_name
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()  #Rollback en caso de error
        raise ServiceException(
            message=f"Error al enviar credenciales masivamente: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/dashboard/statistics",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener estadísticas del dashboard de SuperAdmin",
    description="Obtiene todas las estadísticas necesarias para el dashboard: stats generales, reuniones recientes y próximas"
)
async def get_dashboard_statistics(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene estadísticas completas del dashboard de SuperAdmin.

    Retorna:
    - stats: Estadísticas generales (unidades, residentes, reuniones activas, asistencia promedio)
    - recent_meetings: Últimas 5 reuniones completadas
    - upcoming_meetings: Próximas 5 reuniones programadas

    Solo usuarios Super Admin pueden acceder a este endpoint.
    """
    try:
        # Verificar que el usuario actual sea super admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a esta información. Solo Super Admin."
            )

        # Obtener estadísticas del dashboard
        dashboard_service = DashboardService(db)
        dashboard_data = await dashboard_service.get_dashboard_statistics()

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estadísticas del dashboard obtenidas exitosamente",
            data={
                "stats": {
                    "total_residential_units": dashboard_data.stats.total_residential_units,
                    "total_residents": dashboard_data.stats.total_residents,
                    "active_meetings": dashboard_data.stats.active_meetings,
                    "average_attendance": dashboard_data.stats.average_attendance
                },
                "recent_meetings": [
                    {
                        "id": meeting.id,
                        "title": meeting.title,
                        "residential_unit_name": meeting.residential_unit_name,
                        "status": meeting.status,
                        "completed_at": meeting.completed_at.isoformat() if meeting.completed_at else None,
                        "total_participants": meeting.total_participants,
                        "attendance_percentage": meeting.attendance_percentage
                    }
                    for meeting in dashboard_data.recent_meetings
                ],
                "upcoming_meetings": [
                    {
                        "id": meeting.id,
                        "title": meeting.title,
                        "residential_unit_name": meeting.residential_unit_name,
                        "scheduled_date": meeting.scheduled_date.isoformat(),
                        "meeting_type": meeting.meeting_type,
                        "total_invited": meeting.total_invited
                    }
                    for meeting in dashboard_data.upcoming_meetings
                ]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener estadísticas del dashboard: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener estadísticas del dashboard: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/active-meetings",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener lista de reuniones activas",
    description="Obtiene todas las reuniones que están en curso actualmente"
)
async def get_active_meetings(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene lista de reuniones activas (En Curso).

    Retorna para cada reunión:
    - Información básica (título, tipo, unidad residencial)
    - Cantidad de usuarios conectados
    - Total de invitados
    - Estado de quórum
    - Cantidad de encuestas activas

    Solo usuarios Super Admin pueden acceder a este endpoint.
    """
    try:
        # Verificar que el usuario actual sea super admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a esta información. Solo Super Admin."
            )

        # Obtener reuniones activas
        active_meeting_service = ActiveMeetingService(db)
        active_meetings = await active_meeting_service.get_active_meetings_list()

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {active_meetings.total_count} reuniones activas",
            data={
                "active_meetings": [
                    {
                        "meeting_id": meeting.meeting_id,
                        "title": meeting.title,
                        "residential_unit_name": meeting.residential_unit_name,
                        "meeting_type": meeting.meeting_type,
                        "status": meeting.status,
                        "started_at": meeting.started_at.isoformat() if meeting.started_at else None,
                        "connected_users_count": meeting.connected_users_count,
                        "total_invited": meeting.total_invited,
                        "quorum_reached": meeting.quorum_reached,
                        "active_polls_count": meeting.active_polls_count
                    }
                    for meeting in active_meetings.active_meetings
                ],
                "total_count": active_meetings.total_count
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener reuniones activas: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener reuniones activas: {str(e)}",
            details={"original_error": str(e)}
        )


@router.get(
    "/active-meetings/{meeting_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalles de una reunión activa",
    description="Obtiene todos los detalles de una reunión específica incluyendo usuarios conectados, encuestas y administrador"
)
async def get_active_meeting_details(
    meeting_id: int,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene detalles completos de una reunión activa.

    Incluye:
    - Información completa de la reunión
    - Información de la unidad residencial
    - Datos del administrador de la unidad
    - Lista de usuarios conectados con sus datos
    - Lista de encuestas creadas para la reunión
    - URLs de Zoom

    Solo usuarios Super Admin pueden acceder a este endpoint.
    """
    try:
        # Verificar que el usuario actual sea super admin
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)

        if not user or user.int_id_rol != 1:  # 1: Super Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a esta información. Solo Super Admin."
            )

        # Obtener detalles de la reunión
        active_meeting_service = ActiveMeetingService(db)
        meeting_details = await active_meeting_service.get_meeting_details(meeting_id)

        if not meeting_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La reunión con ID {meeting_id} no existe"
            )

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Detalles de la reunión obtenidos exitosamente",
            data={
                "meeting_id": meeting_details.meeting_id,
                "title": meeting_details.title,
                "description": meeting_details.description,
                "residential_unit": {
                    "id": meeting_details.residential_unit_id,
                    "name": meeting_details.residential_unit_name,
                    "nit": meeting_details.residential_unit_nit
                },
                "meeting_type": meeting_details.meeting_type,
                "status": meeting_details.status,
                "scheduled_date": meeting_details.scheduled_date.isoformat(),
                "actual_start_time": meeting_details.actual_start_time.isoformat() if meeting_details.actual_start_time else None,
                "actual_end_time": meeting_details.actual_end_time.isoformat() if meeting_details.actual_end_time else None,
                "total_invited": meeting_details.total_invited,
                "total_confirmed": meeting_details.total_confirmed,
                "quorum_reached": meeting_details.quorum_reached,
                "zoom_join_url": meeting_details.zoom_join_url,
                "zoom_meeting_id": meeting_details.zoom_meeting_id,
                "administrator": {
                    "user_id": meeting_details.administrator.user_id,
                    "full_name": meeting_details.administrator.full_name,
                    "email": meeting_details.administrator.email,
                    "phone": meeting_details.administrator.phone
                } if meeting_details.administrator else None,
                "connected_users": [
                    {
                        "user_id": user.user_id,
                        "full_name": user.full_name,
                        "email": user.email,
                        "apartment_number": user.apartment_number,
                        "voting_weight": float(user.voting_weight),
                        "is_present": user.is_present,
                        "joined_at": user.joined_at.isoformat() if user.joined_at else None,
                        "attendance_type": user.attendance_type
                    }
                    for user in meeting_details.connected_users
                ],
                "polls": [
                    {
                        "poll_id": poll.poll_id,
                        "title": poll.title,
                        "description": poll.description,
                        "poll_type": poll.poll_type,
                        "status": poll.status,
                        "started_at": poll.started_at.isoformat() if poll.started_at else None,
                        "ended_at": poll.ended_at.isoformat() if poll.ended_at else None,
                        "total_votes": poll.total_votes,
                        "requires_quorum": poll.requires_quorum,
                        "minimum_quorum_percentage": float(poll.minimum_quorum_percentage)
                    }
                    for poll in meeting_details.polls
                ]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener detalles de la reunión: {str(e)}")
        raise ServiceException(
            message=f"Error al obtener detalles de la reunión: {str(e)}",
            details={"original_error": str(e)}
        )