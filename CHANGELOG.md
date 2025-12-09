# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Añadido

#### 2025-12-09
- **Gestión avanzada de copropietarios desde panel de administrador**:
  - Endpoints completos para CRUD de copropietarios (`admin_coowners.py`)
  - Modal mejorado con validación completa de campos
  - Servicio de copropietario para administradores (`coownerService.js`)
  - Integración con sistema de notificaciones por correo

- **Sistema de notificaciones por correo mejorado**:
  - Servicio dedicado de notificaciones (`email_notification_service.py`)
  - Registro de notificaciones en tabla `tbl_email_notifications`
  - Plantillas HTML de correo profesionales:
    - `admin_invitation.html`: Invitación para nuevos administradores
    - `coowner_disabled.html`: Notificación de deshabilitación
    - `coowner_update.html`: Notificación de actualización de datos
    - `welcome_coproprietario.html`: Bienvenida para copropietarios
  - Botón para enviar credenciales manualmente desde interfaz

- **Mejoras en gestión de unidades residenciales**:
  - Funcionalidad completa de edición de copropietarios
  - Opción para editar sin cambiar contraseña
  - Visualización y edición de coeficiente de participación
  - Servicio mejorado de residentes (`ResidentService.js`)
  - Validación de eliminación (no permite eliminar administradores activos)

#### 2025-12-04
- **Reuniones con duración indefinida**:
  - Soporte para crear reuniones sin duración específica usando valor 0
  - Campo `int_estimated_duration`: 0 = duración indefinida, >0 = duración en minutos
  - Campo `int_meeting_leader_id` agregado al formulario de creación de reuniones
  - Opción "Permitir delegados" marcada por defecto en nuevas reuniones
  - Reuniones con duración 0 se crean en Zoom con 60 minutos por defecto (valor técnico)
  - Enlaces de Zoom se generan siempre al crear la reunión (con o sin duración)
  - Valor por defecto de `int_estimated_duration` es 0 (duración indefinida)

- **Control de acceso a reuniones programadas**:
  - Filtro automático que muestra solo reuniones del día actual y futuras
  - Reuniones pasadas ya no aparecen en la lista
  - Botón de acceso habilitado solo 1 hora antes de la reunión para administradores
  - Indicador visual de tiempo restante para habilitar acceso
  - Estados diferenciados por color: verde (en curso), azul (programada habilitada), gris (programada deshabilitada)

- **Migraciones de base de datos**:
  - Script SQL para actualizar tabla `tbl_meetings` (`001_update_meeting_nullable_fields.sql`)
  - Script SQL para cambiar `int_estimated_duration` a NOT NULL DEFAULT 0 (`002_update_estimated_duration_zero_default.sql`)
  - Script Python para aplicar migraciones automáticamente (`apply_migration.py`)
  - Documentación de migraciones en `backend/migrations/README.md`

### Cambiado

#### 2025-12-09
- **Arquitectura de notificaciones**:
  - Envío de correos movido del registro automático al panel de super admin
  - Modelo `email_notification_model.py` actualizado para soportar múltiples tipos
  - Schema `email_notification_schema.py` con campos adicionales de seguimiento

- **Componente UnidadResidencialDetalles**:
  - Refactorización completa con más de 1400 líneas mejoradas
  - Integración con múltiples servicios (ResidentService, ResidentialUnitService, coownerService)
  - Mejoras en manejo de estado y validación de formularios
  - UI mejorada con indicadores de carga y mensajes de error descriptivos

- **Servicios de API en frontend**:
  - `ResidentService.js`: Nuevo servicio para gestión de residentes (61 líneas)
  - `ResidentialUnitService.js`: Ampliado con 179 líneas de funcionalidad
  - `coownerService.js`: Nuevo servicio para operaciones de copropietarios (96 líneas)
  - `axiosconfig.js`: Configuración mejorada de interceptores

- **Configuración de navegación**:
  - Sidebare actualizados con nuevas rutas y permisos
  - `SidebarAD.jsx`: Navegación mejorada para administradores
  - `SidebarCO.jsx`: Panel simplificado para copropietarios

#### 2025-12-04
- **Modal de nuevas reuniones**:
  - Eliminado campo de fecha y hora de finalización
  - Solo solicita fecha y hora de inicio
  - Mensaje informativo sobre duración indefinida

- **Lista de reuniones programadas**:
  - Filtrado automático: solo muestra reuniones del día actual y futuras
  - Reuniones pasadas ya no se muestran en la interfaz
  - Botón de acceso con control temporal (1 hora antes de inicio)
  - Mensajes informativos sobre disponibilidad de acceso
  - Diferenciación visual entre estados: "En Curso", "Activa" y "Programada"

- **Modelo de base de datos**:
  - `int_estimated_duration`: Usa 0 para duración indefinida (NOT NULL DEFAULT 0)
  - `int_zoom_meeting_id`: Ahora acepta NULL
  - `str_zoom_join_url`: Ahora acepta NULL
  - `str_zoom_start_url`: Ahora acepta NULL
  - `bln_allow_delegates`: Valor por defecto TRUE
  - `int_total_invitated`: Valor por defecto 0
  - `int_total_confirmed`: Valor por defecto 0
  - `str_status`: Valor por defecto 'Programada'

- **Schemas de API**:
  - `MeetingCreateRequest`: Campo `int_estimated_duration` con default 0 (0 = indefinida, 15-480 = con límite)
  - `MeetingCreateRequest`: Agregado campo `int_meeting_leader_id` obligatorio
  - `MeetingCreateRequest`: Cambio de valor por defecto de `bln_allow_delegates` a TRUE
  - `MeetingResponse`: Campo `int_estimated_duration` siempre tiene valor entero (0 o mayor)

- **Servicio de reuniones**:
  - Lógica actualizada para manejar duración 0 (indefinida)
  - Reuniones con duración 0 usan 60 minutos en Zoom (valor técnico)
  - Enlaces de Zoom se generan siempre al crear la reunión
  - Soporte para `meeting_leader_id` separado del `organizer_id`
  - Mejoras en logging para diferenciar reuniones con/sin duración
  - Tipo de parámetro `estimated_duration` cambiado de `Optional[int]` a `int`

### Añadido

#### 2025-11-26
- **Notificaciones por correo electrónico**: Implementación del sistema de notificaciones por correo desde el super admin
  - Ajuste para enviar correos desde super admin en lugar de al registrar usuario
  - Envío manual de credenciales de acceso mediante botón
  - Registro de notificaciones en tabla de notificaciones
  - Plantillas de correo para administrador y copropietario
  - Correo de bienvenida automático al cargar copropietarios desde Excel

- **Gestión de administradores**:
  - Creación de administrador desde la opción de asamblea
  - Envío de correo con credenciales al crear administrador
  - Endpoints para funcionalidades administrador-copropietarios
  - Servicio de copropietario para admin

#### 2025-11-24
- **Gestión de copropietarios**:
  - Carga masiva de copropietarios desde archivo Excel
  - Configuración correcta de carga hasta 3 tablas necesarias
  - Modal unificado para crear y editar copropietarios
  - Funcionalidad de edición de copropietarios cargados desde Excel
  - Funcionalidad de eliminación de copropietarios cargados desde Excel

#### 2025-11-20
- **Interfaces de usuario**:
  - Vista de Administrador en React
  - Vista de Copropietario en React

#### 2025-11-17
- **Super Admin**: Endpoints para gestión de unidades residenciales y creación de copropietarios mediante archivo Excel

#### 2025-11-16
- **Servicios de encuestas**: Ajustes en funcionalidad de encuestas y configuración del backend para acceso desde frontend localhost:5173

#### 2025-11-11
- **Vistas adicionales**:
  - Vista de configuración
  - Vista de informes
  - Vista de reuniones activas implementadas

#### 2025-11-09
- **Encuestas**: Implementación de endpoint para crear las preguntas de las reuniones

#### 2025-10-19
- **Invitaciones a reuniones**: Endpoint para carga masiva de invitaciones a reuniones mediante archivo Excel

#### 2025-10-13
- **Funcionalidad de administrador**: Endpoint y servicio de invitación a reuniones

### Corregido

#### 2025-12-09
- **Generación de reuniones**:
  - Corrección en creación de reuniones desde panel de administrador
  - Ajuste en validación de campos requeridos
  - Mejora en manejo de errores al crear reunión en Zoom

- **Asignación de administrador**:
  - Corrección en lógica de asignación de administrador a unidad residencial
  - Validación mejorada de permisos antes de asignar
  - Fix en actualización de rol de usuario al convertirse en administrador

- **Servicio de unidades residenciales** (`residential_unit_service.py`):
  - Corrección en endpoint de eliminación de copropietarios
  - Validación que previene eliminar administradores activos
  - Fix en procesamiento de archivo Excel (`process_residents_excel_file`)
  - Corrección en actualización de copropietarios sin cambiar contraseña

- **Autenticación y autorización**:
  - Ajustes en `auth_endpoint.py` para manejo correcto de roles
  - Corrección en `auth.py` para validación de tokens
  - Fix en redirección según rol de usuario después del login

#### 2025-11-26
- **Login y administrador**: Corrección en asignación de administrador y ajustes en login para entrar a vistas diferentes según rol

#### 2025-11-24
- **Unidades residenciales**:
  - Ajustes en carga de usuarios del sistema para administración
  - Corrección en carga de residentes
  - Corrección para cargar todos los usuarios encontrados de esa unidad
  - Ajuste para mostrar coeficiente en modal de edición
  - Permitir editar sin cambiar la contraseña
  - Creación de función `process_residents_excel_file` para correcto funcionamiento del sistema
  - Ajuste para evitar eliminación de copropietario que sea administrador de la sesión

- **Login**: Corrección en login cambiando inicio de sesión por nombre de usuario

- **Autenticación**: Corrección en lógica de auth

#### 2025-11-14
- **Seguridad y encriptación**:
  - Corrección en encriptado de datos
  - Ajustes visuales para unidades residenciales
  - Corrección en login para nueva estructura de hash
  - Corrección en encriptación y verificación de contraseñas
  - Logout aplicado

- **Base de datos**: Corrección en conector SQL compatible con Windows

#### 2025-11-11
- **Frontend**:
  - Ajustes visuales
  - Agrupación de vistas relevantes de la unidad residencial

- **Gestión de errores**: Ajuste en clases de excepciones para mejorar gestión de errores en servicio de creación de encuestas

#### 2025-10-19
- **Administrador**: Ajuste de respuestas y endpoints para carga masiva

### Eliminado

#### 2025-12-09
- **Archivos de documentación obsoletos del backend**:
  - `CAMBIOS_SISTEMA_ENCUESTAS.md` (280 líneas)
  - `CONFIGURAR_EMAIL.md` (292 líneas)
  - `EJEMPLO_USO_ENCUESTAS.md` (498 líneas)
  - `GUIA_POSTMAN_ENCUESTAS.md` (432 líneas)
  - `SISTEMA_EMAIL_README.md` (330 líneas)
  - `Postman_Collection_Encuestas.json` (483 líneas)

- **Scripts SQL obsoletos**:
  - `MIGRATION_POLL_FIX.sql` (38 líneas)
  - `agregar_campo_password.sql` (12 líneas)
  - `crear_multiples_usuarios_prueba.sql` (93 líneas)
  - `crear_usuario_prueba_email.sql` (98 líneas)

#### 2025-12-04
- Archivo de ejemplo `EJEMPLO_USO_POLLSERVICE.md` del frontend (532 líneas)

---

## Convenciones de commits

Este proyecto utiliza los siguientes prefijos en los commits:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de errores
- `merge`: Fusión de ramas
- `docs`: Cambios en documentación

## Autores

- Jose David N
- Santiago-RV
- Darwin352
