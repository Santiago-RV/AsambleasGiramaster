# 🖼️ Cómo Ver la Imagen QR Generada

## Problema
El endpoint `/generate-qr-simple` no genera imagen, solo token y URL.

## Solución: Usar Endpoint Enhanced

### **Opción 1: Endpoint Enhanced (Genera Imagen QR)**

**Request en Postman/Bruno:**

```
POST http://localhost:8001/api/v1/residents/enhanced-qr

Headers:
  Content-Type: application/json
  Authorization: Bearer TU_TOKEN

Body (JSON):
{
  "userId": 1,
  "include_personal_info": true,
  "qr_size": 400,
  "expiration_hours": 48
}
```

**Respuesta Esperada:**
```json
{
  "success": true,
  "data": {
    "qr_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
    "auto_login_token": "eyJhbGci...",
    "auto_login_url": "https://asambleas.giramaster.com/auto-login/...",
    "qr_filename": "qr_user_1_20260126_214551.png",
    "expires_in_hours": 48,
    "user_info": {
      "name": "Juan Pérez",
      "apartment": "A-101",
      "residential_unit": "Torres del Sol"
    }
  }
}
```

### **Ver la Imagen QR:**

#### **Método 1: Copiar Base64 y Ver en Navegador**
1. Copia el valor completo de `qr_base64` (incluye el `data:image/png;base64,...`)
2. Crea un archivo HTML temporal:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>QR Code Generado</h1>
  <img src="PEGA_AQUI_EL_BASE64_COMPLETO" alt="QR Code">
</body>
</html>
```

3. Abre el HTML en tu navegador
4. Deberías ver el QR con logo y datos del usuario

#### **Método 2: Usar Herramienta Online**
1. Copia solo la parte después de `base64,`
2. Ve a: https://base64.guru/converter/decode/image
3. Pega el código base64
4. Click en "Decode"
5. Verás la imagen del QR

#### **Método 3: Ver Archivo PNG en el Servidor**
El QR se guarda automáticamente en:
```
/srv/proyectos/AsambleasGiramaster/backend/app/static/qr_codes/qr_user_1_YYYYMMDD_HHMMSS.png
```

**Comando para ver los QRs generados:**
```bash
ls -la /srv/proyectos/AsambleasGiramaster/backend/app/static/qr_codes/
```

**Abrir el último QR generado:**
```bash
# Linux
xdg-open $(ls -t /srv/proyectos/AsambleasGiramaster/backend/app/static/qr_codes/*.png | head -1)

# O simplemente ir a la carpeta y abrir el archivo
cd /srv/proyectos/AsambleasGiramaster/backend/app/static/qr_codes/
```

---

## 🎨 **Cómo Funciona el Frontend (Endpoint Simple)**

El endpoint simple está diseñado para que el **frontend genere el QR** usando JavaScript:

```javascript
// En ResidentsList.jsx (líneas 174-195)

// 1. Backend genera solo la URL
const response = await fetch('/api/v1/residents/generate-qr-simple', {
  body: JSON.stringify({ userId: resident.id })
});

const data = await response.json();
const token = data.data.auto_login_token;
const url = `${frontendUrl}/auto-login/${token}`;

// 2. Frontend usa librería 'qrcode' para generar la imagen
import QRCode from 'qrcode';

QRCode.toDataURL(url, options)
  .then(qrDataUrl => {
    // qrDataUrl contiene la imagen QR en base64
    // Se muestra en el modal QRCodeModal.jsx
  });
```

---

## 📊 **Comparación de Métodos:**

| Método | Dónde se Genera | Personalización | Logo | Archivo PNG |
|--------|-----------------|-----------------|------|-------------|
| `/generate-qr-simple` | Frontend (JS) | Básica | ❌ No | ❌ No |
| `/enhanced-qr` | Backend (Python) | Avanzada | ✅ Sí | ✅ Sí |
| Frontend (QRCodeModal) | Frontend (JS) | Media | ❌ No | ❌ No |

---

## 🚀 **Recomendación:**

### **Para Ver Imagen Ahora:**
Usa el endpoint `/enhanced-qr` en Postman - verás el QR completo con logo e información

### **Para Producción:**
El flujo actual del frontend es correcto:
1. Backend genera token (simple)
2. Frontend genera QR visual (librería qrcode)
3. Usuario escanea QR del modal

### **Para QRs Impresos/Email:**
Usa `/enhanced-qr` o `/send-enhanced-qr-email` - genera QR de alta calidad con branding

---

## 🧪 **Ejemplo Completo con cURL:**

```bash
# Obtener token
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" | jq -r '.data.access_token')

# Generar QR enhanced
curl -X POST http://localhost:8001/api/v1/residents/enhanced-qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": 1,
    "include_personal_info": true,
    "qr_size": 400,
    "expiration_hours": 48
  }' | jq '.'

# El QR también se guarda en:
# backend/app/static/qr_codes/qr_user_1_YYYYMMDD_HHMMSS.png
```

---

## ✅ **Resumen:**

1. **Endpoint Simple** → Solo URL (frontend genera imagen)
2. **Endpoint Enhanced** → URL + Imagen QR con logo
3. **Archivo PNG** → Se guarda en `/backend/app/static/qr_codes/`
4. **Base64** → Viene en la respuesta del endpoint enhanced

¿Quieres que te ayude a probar el endpoint enhanced para ver la imagen?
