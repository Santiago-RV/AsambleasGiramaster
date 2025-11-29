# 🧪 Guía de Pruebas con Postman - Sistema de Encuestas

## 📦 1. IMPORTAR LA COLECCIÓN

1. Abre Postman
2. Click en **Import** (arriba a la izquierda)
3. Selecciona el archivo: `Postman_Collection_Encuestas.json`
4. Click en **Import**

---

## ⚙️ 2. CONFIGURAR VARIABLES

La colección ya tiene configuradas estas variables:

| Variable | Valor por Defecto | Descripción |
|----------|-------------------|-------------|
| `base_url` | `http://localhost:8000` | URL del backend |
| `admin_token` | (vacío) | Se llena automáticamente al hacer login |
| `poll_id` | (vacío) | Se llena automáticamente al crear encuesta |
| `poll_code` | (vacío) | Se llena automáticamente al crear encuesta |
| `meeting_id` | `1` | **IMPORTANTE: Cámbialo por un ID de reunión real** |

### Cómo cambiar las variables:
1. Click derecho en la colección → **Edit**
2. Pestaña **Variables**
3. Modifica `meeting_id` con un ID real de tu BD
4. Click **Save**

---

## 🚀 3. FLUJO COMPLETO DE PRUEBAS

### PASO 1: Login como Administrador

**Endpoint:** `1. Autenticación → Login Admin`

**Request:**
```http
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**IMPORTANTE:**
- Cambia `username` y `password` por credenciales reales de tu sistema
- El script automáticamente guardará el token en `{{admin_token}}`

**Verificación:**
- Status: `200 OK`
- Response debe incluir `access_token`
- En la pestaña **Variables** de la colección, verifica que `admin_token` tenga valor

---

### PASO 2: Crear una Encuesta

**Endpoint:** `2. Crear Encuesta → Crear Encuesta Simple (Sí/No)`

**Request:**
```http
POST http://localhost:8000/api/v1/polls/
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "int_meeting_id": 1,
  "str_title": "¿Aprobar la renovación del ascensor?",
  "str_description": "Votación para aprobar el presupuesto...",
  "str_poll_type": "single",
  "bln_is_anonymous": false,
  "bln_requires_quorum": true,
  "dec_minimum_quorum_percentage": 51.0,
  "bln_allows_abstention": true,
  "int_max_selections": 1,
  "int_duration_minutes": 30,
  "options": [
    {"str_option_text": "A favor", "int_option_order": 1},
    {"str_option_text": "En contra", "int_option_order": 2}
  ]
}
```

**Verificación:**
- Status: `201 Created`
- Response incluye `poll_code` (ej: "A7K9X2L1")
- Variables `poll_id` y `poll_code` se actualizan automáticamente
- Estado debe ser `draft`

**💡 Tip:** Copia el `poll_code` de la respuesta, lo necesitarás después.

---

### PASO 3: Iniciar la Encuesta

**Endpoint:** `3. Gestionar Encuesta → Iniciar Encuesta`

**Request:**
```http
POST http://localhost:8000/api/v1/polls/{{poll_id}}/start
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "duration_minutes": 60
}
```

**Verificación:**
- Status: `200 OK`
- Estado cambia a `active`
- `dat_started_at` tiene valor
- `dat_ended_at` se calcula (1 hora después)

---

### PASO 4: Obtener Encuesta por Código (SIN AUTH)

**Endpoint:** `4. Acceso Público → Obtener Encuesta por Código (Público)`

**Request:**
```http
GET http://localhost:8000/api/v1/polls/code/{{poll_code}}
```

**IMPORTANTE:**
- **NO incluyas** el header `Authorization`
- Este endpoint es público

**Verificación:**
- Status: `200 OK`
- Response incluye todas las opciones
- Anota los `id` de las opciones para votar

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "str_poll_code": "A7K9X2L1",
    "str_title": "¿Aprobar la renovación del ascensor?",
    "str_status": "active",
    "options": [
      {"id": 101, "str_option_text": "A favor"},
      {"id": 102, "str_option_text": "En contra"}
    ]
  }
}
```

---

### PASO 5: Votar (SIN AUTENTICACIÓN)

**Endpoint:** `5. Votar (Público) → Votar - A Favor (Público)`

**IMPORTANTE:** Cambia `int_option_id` por el ID real de la opción que obtuviste en el paso anterior.

**Request:**
```http
POST http://localhost:8000/api/v1/polls/code/{{poll_code}}/vote
Content-Type: application/json

{
  "int_option_id": 101,
  "bln_is_abstention": false
}
```

**Verificación:**
- Status: `201 Created`
- Response incluye `id` del voto
- `is_abstention` es `false`

**Para votar "En Contra":**
```json
{
  "int_option_id": 102,
  "bln_is_abstention": false
}
```

**Para Abstención:**
```json
{
  "bln_is_abstention": true
}
```

**💡 Simular Múltiples Votantes:**
Para simular varios copropietarios votando, ejecuta el mismo request varias veces cambiando entre las opciones.

---

### PASO 6: Ver Estadísticas en Tiempo Real

**Endpoint:** `7. Resultados → Ver Estadísticas en Tiempo Real`

**Request:**
```http
GET http://localhost:8000/api/v1/polls/{{poll_id}}/statistics
Authorization: Bearer {{admin_token}}
```

**Verificación:**
- Status: `200 OK`
- `total_responses`: Número de votos
- `total_votes`: Votos válidos (sin abstenciones)
- `total_abstentions`: Número de abstenciones
- `participation_percentage`: % de participación
- `quorum_reached`: true/false

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_responses": 15,
      "total_votes": 13,
      "total_abstentions": 2,
      "participation_percentage": 75.0,
      "quorum_reached": true
    },
    "options": [
      {
        "str_option_text": "A favor",
        "int_votes_count": 10,
        "dec_percentage": 76.92
      },
      {
        "str_option_text": "En contra",
        "int_votes_count": 3,
        "dec_percentage": 23.08
      }
    ]
  }
}
```

---

### PASO 7: Finalizar la Encuesta

**Endpoint:** `3. Gestionar Encuesta → Finalizar Encuesta`

**Request:**
```http
POST http://localhost:8000/api/v1/polls/{{poll_id}}/end
Authorization: Bearer {{admin_token}}
```

**Verificación:**
- Status: `200 OK`
- Estado cambia a `closed`
- `dat_ended_at` se actualiza

---

### PASO 8: Ver Resultados Finales

**Endpoint:** `7. Resultados → Ver Resultados Finales`

**Request:**
```http
GET http://localhost:8000/api/v1/polls/{{poll_id}}/results
Authorization: Bearer {{admin_token}}
```

**Verificación:**
- Status: `200 OK`
- Resultados completos con porcentajes finales
- Quorum calculado

---

## 🧪 4. CASOS DE PRUEBA ADICIONALES

### A. Probar Encuesta Múltiple

1. Usa: `2. Crear Encuesta → Crear Encuesta Múltiple`
2. Inicia la encuesta
3. Vota seleccionando múltiples opciones (hasta 3)

**Request de voto múltiple:**
```json
{
  "int_option_ids": [101, 102, 103],
  "bln_is_abstention": false
}
```

---

### B. Probar Encuesta de Texto

1. Usa: `2. Crear Encuesta → Crear Encuesta de Texto Libre`
2. Inicia la encuesta
3. Vota: `5. Votar (Público) → Votar - Texto Libre (Público)`

**Request:**
```json
{
  "str_response_text": "Sugiero contratar más vigilantes en horario nocturno",
  "bln_is_abstention": false
}
```

---

### C. Probar Validaciones de Errores

#### Error 1: Votar en encuesta no activa
1. Crea una encuesta pero **NO la inicies**
2. Intenta votar
3. Debe retornar: `400 Bad Request` - "La encuesta no está activa"

#### Error 2: Votar dos veces (si no es anónima)
1. Vota usando el endpoint autenticado
2. Vota de nuevo con el mismo usuario
3. Debe retornar: `400 Bad Request` - "Ya has votado en esta encuesta"

#### Error 3: Sin permisos de admin
1. Crea un segundo usuario sin permisos de admin
2. Login con ese usuario
3. Intenta crear/iniciar/cerrar encuesta
4. Debe retornar: `403 Forbidden` - "No tienes permisos..."

#### Error 4: Encuesta no encontrada
```http
GET http://localhost:8000/api/v1/polls/code/XXXXXXXX
```
Debe retornar: `404 Not Found` - "La encuesta no existe"

---

## 📊 5. VERIFICAR EN BASE DE DATOS

Después de probar, verifica en tu BD:

```sql
-- Ver la encuesta creada
SELECT * FROM tbl_polls WHERE id = 42;

-- Ver las opciones
SELECT * FROM tbl_poll_options WHERE int_poll_id = 42;

-- Ver los votos
SELECT * FROM tbl_poll_responses WHERE int_poll_id = 42;

-- Ver estadísticas calculadas
SELECT
    po.str_option_text,
    po.int_votes_count,
    po.dec_weight_total,
    po.dec_percentage
FROM tbl_poll_options po
WHERE po.int_poll_id = 42;
```

---

## 🔧 6. TROUBLESHOOTING

### Problema: "Token inválido o expirado"
**Solución:** Ejecuta nuevamente el request de Login

### Problema: "La reunión no existe"
**Solución:** Cambia la variable `meeting_id` por un ID válido en tu BD

### Problema: "No tienes permisos para administrar encuestas"
**Solución:** Verifica que el usuario sea el `int_organizer_id` o `int_meeting_leader_id` de la reunión

### Problema: "Debe seleccionar una opción"
**Solución:** Asegúrate de usar el `id` correcto de la opción (no el índice)

### Problema: Variables no se actualizan automáticamente
**Solución:**
1. Ve a la pestaña **Tests** del request
2. Verifica que el script esté activo
3. Ejecuta el request de nuevo

---

## 📱 7. SIMULANDO EL FLUJO DE UN COPROPIETARIO

Para simular a un copropietario real:

1. **Abre una ventana de incógnito en Postman** (New Window)
2. **NO hagas login** (el copropietario no tiene cuenta)
3. **Solo usa estos endpoints:**
   - `GET /polls/code/{poll_code}` - Ver la encuesta
   - `POST /polls/code/{poll_code}/vote` - Votar

**Esto simula exactamente lo que hará un copropietario desde su celular.**

---

## CHECKLIST DE PRUEBAS

- [ ] Login como admin exitoso
- [ ] Crear encuesta tipo single
- [ ] Crear encuesta tipo multiple
- [ ] Crear encuesta tipo text
- [ ] Iniciar encuesta
- [ ] Obtener encuesta por código (sin auth)
- [ ] Votar sin autenticación
- [ ] Votar con autenticación
- [ ] Ver estadísticas en tiempo real
- [ ] Finalizar encuesta
- [ ] Ver resultados finales
- [ ] Probar error: encuesta no activa
- [ ] Probar error: voto duplicado
- [ ] Probar error: sin permisos
- [ ] Verificar datos en BD

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisa los logs del backend
2. Verifica que la migración SQL se haya ejecutado
3. Confirma que las credenciales de login sean correctas
4. Asegúrate de que el `meeting_id` exista en la BD

**¡Buena suerte con las pruebas!** 🚀
