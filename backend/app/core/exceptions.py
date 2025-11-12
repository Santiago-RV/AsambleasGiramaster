from typing import Optional, Dict, Any
from datetime import datetime

class BaseAPIException(Exception):
    """Excepción base para todas las excepciones de la API"""
    
    def __init__(
        self, 
        status_code: int, 
        message: str, 
        error_code: str,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.timestamp = timestamp or datetime.now()
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte la excepción a un diccionario para la respuesta"""
        return {
            "success": False,
            "status_code": self.status_code,
            "message": self.message,
            "error_code": self.error_code,
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }

# Excepciones específicas para autenticación
class AuthenticationException(BaseAPIException):
    """Excepción para errores de autenticación"""
    
    def __init__(
        self, 
        message: str = "No estás autorizado para acceder a este recurso",
        error_code: str = "AUTH_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(401, message, error_code, details)

class TokenExpiredException(BaseAPIException):
    """Excepción para tokens expirados"""
    
    def __init__(
        self, 
        message: str = "Tu sesión ha expirado. Por favor, inicia sesión nuevamente",
        error_code: str = "TOKEN_EXPIRED",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(401, message, error_code, details)

class InvalidCredentialsException(BaseAPIException):
    """Excepción para credenciales inválidas"""
    
    def __init__(
        self, 
        message: str = "Las credenciales proporcionadas son incorrectas",
        error_code: str = "INVALID_CREDENTIALS",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(401, message, error_code, details)

# Excepciones específicas para usuarios
class UserNotFoundException(BaseAPIException):
    """Excepción para usuario no encontrado"""
    
    def __init__(
        self, 
        message: str = "El usuario no fue encontrado",
        error_code: str = "USER_NOT_FOUND",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(404, message, error_code, details)

class UserAlreadyExistsException(BaseAPIException):
    """Excepción para usuario ya existente"""
    
    def __init__(
        self, 
        message: str = "El usuario ya existe en el sistema",
        error_code: str = "USER_ALREADY_EXISTS",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(409, message, error_code, details)

class UserValidationException(BaseAPIException):
    """Excepción para errores de validación de usuario"""
    
    def __init__(
        self, 
        message: str = "Los datos del usuario no son válidos",
        error_code: str = "USER_VALIDATION_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(400, message, error_code, details)

class UserNotActiveException(BaseAPIException):
    """Excepción para usuario no activo"""
    
    def __init__(
        self, 
        message: str = "El usuario no esta activo",
        error_code: str = "USER_NOT_ACTIVE",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(400, message, error_code, details)

# Excepciones específicas para servicios
class ServiceException(BaseAPIException):
    """Excepción para errores del servicio"""
    
    def __init__(
        self, 
        message: str = "Error en el servicio",
        error_code: str = "SERVICE_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(500, message, error_code, details)

class DatabaseException(BaseAPIException):
    """Excepción para errores de base de datos"""
    
    def __init__(
        self, 
        message: str = "Error en la base de datos",
        error_code: str = "DATABASE_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(500, message, error_code, details)

# Excepciones específicas para límites
class RateLimitException(BaseAPIException):
    """Excepción para límite de solicitudes"""
    
    def __init__(
        self, 
        message: str = "Has excedido el límite de solicitudes. Intenta más tarde",
        error_code: str = "RATE_LIMIT_EXCEEDED",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(429, message, error_code, details)

# Excepciones específicas para validación
class ValidationException(BaseAPIException):
    """Excepción para errores de validación"""
    
    def __init__(
        self, 
        message: str = "Los datos proporcionados no son válidos",
        error_code: str = "VALIDATION_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(400, message, error_code, details)

# Excepciones específicas para recursos
class ResourceNotFoundException(BaseAPIException):
    """Excepción para recurso no encontrado"""
    
    def __init__(
        self, 
        message: str = "El recurso solicitado no fue encontrado",
        error_code: str = "RESOURCE_NOT_FOUND",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(404, message, error_code, details)

class ResourceAlreadyExistsException(BaseAPIException):
    """Excepción para recurso ya existente"""
    
    def __init__(
        self, 
        message: str = "El recurso ya existe",
        error_code: str = "RESOURCE_ALREADY_EXISTS",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(409, message, error_code, details)

# Excepciones específicas para permisos
class PermissionDeniedException(BaseAPIException):
    """Excepción para permisos denegados"""
    
    def __init__(
        self, 
        message: str = "No tienes permisos para realizar esta acción",
        error_code: str = "PERMISSION_DENIED",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(403, message, error_code, details)

# Excepciones específicas para configuración
class ConfigurationException(BaseAPIException):
    """Excepción para errores de configuración"""
    
    def __init__(
        self, 
        message: str = "Error en la configuración del sistema",
        error_code: str = "CONFIGURATION_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(500, message, error_code, details)

# ==================== NUEVAS EXCEPCIONES ====================

# Excepciones específicas para recursos no encontrados (genérica)
class NotFoundException(BaseAPIException):
    """Excepción para recurso no encontrado"""
    
    def __init__(
        self, 
        message: str = "El recurso solicitado no fue encontrado",
        error_code: str = "NOT_FOUND",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(404, message, error_code, details)

# Excepciones específicas para lógica de negocio
class BusinessLogicException(BaseAPIException):
    """Excepción para errores de lógica de negocio"""
    
    def __init__(
        self, 
        message: str = "Error en la lógica de negocio",
        error_code: str = "BUSINESS_LOGIC_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(400, message, error_code, details)

# Excepciones específicas para conflictos
class ConflictException(BaseAPIException):
    """Excepción para conflictos (recursos duplicados, estado inválido, etc)"""
    
    def __init__(
        self, 
        message: str = "Existe un conflicto con el estado actual del recurso",
        error_code: str = "CONFLICT",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(409, message, error_code, details)