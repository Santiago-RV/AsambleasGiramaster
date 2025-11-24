# ⚠️ ALERTAS DE SEGURIDAD CRÍTICAS

**Fecha:** 2025-11-24
**Estado:** REQUIERE ACCIÓN INMEDIATA

---

## 🔴 ACCIÓN REQUERIDA: Rotar Credenciales Expuestas

El archivo `.env` fue comprometido y contiene credenciales que **DEBEN SER ROTADAS INMEDIATAMENTE**:

### 1. Base de Datos MySQL
```
HOST_DB = "localhost"
USER_DB = "develop_db"
PASSWORD_DB = "Database_develop-user-2025"
NAME_DB = "db_giramaster"
```
**Acción requerida:**
- [ ] Cambiar la contraseña del usuario `develop_db` en MySQL
- [ ] Actualizar el archivo `.env` con la nueva contraseña
- [ ] Verificar que `.env` esté en `.gitignore` (✅ Ya verificado)

### 2. Zoom SDK Credentials
```
ZOOM_SDK_KEY = "v3RL9_2sSWK0HtBUXsKjtg"
ZOOM_SDK_SECRET = "1ZdWaM2lbEG0DOMk3LUj6J7rjGcSbXk1"
ZOOM_ACCOUNT_ID = "4nFl7Xj5Qu68SC0gocai9A"
ZOOM_CLIENT_ID = "NTVgxiKKQrCgJ72VHbtKw"
ZOOM_CLIENT_SECRET = "1GXpJbSZ9HMQvQQuS5XH6rYJ7IZw1dmC"
```
**Acción requerida:**
- [ ] Revocar las credenciales actuales en el dashboard de Zoom
- [ ] Generar nuevas credenciales SDK y OAuth
- [ ] Actualizar el archivo `.env` con las nuevas credenciales

### 3. Gmail SMTP
```
SMTP_USER = "gomezjosedavid997@gmail.com"
SMTP_PASSWORD = "myhu utmc skls bptl"  # App Password
```
**Acción requerida:**
- [ ] Revocar la contraseña de aplicación actual en Google Account Security
- [ ] Generar una nueva contraseña de aplicación
- [ ] Actualizar el archivo `.env` con la nueva contraseña

### 4. SECRET_KEY de JWT
```
SECRET_KEY = "6KpzSWJhGQHyhFDnvGe+9Kv07MU6ihJpFc8uto0PO5E="
```
**Acción requerida:**
- [ ] Generar una nueva SECRET_KEY segura
- [ ] Actualizar el archivo `.env` con la nueva clave
- [ ] **IMPORTANTE:** Esto invalidará todos los tokens JWT actuales, los usuarios deberán volver a iniciar sesión

---

## ✅ Correcciones Aplicadas (Prioridad 1)

### 1. SECRET_KEY Hardcodeada ✅
**Archivo:** `backend/app/auth/auth.py`
**Cambio:**
- ❌ Antes: `SECRET_KEY = "tu_clave_super_secreta"`
- ✅ Ahora: `SECRET_KEY = settings.SECRET_KEY`

### 2. fake_users_db Eliminado ✅
**Archivo:** `backend/app/api/v1/endpoints/auth_endpoint.py`
**Cambio:**
- ❌ Antes: Base de datos de usuarios falsos con contraseñas débiles
- ✅ Ahora: Código eliminado completamente

### 3. .gitignore Verificado ✅
**Archivo:** `.gitignore`
**Estado:** ✅ El archivo `.env` ya está incluido en `.gitignore` (línea 34)

---

## 📋 Pasos para Generar Nueva SECRET_KEY

```bash
# Opción 1: Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Opción 2: OpenSSL
openssl rand -base64 32
```

---

## 🔒 Recomendaciones Adicionales

1. **Auditar acceso al repositorio:** Verificar quién tuvo acceso al código con las credenciales expuestas
2. **Revisar logs de acceso:** Buscar intentos de acceso no autorizados a:
   - Base de datos
   - Cuenta de Zoom
   - Cuenta de Gmail
3. **Implementar monitoreo:** Configurar alertas para detectar accesos sospechosos
4. **Considerar gestión de secretos:** Para producción, usar servicios como AWS Secrets Manager, Azure Key Vault, o HashiCorp Vault

---

## 📞 Contacto

Si tienes dudas sobre este proceso de rotación de credenciales, contacta al equipo de seguridad.

**Última actualización:** 2025-11-24
