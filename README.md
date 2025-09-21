# 🏢 AsambleasGiramaster

**Sistema de Administración de Unidades Residenciales con Reuniones Virtuales Integradas**

AsambleasGiramaster es una aplicación web completa diseñada para la gestión eficiente de unidades residenciales, que permite crear y administrar reuniones virtuales directamente desde la plataforma, con sistemas de votación, estadísticas avanzadas y gestión integral de asambleas.

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
- **PostgreSQL/MySQL**: Base de datos relacional (configurable)
- **Modelos relacionales**: Estructura optimizada para consultas complejas

## 📁 Estructura del Proyecto

```
AsambleasGiramaster/
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
└── README.md                # Este archivo
```

## 🚀 Instalación y Configuración

### **Prerrequisitos**
- Python 3.8+
- Node.js 16+
- Base de datos PostgreSQL o MySQL
- Cuenta de Zoom para integración de reuniones

### **Backend**

1. **Clonar el repositorio**
```bash
git clone [URL_DEL_REPOSITORIO]
cd AsambleasGiramaster/backend
```

2. **Crear entorno virtual**
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno**
```bash
# Crear archivo .env con:
DATABASE_URL=postgresql://usuario:password@localhost/asambleas_db
ZOOM_API_KEY=tu_api_key_zoom
ZOOM_API_SECRET=tu_api_secret_zoom
SECRET_KEY=tu_clave_secreta
```

5. **Ejecutar migraciones**
```bash
# Configurar base de datos y ejecutar migraciones
python -m alembic upgrade head
```

6. **Iniciar servidor**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Frontend**

1. **Navegar al directorio frontend**
```bash
cd ../frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# Crear archivo .env con:
VITE_API_URL=http://localhost:8000
```

4. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

## 🔧 Configuración de Zoom

Para habilitar las reuniones virtuales, necesitas:

1. **Crear aplicación en Zoom Marketplace**
   - Ir a [Zoom Marketplace](https://marketplace.zoom.us/)
   - Crear una aplicación "Server-to-Server OAuth"
   - Obtener API Key y API Secret

2. **Configurar permisos**
   - Habilitar permisos para crear reuniones
   - Habilitar grabación automática
   - Configurar webhooks para notificaciones

3. **Variables de entorno**
```bash
ZOOM_API_KEY=tu_api_key
ZOOM_API_SECRET=tu_api_secret
ZOOM_WEBHOOK_SECRET=tu_webhook_secret
```

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

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- **Email**: soporte@asambleasgiramaster.com
- **Documentación**: [Wiki del proyecto]
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
