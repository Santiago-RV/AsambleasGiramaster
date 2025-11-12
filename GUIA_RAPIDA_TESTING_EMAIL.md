# 🚀 Guía Rápida: Testing del Sistema de Correos Electrónicos

Esta guía te ayudará a probar el sistema de envío automático de correos al crear reuniones de Zoom.

---

## 📋 Pasos Rápidos

### 1️⃣ Configurar Gmail (5 minutos)

1. Ve a tu cuenta de Gmail → Seguridad
2. Habilita "Verificación en dos pasos"
3. Genera una "Contraseña de aplicación":
   - Selecciona "Correo"
   - Selecciona "Otro" → nombra "GIRAMASTER"
   - **Copia la contraseña de 16 caracteres**

### 2️⃣ Configurar Backend (2 minutos)

Edita el archivo `backend/.env`:

```bash
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Contraseña de 16 caracteres
SMTP_FROM_EMAIL=tu-email@gmail.com
EMAIL_ENABLED=True
```

### 3️⃣ Crear Usuario de Prueba (3 minutos)

**Opción A - Un solo usuario:**

1. Abre el archivo `backend/crear_usuario_prueba_email.sql`
2. Reemplaza `'tu-email@gmail.com'` con tu email real (línea 17)
3. Ejecuta el script en MySQL:

```bash
mysql -u root -p db_giramaster < backend/crear_usuario_prueba_email.sql
```

**Opción B - Múltiples usuarios:**

1. Abre el archivo `backend/crear_multiples_usuarios_prueba.sql`
2. En la línea del Usuario 4, reemplaza `'tu-email@gmail.com'` con tu email
3. Ejecuta el script:

```bash
mysql -u root -p db_giramaster < backend/crear_multiples_usuarios_prueba.sql
```

**Datos de los usuarios creados:**
- **Usuario**: juan.perez, maria.gonzalez, carlos.rodriguez, ana.martinez, luis.hernandez
- **Contraseña**: prueba123
- **Unidad Residencial**: ID 1

### 4️⃣ Probar el Envío (5 minutos)

**Desde la interfaz web:**

1. Inicia el backend:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

2. Inicia el frontend:
```bash
cd frontend
npm run dev
```

3. Accede a la aplicación y crea una nueva reunión:
   - Ve a la pestaña "Reuniones"
   - Haz clic en "Nueva Reunión"
   - Llena el formulario:
     * Unidad Residencial: Selecciona la unidad (ID 1)
     * Título: "Prueba de Correos"
     * Tipo: "Ordinaria"
     * Fecha: Fecha futura
     * Duración: 60 minutos
   - Haz clic en "Crear Reunión de Zoom"

4. **¡Observa la magia!** 🎉
   - Aparecerá: "Reunión Creada! Enviando invitaciones..."
   - Luego verás las estadísticas de envío
   - **Revisa tu bandeja de entrada** para el correo

**Desde la API directamente:**

```bash
# 1. Crear una reunión (cambia los valores según tu BD)
curl -X POST "http://localhost:8000/api/v1/meetings" \
  -H "Content-Type: application/json" \
  -d '{
    "int_id_residential_unit": 1,
    "str_title": "Prueba de Correos",
    "str_description": "Testing del sistema de emails",
    "str_meeting_type": "Ordinaria",
    "dat_schedule_date": "2025-11-01T15:00:00",
    "int_estimated_duration": 60,
    "bln_allow_delegates": false
  }'

# 2. Obtener el ID de la reunión de la respuesta
# 3. Enviar invitaciones (reemplaza {meeting_id})
curl -X POST "http://localhost:8000/api/v1/meetings/{meeting_id}/send-invitations" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 📧 Verificar el Correo Recibido

El correo que recibirás debe incluir:

✅ **Header atractivo** con colores y gradientes  
✅ **Tu nombre** (Usuario Prueba Email o Ana Martínez)  
✅ **Título de la reunión**  
✅ **Fecha y hora** formateadas  
✅ **Información de Zoom**:
   - ID de reunión
   - Contraseña (si aplica)
   - Botón "Unirse a la Reunión"  
✅ **Notas importantes**  
✅ **Footer profesional**

---

## 🐛 Solución de Problemas

### No recibí el correo

1. **Revisa la carpeta de Spam**
2. **Verifica los logs**:
```bash
tail -f backend/logs/app.log | grep "Email"
```

3. **Prueba el envío manual**:
```bash
cd backend
python test_email.py
```

### Error de autenticación

- Verifica que la contraseña de aplicación sea correcta
- Asegúrate de que la verificación en dos pasos esté habilitada
- Regenera la contraseña de aplicación si es necesario

### No encuentra usuarios

Verifica que el usuario esté en la base de datos:

```sql
SELECT 
    u.id,
    u.str_username,
    du.str_email,
    uru.int_residential_unit_id,
    u.bln_is_active
FROM tbl_users u
INNER JOIN tbl_data_users du ON u.int_data_user_id = du.id
INNER JOIN tbl_user_residential_units uru ON u.id = uru.int_user_id
WHERE uru.int_residential_unit_id = 1
  AND u.bln_is_active = 1;
```

---

## 📊 Estadísticas Esperadas

Después de crear una reunión, deberías ver algo como:

```
📧 Invitaciones Enviadas

Total: 5
✓ Exitosos: 5
✗ Fallidos: 0
```

Si usaste el script de múltiples usuarios, deberías recibir:
- **1 correo** en tu bandeja (como Ana Martínez)
- **4 correos adicionales** irían a los otros usuarios (emails de ejemplo)

---

## 🎯 Checklist de Testing

- [ ] Gmail configurado con contraseña de aplicación
- [ ] Variables de entorno configuradas en `.env`
- [ ] Usuario(s) de prueba creado(s) en la BD
- [ ] Backend corriendo (`uvicorn`)
- [ ] Frontend corriendo (`npm run dev`)
- [ ] Reunión creada desde la interfaz
- [ ] Mensaje de "Invitaciones Enviadas" aparece
- [ ] Correo recibido en tu bandeja
- [ ] Correo tiene diseño correcto
- [ ] Botón de Zoom funciona

---

## 💡 Tips Adicionales

### Cambiar el remitente

Edita en `.env`:
```bash
SMTP_FROM_NAME="Mi Conjunto Residencial"
```

### Enviar solo a usuarios específicos

Desde la API:
```bash
curl -X POST "http://localhost:8000/api/v1/meetings/1/send-invitations" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": [4]}'  # Solo a Ana Martínez
```

### Deshabilitar envío automático

Edita en `.env`:
```bash
EMAIL_ENABLED=False
```

---

## 📞 ¿Necesitas Ayuda?

1. **Revisa los logs**: `backend/logs/app.log`
2. **Lee la documentación**: `backend/CONFIGURAR_EMAIL.md`
3. **Ejecuta los tests**: `python backend/test_email.py`

---

**¡Listo para probar! 🎉**

Si todo funciona, deberías recibir un hermoso correo de invitación en menos de 5 segundos después de crear la reunión.

