from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import BaseAPIException
from app.schemas.responses_schema import ErrorResponse
import logging

logger = logging.getLogger(__name__)

async def base_api_exception_handler(request: Request, exc: BaseAPIException):
    """Manejador para excepciones personalizadas de la API"""
    logger.error(f"API Exception: {exc.error_code} - {exc.message}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict()
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Manejador para excepciones HTTP de FastAPI"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            message=exc.detail,
            error_code=f"HTTP_{exc.status_code}",
            meta={"status_code": exc.status_code}
        ).dict()
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Manejador para errores de validación de Pydantic"""
    logger.error(f"Validation Error: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            success=False,
            message="Los datos proporcionados no son válidos",
            error_code="VALIDATION_ERROR",
            errors=str(exc.errors()),
            meta={"validation_errors": exc.errors()}
        ).dict()
    )

async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Manejador para errores de integridad de la base de datos"""
    logger.error(f"Database Integrity Error: {exc.orig}")
    
    # Determinar el tipo de error específico
    error_message = "Error en la base de datos"
    error_code = "DATABASE_INTEGRITY_ERROR"
    
    if "duplicate entry" in str(exc.orig).lower():
        error_message = "El recurso ya existe en el sistema"
        error_code = "DUPLICATE_ENTRY"
    elif "foreign key constraint" in str(exc.orig).lower():
        error_message = "No se puede eliminar el recurso porque está siendo utilizado"
        error_code = "FOREIGN_KEY_CONSTRAINT"
    
    return JSONResponse(
        status_code=409,
        content=ErrorResponse(
            success=False,
            message=error_message,
            error_code=error_code,
            meta={"database_error": str(exc.orig)}
        ).dict()
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Manejador para excepciones generales no manejadas"""
    logger.error(f"Unhandled Exception: {type(exc).__name__} - {str(exc)}")
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            success=False,
            message="Error interno del servidor",
            error_code="INTERNAL_SERVER_ERROR",
            meta={"exception_type": type(exc).__name__}
        ).dict()
    )