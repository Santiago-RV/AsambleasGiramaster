# BACKEND GIRAMASTER

API REST para la gestión de asambleas residenciales construida con FastAPI y Celery.

## Prerrequisitos

- Python 3.11+
- Redis (para Celery broker y result backend)
- Base de datos (MySQL/MariaDB o PostgreSQL)
- Virtual environment (recomendado)

## Configuración inicial

1. Copiar el archivo de entorno:
   ```bash
   cp .env.example .env
   ```

2. Configurar las variables en `.env`:
   - `VERSION`: Versión de la aplicación
   - `ENVIRONMENT`: `development` o `production`
   - `HOST` y `PORT`: Dirección del servidor (default: 127.0.0.1:8000)
   - `HOST_DB`, `PORT_DB`, `USER_DB`, `PASSWORD_DB`, `NAME_DB`: Configuración de base de datos
   - `SECRET_KEY`: Clave secreta para JWT
   - `REDIS_HOST` y `REDIS_PORT`: Conexión a Redis

## Instalación

### Con Makefile (recomendado):
```bash
make install
```

### Manual:
```bash
pip install -r requirements.txt
```

## Base de datos

Ejecutar migraciones:
```bash
make migrate
```

O manualmente:
```bash
alembic upgrade head
```

## Ejecución

### 1. Servidor principal (FastAPI + Uvicorn)

**Con Makefile:**
```bash
make dev
```

**Manual:**
```bash
python -m app.main
```

**Con uvicorn directamente:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

La documentación estará disponible en:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 2. Celery Worker

Procesa tareas en segundo plano (ej. envío de emails):

**Con Makefile:**
```bash
make celery
```

**Manual:**
```bash
celery -A app.celery_app worker -Q email_tasks -l info --concurrency=4
```

**Manual desde windows en backend:**
```bash
.\venv\Scripts\python -m celery -A app.celery_app worker -Q email_tasks -l info --pool=solo
```

**Con Python module:**
```bash
python -m celery -A app.celery_app worker -Q email_tasks -l info --concurrency=4
```

Configuración relevante (en `app/celery_app.py`):
- **Broker/Backend**: Redis (configurado vía `REDIS_URL`)
- **Cola**: `email_tasks`
- **Concurrencia**: 4 workers
- **Timezone**: America/Bogota
- **Time limits**: 1 hora máximo, 50 minutos soft limit

### 3. Celery Beat (Tareas programadas)

Si hay tareas periódicas configuradas:

**Con Makefile:**
```bash
make celery-beat
```

**Manual:**
```bash
celery -A app.celery_app beat -l info --scheduler celery.beat:PersistentScheduler
```

**Con Python module:**
```bash
python -m celery -A app.celery_app beat -l info --scheduler celery.beat:PersistentScheduler
```

## Ejecución completa (desarrollo)

En tres terminales separadas:

```bash
# Terminal 1: Backend
make dev

# Terminal 2: Celery Worker
make celery

# Terminal 3: Celery Beat (opcional, si hay tareas programadas)
make celery-beat
```

O manualmente:

```bash
# Terminal 1: Backend
python -m app.main

# Terminal 2: Celery Worker
celery -A app.celery_app worker -Q email_tasks -l info --concurrency=4

# Terminal 3: Celery Beat (opcional)
celery -A app.celery_app beat -l info --scheduler celery.beat:PersistentScheduler
```

## Docker

### Construir imagen:
```bash
make docker-build
```

### Ejecutar contenedor:
```bash
# En primer plano
make docker-run

# En segundo plano
make docker-run-detached

# Ver logs
make docker-logs

# Detener
make docker-stop
```

### Servicios Docker disponibles

La imagen unificada soporta tres servicios vía variable `SERVICE`:
- `backend`: Servidor FastAPI (default)
- `celery`: Worker de Celery
- `celery-beat`: Scheduler de Celery

Ejemplo:
```bash
docker run -e SERVICE=celery --env-file .env.production giramaster-backend
```

## Testing

```bash
# Tests básicos
make test

# Con cobertura
make test-cov
```

## Linting y formato

```bash
# Verificar código
make lint

# Formatear código
make format
```

## Comandos útiles

```bash
# Crear nueva migración
make migration
# (te pedirá el nombre de la migración)

# Rollback de última migración
make rollback

# Limpiar archivos temporales
make clean

# Verificar variables de entorno
make check-env

# Shell interactivo
make shell

# Configuración inicial completa
make setup

# Refrescar: limpiar, instalar, migrar y ejecutar
make refresh
```

## Estructura del proyecto

```
backend/
├── app/
│   ├── main.py              # Punto de entrada FastAPI
│   ├── celery_app.py        # Configuración de Celery
│   ├── api/                 # Endpoints API
│   ├── core/                # Configuración y utilidades
│   ├── models/              # Modelos de base de datos
│   ├── schemas/             # Esquemas Pydantic
│   ├── services/            # Lógica de negocio
│   └── tasks/               # Tareas de Celery
├── migrations/              # Migraciones Alembic
├── tests/                   # Tests
├── requirements.txt         # Dependencias
├── Makefile                # Comandos de automatización
└── Dockerfile              # Imagen Docker unificada
```

## Notas

- En desarrollo, CORS permite localhost en puertos 3000 y 5173
- En producción, configurar `ALLOWED_HOSTS` explícitamente
- Redis es requerido para Celery (broker y result backend)
- Los logs se guardan en `/app/logs/` (en Docker) o `./logs/` (local)
