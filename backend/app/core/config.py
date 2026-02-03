from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
  # COnfiguracion Basica
  PROJECT_NAME: str = "GIRAMASTER"
  VERSION: str = "1.0.0"
  ENVIRONMENT: str = "development"
  HOST: str = "0.0.0.0"
  PORT: int = 8000

  # Base de Datos
  HOST_DB: str = "localhost"
  PORT_DB: int = 3306
  USER_DB: str = "root"
  PASSWORD_DB: str = ""
  NAME_DB: str = "db_giramaster"

  @property
  def DATABASE_URL(self) -> str:
    # Driver asíncrono requerido por SQLAlchemy AsyncEngine
    return f"mysql+aiomysql://{self.USER_DB}:{self.PASSWORD_DB}@{self.HOST_DB}:{self.PORT_DB}/{self.NAME_DB}"

  # Seguridad
  SECRET_KEY: str = "ffgkpMfbwwWA&n!smJt=Q)-2%fQq2yLI-jFtQd&JR84IeO$itqSU!CCxrqR_s*Fz"
  REFRESH_SECRET_KEY: str = "T7C0jU!!My$3E5hz%-=&#fwWrs*w#PF%)EN%&c5VUjc-i@*W"
  ALGORITHM: str = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
  REFRESH_TOKEN_EXPIRE_MINUTES: int = 60
  
  # CORS
  ALLOWED_HOSTS_DEV: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]
  ALLOWED_HOSTS_PROD: List[str] = []  # Configurar dominios específicos en producción
  
  @property
  def ALLOWED_HOSTS(self) -> List[str]:
      if self.ENVIRONMENT == "development":
          return self.ALLOWED_HOSTS_DEV
      else:
          return self.ALLOWED_HOSTS_PROD

  # Redis (para caché y sesiones)
  REDIS_HOST: str = "localhost"
  REDIS_PORT: int = 6379
  @property
  def REDIS_URL(self) -> str:
    return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"
  REDIS_CACHE_TTL: int = 60 * 60 * 1
  REDIS_SESSION_TTL: int = 60 * 60 * 24 * 7

  # API
  @property
  def API_URL(self) -> str:
    return f"http://{self.HOST}:{self.PORT}"

  # Logging
  LOG_LEVEL: str = "INFO"
  LOG_FILE: str = "app.log"

  # Zoom SDK Configuration (para Meeting SDK - frontend)
  ZOOM_SDK_KEY: str = ""
  ZOOM_SDK_SECRET: str = ""
  
  # Zoom OAuth Server-to-Server (para API REST - crear reuniones)
  ZOOM_ACCOUNT_ID: str = ""
  ZOOM_CLIENT_ID: str = ""
  ZOOM_CLIENT_SECRET: str = ""

  # Configuración de Email (Gmail)
  SMTP_HOST: str = "smtp.gmail.com"
  SMTP_PORT: int = 587
  SMTP_USER: str = ""  # Email de Gmail
  SMTP_PASSWORD: str = ""  # Contraseña de aplicación de Gmail
  SMTP_FROM_EMAIL: str = ""  # Email del remitente
  SMTP_FROM_NAME: str = "GIRAMASTER - Sistema de Asambleas"
  EMAIL_ENABLED: bool = True  # Activar/desactivar envío de emails
  
  # Generar Qrs
  FRONTEND_URL: str

  class Config:
    env_file = ".env"
    case_sensitive = True

settings = Settings()