import logging
import logging.handlers
import os
import sys
from pathlib import Path
from typing import Optional

from app.core.config import settings


def setup_logging() -> None:
    """
    Configura el sistema de logging basado en el entorno.
    - Desarrollo: Logs en terminal con formato detallado
    - Producción: Logs en archivo con rotación
    """
    
    # Crear directorio de logs si no existe
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configurar el logger raíz
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Limpiar handlers existentes
    root_logger.handlers.clear()
    
    if settings.ENVIRONMENT == "development":
        setup_development_logging(root_logger)
    else:
        setup_production_logging(root_logger)


def setup_development_logging(logger: logging.Logger) -> None:
    """Configura logging para desarrollo con salida a terminal"""
    
    # Handler para terminal con formato detallado
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    # Formato detallado para desarrollo
    formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(funcName)s() | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    # Log de inicio
    logger.info("🔧 Modo DESARROLLO - Logging configurado para terminal")


def setup_production_logging(logger: logging.Logger) -> None:
    """Configura logging para producción con archivos rotativos"""
    
    log_file_path = Path("logs") / settings.LOG_FILE
    
    # Handler para archivo con rotación (10MB por archivo, máximo 5 archivos)
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_file_path,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Formato compacto para producción
    formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    
    # También agregar handler para errores críticos en archivo separado
    error_log_path = Path("logs") / "error.log"
    error_handler = logging.handlers.RotatingFileHandler(
        filename=error_log_path,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    
    logger.addHandler(error_handler)
    
    # Log de inicio
    logger.info("🚀 Modo PRODUCCIÓN - Logging configurado para archivos")


def get_logger(name: str) -> logging.Logger:
    """
    Obtiene un logger configurado para un módulo específico.
    
    Args:
        name: Nombre del módulo (ej: 'app.api.users')
    
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)


# Configurar logging al importar el módulo
setup_logging()
