# Flujo de QR y Auto-login

Acceso sin contraseña: un administrador genera un link (o un QR que codifica ese link) para un residente, que al abrirlo entra directo al sistema logueado. Es la lógica más repartida entre archivos de todo el backend — esta guía la junta en un solo lugar.

## Piezas clave

| Archivo | Rol |
|---|---|
| `backend/app/services/simple_auto_login_service.py` | Genera y decodifica el JWT de auto-login; mantiene la tabla espejo `used_auto_login_tokens`. |
| `backend/app/api/v1/endpoints/qr_endpoints.py` (prefix `/residents`) | Endpoints que el frontend llama para generar QR (individual, masivo, mejorado, envío por email). |
| `backend/app/services/qr_service.py` | Genera la imagen QR (PNG) a partir de la URL de auto-login. |
| `backend/app/api/v1/endpoints/simple_auto_login_endpoint.py` | `GET /auto-login/{token}` — valida el link cuando alguien lo abre y crea la sesión real. |
| `backend/app/services/meeting_service.py` (`register_attendance_by_qr`) | Cuando un admin *escanea* el QR de un residente durante una asamblea presencial. |
| `backend/app/tasks/email_tasks.py`, `backend/app/services/email_service.py` | Generan tokens al enviar credenciales/QR por email (bienvenida, invitación a reunión, envío individual). |
| `frontend/src/components/common/QRCodeModal.jsx`, `ResidentsList.jsx` | UI: modal de QR individual, export masivo a PDF/Excel. |
| `frontend/src/components/Auth/AutoLogin.jsx` | Página `/auto-login/:token` que consume el endpoint de validación. |

## Expiración: dos capas que deben coincidir

Cada token tiene **dos** lugares donde se valida su vigencia, y ambos deben estar de acuerdo:

1. **Claim `exp` del JWT** — estándar, lo verifica `jose.jwt.decode` automáticamente al decodificar (`decode_auto_login_token`).
2. **Columna `expires_at` en la tabla `used_auto_login_tokens`** — un espejo en BD, verificado a mano en `is_token_valid_for_user()`. Existe para poder invalidar un token *antes* de que expire el JWT (por ejemplo, para no reprocesar upserts).

Ambos se calculan a partir de **un único valor centralizado**: `settings.QR_INDIVIDUAL_EXPIRATION_HOURS` / `settings.QR_BULK_EXPIRATION_HOURS` (`backend/app/core/config.py`), hoy **168 horas (1 semana)** para los dos casos.

> **Bug histórico ya corregido** (ver `docs/CHANGELOG.md`): antes, `upsert_user_token()` siempre guardaba `expires_at = ahora + 24h` si no se le pasaba el valor explícito, y varios call sites no se lo pasaban — un QR masivo generado con 48h tenía un JWT válido por 48h pero el registro en BD expiraba a las 24h. Hoy todos los call sites pasan `expires_at` explícito, calculado con el mismo `expiration_hours` usado para el JWT. Si agregás un nuevo lugar que genera tokens, **siempre pasá `expires_at` a `upsert_user_token`** — no confíes en su default.

`upsert_user_token()` es un upsert real: si el `token_id` (jti) ya existe, actualiza `expires_at`/`ip_address` en vez de ignorarlo. Esto importa para el reuso de tokens (ver más abajo).

## Flujo individual (un residente, un QR)

1. Frontend: botón de QR en `ResidentsList.jsx` → `handleGenerateQR()` → `POST /residents/generate-qr-simple`.
2. Backend (`qr_endpoints.py::generate_qr_simple`): genera JWT con `simple_auto_login_service.generate_auto_login_token(expiration_hours=settings.QR_INDIVIDUAL_EXPIRATION_HOURS)`, guarda el token en BD (`upsert_user_token`), arma `auto_login_url = f"{frontend_url}/auto-login/{token}"`.
3. Frontend: `QRCodeModal.jsx` dibuja el QR (librería `qrcode`, en el navegador) a partir de esa URL y muestra `expires_in_hours` recibido del backend.

## Flujo masivo (PDF/Excel para muchos residentes)

1. Frontend: `ResidentsList.jsx::handleGenerateBulkQRsPDF` / `handleDownloadExcel` → `POST /residents/generate-qr-bulk-simple` con la lista de `user_ids`.
2. Backend (`qr_endpoints.py::generate_qr_bulk_simple`): por cada usuario, si ya tiene un token válido vigente (`get_valid_tokens_for_users`), **reusa el mismo `token_id`** y solo regenera el JWT (`generate_auto_login_token_with_id`) — así no se acumulan filas nuevas en `used_auto_login_tokens` cada vez que alguien reimprime el PDF. Si no tiene token vigente, genera uno nuevo.
3. En ambos casos se llama `upsert_user_token` con el `expires_at` recién calculado, para que la BD quede sincronizada con el JWT regenerado.
4. Frontend: genera las imágenes QR en el navegador (`qrcode`) y arma el PDF (`jspdf`) o Excel (`exceljs`). El PDF incluye la fecha de vigencia impresa junto a cada QR.

`/residents/enhanced-qr` y `/residents/bulk-qr` son variantes que sí generan la imagen PNG en el servidor (con logo/personalización) para envío por email — usan la misma lógica de `simple_auto_login_service` por debajo.

## Flujo por email

- **QR individual por email**: botón "Enviar por email" en `QRCodeModal.jsx` → `POST /residents/send-enhanced-qr-email` → tarea Celery `send_qr_email` (`email_tasks.py`) → `qr_service.generate_user_qr_data(expiration_hours=settings.QR_INDIVIDUAL_EXPIRATION_HOURS)`.
- **Invitación a reunión (masiva)**: `email_tasks.py` genera un token por invitado con `meeting_id` embebido en el JWT (`generate_auto_login_token(..., meeting_id=...)`) — esto es lo que permite auto-registrar asistencia al abrir el link (ver abajo).
- **Bienvenida / credenciales de admin/copropietario**: `residential_unit_service.py` (varios puntos de alta de usuario) y `email_service.py` generan igual un token de auto-login para el primer acceso.

## Validación al abrir el link (`GET /auto-login/{token}`)

`simple_auto_login_endpoint.py::auto_login_simple`:

1. Decodifica el JWT (`decode_auto_login_token`) → si expiró o es inválido, **404**.
2. Si tiene `token_id`, valida contra la tabla espejo (`is_token_valid_for_user`) → si no es válido, **410 GONE**.
3. Verifica `user.bln_allow_entry`.
4. Genera un **access_token de sesión normal** (7 días, `ACCESS_TOKEN_EXPIRE_MINUTES`) y crea una sesión — a partir de acá el usuario queda logueado como si hubiera usado usuario/contraseña.
5. Actualiza el token de auto-login (`upsert_user_token`) con la IP del cliente.
6. **Si el rol es Copropietario o Invitado (`int_id_rol in (3, 4)`, ver [`docs/ROLES.md`](ROLES.md))**: intenta auto-registrar asistencia (`meeting_service.auto_register_attendance_on_login`) a una reunión presencial "En Curso" de su unidad residencial. Si el token traía `meeting_id` (venía de una invitación), se usa ese; si no, se detecta por unidad residencial.

## Escaneo de QR en la puerta (admin escanea al copropietario)

`meeting_service.py::register_attendance_by_qr(qr_token, admin_user_id)`: decodifica el mismo tipo de JWT, pero en vez de loguear al usuario, registra su asistencia a la reunión presencial en curso de la unidad residencial del admin que escanea. Usado desde el flujo de recepción presencial, no desde `/auto-login`.

## Limitaciones conocidas

- `POST /residents/bulk-qr` (variante con imágenes PNG en servidor) no persiste los tokens en `used_auto_login_tokens` — solo genera el JWT. Si en el futuro se valida contra la tabla espejo, esos QR fallarían pese a tener un JWT vigente.
- No hay `Deployment` de `celery-beat` en producción (ver `docs/DEPLOY.md`), así que cualquier tarea periódica de limpieza de tokens expirados (`cleanup_expired_tokens` en `simple_auto_login_service.py`) debe dispararse manualmente o agregarse al scheduler.
