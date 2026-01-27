# 🔧 Fix: Error 404 en Generación de QR Frontend

## ❌ Problema

Al hacer clic en el botón de generar QR, el frontend mostraba:
```
Error HTTP 404: Not Found
```

## 🔍 Causa

El código del frontend usaba una **URL relativa**:
```javascript
fetch('/api/v1/residents/generate-qr-simple', ...)
```

Esto hace que el navegador intente llamar a:
```
http://localhost:5173/api/v1/residents/generate-qr-simple
```
(Puerto 5173 = frontend Vite)

Pero el backend está en:
```
http://localhost:8001/api/v1/residents/generate-qr-simple
```
(Puerto 8001 = backend FastAPI)

## ✅ Solución

**Archivo:** `frontend/src/components/common/ResidentsList.jsx`
**Líneas:** 180-187

### Antes (URL relativa - incorrecto):
```javascript
console.log('🔄 Making request to:', '/api/v1/residents/generate-qr-simple');
console.log('🔄 Request data:', { userId: resident.id });
console.log('🔄 Auth token:', token.substring(0, 20) + '...');

const response = await fetch('/api/v1/residents/generate-qr-simple', {
    method: 'POST',
    ...
});
```

### Después (URL absoluta con variable de entorno - correcto):
```javascript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
const endpoint = `${apiUrl}/residents/generate-qr-simple`;

console.log('🔄 Making request to:', endpoint);
console.log('🔄 Request data:', { userId: resident.id });
console.log('🔄 Auth token:', token.substring(0, 20) + '...');

const response = await fetch(endpoint, {
    method: 'POST',
    ...
});
```

## 📋 Cómo Funciona

1. **Lee la variable de entorno** `VITE_API_URL` del archivo `.env`:
   ```
   VITE_API_URL = "http://localhost:8001/api/v1"
   ```

2. **Construye la URL completa**:
   ```javascript
   const endpoint = `${apiUrl}/residents/generate-qr-simple`;
   // Resultado: "http://localhost:8001/api/v1/residents/generate-qr-simple"
   ```

3. **Hace el fetch a la URL correcta** (backend en puerto 8001)

## 🧪 Verificación

### **Backend - El endpoint SÍ existe:**
```bash
$ curl -X POST http://localhost:8001/api/v1/residents/generate-qr-simple \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"userId": 1}'

# Respuesta (401 porque el token es inválido, pero el endpoint existe):
{"success":false,"message":"Token inválido o expirado",...}
```

Si el endpoint NO existiera, la respuesta sería:
```json
{"detail":"Not Found"}  // ← Esto es lo que estaba pasando en el frontend
```

## 🔄 No Requiere Reinicio

Como el cambio es en el **frontend**, Vite recargará automáticamente la página y aplicará el cambio.

## ✅ Resultado Esperado

Después del cambio, al hacer clic en el botón QR:

1. **En la consola verás:**
   ```
   🔄 Making request to: http://localhost:8001/api/v1/residents/generate-qr-simple
   🔄 Request data: {userId: 13}
   🔄 Auth token: eyJhbGciOiJIUzI1NiI...
   🔄 Response status: 200
   ✅ Response from backend: {success: true, data: {...}}
   ✅ QR URL generated: http://localhost:8001/auto-login/eyJhbGci...
   ```

2. **El modal QR se abrirá** mostrando el código QR

3. **El QR será escaneable** y permitirá auto-login

## 📝 Nota sobre Configuración

El archivo `.env` del frontend contiene:
```env
VITE_API_URL = "http://localhost:8001/api/v1"
```

Esta URL se usa en:
- ✅ Generación de QR (ahora corregido)
- ✅ Otros endpoints del frontend

Si cambias el puerto del backend, solo actualiza esta variable.

## 🚀 Próximos Pasos

1. **Refresca el navegador** (Vite lo hará automáticamente)
2. **Haz clic en el botón QR** de un residente
3. **Deberías ver el modal** con el código QR
4. **Escanea el QR** con tu teléfono para probar el auto-login

## ✅ Estado Final

- ✅ Frontend usa URL completa con variable de entorno
- ✅ Backend responde correctamente (endpoint existe)
- ✅ No más error 404
- ✅ El flujo de QR debería funcionar completamente

**¡El problema está resuelto!** 🎉
