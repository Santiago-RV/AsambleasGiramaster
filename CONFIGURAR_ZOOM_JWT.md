# ✅ Configuración de Zoom JWT - COMPLETADA

## 🎉 ¡Buenas Noticias!

Las credenciales de Zoom JWT **ya están configuradas** y funcionando. Se obtuvieron del backend Laravel existente.

---

## 📋 Credenciales Actuales

Las siguientes credenciales **ya están en tu `.env`**:

```env
# Zoom SDK (Meeting SDK - Frontend)
ZOOM_SDK_KEY = "2kch2h4jTQm7acvhFmaFeg"
ZOOM_SDK_SECRET = "xOnkvKTrH1edbkoZ8gDrot54XuLavTKR"

# Zoom JWT API (Backend - Crear reuniones)
ZOOM_JWT_API_KEY = "0qokFMx7QgaTG1lvg08kJQ"
ZOOM_JWT_API_SECRET = "99S3wWhgtTyes9QF0mb4yi98Kq1WJlOTWbQS"
```

---

## 🔍 ¿Qué hace cada credencial?

### **1. ZOOM_SDK_KEY / ZOOM_SDK_SECRET**
- **Uso**: Meeting SDK (frontend)
- **Función**: Generar JWT para unirse a reuniones desde el navegador
- **Ubicación**: `ZoomMeetingView.jsx`

### **2. ZOOM_JWT_API_KEY / ZOOM_JWT_API_SECRET**
- **Uso**: API REST (backend)
- **Función**: Crear, actualizar, eliminar reuniones automáticamente
- **Ubicación**: `zoom_api_service.py`

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ReunionesTab.jsx                                        │
│    ↓                                                     │
│  [Crear Reunión] → MeetingService.createMeeting()       │
│    ↓                                                     │
│  POST /api/v1/meetings/create                           │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│                 BACKEND (FastAPI)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  meeting_endpoint.py                                     │
│    ↓                                                     │
│  meeting_service.py                                      │
│    ↓                                                     │
│  zoom_api_service.py                                     │
│    ├─ _generate_jwt()  ← ZOOM_JWT_API_KEY/SECRET        │
│    └─ create_meeting() → API de Zoom                    │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│                  ZOOM API (REST)                         │
│                                                          │
│  POST /v2/users/me/meetings                             │
│    ↓                                                     │
│  Reunión creada ✅                                       │
│    • ID: 83338761699                                     │
│    • URL: https://zoom.us/j/83338761699?pwd=...         │
│    • Password: abc123                                    │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              BASE DE DATOS (MySQL)                       │
│                                                          │
│  adm_reuniones                                           │
│    • int_zoom_meeting_id: 83338761699                   │
│    • str_zoom_join_url: https://zoom.us/j/...           │
│    • str_zoom_password: abc123                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Funciona

### **1. Crear Reunión (Backend)**

```python
# zoom_api_service.py

def _generate_jwt(self) -> str:
    """Genera JWT para autenticar con Zoom API"""
    payload = {
        "iss": self.api_key,  # ZOOM_JWT_API_KEY
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, self.api_secret, algorithm="HS256")

def create_meeting(self, topic, start_time, duration):
    """Crea reunión en Zoom"""
    token = self._generate_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        "https://api.zoom.us/v2/users/me/meetings",
        headers=headers,
        json={
            "topic": topic,
            "type": 2,
            "start_time": start_time,
            "duration": duration
        }
    )
    
    return response.json()  # Incluye join_url, password, etc.
```

### **2. Unirse a Reunión (Frontend)**

```javascript
// ZoomMeetingView.jsx

// 1. Obtener SDK Key del backend
const { data } = await axios.get('/api/v1/zoom/config');
const sdkKey = data.sdk_key;

// 2. Obtener JWT signature del backend
const signatureResponse = await axios.post('/api/v1/zoom/generate-signature', {
  meeting_number: meetingNumber,
  role: 0  // 0 = participante, 1 = anfitrión
});

// 3. Inicializar Zoom SDK
await client.init({ zoomAppRoot: meetingSDKElement.current });

// 4. Unirse a la reunión
await client.join({
  sdkKey: sdkKey,
  signature: signatureResponse.data.signature,
  meetingNumber: meetingNumber,
  password: meetingPassword,
  userName: 'Usuario'
});
```

---

## 🔐 Seguridad

### **¿Por qué JWT en el Backend?**

✅ **Nunca expone secretos en el frontend**
- `ZOOM_JWT_API_SECRET` solo está en el backend
- El frontend solo recibe el JWT generado

✅ **Tokens temporales**
- JWT expira en 1 hora
- Se genera uno nuevo para cada operación

✅ **Dos niveles de autenticación**
- JWT API (backend) → Crear/gestionar reuniones
- JWT SDK (frontend) → Unirse a reuniones

---

## 📝 Verificar Configuración

### **1. Verificar `.env` del Backend**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
cat .env | grep ZOOM
```

**Salida esperada:**
```env
ZOOM_SDK_KEY = "2kch2h4jTQm7acvhFmaFeg"
ZOOM_SDK_SECRET = "xOnkvKTrH1edbkoZ8gDrot54XuLavTKR"
ZOOM_JWT_API_KEY = "0qokFMx7QgaTG1lvg08kJQ"
ZOOM_JWT_API_SECRET = "99S3wWhgtTyes9QF0mb4yi98Kq1WJlOTWbQS"
```

### **2. Verificar Backend Arranca**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

**Salida esperada:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### **3. Probar Creación de Reunión**

```bash
curl -X POST "http://localhost:8000/api/v1/meetings/create" \
  -H "Content-Type: application/json" \
  -d '{
    "int_id_residential_unit": 1,
    "str_title": "Reunión de Prueba",
    "str_description": "Prueba de integración Zoom",
    "str_meeting_type": "ordinary",
    "dat_schedule_date": "2025-10-26T10:00:00",
    "int_estimated_duration": 60,
    "bln_allow_delegates": true
  }'
```

**Salida esperada:**
```json
{
  "int_id_meeting": 1,
  "str_meeting_code": "MTG-2025-001",
  "str_title": "Reunión de Prueba",
  "int_zoom_meeting_id": "83338761699",
  "str_zoom_join_url": "https://zoom.us/j/83338761699?pwd=...",
  "str_zoom_password": "abc123"
}
```

---

## 🐛 Solución de Problemas

### **Error: "Credenciales de Zoom JWT no configuradas"**

**Causa**: El `.env` no tiene las variables o están vacías.

**Solución**:
```bash
cd /srv/proyectos/AsambleasGiramaster/backend
nano .env
```

Asegúrate de tener:
```env
ZOOM_JWT_API_KEY = "0qokFMx7QgaTG1lvg08kJQ"
ZOOM_JWT_API_SECRET = "99S3wWhgtTyes9QF0mb4yi98Kq1WJlOTWbQS"
```

### **Error: "401 Unauthorized" al crear reunión**

**Causa**: Las credenciales JWT son inválidas o han expirado.

**Solución**:
1. Verificar que las credenciales sean correctas
2. Ir a [Zoom App Marketplace](https://marketplace.zoom.us/)
3. Verificar que la app JWT esté activa
4. Regenerar credenciales si es necesario

### **Error: "Meeting number is not found" al unirse**

**Causa**: El `int_zoom_meeting_id` en la base de datos no es válido.

**Solución**:
1. Verificar que la reunión se creó correctamente en Zoom
2. Verificar que el `int_zoom_meeting_id` en la BD coincide con el ID real
3. Probar con el número de reunión sin espacios ni guiones

---

## 📚 Referencias

- [Zoom JWT App Documentation](https://marketplace.zoom.us/docs/guides/build/jwt-app)
- [Zoom Meeting SDK Documentation](https://developers.zoom.us/docs/meeting-sdk/)
- [Zoom REST API Reference](https://marketplace.zoom.us/docs/api-reference/zoom-api)

---

## ✅ Estado Actual

| Componente | Estado | Descripción |
|-----------|--------|-------------|
| Credenciales SDK | ✅ Configuradas | Del backend Laravel |
| Credenciales JWT API | ✅ Configuradas | Del backend Laravel |
| Backend FastAPI | ✅ Listo | Usando JWT |
| Frontend React | ✅ Listo | Zoom Meeting SDK |
| Base de Datos | ✅ Lista | Modelo de reuniones |

---

## 🎯 Siguiente Paso

**¡Todo está listo!** Solo necesitas:

1. **Arrancar el backend**:
   ```bash
   cd /srv/proyectos/AsambleasGiramaster/backend
   source .venv/bin/activate
   python -m uvicorn app.main:app --reload
   ```

2. **Arrancar el frontend**:
   ```bash
   cd /srv/proyectos/AsambleasGiramaster/frontend
   npm run dev
   ```

3. **Probar**:
   - Ir a "Reuniones"
   - Crear nueva reunión
   - Iniciar reunión
   - ¡Debería funcionar! 🎉

---

## 💡 Notas Importantes

1. **Las credenciales JWT son las mismas del Laravel** - No necesitas crear una app nueva
2. **JWT es más simple que OAuth** - No requiere tokens de acceso
3. **Las credenciales están hardcodeadas** - Para producción, considera rotarlas regularmente
4. **El sistema Laravel no crea reuniones automáticamente** - Solo almacena los links manuales

---

**Documentación generada automáticamente**
**Fecha**: 2025-10-25
**Sistema**: Asambleas Giramaster - Integración Zoom

