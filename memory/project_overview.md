---
name: Project Overview - Asambleas Giramaster
description: Stack, DB, y estructura general del proyecto de gestión de asambleas
type: project
---

# Asambleas Giramaster

**Backend:** FastAPI, SQLAlchemy (async), PostgreSQL, Pydantic, Uvicorn
**Frontend:** React 18, Vite, TailwindCSS, @tanstack/react-query, jsPDF + jspdf-autotable, lucide-react, SweetAlert2
**Auth:** JWT, roles: 1=SuperAdmin, 2=Admin, 3=Usuario/Copropietario

## Estructura de BD
- `tbl_meetings` — reuniones, statuses: "Programada", "En Curso", "Completada"
- `tbl_meeting_invitations` — invitados con dec_quorum_base (inmutable) y dec_voting_weight (cambia con delegaciones)
- `tbl_delegation_history` — historial de ceder poder
- Para quórum por delegación: si int_delegated_id != NULL, el delegante aparece como "presente" si su delegado está activo

## Rutas API clave
- `/administrator/*` — para rol Admin (2) y SuperAdmin (1)
- `/super-admin/*` — solo SuperAdmin (1)
- `/super-admin/reports/*` — reportes SA
- `/user/*` — copropietario

**Why:** Contexto general para no tener que re-explorar en cada sesión.
