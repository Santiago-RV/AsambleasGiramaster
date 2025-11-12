# ⚡ Solución Rápida: Hacer Funcionar Zoom AHORA

## 🎯 Problema
Las credenciales están configuradas pero no puedes entrar a las reuniones.

## ✅ Solución en 3 Pasos (5 minutos)

### Paso 1: Obtener tu PMI de Zoom

1. Ve a: https://zoom.us/profile
2. Inicia sesión
3. Busca **"Personal Meeting ID (PMI)"**
4. Verás algo como: `123-456-7890`
5. Copia SOLO los números: `1234567890`

### Paso 2: Agregar PMI al .env

Edita el archivo `.env` en el backend:

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
nano .env
```

Agrega esta línea (con TU PMI):

```env
# Zoom Configuration
ZOOM_SDK_KEY=tu_sdk_key_actual
ZOOM_SDK_SECRET=tu_sdk_secret_actual
ZOOM_PMI=1234567890
```

**Ejemplo completo:**
```env
ZOOM_SDK_KEY=abc123XYZ456def789
ZOOM_SDK_SECRET=xyz789ABC123def456GHI789jkl012
ZOOM_PMI=1234567890
```

### Paso 3: Reiniciar Backend

```bash
# El servidor con --reload se recarga automáticamente
# O reinicia manualmente si es necesario
pkill -f uvicorn
cd /srv/proyectos/AsambleasGiramaster/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🎉 ¡Listo! Ahora Funciona

### Qué hace esto:
- ✅ **Todas** las reuniones usarán **TU sala personal de Zoom**
- ✅ Puedes entrar a cualquier reunión creada en el sistema
- ✅ No necesitas crear reuniones manualmente en Zoom
- ✅ Tu PMI está siempre disponible 24/7

### Cómo usar:
1. Crea una reunión en el sistema
2. Click en "Iniciar Reunión"
3. ✅ Te conecta a tu sala de Zoom personal
4. ✅ Audio, video, chat funcionan

---

## 🔍 Verificar que Funciona

### Test 1: Ver el PMI configurado

```bash
cd /srv/proyectos/AsambleasGiramaster/backend
grep ZOOM_PMI .env
```

Deberías ver:
```
ZOOM_PMI=1234567890
```

### Test 2: Crear Reunión y Ver Logs

1. Crea una reunión desde el frontend
2. Revisa los logs:

```bash
tail -f /srv/proyectos/AsambleasGiramaster/backend/logs/app.log
```

Deberías ver:
```
Usando PMI de Zoom configurado: 1234567890
```

### Test 3: Iniciar Reunión

1. Ve a la lista de reuniones
2. Click en "Iniciar Reunión"
3. Debe cargar la vista de Zoom
4. Te conectas a tu sala personal
5. ✅ Funciona!

---

## 💡 Ventajas de Usar PMI

### ✅ Pros:
- Simple y rápido de configurar
- Siempre disponible (tu sala 24/7)
- No necesitas crear reuniones en Zoom manualmente
- Funciona con cuenta Zoom gratuita
- No necesitas OAuth ni API compleja

### ⚠️ Consideraciones:
- Todas las reuniones usan la misma sala de Zoom
- No puedes tener múltiples reuniones simultáneas
- Los invitados ven tu PMI en la URL

---

## 🚀 Siguiente Nivel (Opcional)

Si más adelante quieres que **cada reunión tenga su propia sala**:

### Opción A: Crear Reuniones Manualmente
1. Programa reunión en Zoom.us
2. Copia la URL
3. Agrega campo "Zoom URL" al formulario
4. Pega la URL al crear la reunión

### Opción B: OAuth Completo
1. Crea app "Server-to-Server OAuth" en Zoom
2. Configura credenciales OAuth
3. El sistema crea reuniones únicas automáticamente

Por ahora, **el PMI funciona perfectamente** para empezar. 🎯

---

## 🐛 Si No Funciona

### Error: "Meeting not found"
- Verifica que copiaste el PMI correctamente (solo números)
- Asegúrate de que el PMI esté habilitado en tu cuenta de Zoom
- Ve a Zoom Settings → Personal Meeting Room → Activar PMI

### Error: "Signature invalid"
- Verifica ZOOM_SDK_KEY y ZOOM_SDK_SECRET en .env
- Asegúrate de no tener espacios extra
- Las credenciales deben ser del "Meeting SDK" app

### No aparece en los logs
- Verifica que guardaste el .env
- Reinicia el servidor backend
- Verifica con: `cat .env | grep ZOOM_PMI`

---

## 📞 Resumen

```bash
# 1. Obtener PMI
https://zoom.us/profile → Copiar PMI

# 2. Agregar a .env
echo "ZOOM_PMI=1234567890" >> /srv/proyectos/AsambleasGiramaster/backend/.env

# 3. Reiniciar (se recarga solo con --reload)
# O manualmente:
# pkill -f uvicorn && cd backend && uvicorn app.main:app --reload

# 4. ¡Funciona! 🎉
```

