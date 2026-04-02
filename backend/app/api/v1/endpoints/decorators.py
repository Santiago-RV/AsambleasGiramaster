"""
Decoradores para endpoints de la API.
"""
from functools import wraps
from fastapi import HTTPException, status
from typing import Callable


async def check_email_enabled(db) -> bool:
    """
    Valida si el envío de correos está habilitado en la configuración SMTP.
    
    Args:
        db: Sesión de base de datos
        
    Returns:
        True si está habilitado, False si no existe o está deshabilitado
    """
    try:
        from app.services.system_config_service import SystemConfigService
        config_service = SystemConfigService(db)
        credentials = await config_service.get_smtp_credentials()
        
        if not credentials:
            return False
        
        email_enabled = credentials.get('EMAIL_ENABLED', 'false').lower() == 'true'
        return email_enabled
    except Exception:
        return False


def require_email_enabled(func: Callable):
    """
    Decorador que valida que el envío de emails esté habilitado 
    antes de ejecutar el endpoint.
    
    Uso:
        @require_email_enabled
        async def my_endpoint(db: AsyncSession = Depends(get_db), ...):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        db = kwargs.get('db')
        
        if not db:
            for arg in args:
                if hasattr(arg, 'execute'):
                    db = arg
                    break
        
        if not db:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo obtener conexión a base de datos"
            )
        
        is_enabled = await check_email_enabled(db)
        
        if not is_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El envío de correos está deshabilitado en la configuración SMTP"
            )
        
        return await func(*args, **kwargs)
    
    return wrapper