# Guía de Despliegue - Giramaster

Esta guía te ayudará a desplegar la aplicación Giramaster en un servidor con tu propio dominio.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Preparación del Servidor](#preparación-del-servidor)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Despliegue con Docker](#despliegue-con-docker)
5. [Configuración de Nginx como Proxy Reverso](#configuración-de-nginx-como-proxy-reverso)
6. [Configuración de SSL con Let's Encrypt](#configuración-de-ssl-con-lets-encrypt)
7. [Mantenimiento](#mantenimiento)

---

## Requisitos Previos

### En tu servidor

- **Sistema Operativo**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Docker**: Versión 20.10+
- **Docker Compose** (opcional): Versión 2.0+
- **Nginx**: Para actuar como proxy reverso
- **Certbot**: Para certificados SSL
- **Dominio**: Apuntando a la IP de tu servidor

### Recursos mínimos recomendados

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disco**: 20 GB SSD
- **Puertos abiertos**: 80 (HTTP), 443 (HTTPS), 8000 (backend - interno)

---

## Preparación del Servidor

### 1. Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Docker

```bash
# Instalar dependencias
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Agregar repositorio de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Instalar Nginx

```bash
sudo apt install -y nginx
```

### 4. Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5. Clonar el repositorio

```bash
cd /srv
sudo git clone https://github.com/tu-usuario/AsambleasGiramaster.git
sudo chown -R $USER:$USER /srv/AsambleasGiramaster
cd /srv/AsambleasGiramaster
```

---

## Configuración de Variables de Entorno

### Backend

Edita `/srv/AsambleasGiramaster/backend/.env.production`:

```bash
VERSION=1.0.0
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000

# MIDDLEWARE
ALLOWED_HOSTS=["*"]

# Base de Datos
HOST_DB=tu-servidor-mysql.com
PORT_DB=3306
USER_DB=tu_usuario
PASSWORD_DB=tu_password_seguro
NAME_DB=db_giramaster

# Securidad - CAMBIAR POR UNA CLAVE SEGURA
SECRET_KEY=genera_una_clave_secreta_aqui_muy_larga_y_segura

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu_app_password
SMTP_FROM_NAME=GIRAMASTER - Sistema de Asambleas

# Zoom
ZOOM_SDK_KEY=tu_zoom_sdk_key
ZOOM_SDK_SECRET=tu_zoom_sdk_secret
ZOOM_ACCOUNT_ID=tu_zoom_account_id
ZOOM_CLIENT_ID=tu_zoom_client_id
ZOOM_CLIENT_SECRET=tu_zoom_client_secret

# Redis (opcional)
REDIS_HOST=
REDIS_PORT=
```

### Frontend

Edita `/srv/AsambleasGiramaster/frontend/.env.production`:

```bash
# Cambia esto por tu dominio real
VITE_API_URL=https://tu-dominio.com/api/v1
```

---

## Despliegue con Docker

### 1. Construir y ejecutar el backend

```bash
cd /srv/AsambleasGiramaster/backend

# Construir imagen
make docker-build

# Ejecutar en segundo plano
make docker-run-detached

# Verificar que está corriendo
docker logs -f giramaster-backend
```

### 2. Compilar y construir el frontend

```bash
cd /srv/AsambleasGiramaster/frontend

# Compilar la aplicación (asegúrate de tener Node.js instalado)
npm install
npm run build

# Construir imagen Docker
make docker-build

# Ejecutar en puerto 3000
make docker-run-detached

# Verificar que está corriendo
docker logs -f giramaster-frontend
```

### 3. Verificar que los contenedores estén corriendo

```bash
docker ps
```

Deberías ver:
- `giramaster-backend` corriendo en puerto 8000
- `giramaster-frontend` corriendo en puerto 3000

---

## Configuración de Nginx como Proxy Reverso

### 1. Crear configuración de Nginx

Crea el archivo `/etc/nginx/sites-available/giramaster`:

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (serán generados por Certbot)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL recomendada
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/giramaster_access.log;
    error_log /var/log/nginx/giramaster_error.log;

    # Tamaño máximo de archivos (para carga de Excel)
    client_max_body_size 10M;

    # Proxy al backend (API)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy al frontend (React SPA)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Cache para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://localhost:3000;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 2. Habilitar el sitio

```bash
sudo ln -s /etc/nginx/sites-available/giramaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Configuración de SSL con Let's Encrypt

### 1. Obtener certificado SSL

**IMPORTANTE**: Primero debes configurar Nginx SIN SSL para que Certbot pueda verificar el dominio.

Modifica temporalmente `/etc/nginx/sites-available/giramaster` para que solo tenga:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
    }
}
```

Reinicia Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Generar certificado

```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Certbot configurará automáticamente SSL en tu Nginx.

### 3. Renovación automática

Certbot instala un cronjob automático. Verifica que funciona:

```bash
sudo certbot renew --dry-run
```

---

## Mantenimiento

### Ver logs

```bash
# Backend
docker logs -f giramaster-backend

# Frontend
docker logs -f giramaster-frontend

# Nginx
sudo tail -f /var/log/nginx/giramaster_access.log
sudo tail -f /var/log/nginx/giramaster_error.log
```

### Actualizar la aplicación

```bash
cd /srv/AsambleasGiramaster

# Actualizar código
git pull

# Backend
cd backend
make docker-stop
make docker-build
make docker-run-detached

# Frontend
cd ../frontend
npm run build
make docker-stop
make docker-build
make docker-run-detached
```

### Backup de base de datos

```bash
# Crear backup
docker exec giramaster-backend mysqldump -u usuario -p db_giramaster > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i giramaster-backend mysql -u usuario -p db_giramaster < backup_20231223.sql
```

### Reiniciar servicios

```bash
# Reiniciar contenedores
docker restart giramaster-backend giramaster-frontend

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Monitoreo

Instala herramientas de monitoreo:

```bash
# Instalar htop y netstat
sudo apt install -y htop net-tools

# Ver uso de recursos
htop

# Ver puertos en uso
sudo netstat -tulpn | grep LISTEN
```

---

## Troubleshooting

### El sitio no carga

1. Verifica que los contenedores estén corriendo:
   ```bash
   docker ps
   ```

2. Verifica logs de Nginx:
   ```bash
   sudo nginx -t
   sudo tail -100 /var/log/nginx/error.log
   ```

3. Verifica que el firewall permita los puertos:
   ```bash
   sudo ufw status
   sudo ufw allow 80
   sudo ufw allow 443
   ```

### Error de CORS

Asegúrate de que `ALLOWED_HOSTS` en backend incluya tu dominio:
```bash
ALLOWED_HOSTS=["tu-dominio.com", "www.tu-dominio.com", "*"]
```

### Error de conexión a base de datos

Verifica la conexión:
```bash
docker exec -it giramaster-backend bash
ping HOST_DB
```

---

## Seguridad Adicional

### 1. Configurar firewall

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 8000  # Backend solo accesible desde localhost
sudo ufw deny 3000  # Frontend solo accesible desde localhost
```

### 2. Configurar fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 3. Actualizar regularmente

```bash
# Configurar actualizaciones automáticas
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Soporte

Para más información, consulta:
- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Nginx](https://nginx.org/en/docs/)
- [Documentación de Let's Encrypt](https://letsencrypt.org/docs/)
