# Configuración de Envío de Correos Electrónicos

Este documento explica cómo configurar el sistema de envío de correos electrónicos usando Gmail para el proyecto GIRAMASTER.

## 📋 Tabla de Contenidos

1. [Configuración de Gmail](#configuración-de-gmail)
2. [Configuración del Backend](#configuración-del-backend)
3. [Uso del Sistema](#uso-del-sistema)
4. [Plantilla de Email](#plantilla-de-email)
5. [API Endpoints](#api-endpoints)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Configuración de Gmail

### Paso 1: Habilitar la verificación en dos pasos

1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Navega a **Seguridad**
3. Habilita **Verificación en dos pasos**

### Paso 2: Crear una contraseña de aplicación

1. En la sección de **Seguridad**, busca **Contraseñas de aplicaciones**
2. Haz clic en **Contraseñas de aplicaciones**
3. Selecciona la aplicación: **Correo**
4. Selecciona el dispositivo: **Otro (nombre personalizado)**
5. Ingresa un nombre, por ejemplo: "GIRAMASTER"
6. Haz clic en **Generar**
7. **Copia la contraseña de 16 caracteres** que aparece

⚠️ **Importante**: Guarda esta contraseña de forma segura, ya que no podrás verla de nuevo.

---

## ⚙️ Configuración del Backend

### Paso 1: Agregar variables de entorno

Edita el archivo `.env` en el directorio `/backend/` y agrega las siguientes variables:

```bash
# Configuración de Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion-de-16-caracteres
SMTP_FROM_EMAIL=tu-email@gmail.com
SMTP_FROM_NAME="GIRAMASTER - Sistema de Asambleas"
EMAIL_ENABLED=True
```

**Reemplaza:**
- `tu-email@gmail.com` con tu dirección de Gmail
- `tu-contraseña-de-aplicacion-de-16-caracteres` con la contraseña generada en el Paso 2 de Gmail

### Paso 2: Instalar dependencias (opcional)

El sistema de email no requiere dependencias adicionales ya que usa la biblioteca estándar de Python. Sin embargo, si quieres usar una implementación asíncrona más avanzada, puedes instalar:

```bash
pip install aiosmtplib
```

---

## 📧 Uso del Sistema

### Enviar invitaciones desde la API

#### Endpoint: `POST /api/v1/meetings/{meeting_id}/send-invitations`

#### Ejemplo 1: Enviar a todos los usuarios de la unidad residencial

```bash
curl -X POST "http://localhost:8000/api/v1/meetings/1/send-invitations" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Ejemplo 2: Enviar a usuarios específicos

```bash
curl -X POST "http://localhost:8000/api/v1/meetings/1/send-invitations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": [1, 2, 3, 4, 5]
  }'
```

#### Respuesta exitosa:

```json
{
  "success": true,
  "status_code": 200,
  "message": "Invitaciones procesadas: 23 exitosos, 0 fallidos",
  "data": {
    "meeting_id": 1,
    "statistics": {
      "total": 23,
      "exitosos": 23,
      "fallidos": 0,
      "detalles": [
        {
          "to": ["usuario1@example.com"],
          "status": "exitoso"
        },
        {
          "to": ["usuario2@example.com"],
          "status": "exitoso"
        }
      ]
    }
  }
}
```

### Uso programático desde Python

```python
from app.services.email_service import email_service
from app.core.database import get_db

async def enviar_invitaciones_reunion(meeting_id: int):
    async with get_db() as db:
        stats = await email_service.send_meeting_invitation(
            db=db,
            meeting_id=meeting_id,
            user_ids=None  # None = todos los usuarios de la unidad
        )
        print(f"Emails enviados: {stats}")
```

---

## 🎨 Plantilla de Email

La plantilla HTML se encuentra en:
```
backend/app/templates/meeting_invitation_email.html
```

### Variables disponibles en la plantilla:

- `{{user_name}}` - Nombre completo del destinatario
- `{{meeting_title}}` - Título de la reunión
- `{{residential_unit}}` - Nombre de la unidad residencial
- `{{meeting_date}}` - Fecha formateada (ej: "Lunes, 25 de Octubre de 2025")
- `{{meeting_time}}` - Hora formateada (ej: "03:00 PM")
- `{{duration}}` - Duración en minutos
- `{{meeting_type}}` - Tipo de reunión
- `{{organizer_name}}` - Nombre del organizador
- `{{meeting_description}}` - Descripción de la reunión (opcional)
- `{{zoom_meeting_id}}` - ID de la reunión de Zoom
- `{{zoom_password}}` - Contraseña de Zoom (opcional)
- `{{zoom_join_url}}` - URL para unirse a la reunión
- `{{current_year}}` - Año actual

### Personalizar la plantilla

Puedes editar el archivo HTML para cambiar:
- Colores y estilos
- Logo de la empresa
- Textos y mensajes
- Estructura del email

---

## 🔌 API Endpoints

### 1. Enviar Invitaciones

**POST** `/api/v1/meetings/{meeting_id}/send-invitations`

**Descripción**: Envía invitaciones por correo electrónico a usuarios de la unidad residencial.

**Request Body**:
```json
{
  "user_ids": [1, 2, 3]  // Opcional, si no se envía, se envía a todos
}
```

**Response**: Ver ejemplo en la sección [Uso del Sistema](#uso-del-sistema)

---

## 🛠️ Solución de Problemas

### Error: "Credenciales de email no configuradas"

**Solución**: Verifica que las variables `SMTP_USER` y `SMTP_PASSWORD` estén configuradas en el archivo `.env`

### Error: "Error de autenticación SMTP"

**Posibles causas**:
1. Contraseña de aplicación incorrecta
2. Verificación en dos pasos no habilitada en Gmail
3. Email bloqueado por Gmail por actividad sospechosa

**Solución**:
1. Regenera la contraseña de aplicación en Gmail
2. Verifica que la verificación en dos pasos esté habilitada
3. Revisa tu bandeja de entrada de Gmail para notificaciones de seguridad

### Error: "Connection refused" o "Timeout"

**Posibles causas**:
1. Firewall bloqueando el puerto 587
2. Configuración incorrecta del host SMTP

**Solución**:
1. Verifica que el puerto 587 esté abierto
2. Prueba con el puerto 465 (SSL) cambiando `SMTP_PORT=465`

### Los correos llegan a spam

**Solución**:
1. Configura registros SPF y DKIM en tu dominio
2. Evita palabras spam en el asunto
3. Incluye siempre un enlace para darse de baja
4. Usa un dominio personalizado en lugar de Gmail

### Cómo probar el envío de correos

```python
from app.utils.email_sender import email_sender

# Test simple
success = email_sender.send_email(
    to_emails=["tu-email@example.com"],
    subject="Test de correo",
    html_content="<h1>Hola</h1><p>Este es un correo de prueba</p>"
)

print(f"Envío exitoso: {success}")
```

---

## 📝 Notas Adicionales

### Límites de Gmail

- **Límite diario**: 500 correos por día para cuentas gratuitas
- **Límite por hora**: Aproximadamente 100 correos por hora
- **Destinatarios por correo**: Máximo 100 destinatarios

Para envíos masivos mayores, considera usar:
- Google Workspace (límite de 2000/día)
- SendGrid
- Amazon SES
- Mailgun

### Seguridad

- **Nunca** subas el archivo `.env` a GitHub
- Agrega `.env` a tu `.gitignore`
- Usa variables de entorno en producción
- Rota las contraseñas de aplicación periódicamente

### Registro de Actividad

Los logs de envío de correos se guardan en:
```
backend/logs/app.log
```

Para ver los logs en tiempo real:
```bash
tail -f backend/logs/app.log | grep "Email"
```

---

## 🎯 Próximos Pasos

1. ✅ Configurar Gmail
2. ✅ Agregar variables al `.env`
3. ✅ Probar envío de correos
4. ✅ Personalizar plantilla HTML
5. ⬜ Configurar dominio personalizado (opcional)
6. ⬜ Implementar sistema de colas para envíos masivos (opcional)
7. ⬜ Agregar más plantillas de correo (recordatorios, resúmenes, etc.)

---

**¿Necesitas ayuda?** Consulta los logs del sistema o contacta al equipo de desarrollo.

