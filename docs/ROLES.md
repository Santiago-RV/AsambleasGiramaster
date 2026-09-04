# Roles y Permisos

## Catálogo de roles

La única fuente de verdad es el seed automático que corre en cada arranque del backend: `backend/app/core/database.py` (función `seed_db()`, líneas 94-134), que inserta estas 4 filas en `tbl_rols` si no existen:

| `id` | `str_name` (valor real en BD) | Alias de negocio usado en código/UI | Descripción del seed |
|---|---|---|---|
| 1 | **"Super Administrador"** | Super Admin | Acceso completo al sistema |
| 2 | **"Administrador"** | Admin | Puede crear y modificar contenido (administra su unidad residencial) |
| 3 | **"Usuario"** | **Copropietario** | Solo puede ver contenido (residente votante) |
| 4 | **"Invitado"** | Invitado / Delegado | "Puede moderar contenido" (descripción del seed, aparentemente copiada/errónea — en la práctica es un acceso temporal sin voto propio) |

> **Ojo con el nombre del id 3**: en la base de datos el `str_name` literal es `"Usuario"`, no `"Copropietario"`. El código y las rutas del frontend (`/copropietario`) usan "Copropietario" como término de negocio, pero si necesitás comparar contra la BD o el JWT, el string real es `"Usuario"`.

No existe ningún `Enum`/constante compartida para estos roles ni en backend ni en frontend — son números mágicos (`int_id_rol == 1`, `in [3, 4]`, etc.) repetidos en ~101 lugares del backend, casi siempre con un comentario inline aclarando el significado. Si se toca esta lógica, conviene introducir una constante/enum común en vez de agregar más números sueltos.

## Cómo se usa en el backend

Patrón dominante: comparar `UserModel.int_id_rol` contra los ids crudos.

| Uso | Dónde (ejemplos representativos) |
|---|---|
| Solo Super Admin (`!= 1` / `== 1`) | `super_admin.py` (9 endpoints), `system_config_endpoint.py:37`, `residential_enpoint.py:440`, `support_endpoint.py:58`, `reports_superadmin_endpoint.py:30` |
| Solo Admin (`!= 2` / `== 2`) | `admin_coowners.py` (10 endpoints), `user_service.py:317,480` (un Admin no puede modificar a otro Admin salvo que sea Super Admin) |
| Super Admin o Admin (`in [1, 2]`) | `residential_enpoint.py:225,332,388`, `qr_endpoints.py:330,495` y `email_tasks.py:703` (agrupa 1+2 como `'Admin'` para el payload del QR, el resto como `'Resident'`) |
| Solo Copropietario (`== 3`) | `residential_unit_service.py:517,531`, `dashboard_service.py:60` (estadísticas filtradas a copropietarios) |
| Solo Invitado (`== 4`) | `residential_unit_service.py:2406,2461` |
| Copropietario o Invitado (`in [3, 4]`) | `simple_auto_login_endpoint.py:158` (dispara auto-registro de asistencia al validar un link de auto-login/QR en una reunión presencial), `poll_endpoint.py:312` (oculta encuestas en borrador), `ResidentsList.jsx:122-123` (frontend: qué residentes puede modificar un Admin) |
| Excluir Admin de un listado (`!= 2`) | `administrator.py:328,1002,1582` (listar copropietarios/invitados de una reunión) |
| Por nombre en vez de id | `meeting_service.py:165`: `RolModel.str_name == 'Administrador'` — único caso que busca por string en vez de id, para encontrar el admin activo de una unidad residencial |

Ver también [`docs/QR_AUTH_FLOW.md`](QR_AUTH_FLOW.md) para el caso de auto-registro de asistencia por rol.

## Cómo se usa en el frontend

El frontend **no** recibe ni compara el `id` numérico — recibe el `str_name` como string en el login (`data.user.role`, guardado en `localStorage`) y compara contra los mismos textos del seed:

- `frontend/src/hooks/useAuth.js` (`navigateByRole`): `'Super Administrador'` → `/super-admin`, `'Administrador'` → `/admin`, `'Usuario'` → `/copropietario`.
- `frontend/src/App.jsx`: rutas protegidas con `<RoleBasedRoute allowedRoles={['Super Administrador']}>`, `['Administrador']`, `['Usuario']`.
- `frontend/src/components/Auth/RoleBasedRoute.jsx`: compara `user.role` contra el arreglo `allowedRoles` (por string, no por id).
- `frontend/src/pages/CoDashboard.jsx`: ítems de menú con `allowedRoles: ["Usuario", "Invitado"]` o `["Usuario"]` según la sección.
- **Única excepción** que compara por id crudo: `frontend/src/components/common/ResidentsList.jsx` (`resident.int_id_rol === 3 || resident.int_id_rol === 4`), porque ahí se está mirando el rol de *otro* usuario (un residente listado), no el del usuario logueado.

No hay ninguna ruta ni dashboard separado para el rol "Invitado" — comparte el dashboard de Copropietario (`/copropietario`, rol `"Usuario"`) y se distingue únicamente a nivel de permisos puntuales dentro de ese dashboard (ver `CoDashboard.jsx`).
