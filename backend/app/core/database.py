from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.declarative import declarative_base
from typing import AsyncGenerator

from app.core.config import settings
from app.core.logging_config import get_logger

# Define Base first to avoid circular imports
Base = declarative_base()

# Import all models to ensure they are registered with SQLAlchemy
# This must be after Base is defined
from app.models import *

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

# Alias for compatibility
async_session_maker = AsyncSessionLocal

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
      await seed_db()
      logger.info("Base de datos semillada")
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

async def seed_db():
  """Semilla de la base de datos"""
  try:
    async with AsyncSessionLocal() as session:
      from app.models.rol_model import RolModel
      from app.models.data_user_model import DataUserModel
      from app.models.user_model import UserModel
      from app.core.security import security_manager

      # Semilla de roles
      verify_rol = await session.execute(select(RolModel).where(RolModel.id.in_([1, 2, 3, 4])))
      existing_roles = {rol.id for rol in verify_rol.scalars().all()}

      roles_to_create = []

      roles = {
        1: {
            "nombre": "Super Administrador",
            "descripcion": "Acceso completo al sistema",
            "permisos": ["crear", "leer", "actualizar", "eliminar"],
            "nivel": 5
        },
        2: {
            "nombre": "Administrador",
            "descripcion": "Puede crear y modificar contenido",
            "permisos": ["crear", "leer", "actualizar"],
            "nivel": 3
        },
        3: {
            "nombre": "Usuario",
            "descripcion": "Solo puede ver contenido",
            "permisos": ["leer"],
            "nivel": 1
        },
        4: {
            "nombre": "Invitado",
            "descripcion": "Puede moderar contenido",
            "permisos": ["leer"],
            "nivel": 1
        }
      }

      for i in range(1, len(roles.keys()) + 1):
        if i not in existing_roles:
          roles_to_create.append(RolModel(id=i, str_name=roles[i]["nombre"], str_description=roles[i]["descripcion"], bln_is_active=True))

      if roles_to_create:
        session.add_all(roles_to_create)
        await session.commit()
        logger.info("Roles semillados correctamente")
      else:
        logger.info("Roles ya existentes")

      # Semilla de usuario administrador por defecto
      verify_user = await session.execute(select(UserModel).where(UserModel.str_username == "admin"))
      existing_user = verify_user.scalar_one_or_none()

      if not existing_user:
        # Crear datos del usuario
        data_user = DataUserModel(
          str_firstname="Administrador",
          str_lastname="Sistema",
          str_email="admin@sistema.com",
          str_phone=None
        )
        session.add(data_user)
        await session.flush()  # Para obtener el ID generado

        # Crear usuario con contraseña hasheada
        password_hash = security_manager.create_password_hash("Super@dmin.12345")
        user = UserModel(
          int_data_user_id=data_user.id,
          str_username="admin",
          str_password_hash=password_hash,
          int_id_rol=1,  # Super Administrador
          bln_is_external_delegate=False,
          bln_user_temporary=False,
          bln_allow_entry=True
        )
        session.add(user)
        await session.commit()
        logger.info("Usuario administrador creado correctamente")
      else:
        logger.info("Usuario administrador ya existe")

  except Exception as e:
    logger.error(f"Error al semillar la base de datos: {e}")
    raise