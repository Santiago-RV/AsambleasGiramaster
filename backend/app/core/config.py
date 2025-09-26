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
    return f"mysql+asyncmy://{self.USER_DB}:{self.PASSWORD_DB}@{self.HOST_DB}:{self.PORT_DB}/{self.NAME_DB}"

  # Seguridad
  SECRET_KEY: str = "SECRET-KEY-GIRAMASTER"
  ALGORITHM: str = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
  REFRESH_TOKEN_EXPIRE_MINUTES: int = 60
  
  # CORS
  ALLOWED_HOSTS: List[str] = ["localhost"]

  # Redis (para caché y sesiones)
  REDIS_HOST: str = "localhost"
  REDIS_PORT: int = 6379
  REDIS_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}"
  REDIS_CACHE_TTL: int = 60 * 60 * 1
  REDIS_SESSION_TTL: int = 60 * 60 * 24 * 7

  # Logging
  LOG_LEVEL: str = "INFO"
  LOG_FILE: str = "app.log"

  class Config:
    env_file = ".env"
    case_sensitive = True

settings = Settings()