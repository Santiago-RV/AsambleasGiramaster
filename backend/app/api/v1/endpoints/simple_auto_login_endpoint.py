from fastapi import APIRouter, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from datetime import timedelta

from app.core.database import get_db
from app.schemas.responses_schema import SuccessResponse
from app.services.simple_auto_login_service import simple_auto_login_service
from app.services.user_service import UserService
from app.services.meeting_service import MeetingService
from app.services.session_service import SessionService
from app.auth.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_token_jti
from app.core.security import security_manager
from app.core.logging_config import get_logger
from app.core.exceptions import ServiceException
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
        token_id = credentials.get("token_id")
        
        # Obtener usuario de la base de datos primero
        user_service = UserService(db)
        user = await user_service.get_user_by_username(username)
        
        if not user:
            logger.warning(f"Usuario no encontrado: {username}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Verificar si el token es válido para este usuario
        if token_id:
            token_valid = await simple_auto_login_service.is_token_valid_for_user(db, token_id, user.id)
            if not token_valid:
                logger.warning(f"Token inválido para el usuario {username}: {token_id}")
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail="Este enlace de acceso ya no es válido. Solicita uno nuevo."
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
        
        # Crear sesión en la base de datos
        token_jti = get_token_jti(access_token)
        if token_jti:
            try:
                session_service = SessionService(db)
                await session_service.create_session(
                    user_id=user.id,
                    token_jti=token_jti,
                    ip_address=client_ip,
                    device_info=request.headers.get("User-Agent", "Unknown")
                )
            except Exception as e:
                logger.warning(f"No se pudo crear la sesión: {str(e)}")
        
        logger.info(
            f"✅ Auto-login exitoso: user_id={user.id}, "
            f"username={user.str_username}, role={user.rol.str_name}"
        )
        
        # Actualizar el token del usuario (nuevo: upsert)
        if token_id:
            try:
                await simple_auto_login_service.upsert_user_token(
                    db, token_id, user.id, client_ip
                )
            except Exception as e:
                logger.warning(f"No se pudo actualizar el token: {str(e)}")
        
        # Registro automatico de asistencia para copropietarios (rol 3) e invitados (rol 4)
        # Si hay una reunion presencial "En Curso" en su unidad residencial y tienen invitacion
        attendance_registered = None
        if user.int_id_rol in (3, 4):
            try:
                meeting_service = MeetingService(db)
                attendance_registered = await meeting_service.auto_register_attendance_on_login(user.id)
                if attendance_registered and attendance_registered.get("registered"):
                    if attendance_registered.get("already_registered"):
                        logger.info(
                            f"Auto-attendance: Usuario {user.id} ya estaba registrado "
                            f"en reunion {attendance_registered.get('meeting_id')}"
                        )
                    else:
                        logger.info(
                            f"Auto-attendance: Asistencia registrada automaticamente "
                            f"para usuario {user.id} en reunion {attendance_registered.get('meeting_id')}"
                        )
            except Exception as e:
                # No interrumpir el auto-login si falla el registro de asistencia
                logger.warning(
                    f"Auto-attendance: Error al intentar registro automatico "
                    f"para usuario {user.id}: {str(e)}"
                )
                attendance_registered = None
        
        response_data = {
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
        
        # Incluir info de asistencia si se registro
        if attendance_registered and attendance_registered.get("registered"):
            response_data["attendance_registered"] = attendance_registered
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Autenticación exitosa",
            data=response_data
        )
        
    except HTTPException:
        raise
    except ServiceException as e:
        logger.error(
            f"❌ Error de servicio en auto-login: {e.message} | "
            f"Detalles: {e.details}"
        )
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"❌ Error inesperado en auto-login: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar el auto-login"
        )

