#!/usr/bin/env python3
"""
Borra toda la configuración Zoom de tbl_system_config para poder recargarla desde cero.

Motivo: las filas ZOOM_1_* / ZOOM_2_* quedaron desactivadas por un borrado de cuenta, y
_migrate_legacy_zoom_keys las estuvo sobrescribiendo con las credenciales legacy en cada carga
del panel. No hay forma de saber qué SDK Key quedó realmente guardado, así que se limpia todo y
el Super Admin vuelve a cargar las cuentas desde el panel ya corregido.

No toca las filas SMTP.

Uso:
    python test/limpiar_config_zoom.py           # solo muestra lo que haría
    python test/limpiar_config_zoom.py --apply   # borra
"""
import sys
import os
import asyncio
import logging

logging.disable(logging.CRITICAL)
for name in ("sqlalchemy.engine", "sqlalchemy", "sqlalchemy.engine.Engine"):
    logging.getLogger(name).setLevel(logging.CRITICAL)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, delete

from app.core.database import AsyncSessionLocal
from app.models.system_config_model import SystemConfigModel


async def main(apply: bool):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SystemConfigModel)
            .where(SystemConfigModel.str_config_key.like("ZOOM%"))
            .order_by(SystemConfigModel.str_config_key)
        )
        filas = list(result.scalars().all())

        print("=" * 70)
        print(f"Filas ZOOM* en tbl_system_config: {len(filas)}")
        print(f"Modo: {'APLICAR' if apply else 'SIMULACION (usar --apply para borrar)'}")
        print("=" * 70)

        if not filas:
            print("Nada que limpiar.")
            return

        for fila in filas:
            estado = "activa" if fila.bln_is_active else "INACTIVA"
            print(f"  {fila.str_config_key:<26} {estado:<9} "
                  f"{'cifrada' if fila.bln_is_encrypted else 'plana':<8} "
                  f"len={len(fila.str_config_value or '')}")

        if not apply:
            print("-" * 70)
            print("Vuelva a ejecutar con --apply para borrarlas.")
            return

        await db.execute(
            delete(SystemConfigModel).where(SystemConfigModel.str_config_key.like("ZOOM%"))
        )
        await db.commit()

        restantes = (await db.execute(
            select(SystemConfigModel).where(SystemConfigModel.str_config_key.like("ZOOM%"))
        )).scalars().all()

        print("-" * 70)
        print(f"Borradas: {len(filas)}   Restantes: {len(restantes)}")
        print("Cargue las cuentas Zoom de nuevo desde el panel de Super Admin.")


if __name__ == "__main__":
    asyncio.run(main(apply="--apply" in sys.argv))
