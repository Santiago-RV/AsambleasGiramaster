# 🏢 AsambleasGiramaster

**Sistema de Administración de Unidades Residenciales con Reuniones Virtuales Integradas**

AsambleasGiramaster es una aplicación web completa diseñada para la gestión eficiente de unidades residenciales, que permite crear y administrar reuniones virtuales directamente desde la plataforma, con sistemas de votación, estadísticas avanzadas y gestión integral de asambleas.

## 📚 Documentación

Toda la documentación técnica del proyecto vive centralizada en **[`docs/`](docs/)**:

| Documento | Contenido |
|---|---|
| [`docs/BACKEND.md`](docs/BACKEND.md) | Configuración y ejecución del backend (FastAPI + Celery): variables de entorno, migraciones, Docker, comandos `make`. |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Configuración y ejecución del frontend (React + Vite): estructura de carpetas, rutas por rol, comandos `make`. |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Guía de despliegue en Kubernetes (k3s): build de imágenes, despliegue manual con Kustomize, pipeline de CI/CD (GitHub Actions), DNS/TLS, escalado, rollback, troubleshooting. |
| [`docs/GUIA_DESPLIEGUE.pdf`](docs/GUIA_DESPLIEGUE.pdf) | Versión en PDF de la guía de despliegue, con portada, diagrama de arquitectura y ejemplos de salida. Se regenera con `docs/generate_deploy_guide.py`. |
| [`docs/ROLES.md`](docs/ROLES.md) | Catálogo de roles del sistema (Super Admin, Admin, Copropietario, Invitado), cómo se identifican en BD/backend/frontend y dónde se aplican los permisos. |
| [`docs/QR_AUTH_FLOW.md`](docs/QR_AUTH_FLOW.md) | Cómo funciona el acceso sin contraseña por QR/link (auto-login): generación, expiración, envío por email, validación y registro de asistencia. |
| [`docs/CASCADE_ANALYSIS.md`](docs/CASCADE_ANALYSIS.md) | Análisis de las estrategias `CASCADE`/`RESTRICT`/`SET NULL` en las relaciones de los modelos SQLAlchemy. |
| [`docs/CASCADE_MIGRATIONS.md`](docs/CASCADE_MIGRATIONS.md) | Cómo aplicar la migración SQL que agrega esas constraints (`backend/migrations/add_cascade_constraints.sql`). |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Historial completo de cambios del proyecto. |

También hay documentación puntual junto al código que describe, por estar acoplada a archivos vecinos: [`tests/load/README.md`](tests/load/README.md) (pruebas de carga con k6).

## ✨ Características Principales

### 🏘️ **Gestión de Unidades Residenciales**
- Administración completa de conjuntos residenciales
- Gestión de apartamentos y usuarios por unidad
- Control de accesos y permisos por rol
- Delegados externos y usuarios temporales

### 🎥 **Reuniones Virtuales Integradas**
- **Integración con Zoom**: Creación automática de reuniones
- **URLs de acceso**: Generación automática de enlaces de unión e inicio
- **Control de participantes**: Gestión de invitados y confirmaciones
- **Grabación**: Registro automático de sesiones con archivos de descarga
- **Reportes detallados**: Estadísticas de participación y duración

### 🗳️ **Sistema de Votaciones**
- **Encuestas en tiempo real**: Durante las reuniones
- **Múltiples tipos de votación**: Única, múltiple, con ponderación
- **Control de quórum**: Verificación automática de asistencia mínima
- **Votaciones anónimas**: Opción de votación confidencial
- **Abstenciones**: Manejo de abstenciones en las votaciones

### 📊 **Panel de Estadísticas (Super Admin)**
- **Métricas de participación**: Asistencia y duración promedio
- **Reportes de reuniones**: Historial completo de sesiones
- **Estadísticas de votaciones**: Resultados y tendencias
- **Gestión de usuarios**: Actividad y roles por unidad residencial
- **Auditoría completa**: Log de todas las acciones del sistema

### 🔐 **Sistema de Roles y Permisos**
- **Roles jerárquicos**: Super Admin, Admin, Usuario, Delegado
- **Permisos granulares**: Control detallado por módulo y función
- **Usuarios temporales**: Acceso con fecha de expiración
- **Delegados externos**: Representantes sin acceso directo a la unidad

## 🛠️ Tecnologías Utilizadas

### **Backend**
- **FastAPI**: Framework web moderno y rápido para APIs
- **SQLAlchemy**: ORM para manejo de base de datos
- **Python 3.x**: Lenguaje de programación principal
- **Uvicorn**: Servidor ASGI de alto rendimiento
- **Pydantic**: Validación de datos y configuración

### **Frontend**
- **React 19**: Biblioteca de interfaz de usuario
- **Vite**: Herramienta de construcción rápida
- **Tailwind CSS**: Framework de estilos utilitarios
- **ESLint**: Linter para calidad de código

### **Base de Datos**
- **MySQL / MariaDB**: vía SQLAlchemy async (driver `aiomysql`)
- **Modelos relacionales**: Estructura optimizada para consultas complejas, con estrategias `CASCADE`/`RESTRICT`/`SET NULL` documentadas en [`docs/CASCADE_ANALYSIS.md`](docs/CASCADE_ANALYSIS.md)

## 📁 Estructura del Proyecto

```
AsambleasGiramaster/
├── docs/                     # Documentación técnica centralizada (ver sección "Documentación")
├── backend/
│   ├── app/
│   │   ├── models/           # Modelos de base de datos
│   │   │   ├── user_model.py
│   │   │   ├── residential_unit_model.py
│   │   │   ├── meeting_model.py
│   │   │   ├── poll_model.py
│   │   │   ├── zoom_session_model.py
│   │   │   └── ...
│   │   ├── core/
│   │   │   └── database.py   # Configuración de BD
│   │   └── ...
│   └── requirements.txt      # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── pages/           # Páginas de la aplicación
│   │   ├── App.jsx          # Componente principal
│   │   └── main.jsx         # Punto de entrada
│   ├── package.json         # Dependencias Node.js
│   └── vite.config.js       # Configuración Vite
├── k8s/                      # Manifiestos de Kubernetes (Kustomize)
└── README.md                 # Este archivo
```

## 🚀 Instalación y Configuración

### **Prerrequisitos**
- Python 3.11+
- Node.js 18+ con **pnpm** (no `npm`)
- MySQL / MariaDB
- Redis (broker/cache y sesiones)
- Cuenta de Zoom para integración de reuniones (configuración vía panel de Super Admin, ver nota abajo)

### **Quickstart**

```bash
git clone [URL_DEL_REPOSITORIO]
cd AsambleasGiramaster

# Backend
cd backend
cp .env.example .env   # completar variables (ver docs/BACKEND.md)
make install
make migrate
make dev                # http://localhost:8000 — Swagger en /docs

# Frontend (en otra terminal)
cd ../frontend
cp .env.example .env
make install
make dev                # http://localhost:5173
```

Guías completas, con todas las variables de entorno, comandos de Celery, Docker y estructura de carpetas: **[`docs/BACKEND.md`](docs/BACKEND.md)** y **[`docs/FRONTEND.md`](docs/FRONTEND.md)**.

## 🔧 Configuración de Zoom

> Las variables `ZOOM_SDK_KEY`/`ZOOM_SDK_SECRET`/`ZOOM_ACCOUNT_ID`/`ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` en `backend/app/core/config.py` están marcadas como **deprecadas**: hoy las credenciales de Zoom se configuran desde el panel de **Super Admin** (persistidas en base de datos), no por variables de entorno. Los pasos de Zoom Marketplace siguen aplicando para obtener las credenciales, solo cambia dónde se cargan.

1. **Crear aplicación en Zoom Marketplace**
   - Ir a [Zoom Marketplace](https://marketplace.zoom.us/)
   - Crear una aplicación "Server-to-Server OAuth"
   - Obtener Account ID, Client ID y Client Secret

2. **Configurar permisos**
   - Habilitar permisos para crear reuniones
   - Habilitar grabación automática
   - Configurar webhooks para notificaciones

3. **Cargar credenciales**: desde el panel de Super Admin de la aplicación (no por `.env`).

## 📊 Funcionalidades Detalladas

### **Gestión de Usuarios**
- **Registro**: Creación de cuentas con validación de email
- **Autenticación**: Login seguro con JWT tokens
- **Perfiles**: Información personal y datos de contacto
- **Roles**: Asignación de permisos por tipo de usuario

### **Reuniones**
- **Programación**: Creación de reuniones con fecha y hora
- **Invitaciones**: Envío automático de invitaciones por email
- **Códigos únicos**: Identificadores únicos para cada reunión
- **Estados**: Seguimiento del estado (programada, en curso, finalizada)

### **Votaciones**
- **Creación**: Formularios dinámicos para crear encuestas
- **Opciones**: Múltiples opciones de respuesta configurables
- **Tiempo real**: Resultados actualizados instantáneamente
- **Validación**: Verificación de quórum y permisos de voto

### **Reportes y Estadísticas**
- **Dashboard**: Panel principal con métricas clave
- **Asistencia**: Estadísticas de participación en reuniones
- **Votaciones**: Resultados históricos y tendencias
- **Exportación**: Generación de reportes en PDF/Excel

## 🔒 Seguridad

- **Autenticación JWT**: Tokens seguros para sesiones
- **Encriptación**: Contraseñas hasheadas con bcrypt
- **Validación**: Sanitización de inputs en frontend y backend
- **Auditoría**: Registro completo de acciones del sistema
- **Permisos**: Control granular de acceso por rol

## 📱 Responsive Design

La aplicación está optimizada para:
- **Desktop**: Experiencia completa con todas las funcionalidades
- **Tablet**: Interfaz adaptada para pantallas medianas
- **Mobile**: Versión móvil optimizada para consultas rápidas

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está pensado bajo la Licencia MIT (pendiente agregar el archivo `LICENSE` al repositorio).

## 📞 Soporte

Para soporte técnico o consultas:
- **Email**: soporte@asambleasgiramaster.com
- **Documentación**: [`docs/`](docs/)
- **Issues**: [GitHub Issues]

## 🎯 Roadmap

### **Versión 2.0**
- [ ] Integración con Microsoft Teams
- [ ] Notificaciones push móviles
- [ ] API pública para desarrolladores
- [ ] Módulo de facturación integrado

### **Versión 2.1**
- [ ] Inteligencia artificial para análisis de sentimientos
- [ ] Traducción automática en tiempo real
- [ ] Integración con sistemas contables
- [ ] App móvil nativa

---

**Desarrollado con ❤️ para mejorar la gestión de unidades residenciales**
