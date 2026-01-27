from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from pathlib import Path

from app.core.database import get_db
from app.auth.auth import get_current_user_obj, get_current_user
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.schemas.responses_schema import SuccessResponse
from app.services.simple_auto_login_service import simple_auto_login_service
from app.services.qr_service import qr_service
from app.services.email_service import email_service
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class EnhancedQRRequest(BaseModel):
    userId: int
    include_personal_info: bool = True
    qr_size: int = 400
    expiration_hours: int = 48

class EnhancedQRResponse(BaseModel):
    qr_base64: str
    auto_login_token: str
    auto_login_url: str
    qr_filename: str
    expires_in_hours: int
    user_info: Dict  # Permite diferentes tipos de valores (str, int, etc.)

class BulkQRRequest(BaseModel):
    user_ids: List[int]
    qr_size: int = 400
    expiration_hours: int = 48

class BulkQRResponse(BaseModel):
    generated_qrs: List[Dict]
    total_generated: int
    total_failed: int

@router.post(
    "/enhanced-qr",
    summary="Genera un código QR mejorado y personalizado",
    description="Genera un QR personalizado con información del usuario y opciones avanzadas"
)
async def generate_enhanced_qr(
    request: EnhancedQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un código QR mejorado con información personalizada del usuario.
    
    Args:
        request: Configuración del QR a generar
        current_user: Usuario autenticado que realiza la solicitud
        db: Sesión de base de datos
    
    Returns:
        QR personalizado y datos de acceso
    
    Raises:
        HTTPException: Si el usuario no existe o no hay permisos
    """
    try:
        # Verificar permisos (solo admins y super admins pueden generar QR)
        if current_user.int_id_rol not in [1, 2]:  # 1=Super Admin, 2=Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para generar códigos QR"
            )
        
        # Obtener información completa del usuario target
        result = await db.execute(
            select(UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
            .join(ResidentialUnitModel, UserResidentialUnitModel.int_residential_unit_id == ResidentialUnitModel.id)
            .where(UserModel.id == request.userId)
        )
        user_data = result.first()
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        target_user, target_data_user, user_residential_unit, residential_unit = user_data
        
        # Obtener contraseña actual del usuario
        password = getattr(target_user, 'str_temp_password', None) or target_user.str_username
        
        # Información para personalización del QR
        user_info = {
            'name': f"{target_data_user.str_firstname} {target_data_user.str_lastname}".strip(),
            'apartment': user_residential_unit.str_apartment_number,
            'residential_unit': residential_unit.str_name,
            'email': target_data_user.str_email,
            'role': 'Admin' if target_user.int_id_rol in [1, 2] else 'Resident',
            'user_id': target_user.id
        } if request.include_personal_info else {}
        
        # Generar QR mejorado
        qr_data = qr_service.generate_user_qr_data(
            user_id=target_user.id,
            username=target_user.str_username,
            password=password,
            user_info=user_info,
            expiration_hours=request.expiration_hours
        )
        
        logger.info(f"🎯 QR mejorado generado para usuario {target_user.id}: {user_info.get('name', 'Unknown')}")
        
        return SuccessResponse[EnhancedQRResponse](
            data=EnhancedQRResponse(
                qr_base64=qr_data['qr_base64'],
                auto_login_token=qr_data['auto_login_token'],
                auto_login_url=qr_data['auto_login_url'],
                qr_filename=qr_data['qr_filename'],
                expires_in_hours=qr_data['expires_in_hours'],
                user_info=user_info
            ),
            message="Código QR mejorado generado exitosamente"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar QR mejorado: {str(e)}"
        )

@router.post(
    "/bulk-qr",
    summary="Genera códigos QR para múltiples usuarios",
    description="Genera QRs personalizados para una lista de usuarios"
)
async def generate_bulk_qr(
    request: BulkQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera códigos QR en lote para múltiples usuarios.
    
    Args:
        request: Lista de IDs de usuarios y configuración
        current_user: Usuario autenticado que realiza la solicitud
        db: Sesión de base de datos
    
    Returns:
        Estadísticas de la generación y lista de QRs generados
    
    Raises:
        HTTPException: Si no hay permisos
    """
    try:
        # Verificar permisos
        if current_user.int_id_rol not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para generar códigos QR"
            )
        
        # Obtener información de todos los usuarios
        result = await db.execute(
            select(UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
            .join(ResidentialUnitModel, UserResidentialUnitModel.int_residential_unit_id == ResidentialUnitModel.id)
            .where(UserModel.id.in_(request.user_ids))
        )
        users_data = result.all()
        
        if not users_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron usuarios válidos"
            )
        
        # Preparar datos para generación bulk
        bulk_data = []
        for target_user, target_data_user, user_residential_unit, residential_unit in users_data:
            password = getattr(target_user, 'str_temp_password', None) or target_user.str_username
            
            bulk_data.append({
                'user_id': target_user.id,
                'username': target_user.str_username,
                'password': password,
                'firstname': target_data_user.str_firstname,
                'lastname': target_data_user.str_lastname,
                'apartment_number': user_residential_unit.str_apartment_number,
                'residential_unit_name': residential_unit.str_name,
                'email': target_data_user.str_email,
                'role': 'Admin' if target_user.int_id_rol in [1, 2] else 'Resident'
            })
        
        # Generar QRs en lote
        qr_results = qr_service.generate_bulk_qr_codes(
            users_data=bulk_data,
            expiration_hours=request.expiration_hours
        )
        
        # Calcular estadísticas
        total_generated = len([r for r in qr_results if 'error' not in r])
        total_failed = len([r for r in qr_results if 'error' in r])
        
        logger.info(f"📊 Generación bulk QR: {total_generated} exitosos, {total_failed} fallidos")
        
        return SuccessResponse[BulkQRResponse](
            data=BulkQRResponse(
                generated_qrs=qr_results,
                total_generated=total_generated,
                total_failed=total_failed
            ),
            message=f"Generación completada: {total_generated} QRs generados, {total_failed} errores"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en generación bulk de QRs: {str(e)}"
        )

@router.post(
    "/send-enhanced-qr-email",
    summary="Envía QR mejorado por correo",
    description="Genera y envía un QR personalizado por correo electrónico"
)
async def send_enhanced_qr_email(
    userId: int,
    recipient_email: Optional[EmailStr] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un QR mejorado y lo envía por correo electrónico.
    
    Args:
        userId: ID del usuario target
        recipient_email: Email alternativo (opcional)
        background_tasks: Tareas en segundo plano
        current_user: Usuario autenticado
        db: Sesión de base de datos
    
    Returns:
        Confirmación del envío
    """
    try:
        # Verificar permisos
        if current_user.int_id_rol not in [1, 2]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para enviar códigos QR"
            )
        
        # Obtener información del usuario
        result = await db.execute(
            select(UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
            .join(ResidentialUnitModel, UserResidentialUnitModel.int_residential_unit_id == ResidentialUnitModel.id)
            .where(UserModel.id == userId)
        )
        user_data = result.first()
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        target_user, target_data_user, user_residential_unit, residential_unit = user_data
        
        # Generar QR mejorado
        password = getattr(target_user, 'str_temp_password', None) or target_user.str_username
        
        user_info = {
            'name': f"{target_data_user.str_firstname} {target_data_user.str_lastname}".strip(),
            'apartment': user_residential_unit.str_apartment_number,
            'residential_unit': residential_unit.str_name,
            'email': target_data_user.str_email,
            'role': 'Admin' if target_user.int_id_rol in [1, 2] else 'Resident'
        }
        
        qr_data = qr_service.generate_user_qr_data(
            user_id=target_user.id,
            username=target_user.str_username,
            password=password,
            user_info=user_info,
            expiration_hours=48
        )
        
        # Enviar correo con QR mejorado
        email_sent = await email_service.send_qr_access_email(
            to_email=recipient_email or target_data_user.str_email,
            resident_name=user_info['name'],
            apartment_number=user_info['apartment'],
            username=target_user.str_username,
            auto_login_url=qr_data['auto_login_url'],
            auto_login_token=qr_data['auto_login_token']
        )
        
        if email_sent:
            logger.info(f"📧 QR mejorado enviado a {recipient_email or target_data_user.str_email}")
            
            return SuccessResponse[Dict](
                data={
                    'sent_to': recipient_email or target_data_user.str_email,
                    'qr_filename': qr_data['qr_filename'],
                    'auto_login_url': qr_data['auto_login_url'],
                    'expires_in_hours': 48
                },
                message="QR mejorado enviado exitosamente por correo"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo enviar el correo electrónico"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al enviar QR mejorado: {str(e)}"
        )