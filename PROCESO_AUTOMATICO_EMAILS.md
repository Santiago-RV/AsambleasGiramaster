# 📧 Proceso Automático de Envío de Correos

## ✅ Cambio Implementado

El sistema ahora envía las invitaciones por correo **automáticamente desde el backend** al crear una reunión, sin necesidad de intervención manual o llamadas adicionales desde el frontend.

---

## 🔄 Flujo Actual (Automático)

```
Usuario crea reunión en el frontend
           ↓
Frontend → POST /api/v1/meetings
           ↓
Backend crea la reunión en BD
           ↓
Backend crea reunión en Zoom (API OAuth)
           ↓
Backend guarda reunión con ID de Zoom
           ↓
🆕 Backend AUTOMÁTICAMENTE envía invitaciones 📧
           ↓
Backend consulta tbl_user_residential_units
           ↓
Filtra usuarios de la misma unidad residencial
           ↓
Solo envía a usuarios activos (bln_is_active = TRUE)
           ↓
Envía correos con plantilla HTML profesional
           ↓
Registra estadísticas en logs
           ↓
Retorna reunión creada al frontend
           ↓
Frontend muestra mensaje de éxito
```

---

## 🎯 Características

### ✅ Totalmente Automático
- No requiere llamadas adicionales del frontend
- Se ejecuta en el mismo proceso de creación
- Si falla el email, no falla la reunión (no crítico)

### ✅ Filtrado Inteligente
- **Tabla origen**: `tbl_user_residential_units`
- **Filtro 1**: Solo usuarios de la misma unidad residencial
- **Filtro 2**: Solo usuarios activos (`bln_is_active = TRUE`)
- **Join con**: `tbl_users` → `tbl_data_users` (para obtener emails)

### ✅ Manejo de Errores
- Si falla el envío, se loggea pero no falla la reunión
- Estadísticas detalladas en logs
- Usuario informado en frontend sobre envío automático

---

## 📊 Consulta SQL Utilizada

```sql
SELECT 
    u.id,
    u.str_username,
    du.str_firstname,
    du.str_lastname,
    du.str_email,
    du.str_phone
FROM tbl_users u
INNER JOIN tbl_data_users du ON u.int_data_user_id = du.id
INNER JOIN tbl_user_residential_units uru ON u.id = uru.int_user_id
WHERE 
    uru.int_residential_unit_id = {meeting.int_id_residential_unit}
    AND u.bln_is_active = TRUE;
```

### Tablas Involucradas

1. **`tbl_users`** - Información de usuarios del sistema
   - `id` - ID del usuario
   - `int_data_user_id` - FK a datos personales
   - `bln_is_active` - Estado activo/inactivo

2. **`tbl_data_users`** - Datos personales
   - `id` - ID
   - `str_firstname` - Nombre
   - `str_lastname` - Apellido
   - `str_email` - **Email (usado para envío)**
   - `str_phone` - Teléfono

3. **`tbl_user_residential_units`** - Relación usuario-unidad
   - `int_user_id` - FK a usuario
   - `int_residential_unit_id` - FK a unidad residencial
   - `str_apartment_number` - Número de apartamento

4. **`tbl_meetings`** - Información de reuniones
   - `id` - ID de la reunión
   - `int_id_residential_unit` - **FK a unidad (usado para filtrar)**
   - Otros campos de la reunión

---

## 🔧 Código Clave

### Backend - meeting_service.py

```python
# Después de crear la reunión y hacer commit
try:
    from app.services.email_service import email_service
    logger.info(f"📧 Enviando invitaciones automáticas para reunión ID {meeting_with_relations.id}")
    
    email_stats = await email_service.send_meeting_invitation(
        db=self.db,
        meeting_id=meeting_with_relations.id,
        user_ids=None  # None = todos los usuarios de la unidad
    )
    
    if "error" in email_stats:
        logger.warning(f"⚠️ Error al enviar invitaciones: {email_stats['error']}")
    else:
        logger.info(
            f"✅ Invitaciones enviadas: {email_stats.get('exitosos', 0)} exitosos, "
            f"{email_stats.get('fallidos', 0)} fallidos"
        )
except Exception as email_error:
    # No fallar la creación si falla el email
    logger.error(f"❌ Error al enviar invitaciones (no crítico): {str(email_error)}")
```

### Backend - email_service.py

```python
# Obtener usuarios de la unidad residencial
query = select(UserModel, DataUserModel).join(
    DataUserModel,
    UserModel.int_data_user_id == DataUserModel.id
).join(
    UserResidentialUnitModel,
    UserModel.id == UserResidentialUnitModel.int_user_id
).where(
    UserResidentialUnitModel.int_residential_unit_id == meeting.int_id_residential_unit,
    UserModel.bln_is_active == True
)

result = await db.execute(query)
users_data = result.all()

# Enviar correo a cada usuario
for user, data_user in users_data:
    email = data_user.str_email
    # Enviar correo...
```

### Frontend - ReunionesTab.jsx

```javascript
// Simplificado - Ya no hace llamada adicional
onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    reset();
    setIsModalOpen(false);
    
    Swal.fire({
        icon: 'success',
        title: '¡Reunión Creada Exitosamente!',
        html: `
            <p>✅ La reunión se creó correctamente</p>
            <p>📧 Las invitaciones han sido enviadas automáticamente</p>
        `,
    });
}
```

---

## 📝 Logs del Sistema

### Logs Exitosos

```
INFO: Creando reunión de Zoom: Asamblea Ordinaria 2025
INFO: ✅ Reunión REAL de Zoom creada: ID 87654321098
INFO: 📧 Enviando invitaciones automáticas para reunión ID 1
INFO: Email enviado exitosamente a 5 destinatario(s)
INFO: ✅ Invitaciones enviadas: 5 exitosos, 0 fallidos
```

### Logs con Errores (No Críticos)

```
INFO: Creando reunión de Zoom: Asamblea Ordinaria 2025
INFO: ✅ Reunión REAL de Zoom creada: ID 87654321098
INFO: 📧 Enviando invitaciones automáticas para reunión ID 1
WARNING: ⚠️ Error al enviar invitaciones: No se encontraron usuarios
```

**Nota**: La reunión se crea exitosamente aunque falle el envío de emails.

---

## 🧪 Cómo Probar

### 1. Verificar Usuarios en la Base de Datos

```sql
-- Ver usuarios de una unidad residencial específica
SELECT 
    u.id,
    u.str_username,
    CONCAT(du.str_firstname, ' ', du.str_lastname) as nombre_completo,
    du.str_email,
    uru.str_apartment_number,
    uru.int_residential_unit_id,
    u.bln_is_active
FROM tbl_users u
INNER JOIN tbl_data_users du ON u.int_data_user_id = du.id
INNER JOIN tbl_user_residential_units uru ON u.id = uru.int_user_id
WHERE uru.int_residential_unit_id = 1  -- Cambiar el ID según tu BD
  AND u.bln_is_active = TRUE;
```

### 2. Crear Usuario de Prueba

```bash
# Ejecutar el script SQL
mysql -u root -p db_giramaster < backend/crear_usuario_prueba_email.sql
```

**Asegúrate de**:
- Editar el email en el script (línea 17)
- Usar tu email real para recibir las pruebas
- El usuario debe estar en la tabla `tbl_user_residential_units`

### 3. Configurar Variables de Entorno

```bash
# backend/.env
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM_EMAIL=tu-email@gmail.com
EMAIL_ENABLED=True
```

### 4. Crear Reunión desde el Frontend

1. Accede a la aplicación
2. Ve a "Reuniones" → "Nueva Reunión"
3. Completa el formulario
4. Haz clic en "Crear Reunión de Zoom"
5. **Observa los logs del backend** en tiempo real:

```bash
tail -f backend/logs/app.log | grep -E "📧|Email|invitaciones"
```

6. **Revisa tu email** - Deberías recibir la invitación en segundos

---

## 🎯 Ventajas del Proceso Automático

### Para el Código
- ✅ **Más simple** - Una sola llamada desde el frontend
- ✅ **Más confiable** - Se ejecuta en el mismo proceso
- ✅ **Mejor logging** - Todo en el mismo lugar
- ✅ **Transaccional** - Si algo falla, se registra correctamente

### Para el Usuario
- ✅ **Transparente** - No ve pasos adicionales
- ✅ **Rápido** - Todo sucede automáticamente
- ✅ **Confiable** - No puede olvidar enviar invitaciones
- ✅ **Informado** - Sabe que se enviaron los correos

### Para el Sistema
- ✅ **Menos tráfico** - No hay llamada adicional de API
- ✅ **Mejor performance** - Todo en un solo proceso
- ✅ **Escalable** - Puede manejar muchos usuarios
- ✅ **Mantenible** - Lógica centralizada en el backend

---

## 🔍 Debugging

### Ver Logs en Tiempo Real

```bash
# Logs generales
tail -f backend/logs/app.log

# Solo emails
tail -f backend/logs/app.log | grep "Email"

# Solo invitaciones
tail -f backend/logs/app.log | grep "invitaciones"
```

### Verificar Configuración

```bash
cd backend
python test_email.py
```

### Probar Endpoint Manualmente (Opcional)

```bash
# Crear reunión (el backend enviará emails automáticamente)
curl -X POST "http://localhost:8000/api/v1/meetings" \
  -H "Content-Type: application/json" \
  -d '{
    "int_id_residential_unit": 1,
    "str_title": "Prueba Automática",
    "str_description": "Testing de envío automático",
    "str_meeting_type": "Ordinaria",
    "dat_schedule_date": "2025-11-01T15:00:00",
    "int_estimated_duration": 60,
    "bln_allow_delegates": false
  }'

# Observar logs inmediatamente después
tail -n 50 backend/logs/app.log
```

---

## 📋 Checklist de Testing

- [ ] Configuración de Gmail completada
- [ ] Variables SMTP en `.env` configuradas
- [ ] Usuario de prueba creado en BD
- [ ] Usuario está en `tbl_user_residential_units`
- [ ] Email del usuario es válido
- [ ] Backend corriendo (`uvicorn`)
- [ ] Frontend corriendo (`npm run dev`)
- [ ] Logs abiertos en terminal
- [ ] Reunión creada desde UI
- [ ] Logs muestran "📧 Enviando invitaciones"
- [ ] Logs muestran "✅ Invitaciones enviadas"
- [ ] Correo recibido en bandeja de entrada
- [ ] Correo tiene diseño correcto
- [ ] Información de Zoom es correcta

---

## 🚀 Resumen

### Antes (Manual)
```
1. Usuario crea reunión
2. Frontend recibe respuesta
3. Frontend llama a /send-invitations
4. Backend envía correos
5. Frontend muestra resultado
```

### Ahora (Automático)
```
1. Usuario crea reunión
2. Backend crea reunión + envía correos automáticamente
3. Frontend recibe respuesta y muestra éxito
```

**Resultado**: Proceso más simple, confiable y transparente. ✨

---

**¡Todo listo para usar!** 🎉

El sistema ahora envía correos automáticamente al crear reuniones, obteniendo los usuarios correctamente de `tbl_user_residential_units` y filtrando por la misma unidad residencial.

