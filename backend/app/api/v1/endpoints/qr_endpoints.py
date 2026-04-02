"""
Endpoints unificados para generación y envío de códigos QR.

Este archivo consolida toda la funcionalidad de QR en un solo lugar:
- Generación de QR simple (para modal del frontend)
- Generación de QR mejorado con personalización
- Envío de QR por email
- Generación masiva de QRs

Autor: Claude Code
Fecha: 2026-01-26
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
import logging
import secrets
import string
import os

from app.core.database import get_db
from app.auth.auth import get_current_user_obj
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.schemas.responses_schema import SuccessResponse
from app.services.simple_auto_login_service import simple_auto_login_service
from app.services.qr_service import qr_service
from app.services.email_service import EmailService
from app.core.config import settings
from app.core.security import security_manager
from app.celery_app import celery_app
from app.api.v1.endpoints.decorators import require_email_enabled

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================
# SCHEMAS / MODELOS DE REQUEST/RESPONSE
# ============================================

class SimpleQRRequest(BaseModel):
    """Request para generar QR simple (usado por modal del frontend)"""
    userId: int


class SimpleQRResponse(BaseModel):
    """Response de QR simple con token y URL"""
    auto_login_token: str
    auto_login_url: str
    expires_in_hours: int


class EnhancedQRRequest(BaseModel):
    """Request para generar QR mejorado con personalización"""
    userId: int
    include_personal_info: bool = True
    qr_size: int = 400
    expiration_hours: int = 48


class EnhancedQRResponse(BaseModel):
    """Response de QR mejorado con imagen base64"""
    qr_base64: str
    auto_login_token: str
    auto_login_url: str
    qr_filename: str
    expires_in_hours: int
    user_info: Dict


class SendQREmailRequest(BaseModel):
    """Request para enviar QR por email"""
    userId: int
    recipient_email: Optional[EmailStr] = None


class BulkQRRequest(BaseModel):
    """Request para generar QRs en masa"""
    user_ids: List[int]
    qr_size: int = 400
    expiration_hours: int = 48


class BulkQRResponse(BaseModel):
    """Response de generación masiva de QRs"""
    generated_qrs: List[Dict]
    total_generated: int
    total_failed: int


class BulkQRSimpleRequest(BaseModel):
    """Request para generar tokens QR simples en masa (sin imágenes)"""
    user_ids: List[int]
    expiration_hours: int = 48
    frontend_url: Optional[str] = Field(None, description="URL base del frontend para construir auto-login URL")


class QRTokenData(BaseModel):
    """Datos de un token QR individual"""
    user_id: int
    auto_login_token: str
    auto_login_url: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    apartment_number: Optional[str] = None


class BulkQRSimpleResponse(BaseModel):
    """Response de generación masiva de tokens QR (sin imágenes)"""
    qr_tokens: List[QRTokenData]
    total_generated: int
    total_failed: int
    failed_users: List[Dict] = []


# ============================================
# FUNCIONES AUXILIARES
# ============================================

async def _get_user_complete_data(db: AsyncSession, user_id: int):
    """
    Obtiene información completa del usuario con todos los joins necesarios.
    
    Args:
        db: Sesión de base de datos
        user_id: ID del usuario
    
    Returns:
        Tupla con (UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
    
    Raises:
        HTTPException: Si el usuario no existe
    """
    result = await db.execute(
        select(UserModel, DataUserModel, UserResidentialUnitModel, ResidentialUnitModel)
        .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
        .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
        .join(ResidentialUnitModel, UserResidentialUnitModel.int_residential_unit_id == ResidentialUnitModel.id)
        .where(UserModel.id == user_id)
    )
    user_data = result.first()
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado"
        )
    
    return user_data


def _check_admin_permissions(current_user: UserModel):
    """
    Verifica que el usuario actual tenga permisos de admin.
    
    Args:
        current_user: Usuario autenticado
    
    Raises:
        HTTPException: Si no tiene permisos
    """
    if current_user.int_id_rol not in [1, 2]:  # 1=Super Admin, 2=Admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar códigos QR. Solo administradores."
        )


def _generate_temporary_password() -> str:
    """
    Genera una contraseña temporal segura.
    
    Returns:
        Contraseña temporal de 12 caracteres
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(12))


async def _update_user_password(db: AsyncSession, user: UserModel, password: str):
    """
    Actualiza la contraseña de un usuario en la base de datos.
    
    Args:
        db: Sesión de base de datos
        user: Usuario a actualizar
        password: Nueva contraseña en texto plano
    """
    hashed_password = security_manager.create_password_hash(password)
    user.str_password_hash = hashed_password
    user.updated_at = datetime.now()
    await db.commit()


# ============================================
# ENDPOINTS
# ============================================

@router.post(
    "/generate-qr-simple",
    summary="Genera QR simple para mostrar en modal",
    description="Genera un QR con contraseña temporal para acceso directo. Usado por el botón individual de QR.",
    response_model=SuccessResponse[SimpleQRResponse]
)
async def generate_qr_simple(
    request: SimpleQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint principal usado por el frontend para generar QR individual.
    
    - Genera contraseña temporal única
    - Actualiza hash en BD
    - Crea JWT con contraseña temporal
    - Retorna URL de auto-login
    
    **Frontend:** Botón de QR morado en ResidentsList.jsx
    """
    try:
        _check_admin_permissions(current_user)
        
        # Obtener datos completos del usuario
        target_user, target_data_user, user_residential_unit, residential_unit = \
            await _get_user_complete_data(db, request.userId)
        
        # Generar token JWT (sin contraseña - solo valida el token)
        auto_login_token = simple_auto_login_service.generate_auto_login_token(
            username=target_user.str_username,
            expiration_hours=24
        )
        
        # Guardar el token para el usuario (invalidar anteriores)
        from app.services.simple_auto_login_service import simple_auto_login_service as sal_service
        token_payload = sal_service.decode_auto_login_token(auto_login_token)
        if token_payload and token_payload.get("token_id"):
            await sal_service.upsert_user_token(
                db, 
                token_payload["token_id"], 
                target_user.id, 
                None
            )
        
        # Construir URL del frontend
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://10.1.1.171:5173')
        auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
        
        logger.info(
            f"✅ QR simple generado para {target_data_user.str_firstname} {target_data_user.str_lastname} "
            f"por admin {current_user.str_username}"
        )
        
        return SuccessResponse[SimpleQRResponse](
            data=SimpleQRResponse(
                auto_login_token=auto_login_token,
                auto_login_url=auto_login_url,
                expires_in_hours=24
            ),
            message="Código QR generado exitosamente"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al generar QR simple: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar código QR: {str(e)}"
        )


@router.post(
    "/enhanced-qr",
    summary="Genera QR mejorado con imagen personalizada",
    description="Genera un QR con logo, información del usuario y personalización avanzada",
    response_model=SuccessResponse[EnhancedQRResponse]
)
async def generate_enhanced_qr(
    request: EnhancedQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera QR personalizado con imagen base64.
    
    - Incluye logo corporativo
    - Información del usuario (nombre, apartamento, etc.)
    - QR guardado como PNG en disco
    - Retorna imagen en base64 para mostrar
    
    **Uso:** Ideal para impresión o envío por email
    """
    try:
        _check_admin_permissions(current_user)
        
        # Obtener datos completos del usuario
        target_user, target_data_user, user_residential_unit, residential_unit = \
            await _get_user_complete_data(db, request.userId)
        
        # Generar contraseña temporal
        temp_password = _generate_temporary_password()
        
        # Actualizar hash en BD
        await _update_user_password(db, target_user, temp_password)
        
        # Preparar información del usuario
        user_info = {
            'name': f"{target_data_user.str_firstname} {target_data_user.str_lastname}".strip(),
            'apartment': user_residential_unit.str_apartment_number,
            'residential_unit': residential_unit.str_name,
            'email': target_data_user.str_email,
            'role': 'Admin' if target_user.int_id_rol in [1, 2] else 'Resident',
            'user_id': target_user.id
        } if request.include_personal_info else {}
        
        # Generar QR mejorado con imagen
        qr_data = qr_service.generate_user_qr_data(
            user_id=target_user.id,
            username=target_user.str_username,
            user_info=user_info,
            expiration_hours=request.expiration_hours if request.expiration_hours else 24
        )
        
        # Guardar el token para el usuario (invalidar anteriores)
        token_payload = simple_auto_login_service.decode_auto_login_token(qr_data['auto_login_token'])
        if token_payload and token_payload.get("token_id"):
            await simple_auto_login_service.upsert_user_token(
                db, 
                token_payload["token_id"], 
                target_user.id, 
                None
            )
        
        logger.info(f"🎯 QR mejorado generado para {user_info.get('name', 'Unknown')}")
        
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
        logger.error(f"❌ Error al generar QR mejorado: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar QR mejorado: {str(e)}"
        )


@router.post(
    "/send-enhanced-qr-email",
    summary="Envía QR personalizado por correo electrónico",
    description="Genera QR con contraseña temporal y lo envía por email",
    response_model=SuccessResponse[Dict]
)
@require_email_enabled
async def send_enhanced_qr_email(
    request: SendQREmailRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint principal usado por el frontend para envío masivo de QRs.
    
    - Genera contraseña temporal única
    - Actualiza hash en BD
    - Genera QR personalizado con logo
    - Envía email con QR incrustado
    - Invalida QRs anteriores automáticamente
    
    **Frontend:** Botón "Enviar QRs" morado en ResidentsList.jsx
    """
    try:
        _check_admin_permissions(current_user)
        
        # Enviar a Celery de forma asíncrona
        celery_app.send_task(
            'app.tasks.email_tasks.send_qr_email',
            args=[request.userId],
            kwargs={
                'recipient_email': request.recipient_email,
                'frontend_url': str(settings.FRONTEND_URL) if settings.FRONTEND_URL else None
            },
            queue='email_tasks'
        )
        
        email_address = request.recipient_email or None
        logger.info(f"📧 QR email enviado a cola Celery para user_id={request.userId}")
        
        return SuccessResponse[Dict](
            data={
                'sent_to': email_address,
                'message': 'QR enviado a cola de procesamiento'
            },
            message="QR enviado exitosamente por correo"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al enviar QR por email: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al enviar QR: {str(e)}"
        )


@router.post(
    "/bulk-qr",
    summary="Genera QRs para múltiples usuarios",
    description="Genera QRs personalizados en lote para una lista de usuarios",
    response_model=SuccessResponse[BulkQRResponse]
)
async def generate_bulk_qr(
    request: BulkQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Generación masiva de QRs.
    
    - Procesa múltiples usuarios en una sola petición
    - Genera contraseñas temporales para cada uno
    - Actualiza hashes en BD
    - Retorna estadísticas de éxito/fallo
    
    **Uso:** Ideal para onboarding de múltiples residentes
    """
    try:
        _check_admin_permissions(current_user)
        
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
            # Generar contraseña temporal para cada usuario
            temp_password = _generate_temporary_password()
            
            # Actualizar hash en BD
            await _update_user_password(db, target_user, temp_password)
            
            bulk_data.append({
                'user_id': target_user.id,
                'username': target_user.str_username,
                'password': temp_password,
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
        
        logger.info(f"📊 Generación bulk: {total_generated} exitosos, {total_failed} fallidos")
        
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
        logger.error(f"❌ Error en generación bulk: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en generación masiva de QRs: {str(e)}"
        )


@router.post(
    "/generate-qr-bulk-simple",
    summary="Genera tokens QR simples para múltiples usuarios (sin imágenes)",
    description="Genera solo los tokens de auto-login para múltiples usuarios sin generar las imágenes QR. Ideal para generar PDFs en el frontend.",
    response_model=SuccessResponse[BulkQRSimpleResponse]
)
async def generate_qr_bulk_simple(
    request: BulkQRSimpleRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Generación masiva de tokens QR (sin imágenes).
    
    - Procesa múltiples usuarios en una sola petición
    - Genera contraseñas temporales y tokens de auto-login
    - NO genera las imágenes QR (más rápido y eficiente)
    - El frontend genera las imágenes QR localmente
    
    **Uso:** Ideal para generar PDFs con múltiples QRs en el frontend
    
    **Límite de Rate:** 10 peticiones por hora
    """
    try:
        _check_admin_permissions(current_user)
        
        # Validar número de usuarios
        if len(request.user_ids) > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Has seleccionado {len(request.user_ids)} residentes. El límite máximo es de 500. Por favor, selecciona menos residentes e intenta nuevamente."
            )
        
        if not request.user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No has seleccionado ningún residente. Por favor, selecciona al menos un residente para generar los códigos QR."
            )
        
        logger.info(f"🔄 Generando tokens QR para {len(request.user_ids)} usuarios")
        
        # Obtener información de todos los usuarios
        result = await db.execute(
            select(UserModel, DataUserModel, UserResidentialUnitModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .outerjoin(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
            .where(UserModel.id.in_(request.user_ids))
        )
        users_data = result.all()
        
        if not users_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron usuarios válidos"
            )
        
        qr_tokens = []
        failed_users = []
        
        # Obtener tokens válidos existentes de los usuarios
        user_ids = [user.id for user, _, _ in users_data]
        existing_tokens = await simple_auto_login_service.get_valid_tokens_for_users(db, user_ids)
        logger.info(f"📋 Tokens válidos existentes encontrados: {len(existing_tokens)}")
        
        # Determinar frontend_url
        if request.frontend_url:
            frontend_url = request.frontend_url
        else:
            frontend_url = os.getenv("FRONTEND_URL", "https://asambleas.giramaster.co")
        
        # Procesar cada usuario
        for target_user, target_data_user, user_residential_unit in users_data:
            try:
                # Verificar si ya existe un token válido para este usuario
                existing_token_data = existing_tokens.get(target_user.id)
                
                if existing_token_data:
                    # Reutilizar el token_id existente y generar nuevo JWT
                    token_id = existing_token_data["token_id"]
                    token = simple_auto_login_service.generate_auto_login_token_with_id(
                        username=target_user.str_username,
                        token_id=token_id,
                        expiration_hours=request.expiration_hours if request.expiration_hours else 24
                    )
                    logger.info(f"♻️ Token reutilizado para usuario {target_user.id}: {token_id}")
                else:
                    # Generar nuevo token de auto-login
                    token = simple_auto_login_service.generate_auto_login_token(
                        username=target_user.str_username,
                        expiration_hours=request.expiration_hours if request.expiration_hours else 24
                    )
                    
                    # Guardar el token para el usuario
                    token_payload = simple_auto_login_service.decode_auto_login_token(token)
                    if token_payload and token_payload.get("token_id"):
                        await simple_auto_login_service.upsert_user_token(
                            db, 
                            token_payload["token_id"], 
                            target_user.id, 
                            None
                        )
                    logger.info(f"✅ Token generado para usuario {target_user.id}: {target_user.str_username}")
                
                # Construir URL de auto-login
                auto_login_url = f"{frontend_url}/auto-login/{token}"
                
                # Añadir a resultados exitosos
                qr_tokens.append(QRTokenData(
                    user_id=target_user.id,
                    auto_login_token=token,
                    auto_login_url=auto_login_url,
                    firstname=target_data_user.str_firstname,
                    lastname=target_data_user.str_lastname,
                    apartment_number=user_residential_unit.str_apartment_number if user_residential_unit else "N/A"
                ))
                
            except Exception as user_error:
                logger.error(f"❌ Error procesando usuario {target_user.id}: {str(user_error)}")
                failed_users.append({
                    "user_id": target_user.id,
                    "username": target_user.str_username,
                    "error": str(user_error)
                })
        
        # Commit de todos los cambios de contraseñas
        await db.commit()
        
        total_generated = len(qr_tokens)
        total_failed = len(failed_users)
        
        logger.info(f"📊 Generación bulk simple: {total_generated} exitosos, {total_failed} fallidos")
        
        return SuccessResponse[BulkQRSimpleResponse](
            data=BulkQRSimpleResponse(
                qr_tokens=qr_tokens,
                total_generated=total_generated,
                total_failed=total_failed,
                failed_users=failed_users
            ),
            message=f"Tokens generados: {total_generated} exitosos, {total_failed} errores"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en generación bulk simple: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en generación masiva de tokens QR: {str(e)}"
        )
