from sys import prefix
from fastapi import FastAPI, Request
from fastapi import HTTPException
from fastapi import HTTPException as HTTPError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import uvicorn
import time

from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import init_db, close_db, check_db_connection
from app.core.logging_config import get_logger

from app.core.exceptions_handlers import (
    base_api_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    general_exception_handler
)
from app.core.exceptions import BaseAPIException
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError

tags_metadata = [
  {
    "name": "auth",
    "description": "Operaciones relacionadas con la autenticación",
  },
  {
    "name": "users",
    "description": "Operaciones relacionadas con los usuarios",
  },
  {
    "name": "residential_units",
    "description": "Operaciones relacionadas con las unidades residenciales",
  },
  {
    "name": "meetings",
    "description": "Operaciones relacionadas con las reuniones",
  },
  {
    "name": "zoom_sessions",
    "description": "Operaciones relacionadas con las sesiones de Zoom",
  },
  {
    "name": "role_permissions",
    "description": "Operaciones relacionadas con los roles y permisos",
  },
  {
    "name": "data_users",
    "description": "Operaciones relacionadas con los datos de los usuarios",
  },
  {
    "name": "rols",
    "description": "Operaciones relacionadas con los roles",
  },
  {
    "name": "permissions",
    "description": "Operaciones relacionadas con los permisos",
  },
  {
    "name": "role_permissions",
    "description": "Operaciones relacionadas con los roles y permisos",
  },
  {
    "name": "user_residential_units",
    "description": "Operaciones relacionadas con las unidades residenciales de los usuarios",
  },
]

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
  """Vida útil de la aplicación"""
  try:
    logger.info("Inicializando la aplicación")
    logger.info("Verificando la conexión a la base de datos")
    await check_db_connection()
    logger.info("Base de datos conectada")

    logger.info("Inicializando la base de datos")
    await init_db()
    logger.info("Base de datos inicializada")

    yield
    logger.info("Cerrando la base de datos")
    await close_db()
    logger.info("Base de datos cerrada")
  except Exception as e:
    logger.error(f"Error al inicializar la aplicación: {e}")
    raise HTTPError(status_code=500, detail=f"Error al verificar la conexión a la base de datos: {e}")
  finally:
    logger.info("Finalizando la aplicación")
    try:
      await close_db()
      logger.info("Base de datos cerrada")
    except Exception as e:
      logger.error(f"Error al finalizar la aplicación: {e}")
      raise HTTPError(status_code=500, detail=f"Error al cerrar la base de datos: {e}")

app = FastAPI(
  title=settings.PROJECT_NAME,
  version=settings.VERSION,
  description="""
  ## Api para la aplicación de Giramaster
  """,
  lifespan=lifespan,
  openapi_tags=tags_metadata,
  docs_url="/docs",
  redoc_url="/redoc",
  swagger_ui_parameters={"defaultModelsExpandDepth": -1},
  redoc_url_options={"defaultModelsExpandDepth": -1},
)

# Registrar los manejadores de excepciones
app.add_exception_handler(BaseAPIException, base_api_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Configurar CORS dinámicamente según el ambiente
allowed_origins = list(settings.ALLOWED_HOSTS)

# En desarrollo, permitirlocalhost para facilidad de uso
if settings.ENVIRONMENT == "development":
    if not allowed_origins:
        allowed_origins = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]

# En producción, solo permitir orígenes configurados explícitamente
if settings.ENVIRONMENT == "production" and not allowed_origins:
    # Seguridad: si no hay orígenes configurados en producción, denegar todo
    allowed_origins = []

app.add_middleware(
  CORSMiddleware,
  allow_origins=allowed_origins,
  allow_credentials=True if len(allowed_origins) > 0 else False,
  allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"] if len(allowed_origins) > 0 else [],
  allow_headers=[
    "Authorization",
    "X-Requested-With", 
    "Content-Type",
    "DNT",
    "Accept",
    "X-CSRFToken",
    "keep-alive",
    "User-Agent",
    "Origin",
    "If-Modified-Since"
    ] if len(allowed_origins) > 0 else [],
  expose_headers=["Content-Type", "X-Total-Count"] if len(allowed_origins) > 0 else [],
  max_age=600 if len(allowed_origins) > 0 else 0,
)

# Agregar middleware de seguridad (orden importa)
app.add_middleware(RateLimitMiddleware)  # Primero rate limiting
app.add_middleware(SecurityHeadersMiddleware)  # Luego headers de seguridad

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
  """Raiz de la API"""
  logger.info("Acceso a la raiz de la API")
  return {
    "name": settings.PROJECT_NAME,
    "version": settings.VERSION,
    "status": "ok",
    "documentation": {
      "swagger": f"{settings.API_URL}/docs",
      "redoc": f"{settings.API_URL}/redoc",
    },
  }

if __name__ == "__main__":
  uvicorn.run(
    "app.main:app",
    host=settings.HOST,
    port=settings.PORT,
    reload=settings.ENVIRONMENT == "development",
    reload_dirs=["app"] if settings.ENVIRONMENT == "development" else None,
    log_level=settings.LOG_LEVEL.lower(),
    access_log=settings.ENVIRONMENT == "development"
  )