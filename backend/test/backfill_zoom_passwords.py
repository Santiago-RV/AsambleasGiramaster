#!/usr/bin/env python3
"""
Backfill de str_zoom_password en reuniones ya creadas.

Hasta ahora MeetingService.create_meeting descartaba el campo `password` que devuelve
la API de Zoom, por lo que tbl_meetings.str_zoom_password quedaba NULL y el Meeting SDK
Web terminaba recibiendo el token `pwd=` cifrado de la join_url, que no es el passcode.

Este script consulta GET /meetings/{id} en Zoom con las credenciales OAuth de la cuenta
que creó cada reunión y guarda el passcode real.

Uso:
    python test/backfill_zoom_passwords.py           # solo muestra lo que haría
    python test/backfill_zoom_passwords.py --apply   # escribe en la base de datos
"""
import sys
import os
import asyncio
import logging

logging.disable(logging.CRITICAL)
for name in ("sqlalchemy.engine", "sqlalchemy", "sqlalchemy.engine.Engine"):
    logging.getLogger(name).setLevel(logging.CRITICAL)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.models.meeting_model import MeetingModel
from app.services.system_config_service import SystemConfigService
from app.services.zoom_api_service import ZoomAPIService

ESTADOS = ("Programada", "En Curso")


async def _oauth_credentials(config_service: SystemConfigService, account_id):
    """Credenciales OAuth de una cuenta concreta; sin fallback a otra cuenta."""
    required = ("ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET")

    if account_id:
        creds = await config_service.get_zoom_account_credentials(account_id)
        return creds if all(creds.get(k) for k in required) else None

    for account in [a for a in await config_service.get_zoom_accounts() if a.get("is_configured")]:
        creds = await config_service.get_zoom_account_credentials(account["id"])
        if all(creds.get(k) for k in required):
            return creds

    legacy = await config_service.get_zoom_credentials()
    return legacy if all(legacy.get(k) for k in required) else None


async def main(apply: bool):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(MeetingModel).where(
                and_(
                    MeetingModel.int_zoom_meeting_id != None,  # noqa: E711
                    MeetingModel.str_zoom_password == None,    # noqa: E711
                    MeetingModel.str_status.in_(ESTADOS),
                )
            ).order_by(MeetingModel.id)
        )
        meetings = list(result.scalars().all())

        print("=" * 70)
        print(f"Reuniones sin str_zoom_password (estados {ESTADOS}): {len(meetings)}")
        print(f"Modo: {'APLICAR' if apply else 'SIMULACION (usar --apply para escribir)'}")
        print("=" * 70)

        if not meetings:
            return

        config_service = SystemConfigService(db)
        cache = {}
        actualizadas = 0
        fallidas = 0

        for meeting in meetings:
            account_id = meeting.int_zoom_account_id
            if account_id not in cache:
                cache[account_id] = await _oauth_credentials(config_service, account_id)
            credentials = cache[account_id]

            if not credentials:
                print(f"  [{meeting.id}] {meeting.str_title}: SIN credenciales OAuth "
                      f"para la cuenta {account_id}")
                fallidas += 1
                continue

            try:
                zoom_api = ZoomAPIService(credentials=credentials)
                info = await zoom_api.get_meeting(str(meeting.int_zoom_meeting_id))
                password = (info.get("password") or "").strip()
            except Exception as e:
                print(f"  [{meeting.id}] {meeting.str_title}: ERROR consultando Zoom -> {e}")
                fallidas += 1
                continue

            if not password:
                print(f"  [{meeting.id}] {meeting.str_title}: la reunión no tiene passcode en Zoom")
                continue

            print(f"  [{meeting.id}] {meeting.str_title} (cuenta {account_id}) "
                  f"-> passcode de {len(password)} caracteres")

            if apply:
                meeting.str_zoom_password = password
            actualizadas += 1

        if apply and actualizadas:
            await db.commit()

        print("-" * 70)
        print(f"Actualizadas: {actualizadas}   Fallidas: {fallidas}")
        if not apply and actualizadas:
            print("Vuelva a ejecutar con --apply para guardar los cambios.")


if __name__ == "__main__":
    asyncio.run(main(apply="--apply" in sys.argv))
