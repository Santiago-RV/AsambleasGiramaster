# Estructura del Proyecto AsambleasGiramaster

## Descripción General

Este proyecto es una aplicación web para la gestión de asambleas y reuniones de unidades residenciales, desarrollada con una arquitectura de microservicios que separa el backend (API REST) del frontend (aplicación web).

## Arquitectura General

```
AsambleasGiramaster/
├── backend/          # API REST desarrollada en FastAPI
├── frontend/         # Aplicación web desarrollada en React + Vite
└── README.md         # Documentación principal del proyecto
```

## Estructura del Backend

El backend está desarrollado con **FastAPI** y sigue una arquitectura de capas bien definida para mantener la separación de responsabilidades y facilitar el mantenimiento.

### 📁 `/backend/`

#### **`app/`** - Directorio Principal de la Aplicación
Contiene toda la lógica de negocio y configuración de la API.

#### **`app/main.py`** - Punto de Entrada de la Aplicación
- **Propósito**: Configuración principal de FastAPI
- **Responsabilidades**:
  - Inicialización de la aplicación FastAPI
  - Configuración de CORS para comunicación con el frontend
  - Gestión del ciclo de vida de la aplicación (startup/shutdown)
  - Configuración de middleware y manejo de errores
  - Documentación automática con Swagger/ReDoc

#### **`app/core/`** - Configuración y Servicios Centrales
Esta carpeta contiene los componentes fundamentales que se utilizan en toda la aplicación:

- **`config.py`**: 
  - **Propósito**: Configuración centralizada usando Pydantic Settings
  - **Contiene**: Variables de entorno, configuración de base de datos, seguridad, CORS, Redis, logging
  - **Ventaja**: Gestión centralizada y validación automática de configuración

- **`database.py`**: 
  - **Propósito**: Configuración y gestión de la base de datos
  - **Responsabilidades**: 
    - Configuración del motor SQLAlchemy asíncrono
    - Gestión de sesiones de base de datos
    - Inicialización y cierre de conexiones
    - Verificación de conectividad

- **`security.py`**: 
  - **Propósito**: Funciones de seguridad y autenticación
  - **Contiene**: JWT tokens, hash de contraseñas, validación de permisos

- **`logging_config.py`**: 
  - **Propósito**: Configuración centralizada de logging
  - **Ventaja**: Logging consistente en toda la aplicación

#### **`app/models/`** - Modelos de Base de Datos
Contiene todos los modelos SQLAlchemy que representan las entidades del dominio:

- **`user_model.py`**: Modelo de usuarios del sistema
- **`meeting_model.py`**: Modelo de reuniones/asambleas
- **`residential_unit_model.py`**: Modelo de unidades residenciales
- **`poll_model.py`**: Modelo de encuestas/votaciones
- **`role_model.py`**: Modelo de roles de usuario
- **`permission_model.py`**: Modelo de permisos
- **`zoom_session_model.py`**: Modelo de sesiones de Zoom
- **`audit_log_model.py`**: Modelo de auditoría

**¿Por qué esta estructura?**
- Separación clara de responsabilidades
- Facilita el mantenimiento y testing
- Permite reutilización de modelos
- Sigue el patrón Active Record de SQLAlchemy

#### **`app/schemas/`** - Esquemas de Validación
Contiene los esquemas Pydantic para validación de datos de entrada y salida:

- **`user_schema.py`**: Esquemas para usuarios
- **`residential_unit_schema.py`**: Esquemas para unidades residenciales
- **`role_schema.py`**: Esquemas para roles
- **`permission_schema.py`**: Esquemas para permisos

**¿Por qué usar schemas?**
- Validación automática de datos de entrada
- Serialización consistente de respuestas
- Documentación automática de la API
- Separación entre modelos de BD y DTOs

#### **`app/api/`** - Capa de API REST
Estructura de versionado de la API:

- **`v1/`**: Primera versión de la API
  - **`api.py`**: Configuración de rutas principales
  - **`endpoints/`**: Endpoints específicos por dominio

**¿Por qué versionar la API?**
- Permite evolución sin romper compatibilidad
- Facilita el mantenimiento de versiones anteriores
- Mejora la experiencia del desarrollador

#### **`app/services/`** - Lógica de Negocio
Contiene la lógica de negocio de la aplicación (actualmente vacío, pero preparado para):
- Servicios de autenticación
- Servicios de notificaciones
- Servicios de integración con Zoom
- Servicios de generación de reportes

**¿Por qué separar servicios?**
- Separación de responsabilidades
- Reutilización de lógica de negocio
- Facilita el testing unitario
- Permite inyección de dependencias

#### **`app/utils/`** - Utilidades y Helpers
Funciones auxiliares y utilidades comunes (actualmente vacío, pero preparado para):
- Funciones de formato de fechas
- Utilidades de validación
- Helpers de encriptación
- Funciones de transformación de datos

### 📁 **Archivos de Configuración del Backend**

#### **`requirements.txt`**
Lista de dependencias Python del proyecto:
- **FastAPI**: Framework web moderno y rápido
- **SQLAlchemy**: ORM para base de datos
- **Pydantic**: Validación de datos y configuración
- **Uvicorn**: Servidor ASGI para FastAPI
- **python-dotenv**: Gestión de variables de entorno

#### **`Makefile`**
Comandos automatizados para desarrollo:
- Instalación de dependencias
- Ejecución de tests
- Linting y formateo de código
- Comandos de desarrollo

#### **`test/`** - Directorio de Pruebas
Estructura preparada para testing:
- Tests unitarios
- Tests de integración
- Tests de API
- Fixtures y mocks

## Estructura del Frontend

### 📁 **`/frontend/`** - Aplicación Web React

#### **Tecnologías Utilizadas:**
- **React**: Biblioteca para interfaces de usuario
- **Vite**: Herramienta de construcción moderna
- **Tailwind CSS**: Framework de CSS utilitario
- **ESLint**: Linter para JavaScript/TypeScript

#### **Estructura:**
- **`src/`**: Código fuente de la aplicación
- **`public/`**: Archivos estáticos
- **`package.json`**: Dependencias y scripts
- **`vite.config.js`**: Configuración de Vite
- **`tailwind.config.js`**: Configuración de Tailwind CSS

## Ventajas de esta Estructura

### 🏗️ **Arquitectura de Capas**
- **Separación clara** entre presentación, lógica de negocio y datos
- **Mantenibilidad** mejorada
- **Escalabilidad** horizontal y vertical
- **Testing** más sencillo

### 🔧 **Configuración Centralizada**
- **Variables de entorno** gestionadas con Pydantic
- **Configuración por ambiente** (desarrollo, producción)
- **Validación automática** de configuración

### 🗄️ **Gestión de Datos**
- **ORM moderno** con SQLAlchemy 2.0
- **Migraciones automáticas** de base de datos
- **Relaciones bien definidas** entre entidades
- **Auditoría integrada** para trazabilidad

### 🚀 **API REST Moderna**
- **Documentación automática** con Swagger/ReDoc
- **Validación automática** de requests/responses
- **Versionado de API** para evolución
- **CORS configurado** para comunicación con frontend

### 🔒 **Seguridad**
- **JWT tokens** para autenticación
- **Hash de contraseñas** seguro
- **Sistema de roles y permisos**
- **Logging de auditoría**

### 📊 **Monitoreo y Logging**
- **Logging estructurado** en toda la aplicación
- **Configuración centralizada** de logs
- **Diferentes niveles** de logging por ambiente

## Flujo de Datos

```
Frontend (React) 
    ↓ HTTP Requests
Backend API (FastAPI)
    ↓ ORM Queries
Database (PostgreSQL)
    ↓ Business Logic
Services Layer
    ↓ Data Transformation
Schemas (Pydantic)
    ↓ JSON Response
Frontend (React)
```

## Consideraciones de Desarrollo

### 🛠️ **Herramientas de Desarrollo**
- **Makefile** para automatización de tareas
- **ESLint** para calidad de código frontend
- **Pydantic** para validación de datos backend
- **SQLAlchemy** para gestión de base de datos

### 🧪 **Testing**
- Estructura preparada para **tests unitarios
- **Fixtures** para datos de prueba
- **Mocks** para servicios externos
- **Tests de integración** para API

### 🚀 **Despliegue**
- **Docker** ready (estructura preparada)
- **Variables de entorno** para configuración
- **Base de datos** PostgreSQL
- **Redis** para caché y sesiones

Esta estructura proporciona una base sólida para el desarrollo y mantenimiento de una aplicación de gestión de asambleas moderna, escalable y mantenible.
