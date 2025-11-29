# 📧 Sistema de Envío de Correos Electrónicos - GIRAMASTER

Sistema completo para el envío de invitaciones por correo electrónico a reuniones de Zoom, diseñado para enviar automáticamente a todos los usuarios de una misma unidad residencial.

---

## 📁 Archivos Creados

### 1. **Configuración**
- **`app/core/config.py`** (actualizado)
  - Variables de configuración para Gmail SMTP
  - Configuración de credenciales y parámetros de envío

### 2. **Utilidades**
- **`app/utils/email_sender.py`**
  - Clase `EmailSender` para envío de correos
  - Soporte para envío individual y masivo
  - Manejo de errores y logging

### 3. **Servicios**
- **`app/services/email_service.py`**
  - Servicio `EmailService` para lógica de negocio
  - Método `send_meeting_invitation()` para enviar invitaciones
  - Integración con base de datos para obtener usuarios
  - Filtrado automático por unidad residencial

### 4. **Plantillas**
- **`app/templates/meeting_invitation_email.html`**
  - Plantilla HTML moderna y responsive
  - Diseño con gradientes y estilos profesionales
  - Variables dinámicas para personalización
  - Información completa de la reunión y acceso a Zoom

### 5. **Endpoints API**
- **`app/api/v1/endpoints/meeting_endpoint.py`** (actualizado)
  - Nuevo endpoint: `POST /api/v1/meetings/{meeting_id}/send-invitations`
  - Soporte para envío a todos o usuarios específicos
  - Estadísticas de envío en la respuesta

### 6. **Documentación**
- **`CONFIGURAR_EMAIL.md`**
  - Guía completa de configuración
  - Paso a paso para configurar Gmail
  - Ejemplos de uso de la API
  - Solución de problemas comunes

### 7. **Testing**
- **`test_email.py`**
  - Script de pruebas interactivo
  - Verificación de configuración
  - Test de envío simple
  - Test de invitación completa

---

## 🚀 Inicio Rápido

### 1. Configurar Gmail

```bash
# Sigue los pasos en CONFIGURAR_EMAIL.md
# 1. Habilitar verificación en dos pasos
# 2. Crear contraseña de aplicación
# 3. Copiar la contraseña de 16 caracteres
```

### 2. Configurar Variables de Entorno

Edita el archivo `.env` y agrega:

```bash
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=contraseña-de-aplicacion-16-caracteres
SMTP_FROM_EMAIL=tu-email@gmail.com
SMTP_FROM_NAME="GIRAMASTER - Sistema de Asambleas"
EMAIL_ENABLED=True
```

### 3. Probar el Sistema

```bash
cd backend
python test_email.py
```

### 4. Enviar Invitaciones

```bash
# Enviar a todos los usuarios de la unidad residencial
curl -X POST "http://localhost:8000/api/v1/meetings/1/send-invitations" \
  -H "Content-Type: application/json" \
  -d '{}'

# Enviar a usuarios específicos
curl -X POST "http://localhost:8000/api/v1/meetings/1/send-invitations" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": [1, 2, 3]}'
```

---

## 📊 Características

### Implementadas

- Envío de correos usando Gmail SMTP
- Plantilla HTML profesional y responsive
- Filtrado automático por unidad residencial
- Envío masivo o selectivo
- Estadísticas detalladas de envío
- Manejo de errores robusto
- Logging completo
- Configuración flexible
- Tests automatizados
- Documentación completa

### 🎨 Diseño de Email

- Colores modernos con gradientes
- Diseño responsive (móvil y desktop)
- Información clara y organizada
- Botón destacado para unirse
- Sección de notas importantes
- Footer profesional

### 📋 Información Incluida en el Email

- Nombre del destinatario
- Título de la reunión
- Unidad residencial
- Fecha y hora formateadas
- Duración estimada
- Tipo de reunión
- Organizador
- Descripción (opcional)
- ID de Zoom
- Contraseña de Zoom (si existe)
- Enlace directo para unirse
- Notas importantes

---

## 🔧 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     API Endpoint                         │
│     POST /api/v1/meetings/{id}/send-invitations        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   EmailService                           │
│  - Obtiene datos de la reunión                          │
│  - Filtra usuarios por unidad residencial               │
│  - Renderiza plantilla con datos                        │
│  - Gestiona envío masivo                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   EmailSender                            │
│  - Conexión SMTP con Gmail                              │
│  - Envío individual/masivo                              │
│  - Manejo de errores                                    │
│  - Logging                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Base de Datos

### Tablas Utilizadas

```sql
-- Reuniones
tbl_meetings
  - id
  - int_id_residential_unit (FK)
  - str_title
  - dat_schedule_date
  - str_zoom_join_url
  - int_zoom_meeting_id
  - ...

-- Usuarios
tbl_users
  - id
  - int_data_user_id (FK)
  - bln_is_active

-- Datos de Usuario
tbl_data_users
  - id
  - str_firstname
  - str_lastname
  - str_email

-- Unidades Residenciales de Usuario
tbl_user_residential_units
  - int_user_id (FK)
  - int_residential_unit_id (FK)

-- Unidades Residenciales
tbl_residential_units
  - id
  - str_name
```

### Consulta Principal

El sistema obtiene automáticamente:
1. Información de la reunión
2. Unidad residencial asociada
3. Todos los usuarios **activos** de esa unidad
4. Datos personales (nombre, email)

---

## 🔐 Seguridad

### Mejores Prácticas Implementadas

- Uso de contraseñas de aplicación (no contraseñas reales)
- Variables de entorno para credenciales
- Conexión SSL/TLS con Gmail
- Validación de destinatarios
- Logging de actividad
- Manejo seguro de errores

### Recomendaciones Adicionales

- 🔒 Rotar contraseñas periódicamente
- 🔒 Usar Google Workspace para mayor límite
- 🔒 Implementar rate limiting
- 🔒 Monitorear logs de envío
- 🔒 Configurar SPF/DKIM para dominio propio

---

## 📈 Límites y Escalabilidad

### Límites de Gmail

| Tipo de Cuenta | Límite Diario | Destinatarios por Email |
|----------------|---------------|-------------------------|
| Gmail Gratis   | 500 emails    | 100                    |
| Google Workspace | 2,000 emails | 500                    |

### Para Envíos Mayores

Si necesitas enviar más correos, considera:

1. **Google Workspace** - Mayor límite oficial
2. **SendGrid** - Servicio especializado en emails
3. **Amazon SES** - Económico y escalable
4. **Mailgun** - Robusto para aplicaciones
5. **Sistema de Colas** - Procesar envíos en background

---

## 🐛 Depuración

### Ver Logs

```bash
# Logs en tiempo real
tail -f backend/logs/app.log | grep "Email"

# Filtrar errores
tail -f backend/logs/error.log
```

### Logs Importantes

```
INFO: Email enviado exitosamente a 23 destinatario(s)
ERROR: Error de autenticación SMTP
 WARNING: El envío de emails está deshabilitado
```

---

## 📞 Soporte

### Problemas Comunes

1. **No se envían correos**
   - Verifica configuración en `.env`
   - Revisa logs en `backend/logs/app.log`
   - Ejecuta `python test_email.py`

2. **Error de autenticación**
   - Regenera contraseña de aplicación
   - Verifica que esté habilitada la verificación en dos pasos

3. **Correos en spam**
   - Configura SPF/DKIM
   - Usa dominio personalizado

Para más detalles, consulta **`CONFIGURAR_EMAIL.md`**

---

## 🎯 Roadmap Futuro

### Próximas Mejoras

- [ ] Plantillas adicionales (recordatorios, resúmenes)
- [ ] Sistema de colas para envíos masivos
- [ ] Integración con SendGrid/SES
- [ ] Panel de administración de correos
- [ ] Historial de envíos en BD
- [ ] Reintento automático de fallidos
- [ ] Personalización de plantillas desde UI
- [ ] Soporte para archivos adjuntos
- [ ] Preview de emails antes de enviar
- [ ] A/B testing de plantillas

---

## 📝 Licencia

Este sistema es parte del proyecto GIRAMASTER.

---

**Desarrollado con ❤️ para GIRAMASTER**

