# Organización de Modelos con CASCADE

## Resumen

Se han actualizado todos los modelos de SQLAlchemy para incluir correctamente los parámetros `ondelete` y `onupdate` en las claves foráneas, siguiendo la jerarquía de datos del sistema.

## Cambios Realizados

### 1. Modelos Actualizados

Todos los modelos ahora incluyen:
- **`onupdate="CASCADE"`**: Cuando se actualiza el ID de una tabla padre, se actualiza automáticamente en todas las tablas hijas
- **`ondelete`** con tres estrategias según el caso:
  - **`CASCADE`**: Elimina registros hijos cuando se elimina el padre
  - **`RESTRICT`**: Evita la eliminación del padre si tiene hijos
  - **`SET NULL`**: Establece NULL en el hijo cuando se elimina el padre (solo si la columna permite NULL)

### 2. Jerarquía de Modelos

#### **Nivel 1 - Tablas Maestras** (sin dependencias)
- `tbl_rols` - Roles del sistema
- `tbl_data_users` - Datos personales de usuarios

#### **Nivel 2 - Usuarios y Unidades**
- `tbl_users` → depende de `tbl_data_users` (**RESTRICT**) y `tbl_rols` (**RESTRICT**)
- `tbl_residential_units` → depende de `tbl_users` (**RESTRICT** para created_by/updated_by)

#### **Nivel 3 - Relaciones Usuario-Unidad**
- `tbl_user_residential_units` → depende de `tbl_users` (**CASCADE**) y `tbl_residential_units` (**CASCADE**)

#### **Nivel 4 - Reuniones**
- `tbl_meetings` → depende de `tbl_residential_units` (**CASCADE**) y `tbl_users` (**RESTRICT**)

#### **Nivel 5 - Elementos de Reunión**
- `tbl_meeting_invitations` → depende de `tbl_meetings` (**CASCADE**) y `tbl_users` (**RESTRICT**)
- `tbl_meeting_attendances` → depende de `tbl_meetings` (**CASCADE**) y `tbl_users` (**RESTRICT**)
- `tbl_polls` → depende de `tbl_meetings` (**CASCADE**)
- `tbl_zoom_sessions` → depende de `tbl_meetings` (**CASCADE**)
- `tbl_email_notifications` → depende de `tbl_meetings` (**SET NULL**) y `tbl_users` (**RESTRICT**)
- `tbl_audit_logs` → depende de `tbl_users` (**RESTRICT**) y `tbl_meetings` (**RESTRICT**)

#### **Nivel 6 - Opciones y Respuestas de Encuestas**
- `tbl_poll_options` → depende de `tbl_polls` (**CASCADE**)
- `tbl_poll_responses` → depende de `tbl_polls` (**CASCADE**), `tbl_users` (**RESTRICT**) y `tbl_poll_options` (**CASCADE**)

## Estrategias CASCADE Aplicadas

### ✅ **CASCADE** - Eliminación en Cascada

**Se aplica cuando:**
- La entidad hija no tiene sentido sin la entidad padre
- Los datos son transaccionales y no se necesitan para auditoría

**Ejemplos:**
- Al eliminar una **Unidad Residencial** → se eliminan todas sus **Reuniones**
- Al eliminar una **Reunión** → se eliminan:
  - Invitaciones
  - Asistencias
  - Encuestas
  - Sesiones de Zoom
- Al eliminar una **Encuesta** → se eliminan:
  - Opciones de la encuesta
  - Respuestas de usuarios

### 🚫 **RESTRICT** - Evitar Eliminación

**Se aplica cuando:**
- Se necesita mantener integridad referencial
- Los datos son para auditoría
- No se debe permitir eliminar registros críticos

**Ejemplos:**
- No se puede eliminar un **Usuario** si:
  - Tiene reuniones creadas
  - Tiene respuestas en encuestas
  - Tiene registros de auditoría
  - Es creador/actualizador de unidades residenciales
- No se puede eliminar un **Rol** si tiene usuarios asociados
- No se puede eliminar **DataUser** si tiene usuarios asociados
- No se pueden eliminar **Reuniones** o **Usuarios** si tienen logs de auditoría

### 🔄 **SET NULL** - Establecer NULL

**Se aplica cuando:**
- La relación es opcional (columna permite NULL)
- Se quiere conservar el registro hijo aunque se elimine el padre

**Ejemplos:**
- Al eliminar una **Reunión** → las notificaciones por email relacionadas establecen `int_meeting_id = NULL`
  - Permite mantener historial de emails enviados aunque la reunión ya no exista

## Beneficios

### 1. **Integridad Referencial Automática**
- La base de datos garantiza que no queden registros huérfanos
- No es necesario código manual para eliminar registros relacionados

### 2. **Seguridad de Datos**
- **RESTRICT** evita eliminaciones accidentales de datos críticos
- Los logs de auditoría nunca se eliminan automáticamente

### 3. **Mantenimiento Simplificado**
- Al eliminar una unidad residencial, se limpian automáticamente todos sus datos relacionados
- No se acumulan datos obsoletos en la base de datos

### 4. **Claridad en el Código**
- Las relaciones entre tablas están explícitas en los modelos
- Fácil de entender la jerarquía de datos

## Aplicar la Migración

### Opción 1: SQL Manual

```bash
# 1. Hacer backup de la base de datos
mysqldump -u usuario -p nombre_base_datos > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Aplicar el script SQL
mysql -u usuario -p nombre_base_datos < backend/migrations/add_cascade_constraints.sql

# 3. Verificar los constraints
mysql -u usuario -p nombre_base_datos -e "
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, DELETE_RULE, UPDATE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
"
```

### Opción 2: Alembic (si está configurado)

```bash
# Generar migración automática
alembic revision --autogenerate -m "add_cascade_constraints"

# Revisar la migración generada
# Editar si es necesario en alembic/versions/

# Aplicar migración
alembic upgrade head
```

## Verificación

Después de aplicar la migración, verifica que las constraints están correctamente configuradas:

```sql
-- Ver todas las foreign keys y sus reglas
SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    DELETE_RULE,
    UPDATE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
```

**Resultado esperado:**
- Todas las constraints deben tener `UPDATE_RULE = 'CASCADE'`
- Las constraints deben tener `DELETE_RULE` según la estrategia definida:
  - `CASCADE` para relaciones de dependencia
  - `RESTRICT` para prevenir eliminaciones
  - `SET NULL` para relaciones opcionales

## Archivos Modificados

### Modelos de SQLAlchemy
1. `backend/app/models/residential_unit_model.py`
2. `backend/app/models/user_model.py`
3. `backend/app/models/meeting_model.py`
4. `backend/app/models/poll_model.py`
5. `backend/app/models/poll_option_model.py`
6. `backend/app/models/poll_response_model.py`
7. `backend/app/models/meeting_attendance_model.py`
8. `backend/app/models/meeting_invitation_model.py`
9. `backend/app/models/zoom_session_model.py`
10. `backend/app/models/user_residential_unit_model.py`
11. `backend/app/models/email_notification_model.py`
12. `backend/app/models/audit_log_model.py`

### Archivos Nuevos
1. `backend/migrations/add_cascade_constraints.sql` - Script SQL para aplicar cambios
2. `docs/CASCADE_MIGRATIONS.md` - Este documento (originalmente `backend/migrations/README_CASCADE.md`)

## Consideraciones Importantes

### ⚠️ **Advertencias**

1. **Backup Obligatorio**
   - SIEMPRE hacer backup antes de aplicar la migración
   - La migración modifica constraints existentes

2. **Datos Existentes**
   - Verificar que no haya registros huérfanos antes de aplicar
   - Los datos inconsistentes pueden causar errores

3. **Testing**
   - Probar la migración en entorno de desarrollo primero
   - Verificar que todas las operaciones CRUD funcionen correctamente

4. **Reversión**
   - Guardar el backup para poder revertir si es necesario
   - Documentar cualquier problema encontrado

### ✅ **Recomendaciones**

1. **Orden de Aplicación**
   - Aplicar en entorno de desarrollo
   - Probar exhaustivamente
   - Aplicar en staging
   - Finalmente aplicar en producción

2. **Monitoreo**
   - Monitorear logs de la base de datos después de aplicar
   - Verificar que no haya errores de integridad referencial

3. **Documentación**
   - Mantener este README actualizado
   - Documentar cualquier cambio adicional a la jerarquía

## Ejemplos de Uso

### Ejemplo 1: Eliminar una Unidad Residencial

```python
# Antes del CASCADE (requería código manual):
# 1. Eliminar todas las reuniones
# 2. Eliminar todas las invitaciones
# 3. Eliminar todas las asistencias
# 4. Eliminar todas las encuestas
# 5. Eliminar todas las respuestas
# 6. Eliminar la unidad

# Después del CASCADE (automático):
db.delete(residential_unit)
db.commit()
# Todos los registros relacionados se eliminan automáticamente
```

### Ejemplo 2: Intentar Eliminar un Usuario con Datos

```python
# Si el usuario tiene respuestas en encuestas:
try:
    db.delete(user)
    db.commit()
except IntegrityError:
    # Error: Cannot delete user with poll responses
    # Mensaje: RESTRICT constraint prevents deletion
```

### Ejemplo 3: Eliminar una Reunión

```python
# Se eliminan automáticamente:
# - Invitaciones
# - Asistencias
# - Encuestas (y sus opciones y respuestas)
# - Sesiones de Zoom
# Las notificaciones por email establecen meeting_id = NULL
db.delete(meeting)
db.commit()
```

## Soporte

Para preguntas o problemas con la migración, consulta con el equipo de desarrollo.

## Changelog

- **2025-12-26**: Creación inicial de la organización CASCADE en todos los modelos
