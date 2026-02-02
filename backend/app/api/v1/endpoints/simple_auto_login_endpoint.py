from fastapi import APIRouter, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from datetime import timedelta

from app.core.database import get_db
from app.schemas.responses_schema import SuccessResponse
from app.services.simple_auto_login_service import simple_auto_login_service
from app.services.user_service import UserService
from app.auth.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import security_manager
from app.core.logging_config import get_logger
from sqlalchemy import select
from app.models.data_user_model import DataUserModel

logger = get_logger(__name__)
router = APIRouter()


@router.get(
    "/auto-login/{token}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Auto-login simple con JWT",
    description="Autentica automáticamente usando un JWT con credenciales temporales"
)
async def auto_login_simple(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint de auto-login usando JWT temporal
    
    Flujo:
    1. Decodifica el JWT y extrae username y password
    2. Valida las credenciales contra la BD
    3. Genera JWT de acceso regular
    4. Retorna token y datos del usuario
    
    Args:
        token: JWT con credenciales temporales
        request: Request object para logging
        db: Sesión de base de datos
        
    Returns:
        SuccessResponse con access_token y datos del usuario
    """
    try:
        # Obtener IP del cliente
        client_ip = request.headers.get(
            "X-Forwarded-For", 
            request.client.host
        ).split(",")[0].strip()
        
        logger.info(f"🔐 Intento de auto-login desde IP: {client_ip}")
        
        # Decodificar JWT y extraer credenciales
        credentials = simple_auto_login_service.decode_auto_login_token(token)
        
        if not credentials:
            logger.warning("Token inválido o expirado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El enlace de acceso es inválido o ha expirado. Solicita uno nuevo."
            )
        
        username = credentials["username"]
        password = credentials["password"]
        
        # Verificar credenciales con la base de datos
        user_service = UserService(db)
        user = await user_service.get_user_by_username(username)
        
        if not user:
            logger.warning(f"Usuario no encontrado: {username}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Verificar contraseña
        if not security_manager.verify_password(password, user.str_password_hash):
            logger.warning(f"Contraseña incorrecta para: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        # Verificar que el usuario tiene acceso permitido
        if not user.bln_allow_entry:
            logger.warning(f"Usuario sin permiso de acceso: {username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene permiso para acceder al sistema"
            )
        
        # Obtener datos del usuario (DataUser)
        data_user_query = select(DataUserModel).where(
            DataUserModel.id == user.int_data_user_id
        )
        data_user_result = await db.execute(data_user_query)
        data_user = data_user_result.scalar_one_or_none()
        
        # Construir nombre completo y email
        full_name = None
        email = None
        
        if data_user:
            full_name = f"{data_user.str_firstname} {data_user.str_lastname}".strip()
            email = data_user.str_email
        
        # Generar JWT de acceso regular
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.str_username},
            expires_delta=access_token_expires
        )
        
        logger.info(
            f"✅ Auto-login exitoso: user_id={user.id}, "
            f"username={user.str_username}, role={user.rol.str_name}"
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Autenticación exitosa",
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "username": user.str_username,
                    "role": user.rol.str_name,
                    "name": full_name,
                    "email": email
                },
                "auto_login": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error inesperado en auto-login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar el auto-login"
        )

