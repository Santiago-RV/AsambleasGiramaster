# FRONTEND GIRAMASTER

SPA en React 19 + Vite, servida en producción por Nginx (ver `docs/DEPLOY.md`).

## Prerrequisitos

- Node.js 18+
- pnpm (el proyecto usa `pnpm-lock.yaml`/`pnpm-workspace.yaml` — no usar `npm install`)

## Configuración inicial

```bash
cd frontend
cp .env.example .env
```

Variable principal:
- `VITE_API_URL`: prefijo de la API consumida por el SPA. En desarrollo suele ser `http://localhost:8006/api/v1` (ver `.env.example`); en producción es `/api/v1` (el Ingress enruta `/api/v1` al backend, ver `docs/DEPLOY.md`).

## Instalación y ejecución

### Con Makefile (recomendado):
```bash
make install   # pnpm install
make dev       # servidor de desarrollo (vite, puerto 5173 por defecto — ver server.port en vite.config.js)
make prod      # pnpm build
make lint      # pnpm lint
```

### Manual:
```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## Docker

```bash
make docker-build            # construye la imagen (sirve dist/ con Nginx)
make docker-run               # corre en foreground, puerto 3000 -> 80
make docker-run-detached      # en segundo plano
make docker-logs
make docker-stop
```

El `Dockerfile` no compila la app dentro del build de Docker: espera que `dist/` ya exista (se genera con `pnpm build` antes de construir la imagen). Así lo hace el pipeline real de CI/CD — ver `docs/DEPLOY.md`, sección 5.

## Testing

`make test` / `pnpm test` están referenciados en el `Makefile`, pero **hoy no hay ningún test ni configuración de Vitest en el proyecto** (no hay `*.test.jsx`, `*.spec.jsx` ni config de Vitest en `vite.config.js`) — ejecutar `pnpm test` falla porque `package.json` no define ese script. Si se agregan tests, usar **Vitest, no Jest** (convención del proyecto, ver `CLAUDE.md`).

## Estructura del proyecto

```
frontend/
├── src/
│   ├── components/
│   │   ├── AdDashboard/      # Dashboard de Administrador (rol "Administrador")
│   │   ├── CoDashboard/      # Dashboard de Copropietario/Invitado (rol "Usuario")
│   │   ├── saDashboard/      # Dashboard de Super Administrador
│   │   ├── Auth/             # Login, AutoLogin, ProtectedRoute, RoleBasedRoute
│   │   ├── common/           # Componentes compartidos entre dashboards (QR, listas, modales)
│   │   └── layout/           # DashboardLayout, Header, Sidebar
│   ├── pages/                 # Un componente de página por ruta (AdDashboard.jsx, CoDashboard.jsx, HomeSA.jsx, Login.jsx, ...)
│   ├── services/api/          # Un archivo por recurso de la API (AuthService, MeetingService, ResidentService, ...)
│   ├── hooks/                  # useAuth, useResidentsSSE, useMeetingAttendanceSSE, useMeetingPollsSSE, ...
│   ├── contexts/               # ProgressNotificationContext
│   ├── providers/              # AppProvider, AuthProvider
│   ├── utils/                   # dateUtils, numberUtils
│   ├── App.jsx                  # Definición de rutas (react-router-dom)
│   └── main.jsx                 # Punto de entrada
├── package.json
├── vite.config.js
├── Makefile
├── Dockerfile
└── nginx.conf                   # Config de Nginx para servir el build (incluye /health)
```

## Rutas y control de acceso por rol

Definidas en `App.jsx` con `RoleBasedRoute`, que compara el rol del usuario **por nombre** (string), no por id numérico:

| Ruta | Rol permitido (`allowedRoles`) | Página |
|---|---|---|
| `/super-admin` | `"Super Administrador"` | `HomeSA.jsx` |
| `/admin` | `"Administrador"` | `AdDashboard.jsx` |
| `/copropietario` | `"Usuario"` | `CoDashboard.jsx` |
| `/auto-login/:token` | pública | `Auth/AutoLogin.jsx` (ver `docs/QR_AUTH_FLOW.md`) |
| `/votacion-presencial/:meetingId` | pública | `PresencialVotingPage.jsx` |

No hay ruta propia para el rol "Invitado": comparte `/copropietario`, con restricciones puntuales dentro de ese dashboard. Catálogo completo de roles y de dónde sale cada string en [`docs/ROLES.md`](ROLES.md).

## Convenciones reales vs. `CLAUDE.md`

`CLAUDE.md` fija como convención el alias `@/` para imports y el prefijo `tw-` en clases Tailwind. En el código actual **casi no se usan todavía**: los imports son relativos (`../../services/api/...`) en toda la base, y solo un archivo (`CoDashboard.jsx`) usa clases con `tw-` — el resto usa Tailwind sin prefijo. No hay alias configurado en `vite.config.js` (`resolve.alias`). Si vas a tocar un archivo, seguí la convención de `CLAUDE.md` para código nuevo, pero no asumas que ya está aplicada en el resto del proyecto.
