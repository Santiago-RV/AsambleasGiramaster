# 🎯 Guía de Uso: Sistema de Reuniones con Zoom

## ⚡ Solución Inmediata (Sin configuración adicional)

### Opción 1: Usar tu PMI (Personal Meeting ID) de Zoom

Tu cuenta de Zoom tiene un **PMI** (Personal Meeting ID) que puedes usar para todas las reuniones.

#### Paso 1: Obtener tu PMI

1. Ve a: https://zoom.us/profile
2. Inicia sesión con tu cuenta
3. Busca "Personal Meeting ID" (ej: 123-456-7890)
4. Copia ese número (sin guiones): `1234567890`

#### Paso 2: Configurar en el Backend

Edita: `/srv/proyectos/AsambleasGiramaster/backend/app/core/config.py`

Agrega una nueva variable después de las credenciales de Zoom:

```python
# Zoom Configuration
ZOOM_SDK_KEY: str = "..."
ZOOM_SDK_SECRET: str = "..."
ZOOM_DEFAULT_PMI: str = "1234567890"  # ← TU PMI AQUÍ
```

#### Paso 3: Actualizar meeting_service.py

Voy a actualizar el código para usar tu PMI por defecto.

---

### Opción 2: Crear Reuniones Manualmente en Zoom

1. **Crear reunión en el sistema** → Obtienes un ID (ej: 8271937465)
2. **Ir a Zoom.us** → Programar reunión
3. **Usar el mismo ID** en Zoom (si es posible) o usar tu PMI
4. **Actualizar URL** en la base de datos (opcional)

---

## 🔧 Implementación Automática (Recomendado)

Voy a modificar el sistema para usar **TU PMI** automáticamente:

