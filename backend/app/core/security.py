from datetime import datetime, timedelta
from typing import Any, Union, Optional
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

pwd_context = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto"
)

security = HTTPBearer()

class SecurityManager:
  """ Administra la autenticación y autorización del sistema """

  def __init__(self):
    self.secret_key = settings.SECRET_KEY
    self.algorithm = settings.ALGORITHM
    self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES

  def create_password_hash(self, password: str) -> str:
    """ Genera el hash de la contraseña """
    return pwd_context.hash(password)
  
  def verify_password(self, plain_password: str, hashed_password: str) -> bool:
    """ Verifica la contraseña """
    return pwd_context.verify(plain_password, hashed_password)
  
security_manager = SecurityManager()

class RateLimiter:
  """ Gestiona el límite de solicitudes """

  def __init__(self):
    self.request_counts = {}

  def is_allowed(
    self,
    key: str,
    max_requests: int = 50,
    window_minutes: int = 60,
  ) -> bool:
    """ Verifica si la solicitud está permitida """

    current_time = datetime.now()
    window_start = current_time - timedelta(minutes=window_minutes)

    # Limpiar registros antiguos
    if key in self.request_counts:
      self.request_counts[key] = [
        req for req in self.request_counts[key]
        if req > window_start
      ]
    else:
      self.request_counts[key] = []

    # Verificar límite
    if len(self.request_counts[key]) >= max_requests:
      return False
    
    # Registrar nueva solicitud
    self.request_counts[key].append(current_time)
    return True

rate_limiter = RateLimiter()
