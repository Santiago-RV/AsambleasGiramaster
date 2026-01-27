# 🔧 Fix: Corrección del Método de Hash de Contraseña

## ❌ Problema

Al intentar generar un QR, se producía el siguiente error:

```
AttributeError: 'SecurityManager' object has no attribute 'get_password_hash'. 
Did you mean: 'create_password_hash'?
```

## 🔍 Causa

El código intentaba usar `security_manager.get_password_hash()` pero el método correcto en la clase `SecurityManager` es `create_password_hash()`.

## ✅ Solución

**Archivo:** `backend/app/api/v1/endpoints/simple_qr_endpoint.py`
**Línea:** 87

### Antes (incorrecto):
```python
target_user.str_password_hash = security_manager.get_password_hash(temp_password)
```

### Después (correcto):
```python
target_user.str_password_hash = security_manager.create_password_hash(temp_password)
```

## 📋 Métodos Disponibles en SecurityManager

Según `app/core/security.py`:

1. **`create_password_hash(password: str) -> str`** ✅
   - Crea un hash bcrypt de una contraseña en texto plano
   - Retorna el hash listo para guardar en BD

2. **`verify_password(plain_password: str, hashed_password: str) -> bool`**
   - Verifica si una contraseña coincide con un hash
   - Retorna True si coincide, False si no

3. **`verify_and_update(plain_password: str, hashed_password: str) -> tuple[bool, str | None]`**
   - Verifica y opcionalmente actualiza el hash si es necesario
   - Retorna (coincide, nuevo_hash_si_aplica)

## 🧪 Verificación

```bash
# Compilar para verificar sintaxis
cd backend && .venv/bin/python -m py_compile app/api/v1/endpoints/simple_qr_endpoint.py
# ✅ Sintaxis correcta
```

## 🚀 Próximo Paso

Reiniciar el servidor backend para que cargue el cambio:

```bash
# Matar el servidor actual
pkill -f "python.*main"

# Reiniciar
cd backend && make dev
```

## ✅ Resultado Esperado

Después del fix, al generar un QR:

1. ✅ Se genera contraseña temporal aleatoria
2. ✅ Se crea hash con `create_password_hash()`
3. ✅ Se guarda hash en `tbl_users.str_password_hash`
4. ✅ Se genera JWT con contraseña temporal
5. ✅ Se retorna URL de auto-login
6. ✅ Usuario puede escanear QR y autenticarse

## 📝 Logs Esperados (Después del Fix)

```
🔐 Contraseña temporal generada para usuario juan_perez
✅ QR generado para residente: Juan Pérez García (Username: juan_perez)
✅ Generado por admin: admin
✅ Token válido por 48 horas
```
