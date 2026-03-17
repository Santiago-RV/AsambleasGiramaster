# Pruebas de Estrés - Giramaster

Este directorio contiene scripts de pruebas de estrés usando **k6** para evaluar el rendimiento del sistema bajo carga.

## Estructura

```
tests/load/
├── backend/
│   ├── smoke.js           # Prueba básica de conectividad
│   ├── voting_stress.js   # PRUEBA PRINCIPAL - Votación masiva
│   ├── auth_stress.js     # Autenticación masiva
│   ├── meetings_stress.js # Gestión de reuniones
│   └── stats_stress.js   # Estadísticas en tiempo real
├── frontend/
│   └── dashboard_load.js  # Carga de dashboards
├── data/
│   └── generators.py      # Generador de datos de prueba
├── k6.conf.js            # Configuración global
└── README.md             # Este archivo
```

## Requisitos

### 1. Instalar k6

```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (usar Chocolatey o Scoop)
choco install k6
```

### 2. Dependencias Python (para el generador)

```bash
pip install requests
```

## Uso

### Paso 1: Generar datos de prueba

```bash
cd tests/load/data

# Generar 1000 usuarios
python3 generators.py --api-url http://localhost:8000 --count 1000
```

Esto creará:
- 1000 usuarios copropietarios
- 5 reuniones con encuestas
- Invitaciones a reuniones

### Paso 2: Ejecutar pruebas de estrés

#### Prueba de conectividad (smoke test)
```bash
cd tests/load
k6 run backend/smoke.js
```

#### Prueba de VOTACIÓN (principal - 500 usuarios)
```bash
k6 run --config k6.conf.js backend/voting_stress.js
```

#### Prueba de autenticación (300 usuarios)
```bash
k6 run --config k6.conf.js backend/auth_stress.js
```

#### Prueba de reuniones (200 usuarios)
```bash
k6 run --config k6.conf.js backend/meetings_stress.js
```

#### Prueba de estadísticas (200 usuarios)
```bash
k6 run --config k6.conf.js backend/stats_stress.js
```

### Paso 3: Ver resultados

Los resultados se muestran en consola automáticamente. Para guardar en archivo:

```bash
k6 run --config k6.conf.js backend/voting_stress.js --out json=results/voting.json
```

## Configuración

### Variables de entorno

```bash
# URL de la API
export API_URL=http://localhost:8000

# Versión de la API
export API_VERSION=/api/v1

# Credenciales de admin
export TEST_ADMIN_USER=admin
export TEST_ADMIN_PASS=admin123

# IDs de prueba
export POLL_ID=1
export MEETING_ID=1
export RESIDENTIAL_UNIT_ID=1

# Cantidad de usuarios
export USER_COUNT=1000
```

### Configuración de escenarios

Editar `k6.conf.js` para ajustar:
- Cantidad de usuarios virtuales (VUs)
- Duración de las etapas
- Thresholds (límites de rendimiento)

## Métricas esperadas

| Escenario | Usuarios | Latencia p95 | Error rate |
|-----------|----------|---------------|------------|
| Smoke | 5 | < 500ms | < 1% |
| Voting | 500 | < 1000ms | < 5% |
| Auth | 300 | < 1500ms | < 5% |
| Meetings | 200 | < 1500ms | < 5% |
| Stats | 200 | < 2000ms | < 5% |

## Ejecución completa

```bash
#!/bin/bash
# run_all_tests.sh

echo "=== PRUEBAS DE ESTRÉS GIRAMASTER ==="

# 1. Smoke test
echo "1. Smoke test..."
k6 run backend/smoke.js

# 2. Auth
echo "2. Auth stress..."
k6 run --config k6.conf.js backend/auth_stress.js

# 3. Meetings
echo "3. Meetings stress..."
k6 run --config k6.conf.js backend/meetings_stress.js

# 4. VOTING (principal)
echo "4. VOTING STRESS (principal)..."
k6 run --config k6.conf.js backend/voting_stress.js

# 5. Stats
echo "5. Stats stress..."
k6 run --config k6.conf.js backend/stats_stress.js

echo "=== PRUEBAS COMPLETAS ==="
```

## Solución de problemas

### Error: "No se pudo obtener token"
- Verificar que el servidor está corriendo
- Verificar credenciales de admin en `k6.conf.js`

### Error: "Connection refused"
- Verificar que la API está disponible
- Cambiar `API_URL` si es necesario

### Error: "CORS"
- Verificar configuración CORS en el backend

## Notas

- Las pruebas están diseñadas para ejecutarse en un servidor de PRUEBAS
- No ejecutar en producción sin precaución
- Los datos de prueba pueden limpiarse después de las pruebas
