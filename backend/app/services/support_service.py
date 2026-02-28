# backend/app/services/support_service.py
"""
Servicio para gestión del contacto de soporte técnico por unidad residencial.

Estrategia de almacenamiento (sin nuevas tablas):
  ┌─────────────────────────────────────────────────────────────────┐
  │  tbl_data_users   →  nombre, correo, teléfono del soporte       │
  │  tbl_users        →  usuario vinculado (bln_allow_entry = False) │
  │  tbl_user_residential_units                                     │
  │    str_apartment_number = 'SOPORTE'  ← identificador especial   │
  │    bool_is_admin        = False                                  │
  │    dec_default_voting_weight = 0                                 │
  └─────────────────────────────────────────────────────────────────┘

El mismo patrón que ya usa 'ADMIN' en el sistema.
El usuario de soporte tiene bln_allow_entry = False → no accede a la plataforma.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import logging

from app.models.user_model import UserModel
from app.models.data_user_model import DataUserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.core.security import security_manager
from app.core.exceptions import ServiceException, ResourceNotFoundException

logger = logging.getLogger(__name__)

SUPPORT_IDENTIFIER = "SOPORTE"


class SupportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────────────────
    # Privado: buscar registro SOPORTE existente para una unidad
    # ─────────────────────────────────────────────────────────────────────────

    async def _get_support_unit_record(self, unit_id: int) -> Optional[UserResidentialUnitModel]:
        """Retorna el UserResidentialUnitModel con str_apartment_number='SOPORTE' o None."""
        result = await self.db.execute(
            select(UserResidentialUnitModel)
            .options(selectinload(UserResidentialUnitModel.user))
            .where(
                UserResidentialUnitModel.int_residential_unit_id == unit_id,
                UserResidentialUnitModel.str_apartment_number == SUPPORT_IDENTIFIER
            )
        )
        return result.scalar_one_or_none()

    # ─────────────────────────────────────────────────────────────────────────
    # GET: obtener datos de soporte de una unidad
    # ─────────────────────────────────────────────────────────────────────────

    async def get_support_info(self, unit_id: int) -> Optional[dict]:
        """
        Busca el registro SOPORTE de la unidad y retorna sus datos.
        Retorna None si no existe ningún contacto configurado.
        """
        try:
            unit_record = await self._get_support_unit_record(unit_id)

            if not unit_record:
                return None

            # Cargar datos personales del usuario de soporte
            data_user_result = await self.db.execute(
                select(DataUserModel).where(
                    DataUserModel.id == unit_record.user.int_data_user_id
                )
            )
            data_user = data_user_result.scalar_one_or_none()

            if not data_user:
                return None

            return {
                "user_id": unit_record.int_user_id,
                "unit_id": unit_id,
                "str_support_name": f"{data_user.str_firstname} {data_user.str_lastname}".strip(),
                "str_support_email": data_user.str_email,
                "str_support_phone": data_user.str_phone,
                "updated_at": unit_record.updated_at.isoformat() if unit_record.updated_at else None
            }

        except Exception as e:
            logger.error(f"Error al obtener soporte técnico para unidad {unit_id}: {str(e)}")
            raise ServiceException(
                message=f"Error al obtener soporte técnico: {str(e)}",
                details={"original_error": str(e)}
            )

    # ─────────────────────────────────────────────────────────────────────────
    # UPSERT: crear o actualizar el contacto de soporte
    # ─────────────────────────────────────────────────────────────────────────

    async def upsert_support_info(
        self,
        unit_id: int,
        name: str,
        email: str,
        phone: Optional[str] = None
    ) -> dict:
        """
        Crea el contacto de soporte si no existe, o actualiza sus datos si ya existe.

        Flujo CREAR:
          1. Crear registro en tbl_data_users (nombre, email, teléfono)
          2. Crear registro en tbl_users       (sin acceso: bln_allow_entry=False)
          3. Crear registro en tbl_user_residential_units (str_apartment_number='SOPORTE')

        Flujo ACTUALIZAR:
          1. Localizar el registro SOPORTE de la unidad
          2. Actualizar tbl_data_users con los nuevos datos
        """
        try:
            # Separar nombre en firstname / lastname
            name_parts = name.strip().split(" ", 1)
            firstname = name_parts[0]
            lastname = name_parts[1] if len(name_parts) > 1 else ""

            # ── ¿Ya existe un registro SOPORTE para esta unidad? ─────────────
            existing_unit_record = await self._get_support_unit_record(unit_id)

            if existing_unit_record:
                # ── ACTUALIZAR ────────────────────────────────────────────────
                logger.info(f"Actualizando soporte técnico para unidad {unit_id}")

                data_user_result = await self.db.execute(
                    select(DataUserModel).where(
                        DataUserModel.id == existing_unit_record.user.int_data_user_id
                    )
                )
                data_user = data_user_result.scalar_one_or_none()

                if not data_user:
                    raise ServiceException(
                        message="Registro de datos del soporte no encontrado",
                        details={"unit_id": unit_id}
                    )

                # Actualizar campos
                data_user.str_firstname = firstname
                data_user.str_lastname = lastname
                data_user.str_email = email
                data_user.str_phone = phone
                data_user.updated_at = datetime.now()

                existing_unit_record.updated_at = datetime.now()

                await self.db.commit()
                await self.db.refresh(data_user)

                logger.info(f"✅ Soporte técnico actualizado para unidad {unit_id}")

                return {
                    "user_id": existing_unit_record.int_user_id,
                    "unit_id": unit_id,
                    "str_support_name": f"{firstname} {lastname}".strip(),
                    "str_support_email": email,
                    "str_support_phone": phone,
                    "action": "updated"
                }

            else:
                # ── CREAR ─────────────────────────────────────────────────────
                logger.info(f"Creando soporte técnico para unidad {unit_id}")

                # 1. tbl_data_users
                data_user = DataUserModel(
                    str_firstname=firstname,
                    str_lastname=lastname,
                    str_email=email,
                    str_phone=phone,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.db.add(data_user)
                await self.db.flush()  # Obtener ID sin commit

                # 2. tbl_users (sin acceso a la plataforma)
                #    Generamos una contraseña aleatoria irrelevante ya que nunca podrá iniciar sesión
                dummy_password = security_manager.create_password_hash(
                    f"SoporteNoAccede_{unit_id}_{datetime.now().timestamp()}"
                )
                support_user = UserModel(
                    int_data_user_id=data_user.id,
                    str_username=f"soporte_unidad_{unit_id}",
                    str_password_hash=dummy_password,
                    int_id_rol=3,               # Rol copropietario (el mínimo disponible)
                    bln_allow_entry=False,       # ← SIN ACCESO a la plataforma
                    bln_is_external_delegate=False,
                    bln_user_temporary=False,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.db.add(support_user)
                await self.db.flush()

                # 3. tbl_user_residential_units
                unit_record = UserResidentialUnitModel(
                    int_user_id=support_user.id,
                    int_residential_unit_id=unit_id,
                    str_apartment_number=SUPPORT_IDENTIFIER,  # ← 'SOPORTE'
                    bool_is_admin=False,
                    dec_default_voting_weight=0,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.db.add(unit_record)

                await self.db.commit()
                await self.db.refresh(support_user)

                logger.info(
                    f"✅ Soporte técnico creado para unidad {unit_id} "
                    f"(user_id: {support_user.id})"
                )

                return {
                    "user_id": support_user.id,
                    "unit_id": unit_id,
                    "str_support_name": f"{firstname} {lastname}".strip(),
                    "str_support_email": email,
                    "str_support_phone": phone,
                    "action": "created"
                }

        except ServiceException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error en upsert de soporte técnico: {str(e)}")
            raise ServiceException(
                message=f"Error al guardar soporte técnico: {str(e)}",
                details={"original_error": str(e)}
            )

    # ─────────────────────────────────────────────────────────────────────────
    # DELETE: eliminar el contacto de soporte
    # ─────────────────────────────────────────────────────────────────────────

    async def delete_support_info(self, unit_id: int) -> None:
        """
        Elimina el registro SOPORTE de una unidad residencial.
        Elimina en orden: tbl_user_residential_units → tbl_users → tbl_data_users
        """
        try:
            unit_record = await self._get_support_unit_record(unit_id)

            if not unit_record:
                raise ResourceNotFoundException(
                    message=f"No existe contacto de soporte para la unidad {unit_id}",
                    resource_type="SupportContact"
                )

            support_user = unit_record.user
            data_user_id = support_user.int_data_user_id

            # 1. Eliminar relación unidad-usuario
            await self.db.delete(unit_record)
            await self.db.flush()

            # 2. Eliminar usuario
            await self.db.delete(support_user)
            await self.db.flush()

            # 3. Eliminar datos personales
            data_user_result = await self.db.execute(
                select(DataUserModel).where(DataUserModel.id == data_user_id)
            )
            data_user = data_user_result.scalar_one_or_none()
            if data_user:
                await self.db.delete(data_user)

            await self.db.commit()
            logger.info(f"✅ Soporte técnico eliminado para unidad {unit_id}")

        except ResourceNotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al eliminar soporte técnico: {str(e)}")
            raise ServiceException(
                message=f"Error al eliminar soporte técnico: {str(e)}",
                details={"original_error": str(e)}
            )