from datetime import datetime, timedelta
from typing import Any, Union, Optional
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

pwd_context = CryptContext(
    schemes=["argon2","bcrypt_sha256", "bcrypt"],
    deprecated=["bcrypt_sha256", "bcrypt"],
    argon2__memory_cost = 65536,
    argon2__time_cost = 3,
    argon2__parallelism = 4,
    argon2__hash_len=32
)

security = HTTPBearer()

class SecurityManager:
  """ Administra la autenticación y autorización del sistema """

  def __init__(self):
    self.secret_key = settings.SECRET_KEY
    self.algorithm = settings.ALGORITHM
    self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES

  def create_password_hash(self, password: str) -> str:
    """
    Genera el hash de la contraseña usando Argon2id (nuevo estándar)
        
    Args:
      password: Contraseña en texto plano
            
    Returns:
      Hash de la contraseña
            
    Raises:
      ValueError: Si la contraseña está vacía
    """
    if not password or not password.strip():
      raise ValueError("La contraseña no puede estar vacía")
        
    return pwd_context.hash(password)
  
  def verify_password(self, plain_password: str, hashed_password: str) -> bool:
    """
    Verifica la contraseña contra el hash
    Soporta tanto hashes viejos (bcrypt_sha256/bcrypt) como nuevos (argon2)
        
    Args:
      plain_password: Contraseña en texto plano
      hashed_password: Hash almacenado en la base de datos
            
    Returns:
      True si la contraseña es correcta, False en caso contrario
    """
    if not plain_password or not hashed_password:
      return False
        
    try:
      # Verifica con CUALQUIER algoritmo soportado
      return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
      print(f"Error al verificar contraseña: {str(e)}")
      return False
  
  def verify_and_update(self, plain_password: str, hashed_password: str) -> tuple[bool, str | None]:
    """
    Verifica la contraseña Y devuelve un nuevo hash si el algoritmo está deprecado
        
    ESTE ES EL MÉTODO CLAVE PARA LA MIGRACIÓN
        
    Args:
      plain_password: Contraseña en texto plano
      hashed_password: Hash almacenado actualmente
            
    Returns:
      Tupla de (es_válida, nuevo_hash_o_None)
      - Si es_válida es False: (False, None)
      - Si es_válida y NO necesita actualizar: (True, None)
      - Si es_válida y SÍ necesita actualizar: (True, nuevo_hash)
            
    Example:
      >>> is_valid, new_hash = security_manager.verify_and_update(password, old_hash)
      >>> if is_valid and new_hash:
      >>>     # Actualizar el hash en la base de datos
      >>>     user.hashed_password = new_hash
      >>>     db.commit()
    """
    if not plain_password or not hashed_password:
      return False, None
        
    try:
      # Verificar la contraseña
      is_valid = pwd_context.verify(plain_password, hashed_password)
            
      if not is_valid:
        return False, None
            
      # Si es válida, verificar si necesita actualización
      if pwd_context.needs_update(hashed_password):
        # Generar nuevo hash con Argon2
        new_hash = self.create_password_hash(plain_password)
        return True, new_hash
            
      return True, None
            
    except Exception as e:
      print(f"Error en verify_and_update: {str(e)}")
      return False, None
    
  def needs_update(self, hashed_password: str) -> bool:
    """
    Verifica si el hash está usando un algoritmo deprecado
        
    Args:
      hashed_password: Hash almacenado
            
    Returns:
      True si usa bcrypt o bcrypt_sha256 (deprecados)
    """
    return pwd_context.needs_update(hashed_password)
    
  def identify_hash(self, hashed_password: str) -> str:
    """
    Identifica qué algoritmo se usó para el hash
        
    Args:
      hashed_password: Hash almacenado
            
    Returns:
      'argon2', 'bcrypt', 'bcrypt_sha256', o None
    """
    try:
      return pwd_context.identify(hashed_password)
    except Exception:
      return None
  
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
