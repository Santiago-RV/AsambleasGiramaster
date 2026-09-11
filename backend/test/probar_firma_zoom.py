#!/usr/bin/env python3
"""
Prueba cuál par de credenciales acepta Zoom para el Meeting SDK.

Zoom rechaza la firma con el error 3712 sin decir por qué. Como el par SDK Key/Secret no se puede
validar contra ninguna API (solo se verifica al unirse a una reunión real), este script arma dos
páginas que intentan el ingreso a la MISMA reunión, cada una firmada con un par distinto:

  A  sdk_key / sdk_secret        tal como están guardados en la cuenta
  B  client_id / client_secret   usados como credenciales del Meeting SDK, que es como funciona
                                 el modelo actual de Zoom: una app "General" con Meeting SDK
                                 activado firma con el mismo Client ID y Client Secret

Se abren las dos en el navegador y la que una es la buena.

Uso:
    python test/probar_firma_zoom.py            # usa la última reunión virtual vigente
    python test/probar_firma_zoom.py 55         # usa la reunión con ese id de la base
    python test/probar_firma_zoom.py 55 --port 8099
"""
import sys
import os
import asyncio
import html
import http.server
import logging
import shutil
import socketserver
import threading

logging.disable(logging.CRITICAL)
for name in ("sqlalchemy.engine", "sqlalchemy", "sqlalchemy.engine.Engine"):
    logging.getLogger(name).setLevel(logging.CRITICAL)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.meeting_model import MeetingModel
from app.services.system_config_service import SystemConfigService
from app.services.zoom_service import ZoomService

PLANTILLA = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>{titulo}</title>
<script src="vendor/react.min.js"></script>
<script src="vendor/react-dom.min.js"></script>
<script src="vendor/redux.min.js"></script>
<script src="vendor/redux-thunk.min.js"></script>
<script src="vendor/lodash.min.js"></script>
<script src="zoom-meeting.min.js"></script>
</head><body>
<div id="estado" style="font:14px/1.6 monospace;padding:24px;white-space:pre-wrap">{titulo}
appKey: {app_key}
reunion: {meeting_number}
</div>
<script>
const out = document.getElementById('estado');
const log = (m) => {{
  out.textContent += "\\n" + m;
  console.log(m);
  try {{ navigator.sendBeacon("/log", {etiqueta_js} + " " + m); }} catch (e) {{}}
}};
window.addEventListener("error", (e) => log("ERROR DE PAGINA " + e.message));
if (typeof ZoomMtg === "undefined") {{
  log("NO CARGO EL SDK: revise que zoom-meeting.min.js se sirva junto a esta página");
  throw new Error("ZoomMtg no disponible");
}}
ZoomMtg.preLoadWasm();
ZoomMtg.prepareWebSDK();
ZoomMtg.init({{
  leaveUrl: window.location.href,
  patchJsMedia: true,
  disablePreview: true,{web_endpoint}
  success: () => {{
    log("init OK, uniendo...");
    ZoomMtg.join({{
      signature: "{firma}",
      sdkKey: "{app_key}",
      meetingNumber: "{meeting_number}",
      passWord: "{password}",
      userName: "Prueba {etiqueta}",
      userEmail: "",
      tk: "",
      success: (r) => log("*** UNIDO CORRECTAMENTE *** " + JSON.stringify(r)),
      error: (e) => log("FALLO AL UNIRSE: " + JSON.stringify(e)),
    }});
  }},
  error: (e) => log("FALLO AL INICIALIZAR: " + JSON.stringify(e)),
}});
</script></body></html>
"""


async def preparar(meeting_id, destino):
    async with AsyncSessionLocal() as db:
        if meeting_id:
            consulta = select(MeetingModel).where(MeetingModel.id == meeting_id)
        else:
            consulta = (
                select(MeetingModel)
                .where(
                    MeetingModel.str_modality == "virtual",
                    MeetingModel.int_zoom_meeting_id != None,  # noqa: E711
                    MeetingModel.str_status.in_(("Programada", "En Curso")),
                )
                .order_by(MeetingModel.id.desc())
            )

        meeting = (await db.execute(consulta)).scalars().first()
        if not meeting:
            print("No se encontró ninguna reunión virtual vigente. Cree una y vuelva a intentar.")
            return None

        credenciales = await SystemConfigService(db).get_zoom_account_credentials(
            meeting.int_zoom_account_id or 1
        )

        # El clúster de la cuenta sale de la propia join_url (ej. us06web.zoom.us). Por defecto el
        # SDK habla con zoom.us; si la cuenta está en otro clúster puede hacer falta indicarlo.
        cluster = ""
        if meeting.str_zoom_join_url:
            from urllib.parse import urlparse
            cluster = urlparse(meeting.str_zoom_join_url).hostname or ""

        pares = [
            ("A", "SDK Key / SDK Secret",
             credenciales.get("ZOOM_SDK_KEY"), credenciales.get("ZOOM_SDK_SECRET"), ""),
            ("B", "Client ID / Client Secret",
             credenciales.get("ZOOM_CLIENT_ID"), credenciales.get("ZOOM_CLIENT_SECRET"), ""),
            ("C", f"SDK Key / SDK Secret + webEndpoint {cluster}",
             credenciales.get("ZOOM_SDK_KEY"), credenciales.get("ZOOM_SDK_SECRET"),
             f'\n  webEndpoint: "{cluster}",' if cluster else ""),
            # La guía de troubleshooting de Zoom pide "exp value is greater than tokenExp",
            # mientras que su propio sample oficial los deja iguales. Esta variante prueba la
            # lectura estricta de esa regla.
            ("D", "SDK Key / SDK Secret con tokenExp < exp",
             credenciales.get("ZOOM_SDK_KEY"), credenciales.get("ZOOM_SDK_SECRET"), ""),
        ]

        numero = str(meeting.int_zoom_meeting_id)
        password = meeting.str_zoom_password or ""

        print("=" * 70)
        print(f"Reunión {meeting.id}: {meeting.str_title}")
        print(f"  número Zoom : {numero}")
        print(f"  cuenta Zoom : {meeting.int_zoom_account_id}")
        print(f"  passcode    : {password or '<sin passcode guardado>'}")
        print("=" * 70)

        generadas = []
        for etiqueta, descripcion, key, secret, web_endpoint in pares:
            if not key or not secret:
                print(f"  [{etiqueta}] {descripcion}: sin credenciales, se omite")
                continue

            if etiqueta == "D":
                import time as _time
                import jwt as _jwt
                _iat = int(_time.time()) - 30
                _exp = _iat + 7200
                firma = _jwt.encode(
                    {"appKey": key, "sdkKey": key, "mn": numero, "role": 0,
                     "iat": _iat, "exp": _exp, "tokenExp": _exp - 600},
                    secret, algorithm="HS256")
            else:
                firma = await ZoomService(
                    credentials={"ZOOM_SDK_KEY": key, "ZOOM_SDK_SECRET": secret}
                ).generate_signature(meeting_number=numero, role=0, expire_hours=2)

            archivo = os.path.join(destino, f"cuenta_{etiqueta}.html")
            with open(archivo, "w", encoding="utf-8") as fh:
                fh.write(PLANTILLA.format(
                    titulo=html.escape(f"Prueba {etiqueta}: {descripcion}"),
                    etiqueta=etiqueta,
                    etiqueta_js=f'"[{etiqueta}]"',
                    app_key=key,
                    firma=firma,
                    meeting_number=numero,
                    password=password,
                    web_endpoint=web_endpoint,
                ))
            print(f"  [{etiqueta}] {descripcion}: appKey={key} ({len(key)} caracteres)")
            generadas.append(etiqueta)

        return generadas


class Manejador(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        largo = int(self.headers.get("Content-Length", 0))
        print("  " + self.rfile.read(largo).decode("utf-8", "replace"), flush=True)
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args):
        pass


def main():
    argumentos = [a for a in sys.argv[1:] if not a.startswith("--")]
    meeting_id = int(argumentos[0]) if argumentos else None
    puerto = 8099
    if "--port" in sys.argv:
        puerto = int(sys.argv[sys.argv.index("--port") + 1])

    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_firma_zoom")
    os.makedirs(destino, exist_ok=True)

    # El SDK se sirve desde el mismo origen que la página: traerlo del CDN obliga a lidiar con
    # COEP/CORP y basta un recurso bloqueado para que ZoomMtg quede sin definir.
    origen_sdk = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend", "node_modules", "@zoom", "meetingsdk", "dist", "zoom-meeting-4.1.0.min.js")
    if not os.path.exists(origen_sdk):
        print(f"No se encontró el SDK en {origen_sdk}")
        return
    shutil.copyfile(origen_sdk, os.path.join(destino, "zoom-meeting.min.js"))

    # El bundle del SDK espera React, ReactDOM, Redux y lodash como variables globales: sin
    # ellos ZoomMtg nunca se define. La muestra oficial de Zoom los carga antes por eso mismo.
    origen_vendor = os.path.join(os.path.dirname(origen_sdk), "lib", "vendor")
    destino_vendor = os.path.join(destino, "vendor")
    os.makedirs(destino_vendor, exist_ok=True)
    for archivo in ("react.min.js", "react-dom.min.js", "redux.min.js",
                    "redux-thunk.min.js", "lodash.min.js"):
        shutil.copyfile(os.path.join(origen_vendor, archivo),
                        os.path.join(destino_vendor, archivo))

    generadas = asyncio.run(preparar(meeting_id, destino))
    if not generadas:
        return

    os.chdir(destino)
    socketserver.TCPServer.allow_reuse_address = True
    servidor = socketserver.TCPServer(("127.0.0.1", puerto), Manejador)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()

    print("\nAbra estas direcciones en el navegador:")
    for etiqueta in generadas:
        print(f"   http://127.0.0.1:{puerto}/cuenta_{etiqueta}.html")
    print("\nLa que diga 'UNIDO CORRECTAMENTE' usa las credenciales buenas.")
    print("Lo que reporte cada página aparece acá abajo. Ctrl+C para terminar.\n")

    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\nListo.")
        servidor.shutdown()


if __name__ == "__main__":
    main()
