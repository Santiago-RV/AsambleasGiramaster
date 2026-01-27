from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict

from app.core.database import get_db
from app.auth.auth import get_current_user_obj
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.schemas.responses_schema import SuccessResponse
from app.services.simple_auto_login_service import simple_auto_login_service
from app.core.config import settings
from app.core.security import security_manager
import secrets
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class SimpleQRRequest(BaseModel):
    userId: int

class SimpleQRResponse(BaseModel):
    auto_login_token: str
    auto_login_url: str
    expires_in_hours: int

@router.post(
    "/generate-qr-simple",
    summary="Genera token QR simple y directo",
    description="Genera un JWT temporal sin dependencia de email"
)
async def generate_qr_simple(
    request: SimpleQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un token QR simple sin enviar email.
    
    Args:
        request: Contiene el userId del residente
        current_user: Usuario autenticado que realiza la solicitud
        db: Sesión de base de datos
    
    Returns:
        Token JWT de auto-login y URL
    
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
        
        # Obtener información básica del usuario target
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
        
        # GENERAR UNA CONTRASEÑA TEMPORAL para el QR
        # Esta contraseña será válida para el auto-login
        temp_password = secrets.token_urlsafe(12)  # Genera contraseña segura de 12 caracteres
        
        # Actualizar el hash de la contraseña en la BD con la temporal
        target_user.str_password_hash = security_manager.create_password_hash(temp_password)
        
        # Guardar la contraseña temporal (opcional, para debugging)
        # target_user.str_temp_password = temp_password
        
        # Commit a la base de datos
        await db.commit()
        await db.refresh(target_user)
        
        logger.info(f"🔐 Contraseña temporal generada para usuario {target_user.str_username}")
        
        # Generar token de auto-login con la contraseña temporal
        auto_login_token = simple_auto_login_service.generate_auto_login_token(
            username=target_user.str_username,
            password=temp_password,  # Usar la contraseña temporal en texto plano
            expiration_hours=48
        )
        
        # Construir URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://asambleas.giramaster.com')
        auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
        
        # Logger de éxito
        logger.info(f"✅ QR generado para residente: {target_data_user.str_firstname} {target_data_user.str_lastname} (Username: {target_user.str_username})")
        logger.info(f"✅ Generado por admin: {current_user.str_username}")
        logger.info(f"✅ Token válido por 48 horas")
        
        return SuccessResponse[SimpleQRResponse](
            data=SimpleQRResponse(
                auto_login_token=auto_login_token,
                auto_login_url=auto_login_url,
                expires_in_hours=48
            ),
            message="Código QR generado exitosamente"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al generar QR simple: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar código QR: {str(e)}"
        )