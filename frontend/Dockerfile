# Imagen base de Nginx
FROM nginx:alpine

# Copiar archivos compilados de dist al directorio de Nginx
COPY dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Comando por defecto (nginx en foreground)
CMD ["nginx", "-g", "daemon off;"]
