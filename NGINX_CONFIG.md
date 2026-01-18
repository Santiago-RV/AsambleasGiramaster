# Configuración de Nginx para Giramaster

Esta guía explica cómo configurar Nginx para servir la aplicación Giramaster con tu dominio.

## Arquitectura Recomendada

**Nginx en Host** → Sirve frontend estático + Proxy a Backend Docker

### Ventajas:
- ✅ Más eficiente (un solo Nginx)
- ✅ Menos overhead
- ✅ Más fácil de debuggear
- ✅ Mejor rendimiento
- ✅ No necesitas contenedor Docker del frontend

---

## Paso 1: Compilar el Frontend

```bash
cd /srv/AsambleasGiramaster/frontend
npm run build
```

Esto genera la carpeta `dist/` con los archivos compilados.

---

## Paso 2: Copiar Archivos a Nginx

```bash
# Crear directorio web
sudo mkdir -p /var/www/giramaster

# Copiar archivos compilados
sudo cp -r dist/* /var/www/giramaster/

# Establecer permisos
sudo chown -R www-data:www-data /var/www/giramaster
```

---

## Paso 3: Crear Configuración de Nginx

Crea el archivo `/etc/nginx/sites-available/giramaster`:

```nginx
# Servidor HTTP - Redirige a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Permitir verificación de Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/giramaster;
    }

    # Redirigir todo a HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Servidor HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (Let's Encrypt los creará aquí)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/giramaster_access.log;
    error_log /var/log/nginx/giramaster_error.log;

    # Tamaño máximo de archivos (para carga de Excel)
    client_max_body_size 10M;

    # Directorio raíz del frontend
    root /var/www/giramaster;
    index index.html;

    # ============================================
    # API - Proxy al Backend Docker (puerto 8000)
    # ============================================
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;

        # Headers necesarios
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Timeouts
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_cache_bypass $http_upgrade;
    }

    # ============================================
    # Archivos estáticos con cache agresivo
    # ============================================
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # ============================================
    # Frontend - SPA (Single Page Application)
    # ============================================
    location / {
        # Intentar archivo, directorio, o index.html
        try_files $uri $uri/ /index.html;

        # Sin cache para index.html
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
```

---

## Paso 4: Activar el Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/giramaster /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Si el test es exitoso, recargar Nginx
sudo systemctl reload nginx
```

---

## Paso 5: Obtener Certificado SSL (Let's Encrypt)

### Primero: Configuración temporal sin SSL

**Antes de obtener SSL**, modifica `/etc/nginx/sites-available/giramaster` temporalmente:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /var/www/giramaster;
    index index.html;

    # API
    location /api/ {
        proxy_pass http://localhost:8000;
    }

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Recarga Nginx:
```bash
sudo systemctl reload nginx
```

### Obtener certificado

```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Certbot modificará automáticamente tu configuración para agregar SSL.

O puedes usar la configuración completa con SSL desde el inicio (Paso 3) y ejecutar:

```bash
sudo certbot certonly --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### Renovación automática

Certbot instala un cronjob automático. Verifica:

```bash
sudo certbot renew --dry-run
```

---

## Verificación

### 1. Ver logs de Nginx

```bash
# Logs de acceso
sudo tail -f /var/log/nginx/giramaster_access.log

# Logs de error
sudo tail -f /var/log/nginx/giramaster_error.log
```

### 2. Verificar backend Docker

```bash
docker ps | grep giramaster-backend
docker logs -f giramaster-backend
```

### 3. Probar en el navegador

- Frontend: `https://tu-dominio.com`
- API: `https://tu-dominio.com/api/v1/`

---

## Actualización del Frontend

Cada vez que actualices el frontend:

```bash
# 1. Compilar
cd /srv/AsambleasGiramaster/frontend
npm run build

# 2. Backup (opcional)
sudo mv /var/www/giramaster /var/www/giramaster.backup.$(date +%Y%m%d_%H%M%S)

# 3. Copiar nuevos archivos
sudo mkdir -p /var/www/giramaster
sudo cp -r dist/* /var/www/giramaster/
sudo chown -R www-data:www-data /var/www/giramaster

# 4. Recargar Nginx (opcional, solo si cambió configuración)
sudo systemctl reload nginx
```

---

## Troubleshooting

### Error 502 Bad Gateway en /api/

**Causa**: Nginx no puede conectarse al backend Docker.

**Solución**:
```bash
# Verificar que el backend esté corriendo
docker ps | grep giramaster-backend

# Ver logs del backend
docker logs giramaster-backend

# Reiniciar backend si es necesario
cd /srv/AsambleasGiramaster/backend
make docker-stop
make docker-run-detached
```

### Error 404 en rutas del frontend

**Causa**: Falta la directiva `try_files` para SPA.

**Solución**: Asegúrate de tener en la configuración:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Archivos estáticos no se actualizan

**Causa**: Cache del navegador.

**Solución**:
1. Limpia cache del navegador (Ctrl + Shift + R)
2. Verifica que el index.html tenga `Cache-Control: no-cache`
3. Revisa que los archivos JS/CSS nuevos estén en `/var/www/giramaster/assets/`

### SSL no funciona

**Causa**: Certificados no instalados correctamente.

**Solución**:
```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Recargar Nginx
sudo systemctl reload nginx
```

---

## Seguridad Adicional

### 1. Configurar firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 2. Headers de seguridad (opcional)

Agrega a la configuración HTTPS:

```nginx
server {
    # ... configuración existente ...

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

---

## Resumen de Comandos Útiles

```bash
# Ver estado de Nginx
sudo systemctl status nginx

# Probar configuración
sudo nginx -t

# Recargar Nginx (sin downtime)
sudo systemctl reload nginx

# Reiniciar Nginx (con downtime)
sudo systemctl restart nginx

# Ver logs en tiempo real
sudo tail -f /var/log/nginx/error.log

# Ver certificados SSL
sudo certbot certificates

# Renovar certificados
sudo certbot renew
```

---

## Arquitectura Final

```
Internet
   ↓
HTTPS (443) → Nginx (Host)
              ├─→ /api/* → Backend Docker (localhost:8000)
              └─→ /* → Frontend estático (/var/www/giramaster)
```

**NO se usa el contenedor Docker del frontend en producción.**
