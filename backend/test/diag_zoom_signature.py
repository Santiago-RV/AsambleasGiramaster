#!/usr/bin/env python3
"""
Diagnóstico de firma SDK para una reunión específica.
Determina a qué cuenta Zoom pertenece la reunión, qué credenciales SDK están
configuradas, genera la firma y verifica que sea matemáticamente válida.
"""
import sys
import os
import asyncio
import logging
import jwt

logging.disable(logging.CRITICAL)
for name in ("sqlalchemy.engine", "sqlalchemy", "sqlalchemy.engine.Engine"):
    logging.getLogger(name).setLevel(logging.CRITICAL)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.meeting_model import MeetingModel
from app.services.system_config_service import SystemConfigService
from app.services.zoom_service import ZoomService

ZOOM_MEETING_ID = 86351880690  # VIRTUAL 1


async def main():
    async with AsyncSessionLocal() as db:
        # 1. Buscar la reunión
        result = await db.execute(
            select(MeetingModel).where(MeetingModel.int_zoom_meeting_id == ZOOM_MEETING_ID)
        )
        meeting = result.scalars().first()
        if not meeting:
            print(f"❌ No se encontró reunión con int_zoom_meeting_id={ZOOM_MEETING_ID}")
            return

        print("=" * 70)
        print(f"Reunión: {meeting.str_title} (id={meeting.id})")
        print(f"  int_zoom_meeting_id : {meeting.int_zoom_meeting_id}")
        print(f"  int_zoom_account_id : {meeting.int_zoom_account_id}")
        print(f"  str_zoom_join_url   : {meeting.str_zoom_join_url}")
        print("=" * 70)

        config_service = SystemConfigService(db)

        # 2. Listar cuentas y si tienen SDK creds
        accounts = await config_service.get_zoom_accounts()
        print(f"\nCuentas Zoom configuradas: {len(accounts)}")
        for acc in accounts:
            creds = await config_service.get_zoom_account_credentials(acc["id"])
            has_key = bool(creds.get("ZOOM_SDK_KEY"))
            has_secret = bool(creds.get("ZOOM_SDK_SECRET"))
            key_preview = (creds.get("ZOOM_SDK_KEY") or "")[:12]
            print(f"  [{acc['id']}] {acc.get('name')}: SDK_KEY={'OK' if has_key else 'FALTA'}"
                  f" ({key_preview}...) SDK_SECRET={'OK' if has_secret else 'FALTA'}")

        # 3. Credenciales legacy
        legacy = await config_service.get_zoom_credentials()
        print(f"\nLegacy SDK_KEY: {'OK' if legacy.get('ZOOM_SDK_KEY') else 'FALTA'}"
              f"  SDK_SECRET: {'OK' if legacy.get('ZOOM_SDK_SECRET') else 'FALTA'}")

        # 4. Simular lo que hace el endpoint /generate-signature con la cuenta de la reunión
        acc_id = meeting.int_zoom_account_id
        print("\n" + "-" * 70)
        print(f"Generando firma como lo haría el endpoint (zoom_account_id={acc_id})...")

        zoom_credentials = None
        if acc_id:
            creds = await config_service.get_zoom_account_credentials(acc_id)
            if creds.get("ZOOM_SDK_KEY") and creds.get("ZOOM_SDK_SECRET"):
                zoom_credentials = {
                    "ZOOM_SDK_KEY": creds["ZOOM_SDK_KEY"],
                    "ZOOM_SDK_SECRET": creds["ZOOM_SDK_SECRET"],
                }
                print(f"  -> Usando credenciales SDK de la cuenta {acc_id}")
            else:
                print(f"  -> ⚠️ La cuenta {acc_id} NO tiene SDK_KEY/SDK_SECRET completos; el endpoint hará FALLBACK")

        if zoom_credentials:
            zoom_service = ZoomService(credentials=zoom_credentials)
        else:
            zoom_service = ZoomService(db)

        clean = zoom_service.validate_meeting_number(str(ZOOM_MEETING_ID))
        signature = await zoom_service.generate_signature(meeting_number=clean, role=0, expire_hours=2)
        used_key = zoom_service.sdk_key

        decoded = jwt.decode(signature, options={"verify_signature": False})
        print(f"\n  appKey en el JWT : {decoded.get('appKey')}")
        print(f"  sdk_key devuelto : {used_key}")
        print(f"  ¿coinciden?      : {decoded.get('appKey') == used_key}")
        print(f"  mn               : {decoded.get('mn')}")
        print(f"  role             : {decoded.get('role')}")

        # 5. Verificar firma matemática
        try:
            jwt.decode(signature, zoom_service.sdk_secret, algorithms=["HS256"])
            print("\n  [OK] Firma matematicamente valida (key/secret coherentes entre si)")
            print("  Si Zoom igual la rechaza (3712): la app Meeting SDK esta")
            print("  desactivada/eliminada en Marketplace, o el par key/secret no")
            print("  corresponde a una app Meeting SDK de la MISMA cuenta duena de la reunion.")
        except Exception as e:
            print(f"\n  [ERROR] Firma invalida internamente: {e}")


if __name__ == "__main__":
    asyncio.run(main())
