from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.declarative import declarative_base
from typing import AsyncGenerator

from app.core.config import settings
from app.core.logging_config import get_logger

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
    poolclass=NullPool if settings.ENVIRONMENT == "development" else None,
    pool_recycle=300,
    hide_parameters=True if settings.ENVIRONMENT != "development" else False,
)

AsyncSessionLocal = async_sessionmaker(
  bind=engine, 
  class_=AsyncSession, 
  expire_on_commit=False,
  autocommit=False,
  autoflush=False,
)

Base = declarative_base()

# Logger
logger = get_logger(__name__)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
  """Dependencia para obtener la session a la base de datos"""
  async with AsyncSessionLocal() as session:
    try:
      yield session
    except Exception as e:
      logger.error(f"Error al obtener la session a la base de datos: {e}")
      await session.rollback()
      raise
    finally:
      await session.close()

async def init_db():
  """Inicializa la base de datos"""
  try:
    async with engine.begin() as conn:
      await conn.run_sync(Base.metadata.create_all)
      logger.info("Base de datos inicializada")
  except Exception as e:
    logger.error(f"Error al inicializar la base de datos: {e}")
    raise

async def close_db():
  """Cierra la base de datos"""
  try:
    await engine.dispose()
    logger.info("Base de datos cerrada")
  except Exception as e:
    logger.error(f"Error al cerrar la base de datos: {e}")
    raise

async def check_db_connection():
  """Verifica la conexión a la base de datos"""
  try:
    async with engine.connect() as conn:
      await conn.execute(text("SELECT 1"))
      logger.info("Conexión a la base de datos establecida correctamente")
    return True
  except Exception as e:
    logger.error(f"Error al verificar la conexión a la base de datos: {e}")
    raise