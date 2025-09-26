from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from app.auth.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas.auth_token_schema import Token

from app.schemas.responses_schema import SuccessResponse, ErrorResponse
from app.schemas.user_schema import UserCreate
from app.schemas.data_user_schema import DataUserCreate, DataUserResponse
from app.services.user_service import UserService
from app.core.security import security_manager, rate_limiter
from app.core.database import get_db
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

# Simulación de usuarios
fake_users_db = {
    "santiago": {"username": "santiago", "password": "1234"},
    "admin": {"username": "admin", "password": "adminpass"},
}

# Endpoint de registro de nuevos usuarios
@router.post(
    "/register", 
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registro de nuevos usuarios",
    description="Registra un nuevo usuario en la base de datos"
    )
async def register_user(request: Request, user_data: dict, db: AsyncSession = Depends(get_db)):
    """
        Endpoint para registro de nuevos usuarios
        Args:
        request (Request): La solicitud HTTP
        user_data (dict): Los datos del usuario a registrar en formato raw
    """
    try: 
        # Crear instancia del servicio de usuarios
        user_service = UserService(db)

        # Rate limit
        client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
        if not rate_limiter.is_allowed(f"register:{client_ip}", max_requests=10, window_minutes=60):
            raise RateLimitException()

        # Verificar si el usuario ya existe
        exists_user = await user_service.get_user_by_username(user_data.get('str_email'))
        if exists_user:
            raise UserAlreadyExistsException(
                message="El usuario ya existe",
                error_code="USER_ALREADY_EXISTS"
            )

        # Crear objeto DataUserCreate con los datos restantes
        data_user_data = DataUserCreate(
            str_firstname=user_data.get('str_firstname'),
            str_lastname=user_data.get('str_lastname'),
            str_email=user_data.get('str_email'),
            str_phone=user_data.get('str_phone')
        )

        # Registrar datos del usuario
        data_user = await user_service.create_data_user(data_user_data)

        # Hashear la contraseña
        hashed_password = security_manager.create_password_hash(user_data.get('password'))

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
@router.post("/login", response_model=Token)
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

    # user_dict = fake_users_db.get(form_data.username)

    # Rate limit
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    if not rate_limiter.is_allowed(f"login:{client_ip}", max_requests=10, window_minutes=60):
        raise RateLimitException()

    # Verificar si el usuario existe
    exists_user = await user_service.get_user_by_username(form_data.username)
    print(exists_user)
    if not exists_user or not security_manager.verify_password(form_data.password, exists_user.str_password_hash):
        raise UserNotFoundException(
            message="El usuario no existe",
            error_code="USER_NOT_FOUND"
        )

    # Verificar si el usuario esta activo
    if not exists_user.bln_is_active:
        raise UserNotActiveException(
            message="El usuario no esta activo",
            error_code="USER_NOT_ACTIVE"
        )

    # if not user_dict or user_dict["password"] != form_data.password:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Credenciales incorrectas",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": exists_user.str_username},
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}


# Simulación usando el get_current_user dependencia para un endpoint protegido
@router.get("/perfil")
def perfil(usuario: str = Depends(get_current_user)):
    return {"mensaje": f"Hola {usuario}, perfil protegido."}
