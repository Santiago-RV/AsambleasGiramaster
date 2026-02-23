from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import timedelta
from app.auth.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES, get_token_jti
from app.schemas.auth_token_schema import Token

from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.schemas.user_schema import UserCreate
from app.schemas.data_user_schema import DataUserCreate, DataUserResponse, DataUserRegister
from app.services.user_service import UserService
from app.services.session_service import SessionService
from app.core.security import security_manager, rate_limiter
from app.core.database import get_db
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.models.data_user_model import DataUserModel
from app.core.logging_config import get_logger
from app.core.exceptions import (
    UserAlreadyExistsException,
    UserValidationException,
    ServiceException,
    RateLimitException,
    InvalidCredentialsException,
    UserNotFoundException,
    UserNotActiveException
)

router = APIRouter()

logger = get_logger(__name__)

# Endpoint de registro de nuevos usuarios
@router.post(
    "/register", 
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registro de nuevos usuarios",
    description="Registra un nuevo usuario en la base de datos"
    )
async def register_user(request: Request, user_data: DataUserRegister, db: AsyncSession = Depends(get_db)):
    """
        Endpoint para registro de nuevos usuarios
        Args:
        request (Request): La solicitud HTTP
        user_data (DataUserRegister): Los datos del usuario a registrar
    """
    try: 
        # Crear instancia del servicio de usuarios
        user_service = UserService(db)

        # Rate limit
        client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
        if not rate_limiter.is_allowed(f"register:{client_ip}", max_requests=10, window_minutes=60):
            raise RateLimitException()

        # Verificar si el usuario ya existe
        exists_user = await user_service.get_user_by_username(user_data.str_email)
        if exists_user:
            raise UserAlreadyExistsException(
                message="El usuario ya existe",
                error_code="USER_ALREADY_EXISTS"
            )

        # Crear objeto DataUserCreate sin la contraseña
        data_user_data = DataUserCreate(
            str_firstname=user_data.str_firstname,
            str_lastname=user_data.str_lastname,
            str_email=user_data.str_email,
            str_phone=user_data.str_phone
        )

        # Registrar datos del usuario
        data_user = await user_service.create_data_user(data_user_data)

        # Hashear la contraseña
        hashed_password = security_manager.create_password_hash(user_data.password)

        user = UserCreate(
            str_username=data_user.str_email.lower().strip(),
            str_password_hash=hashed_password,
            int_data_user_id=data_user.id,
            int_id_rol=1
        )

        # Crear el usuario
        user_created = await user_service.create_user(user)

        return SuccessResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Usuario creado correctamente",
            data=user_created
        )
    except UserAlreadyExistsException as e:
        raise e
    except UserValidationException as e:
        raise e
    except ServiceException as e:
        raise e
    except Exception as e:
        raise ServiceException(
            message=f"Error inesperado al registrar el usuario: {str(e)}",
            details={"original_error": str(e)}
        )


# Endpoint de login
@router.post(
    "/login", 
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Login de usuarios",
    description="Login de usuarios"
)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """
        Endpoint para login y obtención de token
        Args:
        request (Request): La solicitud HTTP
        form_data (OAuth2PasswordRequestForm, optional): _description_. Defaults to Depends().
        db (AsyncSession, optional): La sesión de la base de datos. Defaults to Depends(get_db).
        Returns:
            Token: El token de acceso
    """
    user_service = UserService(db)

    # Rate limit
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    if not rate_limiter.is_allowed(f"login:{client_ip}", max_requests=10, window_minutes=60):
        raise RateLimitException()

    # Verificar si el usuario existe
    exists_user = await user_service.get_user_by_username(form_data.username)
    
    if not exists_user or not security_manager.verify_password(form_data.password, exists_user.str_password_hash):
        raise UserNotFoundException(
            message="El usuario no existe",
            error_code="USER_NOT_FOUND"
        )

    is_valid, new_hash = security_manager.verify_and_update(
        form_data.password,
        exists_user.str_password_hash
    )

    if not is_valid:
        raise UserNotFoundException(
            message="El usuario no existe",
            error_code="USER_NOT_FOUND"
        )

    # Verificar si el usuario tiene permitido el acceso
    if not exists_user.bln_allow_entry:
        raise UserNotActiveException(
            message="El usuario no tiene permiso para acceder",
            error_code="USER_NOT_ALLOW_ENTRY"
        )

    # Obtener los datos del usuario (DataUser) asociados
    data_user_query = select(DataUserModel).where(DataUserModel.id == exists_user.int_data_user_id)
    data_user_result = await db.execute(data_user_query)
    data_user = data_user_result.scalar_one_or_none()

    # Construir el nombre completo
    full_name = None
    email = None
    
    if data_user:
        full_name = f"{data_user.str_firstname} {data_user.str_lastname}".strip()
        email = data_user.str_email
    
    if not data_user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # 3. Si hay nuevo hash, actualizar en la base de datos
    if new_hash:
        exists_user.str_password_hash = new_hash
        await db.commit()
        await db.refresh(exists_user)
        logger.info(f"Hash de usuario migrado a Argon2", extra={"username": exists_user.str_username})

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": exists_user.str_username},
        expires_delta=access_token_expires,
    )
    
    # Crear sesión en la base de datos
    token_jti = get_token_jti(access_token)
    if token_jti:
        try:
            session_service = SessionService(db)
            await session_service.create_session(
                user_id=exists_user.id,
                token_jti=token_jti,
                ip_address=client_ip,
                device_info=request.headers.get("User-Agent", "Unknown")
            )
        except Exception as e:
            logger.warning(f"No se pudo crear la sesión: {str(e)}")
    
    # Verificar si hay reunión activa donde el usuario está invitado
    active_meeting_info = None
    try:
        from app.models.meeting_model import MeetingModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        
        logger.info(f"Buscando reunión activa para usuario {exists_user.id}, rol {exists_user.int_id_rol}")
        
        # Buscar reunión "En Curso" donde el usuario está invitado
        # Cualquier usuario con invitación a una reunión activa recibirá el modal
        meeting_query = (
            select(MeetingModel, MeetingInvitationModel)
            .join(
                MeetingInvitationModel,
                and_(
                    MeetingInvitationModel.int_meeting_id == MeetingModel.id,
                    MeetingInvitationModel.int_user_id == exists_user.id
                )
            )
            .where(MeetingModel.str_status == "En Curso")
        )
        meeting_result = await db.execute(meeting_query)
        meeting_data = meeting_result.first()
        
        logger.info(f"Datos de reunión encontrados: {meeting_data}")
        
        if meeting_data:
            meeting, invitation = meeting_data
            is_connected = (invitation.bln_actually_attended == True) and (invitation.dat_left_at is None)
            
            logger.info(f"Estado de conexión - attended: {invitation.bln_actually_attended}, left_at: {invitation.dat_left_at}, is_connected: {is_connected}")
            
            active_meeting_info = {
                "id": meeting.id,
                "title": meeting.str_title,
                "description": meeting.str_description,
                "meeting_type": meeting.str_meeting_type,
                "already_participated": invitation.bln_actually_attended or False,
                "is_connected": is_connected,
                "joined_at": invitation.dat_joined_at.isoformat() if invitation.dat_joined_at else None,
                "left_at": invitation.dat_left_at.isoformat() if invitation.dat_left_at else None,
            }
    except Exception as e:
        logger.warning(f"Error al verificar reunión activa: {str(e)}")
    
    response_data = {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "id": exists_user.id,
            "username": exists_user.str_username,
            "role": exists_user.rol.str_name,
            "name": full_name,
            "email": email
        }
    }
    
    if active_meeting_info:
        response_data["active_meeting"] = active_meeting_info
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message="Login exitoso",
        data=response_data
    )


@router.post("/register-participation")
async def register_participation(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Registrar participación del usuario en una reunión activa"""
    from app.models.meeting_invitation_model import MeetingInvitationModel
    from app.models.user_model import UserModel
    
    # Obtener el usuario actual
    user_query = select(UserModel).where(UserModel.str_username == current_user)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Buscar la invitación del usuario a la reunión
    invitation_query = select(MeetingInvitationModel).where(
        and_(
            MeetingInvitationModel.int_meeting_id == meeting_id,
            MeetingInvitationModel.int_user_id == user.id
        )
    )
    invitation_result = await db.execute(invitation_query)
    invitation = invitation_result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="No tiene invitación a esta reunión")
    
    from datetime import datetime
    
    # Verificar si ya participó (reconexión)
    is_reconnection = invitation.bln_actually_attended and invitation.dat_joined_at is not None
    
    # Actualizar la invitación
    invitation.bln_actually_attended = True
    invitation.dat_joined_at = datetime.now()
    invitation.dat_left_at = None  # Limpiar hora de salida si era una reconexión
    
    await db.commit()
    await db.refresh(invitation)
    
    message = "Participación registrada correctamente" if not is_reconnection else "Reconexión registrada correctamente"
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message=message,
        data={
            "meeting_id": meeting_id,
            "user_id": user.id,
            "is_reconnection": is_reconnection,
            "joined_at": invitation.dat_joined_at.isoformat()
        }
    )


# Simulación usando el get_current_user dependencia para un endpoint protegido
@router.get("/perfil")
def perfil(usuario: str = Depends(get_current_user)):
    return {"mensaje": f"Hola {usuario}, perfil protegido."}
