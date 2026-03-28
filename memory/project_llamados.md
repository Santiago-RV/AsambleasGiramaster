---
name: Llamados de Asistencia Feature
description: Feature para registrar 3 llamados (snapshots) de asistencia durante reuniones activas
type: project
---

# Llamados de Asistencia

Implementado 2026-03-28.

## Almacenamiento
- Columna `json_llamados JSONB` en `tbl_meetings`
- Migración en `backend/migrations/add_json_llamados_to_meetings.sql`
- Estructura: `{ "1": {timestamp, present:[...], absent:[...], connected_quorum, total_quorum, quorum_percentage}, "2": {...}, "3": {...} }`

## Backend
- `MeetingModel.json_llamados` — JSON column
- `ActiveMeetingService.take_llamado_snapshot(meeting_id, numero)` — toma snapshot del estado actual (incluye delegantes si su delegado está activo)
- `ActiveMeetingService.get_llamado_data(meeting_id, numero)` — retorna snapshot
- `ActiveMeetingService.get_all_llamados(meeting_id)` — retorna status de los 3
- `get_meeting_in_progress_details` retorna `llamados_status` con {registered, timestamp} por llamado
- Endpoints admin: `POST/GET /administrator/meeting/{id}/llamado/{n}`, `GET /administrator/meeting/{id}/llamados`
- Endpoints SA: `GET /super-admin/reports/meetings/{id}/llamado/{n}`, `GET /super-admin/reports/meetings/{id}/llamados`

## Frontend Admin (ReunionEnCursoTab.jsx)
- 3 tarjetas con botones "Registrar" / "Re-registrar" + botón "Ver" si ya fue registrado
- Muestra timestamp cuando está registrado
- `LlamadoModal.jsx` muestra presentes/ausentes con % quórum

## Frontend SuperAdmin (ActiveMeetingDetailsModal.jsx)
- Sección "Llamados de Asistencia" carga automáticamente los llamados al abrir el modal
- Vista expandible por llamado con mini-stats
- Botón "PDF" por llamado — genera PDF con jsPDF+autoTable client-side
- PDF incluye: encabezado con unidad, tabla de presentes (verde), tabla de ausentes (rojo), resumen de quórum

**Why:** Necesidad de auditar asistencia en 3 momentos clave de la reunión, con soporte de delegaciones.
**How to apply:** El % de quórum en los llamados usa los mismos cálculos que el quórum en tiempo real (delegation-aware).
