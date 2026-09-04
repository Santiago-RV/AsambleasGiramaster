# Guía de Despliegue - Producción

## Prerrequisitos

- Kubernetes cluster configurado
- kubectl configurado y conectado al cluster
- Ingress controller instalado (nginx-ingress)
- Docker para build de imágenes

### Instalar Ingress Controller

```bash
# Minikube
minikube addons enable ingress

# K3s (ya incluido)
# Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Generico ( Rancher, etc)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml
```

---

## 1. Build de Imágenes Docker

Los Deployments usan `imagePullPolicy: Never` (ver `k8s/base/backend/deployment.yaml` y
`k8s/base/frontend/deployment.yaml`): Kubernetes nunca intenta descargar la imagen de un
registry, espera que ya exista en el nodo. Por eso el flujo real **no usa ningún registry
externo** — las imágenes se construyen localmente y se importan directo al containerd del
cluster (k3s). Si el cluster tiene varios nodos, hay que repetir el build/import en cada uno
donde puedan programarse los pods.

### 1.1 Backend + Celery (misma imagen)

```bash
# Build imagen unificada (nombre real usado por los manifiestos)
docker build -t giramaster-backend:latest ./backend

# Importar directo al containerd de k3s (sin registry)
docker save giramaster-backend:latest | sudo k3s ctr images import -

# Importante: La misma imagen se usa para backend, celery-worker y celery-beat
# El entrypoint selecciona el rol mediante la variable de entorno SERVICE
```

### 1.2 Frontend

```bash
# Build del frontend (pnpm, no npm)
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..

# Build imagen Docker (sirve el build de dist/ vía Nginx)
docker build -t giramaster-frontend:latest ./frontend

# Importar directo al containerd de k3s (sin registry)
docker save giramaster-frontend:latest | sudo k3s ctr images import -
```

> Si en tu entorno sí usás un registry (Docker Hub, GHCR, uno privado), cambiá
> `imagePullPolicy: Never` por `IfNotPresent`/`Always` en los Deployments y agregá los pasos
> de `docker tag`/`docker push` correspondientes.

---

## 2. Desplegar a Kubernetes

### 2.1 Aplicar manifiestos

```bash
# Desde la raíz del proyecto
kubectl apply -k k8s/overlays/local

# Verificar que todo esté aplicado
kubectl get all -A
```

### 2.2 Verificar recursos

```bash
# Ver pods
kubectl get pods

# Ver servicios
kubectl get svc

# Ver ingress
kubectl get ingress

# Ver secretos
kubectl get secrets
```

### 2.3 Despliegue automático (CI/CD)

Lo anterior es el flujo manual para un despliegue inicial. Para el día a día, el despliegue real
ocurre vía GitHub Actions (`.github/workflows/deploy.yml`), que se dispara con cada `push` a
`master` (o manualmente desde la pestaña **Actions**, con la opción `skip_frontend_build`). El
workflow se conecta por SSH al servidor y ejecuta 6 pasos:

1. **Actualizar código**: `git fetch origin master && git reset --hard origin/master`
2. **Build frontend**: `pnpm install --frozen-lockfile && pnpm build`
3. **Build de imágenes Docker**: `giramaster-backend` y `giramaster-frontend` (con `--no-cache`, también etiquetadas con el SHA corto del commit)
4. **Importar a k3s**: `docker save ... | sudo k3s ctr images import -` (sin registry externo)
5. **Rollout restart**: `backend`, `frontend` y `celery-worker`
6. **Verificación**: `kubectl rollout status` de los 3 Deployments (timeout 120s) y resumen final de pods

```
==========================================
  GIRAMASTER - Deploy 2026-07-29 20:10:03
==========================================
📥 [1/6] Actualizando código desde master...
🔨 [2/6] Compilando frontend...
🐳 [3/6] Construyendo imágenes Docker...
📦 [4/6] Importando imágenes a k3s...
♻️  [5/6] Reiniciando deployments...
⏳ [6/6] Esperando que los pods estén Ready...
==========================================
  ✅ Deploy exitoso
==========================================
```

---

## 3. Configuración de DNS

### 3.1 Obtener IP del Ingress

```bash
# Obtener IP externa del ingress
kubectl get ingress main-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# O si usa hostname
kubectl get ingress main-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### 3.2 Configurar CloudFlare

1. Ir al panel de CloudFlare
2. Seleccionar el dominio
3. Ir a **DNS** → **Records**
4. Crear/editar registro A:
   - **Type**: A
   - **Name**: @ o asambleas
   - **Content**: [IP_DEL_INGRESS]
   - **Proxy status**: Activado (orange cloud)

> El host configurado en `k8s/base/ingress.yaml` y en `k8s/base/tls-secret.yaml` debe coincidir
> exactamente con el dominio real (`asambleas.giramaster.co`) y con el certificado TLS emitido
> para ese dominio.

---

## 4. Verificación

### Endpoints

| Servicio | URL |
|----------|-----|
| Frontend | https://asambleas.giramaster.co/ |
| Backend API | https://asambleas.giramaster.co/api/v1/ |
| Health | https://asambleas.giramaster.co/health |

### Verificar SSL

```bash
# Ver certificado SSL
curl -vI https://asambleas.giramaster.co/

# Verificar que el certificado es válido
openssl s_client -connect asambleas.giramaster.co:443 -servername asambleas.giramaster.co
```

### Health checks

```bash
# MySQL
kubectl get pods -l app=mysql
kubectl exec -it <mysql-pod> -- mysqladmin ping

# Backend
curl https://asambleas.giramaster.co/api/v1/

# Frontend
curl https://asambleas.giramaster.co/health
```

---

## 5. Ver Logs

```bash
# Logs del frontend
kubectl logs -l app=frontend -f

# Logs del backend
kubectl logs -l app=backend -f

# Logs de Celery
kubectl logs -l app=celery-worker -f

# Logs de MySQL
kubectl logs -l app=mysql -f

# Logs de Redis
kubectl logs -l app=redis -f

# Ver eventos
kubectl get events --sort-by='.lastTimestamp'
```

---

## 6. Escalado

### Escalar Frontend

```bash
kubectl scale deployment frontend --replicas=3
```

### Escalar Backend

```bash
kubectl scale deployment backend --replicas=2
```

---

## 7. Actualizaciones

### Camino recomendado: CI/CD automático

El flujo real de actualización es hacer `push` a la rama `master`. El workflow de GitHub Actions
(`.github/workflows/deploy.yml`) se conecta por SSH al servidor y hace todo automáticamente:
actualiza el código, compila el frontend, reconstruye ambas imágenes Docker, las importa a k3s
(`k3s ctr images import`, sin registry) y reinicia `backend`, `frontend` y `celery-worker` con
`kubectl rollout restart` + `rollout status`. También se puede disparar manualmente desde la
pestaña **Actions** del repo (`workflow_dispatch`), con la opción `skip_frontend_build` si solo
cambió el backend.

### Camino manual (fuera del pipeline)

```bash
# Backend (también reinicia celery-worker, comparte imagen)
docker build -t giramaster-backend:latest ./backend
docker save giramaster-backend:latest | sudo k3s ctr images import -
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/celery-worker

# Ver estado
kubectl rollout status deployment/backend
kubectl rollout status deployment/celery-worker
```

```bash
# Frontend
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..
docker build -t giramaster-frontend:latest ./frontend
docker save giramaster-frontend:latest | sudo k3s ctr images import -

# Restart pods
kubectl rollout restart deployment/frontend
```

---

## 8. Rollback

```bash
# Ver historial
kubectl rollout history deployment/backend

# Rollback a revisión anterior
kubectl rollout undo deployment/backend

# Rollback a revisión específica
kubectl rollout undo deployment/backend --to-revision=2
```

---

## 9. Limpieza

```bash
# Eliminar todos los recursos
kubectl delete -k k8s/overlays/local

# Eliminar PVC (¡CUIDADO! Elimina los datos)
kubectl delete pvc mysql-pvc

# Eliminar imágenes locales (opcional)
docker rmi giramaster-backend:latest giramaster-frontend:latest
```

---

## Configuración de Producción (Valores por defecto)

| Componente | Réplicas | Recursos |
|------------|----------|----------|
| Frontend | 2 | 64Mi-128Mi RAM, 100m-200m CPU |
| Backend | 2 | 256Mi-512Mi RAM, 250m-500m CPU |
| Celery Worker | 2 | 256Mi-512Mi RAM, 250m-500m CPU |
| MySQL | 1 | 512Mi-1Gi RAM, 250m-500m CPU |
| Redis | 1 | 128Mi-256Mi RAM, 100m-200m CPU |

---

## 10. Celery (Workers)

### 10.1 Verificar que Celery está funcionando

```bash
# Ver pods de celery
kubectl get pods -l app=celery-worker

# Ver logs
kubectl logs -l app=celery-worker -f

# Ver cola de tareas
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect active

# Probar ping
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect ping
```

### 10.2 Escalar workers

```bash
# Escalar workers
kubectl scale deployment celery-worker --replicas=4
```

### 10.3 Depuración de tareas

```bash
# Ver tareas pendientes
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect scheduled

# Ver tareas reservdas
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect reserved

# Forzarpurga de cola
kubectl exec -it <celery-pod> -- celery -A app.celery_app purge
```

---

## Troubleshooting

### Problema: Ingress no obtiene IP externa

```bash
# Ver eventos del ingress
kubectl describe ingress main-ingress

# Ver si el service del ingress controller existe
kubectl get svc -n ingress-nginx
```

### Problema: SSL no funciona

```bash
# Ver certificado
kubectl describe secret tls-secret

# Ver configuración del ingress
kubectl describe ingress main-ingress
```

### Problema: Pods no inician

```bash
# Ver logs
kubectl logs <pod-name>

# Describir pod
kubectl describe pod <pod-name>
```

---

## Estructura Final

```
k8s/
├── base/
│   ├── frontend/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── secret.yaml
│   │   └── service.yaml
│   ├── backend/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── secret.yaml
│   │   └── service.yaml
│   ├── mysql/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── pvc.yaml
│   │   ├── secret.yaml
│   │   └── service.yaml
│   ├── ingress.yaml
│   ├── tls-secret.yaml
│   └── kustomization.yaml
└── overlays/
    └── local/
        └── kustomization.yaml
```
