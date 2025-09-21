# routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from pydantic import BaseModel
from auth.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from schemas.auth_token_schema import Token

router = APIRouter()

# Simulación de usuarios
fake_users_db = {
    "santiago": {"username": "santiago", "password": "1234"},
    "admin": {"username": "admin", "password": "adminpass"},
}

# Endpoint de login
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
        Endpoint para login y obtención de token
        Args:
        form_data (OAuth2PasswordRequestForm, optional): _description_. Defaults to Depends().
        Returns:
            _type_: _description_
            
    """
    user_dict = fake_users_db.get(form_data.username)

    if not user_dict or user_dict["password"] != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"]},
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}


# Simulación usando el get_current_user dependencia para un endpoint protegido
@router.get("/perfil")
def perfil(usuario: str = Depends(get_current_user)):
    return {"mensaje": f"Hola {usuario}, perfil protegido."}
