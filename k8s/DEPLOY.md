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

### 1.1 Backend

```bash
# Build imagen
docker build -t backend:latest ./backend

# Tag para registry (si usa uno privado)
docker tag backend:latest tu-registry/backend:latest
docker push tu-registry/backend:latest
```

### 1.2 Frontend

```bash
# Build del frontend
cd frontend
npm run build

# Build imagen Docker
docker build -t frontend:latest ./frontend

# Tag para registry (si usa uno privado)
docker tag frontend:latest tu-registry/frontend:latest
docker push tu-registry/frontend:latest
```

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
   - **Name**: @ o assembleas
   - **Content**: [IP_DEL_INGRESS]
   - **Proxy status**: Activado (orange cloud)

---

## 4. Verificación

### Endpoints

| Servicio | URL |
|----------|-----|
| Frontend | https://asambleas.giramaster.com/ |
| Backend API | https://asambleas.giramaster.com/api/v1/ |
| Health | https://asambleas.giramaster.com/health |

### Verificar SSL

```bash
# Ver certificado SSL
curl -vI https://asambleas.giramaster.com/

# Verificar que el certificado es válido
openssl s_client -connect assembleas.giramaster.com:443 -servername assembleas.giramaster.com
```

### Health checks

```bash
# MySQL
kubectl get pods -l app=mysql
kubectl exec -it <mysql-pod> -- mysqladmin ping

# Backend
curl https://asambleas.giramaster.com/api/v1/

# Frontend
curl https://asambleas.giramaster.com/health
```

---

## 5. Ver Logs

```bash
# Logs del frontend
kubectl logs -l app=frontend -f

# Logs del backend
kubectl logs -l app=backend -f

# Logs de MySQL
kubectl logs -l app=mysql -f

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

### Actualizar Backend

```bash
# Rebuild imagen
docker build -t backend:latest ./backend

# Tag y push (si usa registry)
docker tag backend:latest tu-registry/backend:latest
docker push tu-registry/backend:latest

# Restart pods
kubectl rollout restart deployment/backend

# Ver estado
kubectl rollout status deployment/backend
```

### Actualizar Frontend

```bash
# Rebuild imagen
cd frontend
npm run build
docker build -t frontend:latest ./frontend

# Tag y push (si usa registry)
docker tag frontend:latest tu-registry/frontend:latest
docker push tu-registry/frontend:latest

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
docker rmi backend:latest frontend:latest
```

---

## Configuración de Producción (Valores por defecto)

| Componente | Réplicas | Recursos |
|------------|----------|----------|
| Frontend | 2 | 64Mi-128Mi RAM, 100m-200m CPU |
| Backend | 1 | 256Mi-512Mi RAM, 250m-500m CPU |
| MySQL | 1 | 512Mi-1Gi RAM, 250m-500m CPU |

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
