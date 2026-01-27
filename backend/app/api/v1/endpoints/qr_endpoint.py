from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.auth.auth import get_current_user_obj, get_current_user
from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.schemas.responses_schema import SuccessResponse
from app.services.simple_auto_login_service import simple_auto_login_service
from app.services.email_service import email_service

router = APIRouter()

class GenerateQRRequest(BaseModel):
    userId: int

class GenerateQRResponse(BaseModel):
    auto_login_token: str
    expires_in_hours: int

@router.post(
    "/generate-auto-login",
    summary="Genera un token de auto-login para QR code",
    description="Genera un JWT temporal para acceso directo mediante QR code"
)
async def generate_auto_login_token(
    request: GenerateQRRequest,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un token de auto-login para un usuario específico.
    
    Args:
        request: Contiene el userId del residente
        current_user: Usuario autenticado que realiza la solicitud
        db: Sesión de base de datos
    
    Returns:
        Token JWT de auto-login y tiempo de expiración
    
    Raises:
        HTTPException: Si el usuario no existe o no hay permisos
    """
    try:
        # Obtener información del usuario target con sus datos relacionados
        result = await db.execute(
            select(UserModel, DataUserModel, UserResidentialUnitModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
            .where(UserModel.id == request.userId)
        )
        user_data = result.first()
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        target_user, target_data_user, residential_unit = user_data
        
        # Verificar permisos (solo admins y super admins pueden generar QR)
        if current_user.int_id_rol not in [1, 2]:  # 1=Super Admin, 2=Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para generar códigos QR"
            )
        
        # ============================================
        # Usar la misma lógica que ya existe en el sistema
        # ============================================
        email_sent = await email_service.send_coproprietor_credentials_email(
            to_email=target_data_user.str_email,
            firstname=target_data_user.str_firstname,
            lastname=target_data_user.str_lastname,
            username=target_user.str_username,
            password=None,  # Dejar que la función genere la contraseña
            residential_unit_name=residential_unit.str_name,
            apartment_number=residential_unit.str_apartment_number,
            voting_weight=float(residential_unit.dec_default_voting_weight or 0.0),
            phone=target_data_user.str_phone,
            auto_login_token=None  # Dejar que la función genere el JWT
        )
        
        # Si el correo se envió exitosamente, el QR endpoint ya no es necesario
        # El usuario recibirá el QR por email con el auto-login ya incluido
        if email_sent:
            # Obtener el token de auto-login que fue generado en la función de email
            # Para esto necesito obtener el usuario actualizado con la nueva contraseña
            updated_result = await db.execute(
                select(UserModel).where(UserModel.id == request.userId)
            )
            updated_user = updated_result.scalar_one_or_none()
            
            # Generar el token para usarlo en el frontend
            auto_login_token = simple_auto_login_service.generate_auto_login_token(
                username=updated_user.str_username,
                password=None,  # La contraseña ya está actualizada
                expiration_hours=48
            )
            
            return SuccessResponse[GenerateQRResponse](
                data=GenerateQRResponse(
                    auto_login_token=auto_login_token,
                    expires_in_hours=48
                ),
                message="Código QR enviado exitosamente por correo"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo enviar el correo electrónico con el código QR"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar token de auto-login: {str(e)}"
        )

class SendQRRequest(BaseModel):
    userId: int
    recipient_email: Optional[EmailStr] = None

class SendQRResponse(BaseModel):
    sent_to: str
    auto_login_url: str

@router.post(
    "/send-qr-email",
    summary="Envía código QR por correo electrónico",
    description="Genera y envía un código QR de acceso directo por email"
)
async def send_qr_email(
    request: SendQRRequest,
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un QR code y lo envía por correo electrónico.
    
    Args:
        request: Contiene el userId y opcionalmente el email del destinatario
        background_tasks: Tareas en segundo plano para envío de email
        current_user: Usuario autenticado que realiza la solicitud
        db: Sesión de base de datos
    
    Returns:
        Confirmación del envío y URL generada
    
    Raises:
        HTTPException: Si el usuario no existe o no hay permisos
    """
    try:
        # Obtener información del usuario target con sus datos relacionados
        result = await db.execute(
            select(UserModel, DataUserModel, UserResidentialUnitModel)
            .join(DataUserModel, UserModel.int_data_user_id == DataUserModel.id)
            .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
            .where(UserModel.id == request.userId)
        )
        user_data = result.first()
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        target_user, target_data_user, residential_unit = user_data
        
        # Verificar permisos (solo admins y super admins pueden enviar QR)
        if current_user.int_id_rol not in [1, 2]:  # 1=Super Admin, 2=Admin
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para enviar códigos QR"
            )
        
        # Determinar email de destino
        recipient_email = request.recipient_email or target_data_user.str_email
        
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario no tiene correo electrónico registrado"
            )
        
        # Usar la lógica existente para generar QR por email
        email_sent = await email_service.send_coproprietor_credentials_email(
            to_email=recipient_email,
            firstname=target_data_user.str_firstname,
            lastname=target_data_user.str_lastname,
            username=target_user.str_username,
            password=None,  # Dejar que la función genere la contraseña
            residential_unit_name=residential_unit.str_name,
            apartment_number=residential_unit.str_apartment_number,
            voting_weight=float(residential_unit.dec_default_voting_weight or 0.0),
            phone=target_data_user.str_phone,
            auto_login_token=None  # Dejar que la función genere el JWT
        )
        
        if email_sent:
            # Obtener token para incluir en la respuesta
            updated_result = await db.execute(
                select(UserModel).where(UserModel.id == request.userId)
            )
            updated_user = updated_result.scalar_one_or_none()
            
            auto_login_token = simple_auto_login_service.generate_auto_login_token(
                username=updated_user.str_username,
                password=None,
                expiration_hours=48
            )
            
            # Construir URL de auto-login (asumiendo que tenemos el frontend URL)
            frontend_url = "https://asambleas.giramaster.com"
            auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
            
            return SuccessResponse[SendQRResponse](
                data=SendQRResponse(
                    sent_to=recipient_email,
                    auto_login_url=auto_login_url
                ),
                message=f"Código QR enviado exitosamente a {recipient_email}"
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
            detail=f"Error al enviar código QR: {str(e)}"
        )