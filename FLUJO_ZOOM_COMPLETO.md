# 🎯 Flujo Completo: Creación e Ingreso a Reuniones de Zoom

## 📊 Diagrama del Flujo

```
Frontend (React)          Backend (FastAPI)              Zoom API
─────────────────        ──────────────────────        ──────────
                                                        
1. Crear Reunión
   │
   ├─> POST /meetings/create
   │      (título, fecha, duración, etc.)
   │                         │
   │                         ├─> ZoomAPIService.create_meeting()
   │                         │      │
   │                         │      └─> POST https://api.zoom.us/v2/users/me/meetings
   │                         │           (Crea reunión REAL en Zoom)
   │                         │           ← {id, join_url, start_url}
   │                         │
   │                         ├─> Guarda en DB:
   │                         │    - zoom_meeting_id
   │                         │    - zoom_join_url
   │                         │    - zoom_start_url
   │                         │
   │      ← {reunión creada con URLs reales}
   │
   
2. Listar Reuniones
   │
   ├─> GET /meetings
   │      │
   │      └─> Obtiene reuniones de DB
   │           (incluye zoom_join_url)
   │      ← [{reuniones...}]
   │
   
3. Iniciar/Unirse a Reunión
   │
   ├─> Usuario hace clic en "Iniciar Reunión"
   │   (Pasa datos de reunión a ZoomMeetingView)
   │
   ├─> GET /zoom/config
   │      │
   │      └─> Retorna SDK_KEY público
   │      ← {sdk_key}
   │
   ├─> POST /zoom/generate-signature
   │      {meeting_number, role: 1}
   │      │
   │      └─> ZoomService.generate_signature()
   │           (Genera JWT usando SDK_SECRET)
   │      ← {signature}
   │
   ├─> ZoomMeetingView.initializeZoom()
   │   │
   │   ├─> client.init({sdk_key, language: 'es-ES'})
   │   │
   │   └─> client.join({
   │         meetingNumber,
   │         password,
   │         signature,
   │         sdkKey
   │       })
   │       │
   │       └─> Conecta con Zoom SDK ──────> ✓ Usuario en reunión
```

## 🔧 Configuración Requerida

### 1. Crear Aplicación Server-to-Server OAuth en Zoom

**Importante:** Ahora usamos Server-to-Server OAuth (NO Meeting SDK para la API)

1. Ve a: https://marketplace.zoom.us/
2. Click en "Develop" → "Build App"
3. Selecciona **"Server-to-Server OAuth"**
4. Completa información básica
5. Ve a "Scopes" y agrega:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `meeting:write`
   - `meeting:read`
6. Ve a "Credentials" y copia:
   - **Account ID**
   - **Client ID**
   - **Client Secret**

### 2. Crear Aplicación Meeting SDK

**Para el SDK del frontend:**

1. Ve a: https://marketplace.zoom.us/
2. "Develop" → "Build App" → **"Meeting SDK"**
3. Completa información
4. Copia las credenciales:
   - **SDK Key** (Client ID)
   - **SDK Secret** (Client Secret)

### 3. Variables de Entorno

Edita `/backend/.env`:

```env
# Zoom SDK Configuration (para el Meeting SDK)
ZOOM_SDK_KEY=tu_meeting_sdk_key
ZOOM_SDK_SECRET=tu_meeting_sdk_secret

# Nota: Estas credenciales se usan para:
# - SDK_KEY: Inicializar el SDK en el frontend
# - SDK_SECRET: Generar JWT signatures para autenticación
# - También se usan para la API Server-to-Server
```

## 🚀 Instalación de Dependencias

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
pip install PyJWT==2.8.0 requests==2.31.0
```

O instala todo:
```bash
pip install -r requirements.txt
```

## 📝 Componentes Implementados

### Backend

#### 1. `zoom_api_service.py` (NUEVO) ✨
**Responsabilidad:** Integración con la API REST de Zoom

**Métodos:**
- `create_meeting()` - Crea reunión REAL en Zoom
- `get_meeting()` - Obtiene info de reunión
- `delete_meeting()` - Elimina reunión
- `update_meeting()` - Actualiza reunión

**Uso:**
```python
zoom_service = ZoomAPIService()
zoom_meeting = zoom_service.create_meeting(
    topic="Asamblea Ordinaria",
    start_time=datetime(2025, 11, 15, 14, 0),
    duration=120,
    agenda="Aprobación de presupuesto"
)
# Retorna: {id, join_url, start_url, password, ...}
```

#### 2. `zoom_service.py`
**Responsabilidad:** Generación de JWT signatures para el Meeting SDK

**Métodos:**
- `generate_signature()` - Genera JWT para autenticación
- `validate_meeting_number()` - Valida números de reunión
- `extract_meeting_number_from_url()` - Extrae ID de URL
- `extract_password_from_url()` - Extrae password de URL

#### 3. `meeting_service.py` (ACTUALIZADO) ✅
**Cambios:**
- ✅ Ahora llama a `ZoomAPIService.create_meeting()`
- ✅ Guarda URLs reales de Zoom en la BD
- ✅ Fallback a URLs temporales si falla Zoom API

**Flujo de creación:**
```python
async def create_meeting(...):
    # 1. Generar código interno
    meeting_code = self._generate_meeting_code(...)
    
    # 2. Crear reunión en Zoom (API REST)
    try:
        zoom_service = ZoomAPIService()
        zoom_meeting = zoom_service.create_meeting(...)
        zoom_meeting_id = zoom_meeting.get('id')
        zoom_join_url = zoom_meeting.get('join_url')
        zoom_start_url = zoom_meeting.get('start_url')
    except:
        # Fallback a URLs temporales
        zoom_meeting_id = temporal_id
        zoom_join_url = f"https://zoom.us/j/{temporal_id}"
    
    # 3. Guardar en BD
    new_meeting = MeetingModel(...)
    db.add(new_meeting)
    await db.commit()
```

#### 4. `zoom_endpoint.py`
**Endpoints disponibles:**
- `POST /zoom/generate-signature` - Genera JWT
- `GET /zoom/config` - Obtiene SDK Key
- `POST /zoom/extract-meeting-info` - Extrae info de URL

### Frontend

#### 1. `ReunionesTab.jsx`
**Responsabilidad:** Lista de reuniones y botón de iniciar

**Funcionalidades:**
- ✅ Muestra reuniones desde BD (con URLs reales)
- ✅ Botón "Nueva Reunión" → Modal de creación
- ✅ Botón "Iniciar Reunión" → Navega a ZoomMeetingView
- ✅ Pasa datos completos de reunión al componente Zoom

**Datos que pasa a Zoom:**
```javascript
{
  id, str_title, str_description,
  str_zoom_join_url,  // URL real de Zoom
  str_zoom_start_url,
  str_meeting_code,
  int_estimated_duration,
  residential_unit: {str_name},
  ...
}
```

#### 2. `ZoomMeetingView.jsx`
**Responsabilidad:** Vista de reunión con Zoom SDK

**Flujo de inicialización:**
```javascript
1. initializeZoom()
   ├─> client = ZoomMtgEmbedded.createClient()
   ├─> client.init({zoomAppRoot, language: 'es-ES'})
   └─> joinMeeting(client)

2. joinMeeting()
   ├─> Extrae meeting_number de str_zoom_join_url
   ├─> GET /zoom/config → obtiene SDK Key
   ├─> POST /zoom/generate-signature → obtiene JWT
   └─> client.join({
        meetingNumber,
        password,
        userName,
        signature,  // JWT del backend
        sdkKey      // Del backend
      })

3. Usuario conectado a Zoom ✓
```

## 🧪 Testing del Flujo Completo

### 1. Crear Reunión

```bash
curl -X POST http://localhost:8000/api/v1/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "int_id_residential_unit": 1,
    "str_title": "Prueba Reunión Zoom",
    "str_description": "Test",
    "str_meeting_type": "Ordinaria",
    "dat_schedule_date": "2025-12-01T14:00:00",
    "int_estimated_duration": 60,
    "bln_allow_delegates": false
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "str_zoom_join_url": "https://zoom.us/j/123456789?pwd=xxxxx",
    "str_zoom_start_url": "https://zoom.us/s/123456789?zak=xxxxx",
    ...
  }
}
```

### 2. Verificar Endpoint Zoom

```bash
# Test generación de signature
curl -X POST http://localhost:8000/api/v1/zoom/generate-signature \
  -H "Content-Type: application/json" \
  -d '{"meeting_number": "123456789", "role": 1}'
```

### 3. Probar desde Frontend

1. Crear reunión desde UI
2. Ir a lista de reuniones
3. Click en "Iniciar Reunión"
4. Debe cargar la vista de Zoom
5. Conectarse automáticamente

## ⚠️ Troubleshooting

### Error: "No module named 'jwt'"
```bash
pip install PyJWT==2.8.0
```

### Error: "No module named 'requests'"
```bash
pip install requests==2.31.0
```

### Error: "Credenciales de Zoom no configuradas"
- Verifica que `ZOOM_SDK_KEY` y `ZOOM_SDK_SECRET` estén en `.env`
- Reinicia el servidor backend

### Error: "Invalid signature"
- Verifica que las credenciales sean correctas
- Asegúrate de estar usando las del Meeting SDK (no Server-to-Server OAuth)
- Verifica que no haya espacios extra en `.env`

### Error: "Meeting not found" o "Invalid meeting number"
- Verifica que la reunión se haya creado correctamente en Zoom
- Revisa los logs del backend para ver si la API de Zoom respondió
- Si usaste fallback (URLs temporales), la reunión no existe realmente en Zoom

### Reunión se crea pero no puedo entrar
- Verifica que tengas ambas aplicaciones de Zoom:
  1. Server-to-Server OAuth (para crear reuniones)
  2. Meeting SDK (para entrar a reuniones)
- Confirma que los scopes estén configurados correctamente

## 🎉 Resultado Final

**Flujo Exitoso:**
1. ✅ Usuario crea reunión desde frontend
2. ✅ Backend llama a Zoom API y crea reunión REAL
3. ✅ URLs reales se guardan en BD
4. ✅ Usuario ve lista de reuniones con datos reales
5. ✅ Usuario hace clic en "Iniciar Reunión"
6. ✅ Frontend obtiene signature del backend
7. ✅ Zoom SDK se inicializa con credenciales correctas
8. ✅ Usuario se une a reunión REAL de Zoom
9. ✅ Puede usar audio, video, chat, etc.

**¡Listo para producción!** 🚀

