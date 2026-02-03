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
  """ Gestiona el límite de solicitudes con seguridad mejorada """

  def __init__(self):
    self.request_counts = {}

  def is_allowed(
    self,
    key: str,
    max_requests: int = 50,
    window_minutes: int = 60,
  ) -> tuple[bool, dict]:
    """ 
    Verifica si la solicitud está permitida
    
    Returns:
      tuple: (permitido, info_adicional)
      info_adicional contiene: remaining_requests, reset_time
    """

    current_time = datetime.now()
    window_start = current_time - timedelta(minutes=window_minutes)

    # Sanitizar key para evitar inyección
    if not key or not isinstance(key, str):
      key = f"unknown_{current_time.timestamp()}"

    # Limitar longitud del key para prevenir DOS
    key = key[:100] if len(key) > 100 else key

    # Limpiar registros antiguos
    if key in self.request_counts:
      self.request_counts[key] = [
        req for req in self.request_counts[key]
        if req > window_start
      ]
    else:
      self.request_counts[key] = []

    # Contar solicitudes actuales
    current_requests = len(self.request_counts[key])
    
    # Verificar límite
    if current_requests >= max_requests:
      reset_time = window_start + timedelta(minutes=window_minutes)
      return False, {
        "remaining_requests": 0,
        "reset_time": reset_time.isoformat(),
        "limit": max_requests,
        "window": window_minutes
      }
    
    # Registrar nueva solicitud
    self.request_counts[key].append(current_time)
    
    return True, {
      "remaining_requests": max_requests - current_requests - 1,
      "reset_time": (window_start + timedelta(minutes=window_minutes)).isoformat(),
      "limit": max_requests,
      "window": window_minutes
    }

  def get_limits_for_endpoint(self, endpoint_path: str) -> dict:
    """ Retorna límites específicos por endpoint """
    
    # Configuración de límites por endpoint
    endpoint_limits = {
      "/api/v1/auth/login": {"max_requests": 5, "window_minutes": 15},  # Login: 5 intentos en 15 min
      "/api/v1/auth/register": {"max_requests": 3, "window_minutes": 60},  # Registro: 3 en 1 hora
      "/api/v1/residents/generate-auto-login": {"max_requests": 10, "window_minutes": 60},  # QR generation
      "/api/v1/residents/send-qr-email": {"max_requests": 10, "window_minutes": 60},  # Email QR
      "/api/v1/residents/generate-qr-bulk-simple": {"max_requests": 50, "window_minutes": 60},  # Bulk QR tokens
      "/api/v1/delegations/": {"max_requests": 100, "window_minutes": 60},
    }
    
    # Buscar límite específico para el endpoint
    for pattern, limits in endpoint_limits.items():
      if pattern in endpoint_path or endpoint_path in pattern:
        return limits
    
    # Límites por defecto según método HTTP
    if "POST" in endpoint_path or "PUT" in endpoint_path or "DELETE" in endpoint_path:
      return {"max_requests": 30, "window_minutes": 60}  # Operaciones de escritura más restrictivas
    else:
      return {"max_requests": 100, "window_minutes": 60}  # Operaciones de lectura más permisivas

rate_limiter = RateLimiter()
