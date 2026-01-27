# 🧪 Guía de Pruebas de Endpoints QR con Postman/Bruno

## 📋 Requisitos Previos

1. Servidor backend corriendo en `http://localhost:8001`
2. Usuario con rol de Admin (rol 2) o SuperAdmin (rol 1) en la BD
3. Al menos un residente/copropietario en la base de datos

---

## 🔐 PASO 1: Autenticación (Obtener Token)

### **Endpoint:** Login
- **Método:** `POST`
- **URL:** `http://localhost:8001/api/v1/auth/login`
- **Headers:**
  ```
  Content-Type: application/x-www-form-urlencoded
  ```
- **Body (x-www-form-urlencoded):**
  ```
  username: tu_usuario_admin
  password: tu_contraseña
  ```

### **Ejemplo en Postman:**
1. Crear nueva request
2. Seleccionar método `POST`
3. URL: `http://localhost:8001/api/v1/auth/login`
4. En pestaña "Body" → seleccionar `x-www-form-urlencoded`
5. Agregar:
   - Key: `username` → Value: `admin` (tu usuario)
   - Key: `password` → Value: `admin123` (tu contraseña)
6. Click en "Send"

### **Respuesta Esperada:**
```json
{
  "success": true,
  "status_code": 200,
  "message": "Login exitoso",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "Admin"
    }
  }
}
```

### **💡 Importante:**
- Copia el valor de `access_token` - lo necesitarás para los siguientes pasos
- Este token expira después de cierto tiempo (verifica ACCESS_TOKEN_EXPIRE_MINUTES en settings)

---

## 📱 PASO 2: Generar QR Simple (Recomendado)

### **Endpoint:** Generate QR Simple
- **Método:** `POST`
- **URL:** `http://localhost:8001/api/v1/residents/generate-qr-simple`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer TU_ACCESS_TOKEN_AQUI
  ```
- **Body (raw JSON):**
  ```json
  {
    "userId": 1
  }
  ```

### **Ejemplo en Postman:**

#### **Configuración:**
1. Crear nueva request
2. Método: `POST`
3. URL: `http://localhost:8001/api/v1/residents/generate-qr-simple`
4. En pestaña "Headers" agregar:
   - Key: `Content-Type` → Value: `application/json`
   - Key: `Authorization` → Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (tu token del paso 1)
5. En pestaña "Body":
   - Seleccionar `raw`
   - Seleccionar `JSON` en el dropdown
   - Pegar el JSON del body
6. Click en "Send"

#### **Body Explicado:**
```json
{
  "userId": 1  // ← ID del residente para quien se genera el QR
}
```

### **Respuesta Esperada (Éxito):**
```json
{
  "success": true,
  "status_code": 200,
  "message": "Código QR generado exitosamente",
  "data": {
    "auto_login_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicHdkIjoiVGVtcF9QYXNzd29yZF8xMjMiLCJleHAiOjE3Mzg0ODMyNjcsImlhdCI6MTczODMxMDQ2NywidHlwZSI6ImF1dG9fbG9naW4ifQ.signature_here",
    "auto_login_url": "https://asambleas.giramaster.com/auto-login/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in_hours": 48
  },
  "meta": null
}
```

### **Errores Comunes:**

#### ❌ **Error 401: No autorizado**
```json
{
  "success": false,
  "message": "Token inválido o expirado",
  "error_code": "HTTP_401"
}
```
**Solución:** Token expirado o inválido. Vuelve al PASO 1 para obtener un nuevo token.

#### ❌ **Error 403: Sin permisos**
```json
{
  "success": false,
  "status_code": 403,
  "message": "No tienes permisos para generar códigos QR"
}
```
**Solución:** El usuario no es Admin o SuperAdmin. Necesitas un usuario con rol 1 o 2.

#### ❌ **Error 404: Usuario no encontrado**
```json
{
  "success": false,
  "status_code": 404,
  "message": "Usuario no encontrado"
}
```
**Solución:** El `userId` no existe en la base de datos. Verifica el ID correcto.

---

## 🎨 PASO 3 (Opcional): Generar QR Mejorado con Personalización

### **Endpoint:** Generate Enhanced QR
- **Método:** `POST`
- **URL:** `http://localhost:8001/api/v1/residents/enhanced-qr`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer TU_ACCESS_TOKEN_AQUI
  ```
- **Body (raw JSON):**
  ```json
  {
    "userId": 1,
    "include_personal_info": true,
    "qr_size": 400,
    "expiration_hours": 48
  }
  ```

### **Body Explicado:**
```json
{
  "userId": 1,                      // ID del residente
  "include_personal_info": true,    // Incluir nombre, apartamento en el QR
  "qr_size": 400,                   // Tamaño en píxeles (400x400)
  "expiration_hours": 48            // Horas de validez del token
}
```

### **Respuesta Esperada:**
```json
{
  "success": true,
  "status_code": 200,
  "message": "Código QR generado exitosamente",
  "data": {
    "qr_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "auto_login_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "auto_login_url": "https://asambleas.giramaster.com/auto-login/eyJhbGci...",
    "qr_filename": "qr_user_1_20260126_203615.png",
    "expires_in_hours": 48,
    "user_info": {
      "name": "Juan Pérez",
      "apartment": "A-101",
      "residential_unit": "Torres del Sol",
      "email": "juan.perez@example.com",
      "role": "Resident",
      "user_id": 1
    }
  }
}
```

### **💡 Ventajas del QR Mejorado:**
- Incluye logo corporativo
- Muestra nombre y apartamento del residente
- Fecha de generación visible
- Mayor calidad visual
- Imagen en base64 lista para mostrar

---

## 📊 PASO 4 (Opcional): Generar QRs Masivos

### **Endpoint:** Bulk QR Generation
- **Método:** `POST`
- **URL:** `http://localhost:8001/api/v1/residents/bulk-qr`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer TU_ACCESS_TOKEN_AQUI
  ```
- **Body (raw JSON):**
  ```json
  {
    "user_ids": [1, 2, 3, 4, 5],
    "qr_size": 400,
    "expiration_hours": 48
  }
  ```

### **Respuesta Esperada:**
```json
{
  "success": true,
  "status_code": 200,
  "message": "Generación completada: 5 QRs generados, 0 errores",
  "data": {
    "generated_qrs": [
      {
        "user_id": 1,
        "user_info": {
          "name": "Juan Pérez",
          "apartment": "A-101"
        },
        "qr_data": {
          "auto_login_token": "...",
          "qr_filename": "qr_user_1_20260126.png"
        }
      },
      // ... más QRs
    ],
    "total_generated": 5,
    "total_failed": 0
  }
}
```

---

## 🧪 PASO 5: Probar el QR Generado

### **Opción A: Copiar URL y abrirla en navegador**
1. De la respuesta, copia el valor de `auto_login_url`
2. Pégalo en un navegador
3. Deberías ser redirigido y autenticado automáticamente

### **Opción B: Generar QR desde Base64 (QR Mejorado)**
1. Copia el valor de `qr_base64` de la respuesta enhanced
2. Pega en un visor de imágenes base64 online (ejemplo: https://base64.guru/converter/decode/image)
3. Escanea el QR generado con tu teléfono
4. Deberías ser redirigido a la URL de auto-login

### **Opción C: Usar archivo PNG generado**
1. El QR se guardó en: `/backend/app/static/qr_codes/qr_user_1_YYYYMMDD_HHMMSS.png`
2. Abre el archivo con un visor de imágenes
3. Escanea con tu teléfono

---

## 📝 Collection de Postman Completa

```json
{
  "info": {
    "name": "QR Code Generation - Asambleas Giramaster",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login (Get Token)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/x-www-form-urlencoded"
          }
        ],
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            {
              "key": "username",
              "value": "admin",
              "type": "text"
            },
            {
              "key": "password",
              "value": "admin123",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:8001/api/v1/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8001",
          "path": ["api", "v1", "auth", "login"]
        }
      }
    },
    {
      "name": "2. Generate Simple QR",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": 1\n}"
        },
        "url": {
          "raw": "http://localhost:8001/api/v1/residents/generate-qr-simple",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8001",
          "path": ["api", "v1", "residents", "generate-qr-simple"]
        }
      }
    },
    {
      "name": "3. Generate Enhanced QR",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": 1,\n  \"include_personal_info\": true,\n  \"qr_size\": 400,\n  \"expiration_hours\": 48\n}"
        },
        "url": {
          "raw": "http://localhost:8001/api/v1/residents/enhanced-qr",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8001",
          "path": ["api", "v1", "residents", "enhanced-qr"]
        }
      }
    },
    {
      "name": "4. Generate Bulk QR",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"user_ids\": [1, 2, 3],\n  \"qr_size\": 400,\n  \"expiration_hours\": 48\n}"
        },
        "url": {
          "raw": "http://localhost:8001/api/v1/residents/bulk-qr",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8001",
          "path": ["api", "v1", "residents", "bulk-qr"]
        }
      }
    }
  ]
}
```

### **Cómo importar en Postman:**
1. Copia el JSON de arriba
2. En Postman: File → Import → Raw text
3. Pega el JSON y click "Import"
4. Tendrás una colección lista para usar

### **Variable de Entorno en Postman:**
1. Después del login exitoso, en la pestaña "Tests" del request de login, agrega:
   ```javascript
   var jsonData = pm.response.json();
   pm.environment.set("access_token", jsonData.data.access_token);
   ```
2. Esto guardará automáticamente el token para los siguientes requests

---

## 🔧 Troubleshooting

### **El servidor no responde:**
```bash
# Verificar que el servidor esté corriendo
ps aux | grep python

# Verificar el puerto
netstat -tlnp | grep 8001

# Iniciar servidor si no está corriendo
cd backend && make dev
```

### **Error de conexión rechazada:**
- Verifica que el servidor esté en el puerto 8001
- Cambia `localhost` por `127.0.0.1` si es necesario
- Verifica firewall o antivirus

### **Token expira muy rápido:**
- Verifica `ACCESS_TOKEN_EXPIRE_MINUTES` en `backend/app/core/config.py`
- Puedes aumentar el tiempo de expiración si es necesario

---

## 💡 Tips Adicionales

1. **Usar Variables en Postman:**
   - Crea una variable `{{base_url}}` con valor `http://localhost:8001`
   - URLs quedan como: `{{base_url}}/api/v1/residents/generate-qr-simple`

2. **Guardar Respuestas:**
   - Click derecho en request → "Save Response" → "Save as example"
   - Útil para documentación

3. **Logging en Backend:**
   - Observa la consola del servidor para ver logs detallados
   - Cada generación de QR loggea información del residente

4. **Testing Automatizado:**
   - Usa la pestaña "Tests" en Postman para validar automáticamente las respuestas
   - Ejemplo:
     ```javascript
     pm.test("Status code is 200", function () {
         pm.response.to.have.status(200);
     });
     
     pm.test("Response has auto_login_token", function () {
         var jsonData = pm.response.json();
         pm.expect(jsonData.data).to.have.property('auto_login_token');
     });
     ```

---

¡Listo! Con esta guía deberías poder probar todos los endpoints de QR en Postman o Bruno sin problemas. 🚀