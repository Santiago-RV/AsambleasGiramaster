# 🎥 Obtener Credenciales Meeting SDK

## ¿Para Qué Sirve el Meeting SDK?

Las credenciales **Meeting SDK** (`ZOOM_SDK_KEY` y `ZOOM_SDK_SECRET`) se usan para:
- ✅ **Unirse a reuniones desde el navegador**
- ✅ Generar el JWT signature para autenticarse
- ✅ Cargar el componente de video de Zoom

**NO se usan para crear reuniones** (eso es OAuth Server-to-Server).

---

## 🚀 Paso a Paso

### **1. Ir a Zoom Marketplace**

Abre: **https://marketplace.zoom.us/**

### **2. Crear App Meeting SDK**

1. Click en **"Develop"** (arriba derecha)
2. Click en **"Build App"**
3. Selecciona **"Meeting SDK"**
4. Click en **"Create"**

### **3. Configurar la App**

#### **Basic Information:**
- **App Name**: `Asambleas Giramaster Meeting SDK`
- **Short Description**: `SDK para reuniones virtuales`
- **Company Name**: Tu empresa
- **Developer Contact Information**:
  - Name: Tu nombre
  - Email: Tu email

#### **App Type:**
- Selecciona: **"Account-level app"**
  - Esto permite que todos los usuarios de tu cuenta Zoom usen la app

#### **Publish:**
- ✅ "I agree to the terms..."
- Click en **"Continue"**

### **4. Copiar Credenciales**

En la página que aparece, verás:

```
┌─────────────────────────────────────────────────────┐
│             App Credentials                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SDK Key (Client ID):                              │
│  [Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0]                │
│                                                     │
│  SDK Secret (Client Secret):                       │
│  [XyZ123AbC456DeF789GhI012JkL345MnO]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Copia ambos valores.**

### **5. Actualizar tu .env**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
nano .env
```

Actualiza las líneas:

```env
# Zoom SDK Configuration (para Meeting SDK - frontend)
ZOOM_SDK_KEY = "Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0"
ZOOM_SDK_SECRET = "XyZ123AbC456DeF789GhI012JkL345MnO"
```

**Guarda:** `Ctrl+O` → Enter → `Ctrl+X`

### **6. Probar las Credenciales**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
source .venv/bin/activate
python test_zoom_sdk_signature.py
```

**Salida esperada:**
```
✅ LAS CREDENCIALES SDK ESTÁN BIEN CONFIGURADAS
```

---

## 🧪 Probar en el Frontend

### **1. Arrancar Backend:**

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **2. Arrancar Frontend:**

```bash
cd /srv/proyectos/AsambleasGiramaster/frontend
npm run dev
```

### **3. Crear y Unirse a Reunión:**

1. Abre **http://localhost:5173**
2. Inicia sesión con tu usuario SuperAdministrador
3. Ve a **"Reuniones"**
4. Click en **"Nueva Reunión"**
5. Llena el formulario:
   - Título: "Reunión de Prueba"
   - Unidad Residencial: Selecciona una
   - Fecha: Hoy o mañana
   - Duración: 60 minutos
   - Tipo: Ordinaria
6. Click en **"Crear"**
7. **¡La reunión se crea automáticamente en Zoom!**
8. Click en **"Iniciar Reunión"**
9. **¡Deberías entrar al video de Zoom en el navegador!** 🎉

---

## 🐛 Solución de Problemas

### **Error: "Signature is invalid" (3712)**

**Causa:** Las credenciales SDK no son válidas

**Solución:**
1. Verifica que copiaste bien las credenciales
2. Asegúrate de que la app está **activa** en Zoom Marketplace
3. Si creaste la app hace poco, espera 1-2 minutos
4. Regenera las credenciales:
   - Ve a tu app en Zoom Marketplace
   - "Regenerate" Client Secret
   - Actualiza el `.env`

### **Error: "SDK Key not configured"**

**Causa:** El backend no encuentra las credenciales

**Solución:**
1. Verifica que el `.env` tiene las líneas correctas
2. Reinicia el backend
3. Verifica que no haya espacios extra en las credenciales

### **La reunión no carga**

**Posibles causas:**
- El número de reunión es incorrecto
- La reunión fue eliminada en Zoom
- El password es incorrecto

**Solución:**
1. Verifica en https://zoom.us/ que la reunión existe
2. Verifica que el `int_zoom_meeting_id` en la BD es correcto
3. Verifica que el `str_zoom_password` es correcto

---

## 📊 Diferencias: OAuth vs Meeting SDK

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  OAuth Server-to-Server                               │
│  ├─ Para: CREAR reuniones                             │
│  ├─ Uso: Backend (meeting_service.py)                 │
│  ├─ Credenciales:                                      │
│  │   • ZOOM_ACCOUNT_ID                                │
│  │   • ZOOM_CLIENT_ID                                 │
│  │   • ZOOM_CLIENT_SECRET                             │
│  └─ ✅ Ya funciona                                     │
│                                                        │
│  Meeting SDK                                           │
│  ├─ Para: UNIRSE a reuniones (navegador)              │
│  ├─ Uso: Frontend (ZoomMeetingView.jsx)               │
│  ├─ Credenciales:                                      │
│  │   • ZOOM_SDK_KEY                                   │
│  │   • ZOOM_SDK_SECRET                                │
│  └─ ⚠️  Necesitas verificar/actualizar                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist

- [ ] App Meeting SDK creada en Zoom Marketplace
- [ ] Credenciales copiadas (SDK Key y SDK Secret)
- [ ] `.env` actualizado con credenciales
- [ ] Test ejecutado (`python test_zoom_sdk_signature.py`)
- [ ] Backend reiniciado
- [ ] Frontend arrancado
- [ ] Reunión creada desde la interfaz
- [ ] ✅ **Puedo unirme a la reunión desde el navegador**

---

## 📚 Referencias

- [Zoom Meeting SDK Documentation](https://developers.zoom.us/docs/meeting-sdk/)
- [Zoom Marketplace](https://marketplace.zoom.us/)
- [Build a Meeting SDK App](https://developers.zoom.us/docs/meeting-sdk/create/)

---

**¿Listo? Crea tu app Meeting SDK y actualiza las credenciales!** 🚀

