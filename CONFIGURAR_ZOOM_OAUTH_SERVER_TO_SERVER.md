# 🔐 Configurar Zoom OAuth Server-to-Server

## ✅ **Todo Está Listo para Configurar**

El código ya está actualizado para usar **OAuth Server-to-Server**. Solo necesitas agregar tus credenciales.

---

## 📋 **Pasos Rápidos:**

### **1. Abre tu .env del backend**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
nano .env
```

### **2. Elimina las líneas JWT viejas (si existen)**

Busca y elimina:
```env
ZOOM_JWT_API_KEY = "..."
ZOOM_JWT_API_SECRET = "..."
```

### **3. Agrega tus credenciales OAuth**

Al final del archivo `.env`, agrega:

```env
# Zoom OAuth Server-to-Server (para API REST - crear reuniones)
ZOOM_ACCOUNT_ID = "TU_ACCOUNT_ID"
ZOOM_CLIENT_ID = "TU_CLIENT_ID"
ZOOM_CLIENT_SECRET = "TU_CLIENT_SECRET"
```

**Reemplaza** `TU_ACCOUNT_ID`, `TU_CLIENT_ID` y `TU_CLIENT_SECRET` con tus credenciales reales.

### **4. Guarda el archivo**

- `Ctrl+O` → Enter → `Ctrl+X`

---

## 🧪 **Probar las Credenciales**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
source .venv/bin/activate
python test_zoom_oauth.py
```

**Si todo funciona**, verás:

```
✅ ¡TODAS LAS PRUEBAS PASARON!
🎉 La integración OAuth Server-to-Server está funcionando correctamente
```

---

## 🚀 **Arrancar el Sistema**

### **Terminal 1 - Backend:**
```bash
cd /srv/proyectos/AsambleasGiramaster/backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Terminal 2 - Frontend:**
```bash
cd /srv/proyectos/AsambleasGiramaster/frontend
npm run dev
```

---

## 🎯 **Crear Reunión Automáticamente**

1. Abre http://localhost:5173
2. Inicia sesión
3. Ve a **"Reuniones"**
4. Click en **"Nueva Reunión"**
5. Llena el formulario
6. Click en **"Crear"**

**¡El sistema creará automáticamente la reunión en Zoom!** 🎉

---

## 🔍 **Dónde Encontrar tus Credenciales**

### **Opción A: Ya tienes la app creada**

1. Ve a https://marketplace.zoom.us/
2. Click en **"Manage"** (arriba derecha)
3. Click en **"Build App"** o **"Created Apps"**
4. Selecciona tu app **Server-to-Server OAuth**
5. Ve a la pestaña **"App Credentials"**
6. Copia:
   - **Account ID**
   - **Client ID**
   - **Client Secret**

### **Opción B: Crear nueva app**

1. Ve a https://marketplace.zoom.us/
2. Click en **"Develop"** → **"Build App"**
3. Selecciona **"Server-to-Server OAuth"**
4. Llena la información básica:
   - **App Name**: "Asambleas Giramaster"
   - **Company Name**: Tu empresa
   - **Developer Contact**: Tu email
5. Click en **"Create"**
6. Copia las credenciales:
   - **Account ID**
   - **Client ID**
   - **Client Secret**
7. Ve a **"Scopes"** y agrega:
   - ✅ `meeting:write:admin` (Crear reuniones)
   - ✅ `meeting:read:admin` (Leer información de reuniones)
8. Click en **"Continue"** y **"Activate"**

---

## 📝 **Ejemplo de .env Completo**

```env
# ... otras configuraciones ...

# Zoom SDK Configuration (para Meeting SDK - frontend)
ZOOM_SDK_KEY = "2kch2h4jTQm7acvhFmaFeg"
ZOOM_SDK_SECRET = "xOnkvKTrH1edbkoZ8gDrot54XuLavTKR"

# Zoom OAuth Server-to-Server (para API REST - crear reuniones)
ZOOM_ACCOUNT_ID = "abc_XyzDefGhi123"
ZOOM_CLIENT_ID = "A1B2C3D4E5F6G7H8I9J0"
ZOOM_CLIENT_SECRET = "XyZ123AbC456DeF789GhI012JkL345"
```

---

## 🐛 **Solución de Problemas**

### **Error: "Credenciales OAuth no configuradas"**

**Solución:** Verifica que las 3 variables estén en el `.env`:
- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

### **Error: "Error al obtener token: 401"**

**Causas:**
- Las credenciales son incorrectas
- Copiaste mal alguna credencial
- La app no está activada

**Solución:**
1. Verifica que copiaste las credenciales correctamente
2. Ve a https://marketplace.zoom.us/ y verifica que la app esté **Activated**

### **Error: "Error al crear reunión: 403"**

**Causa:** La app no tiene los permisos (scopes) necesarios

**Solución:**
1. Ve a tu app en https://marketplace.zoom.us/
2. Ve a **"Scopes"**
3. Asegúrate de tener:
   - ✅ `meeting:write:admin`
   - ✅ `meeting:read:admin`
4. Click en **"Continue"**
5. **Desactiva y reactiva** la app para que los cambios surtan efecto

### **Error: "Signature is invalid (3712)"**

**Causa:** Problema con el Meeting SDK (frontend), no con OAuth

**Solución:** Las credenciales `ZOOM_SDK_KEY` y `ZOOM_SDK_SECRET` pueden estar incorrectas o expiradas. Estas son diferentes a las OAuth y se usan solo para unirse a reuniones desde el navegador.

---

## 🔄 **Flujo Completo**

```
┌─────────────────────────────────────────────────────────┐
│           CREAR REUNIÓN (Automático)                    │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  1. Usuario llena formulario                            │
│  2. Frontend envía POST /api/v1/meetings/create         │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  3. Backend (meeting_service.py):                       │
│     - Llama a ZoomAPIService.create_meeting()           │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  4. ZoomAPIService (zoom_api_service.py):               │
│     - Obtiene access token con OAuth                    │
│     - POST https://api.zoom.us/v2/users/me/meetings     │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  5. Zoom devuelve:                                       │
│     - Meeting ID: 82045341792                           │
│     - Join URL: https://zoom.us/j/82045341792?pwd=...   │
│     - Password: abc123                                   │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  6. Backend guarda en base de datos                     │
│  7. Frontend muestra la reunión en la lista             │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  8. Usuario click en "Iniciar Reunión"                  │
│  9. Zoom Meeting SDK se carga                           │
│  10. Usuario se une a la reunión ✅                     │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **Checklist**

- [ ] Credenciales OAuth copiadas de Zoom Marketplace
- [ ] Archivo `.env` actualizado
- [ ] Script `test_zoom_oauth.py` ejecutado exitosamente
- [ ] Backend arrancado
- [ ] Frontend arrancado
- [ ] Reunión creada desde la interfaz
- [ ] Reunión aparece en Zoom (https://zoom.us/)
- [ ] Puedo iniciar y unirme a la reunión

---

## 📚 **Archivos Modificados**

- ✅ `backend/app/core/config.py` - Variables OAuth agregadas
- ✅ `backend/app/services/zoom_api_service.py` - Usa OAuth en lugar de JWT
- ✅ `backend/test_zoom_oauth.py` - Script de prueba
- ✅ `backend/.env` - Credenciales (debes actualizar manualmente)

---

**¿Listo? Agrega tus credenciales al `.env` y ejecuta `python test_zoom_oauth.py`** 🚀

