# Ejemplos de Uso - Sistema de Encuestas

## 🎯 FLUJO COMPLETO CON EJEMPLOS DE REQUESTS

---

## 1. ADMINISTRADOR CREA UNA ENCUESTA

### Request
```http
POST /api/v1/polls/
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "int_meeting_id": 15,
  "str_title": "¿Aprobar la renovación del ascensor?",
  "str_description": "Votación para aprobar el presupuesto de $50,000 para renovar el ascensor",
  "str_poll_type": "single",
  "bln_is_anonymous": false,
  "bln_requires_quorum": true,
  "dec_minimum_quorum_percentage": 51.0,
  "bln_allows_abstention": true,
  "int_max_selections": 1,
  "int_duration_minutes": 30,
  "options": [
    {
      "str_option_text": "A favor",
      "int_option_order": 1
    },
    {
      "str_option_text": "En contra",
      "int_option_order": 2
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "status_code": 201,
  "message": "Encuesta creada exitosamente",
  "data": {
    "id": 42,
    "poll_code": "A7K9X2L1",
    "title": "¿Aprobar la renovación del ascensor?",
    "status": "draft",
    "options_count": 2
  }
}
```

---

## 2. ADMINISTRADOR INICIA LA ENCUESTA

### Request
```http
POST /api/v1/polls/42/start
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "duration_minutes": 60
}
```

### Response
```json
{
  "success": true,
  "status_code": 200,
  "message": "Encuesta iniciada exitosamente",
  "data": {
    "id": 42,
    "poll_code": "A7K9X2L1",
    "status": "active",
    "started_at": "2025-11-15T14:30:00",
    "ends_at": "2025-11-15T15:30:00"
  }
}
```

**IMPORTANTE:** El administrador debe compartir el código `A7K9X2L1` con los copropietarios.

---

## 3. COPROPIETARIO ACCEDE A LA ENCUESTA (SIN LOGIN)

### Request
```http
GET /api/v1/polls/code/A7K9X2L1
```

### Response
```json
{
  "success": true,
  "status_code": 200,
  "message": "Encuesta obtenida exitosamente",
  "data": {
    "id": 42,
    "str_poll_code": "A7K9X2L1",
    "str_title": "¿Aprobar la renovación del ascensor?",
    "str_description": "Votación para aprobar el presupuesto de $50,000...",
    "str_poll_type": "single",
    "str_status": "active",
    "bln_allows_abstention": true,
    "int_max_selections": 1,
    "dat_ended_at": "2025-11-15T15:30:00",
    "options": [
      {
        "id": 101,
        "str_option_text": "A favor",
        "int_option_order": 1
      },
      {
        "id": 102,
        "str_option_text": "En contra",
        "int_option_order": 2
      }
    ]
  }
}
```

---

## 4. COPROPIETARIO VOTA (SIN LOGIN) - OPCIÓN A FAVOR

### Request
```http
POST /api/v1/polls/code/A7K9X2L1/vote
Content-Type: application/json

{
  "int_option_id": 101,
  "bln_is_abstention": false
}
```

### Response
```json
{
  "success": true,
  "status_code": 201,
  "message": "Voto registrado exitosamente",
  "data": {
    "id": 523,
    "poll_id": 42,
    "voted_at": "2025-11-15T14:45:00",
    "is_abstention": false
  }
}
```

---

## 5. COPROPIETARIO VOTA - ABSTENCIÓN

### Request
```http
POST /api/v1/polls/code/A7K9X2L1/vote
Content-Type: application/json

{
  "bln_is_abstention": true
}
```

### Response
```json
{
  "success": true,
  "status_code": 201,
  "message": "Voto registrado exitosamente",
  "data": {
    "id": 524,
    "poll_id": 42,
    "voted_at": "2025-11-15T14:46:00",
    "is_abstention": true
  }
}
```

---

## 6. ADMINISTRADOR VE ESTADÍSTICAS EN TIEMPO REAL

### Request
```http
GET /api/v1/polls/42/statistics
Authorization: Bearer {admin_token}
```

### Response
```json
{
  "success": true,
  "status_code": 200,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "poll_info": {
      "id": 42,
      "str_title": "¿Aprobar la renovación del ascensor?",
      "str_status": "active",
      "str_poll_type": "single"
    },
    "statistics": {
      "total_responses": 45,
      "total_votes": 42,
      "total_abstentions": 3,
      "participation_percentage": 75.0,
      "quorum_reached": true,
      "required_quorum": 51.0
    },
    "options": [
      {
        "id": 101,
        "str_option_text": "A favor",
        "int_votes_count": 30,
        "dec_weight_total": 30.0,
        "dec_percentage": 71.43
      },
      {
        "id": 102,
        "str_option_text": "En contra",
        "int_votes_count": 12,
        "dec_weight_total": 12.0,
        "dec_percentage": 28.57
      }
    ]
  }
}
```

---

## 7. ADMINISTRADOR CIERRA LA ENCUESTA

### Request
```http
POST /api/v1/polls/42/end
Authorization: Bearer {admin_token}
```

### Response
```json
{
  "success": true,
  "status_code": 200,
  "message": "Encuesta finalizada exitosamente",
  "data": {
    "id": 42,
    "poll_code": "A7K9X2L1",
    "status": "closed",
    "ended_at": "2025-11-15T15:30:00"
  }
}
```

---

## 8. VER RESULTADOS FINALES

### Request
```http
GET /api/v1/polls/42/results
Authorization: Bearer {admin_token}
```

### Response
```json
{
  "success": true,
  "status_code": 200,
  "message": "Resultados obtenidos exitosamente",
  "data": {
    "poll_info": {
      "id": 42,
      "str_title": "¿Aprobar la renovación del ascensor?",
      "str_description": "Votación para aprobar el presupuesto...",
      "str_poll_type": "single",
      "str_status": "closed",
      "dat_started_at": "2025-11-15T14:30:00",
      "dat_ended_at": "2025-11-15T15:30:00"
    },
    "results": {
      "total_responses": 52,
      "total_votes": 48,
      "total_abstentions": 4,
      "participation_percentage": 86.67,
      "quorum_reached": true,
      "required_quorum": 51.0
    },
    "options_results": [
      {
        "id": 101,
        "str_option_text": "A favor",
        "int_option_order": 1,
        "int_votes_count": 35,
        "dec_weight_total": 35.0,
        "dec_percentage": 72.92
      },
      {
        "id": 102,
        "str_option_text": "En contra",
        "int_option_order": 2,
        "int_votes_count": 13,
        "dec_weight_total": 13.0,
        "dec_percentage": 27.08
      }
    ]
  }
}
```

---

## 📋 OTROS EJEMPLOS

### ENCUESTA DE OPCIÓN MÚLTIPLE

```json
{
  "int_meeting_id": 15,
  "str_title": "¿Qué mejoras quieres para el edificio?",
  "str_poll_type": "multiple",
  "int_max_selections": 3,
  "options": [
    {"str_option_text": "Renovar piscina"},
    {"str_option_text": "Agregar gimnasio"},
    {"str_option_text": "Mejorar jardines"},
    {"str_option_text": "Instalar cámaras"},
    {"str_option_text": "Pintar fachada"}
  ]
}
```

### ENCUESTA DE TEXTO LIBRE

```json
{
  "int_meeting_id": 15,
  "str_title": "¿Qué sugerencias tienes para mejorar la seguridad?",
  "str_poll_type": "text",
  "bln_is_anonymous": true,
  "options": []
}
```

**Voto:**
```json
{
  "str_response_text": "Sugiero contratar más vigilantes en horario nocturno"
}
```

### ENCUESTA NUMÉRICA

```json
{
  "int_meeting_id": 15,
  "str_title": "¿Cuánto estarías dispuesto a pagar mensualmente por un gimnasio?",
  "str_poll_type": "numeric",
  "options": []
}
```

**Voto:**
```json
{
  "dec_response_number": 50.00
}
```

---

## 🔐 AUTENTICACIÓN

### Para administradores (endpoints protegidos):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Para copropietarios (endpoints públicos):
**NO SE REQUIERE** - Usan el código de la encuesta

---

## MANEJO DE ERRORES

### Error: Encuesta no encontrada
```json
{
  "success": false,
  "status_code": 404,
  "message": "La encuesta no existe",
  "error_code": "POLL_NOT_FOUND",
  "details": {},
  "timestamp": "2025-11-15T14:30:00"
}
```

### Error: Ya votó
```json
{
  "success": false,
  "status_code": 400,
  "message": "Ya has votado en esta encuesta",
  "error_code": "ALREADY_VOTED",
  "details": {},
  "timestamp": "2025-11-15T14:30:00"
}
```

### Error: Encuesta no activa
```json
{
  "success": false,
  "status_code": 400,
  "message": "La encuesta no está activa",
  "error_code": "POLL_NOT_ACTIVE",
  "details": {},
  "timestamp": "2025-11-15T14:30:00"
}
```

### Error: Sin permisos
```json
{
  "success": false,
  "status_code": 403,
  "message": "No tienes permisos para administrar encuestas de esta reunión",
  "error_code": "INSUFFICIENT_PERMISSIONS",
  "details": {},
  "timestamp": "2025-11-15T14:30:00"
}
```

---

## 🌐 URLs COMPLETAS

Suponiendo que el backend está en `http://localhost:8000`:

- **Crear encuesta:** `POST http://localhost:8000/api/v1/polls/`
- **Iniciar encuesta:** `POST http://localhost:8000/api/v1/polls/{poll_id}/start`
- **Acceder por código:** `GET http://localhost:8000/api/v1/polls/code/{poll_code}`
- **Votar (público):** `POST http://localhost:8000/api/v1/polls/code/{poll_code}/vote`
- **Votar (autenticado):** `POST http://localhost:8000/api/v1/polls/{poll_id}/vote`
- **Estadísticas:** `GET http://localhost:8000/api/v1/polls/{poll_id}/statistics`
- **Cerrar encuesta:** `POST http://localhost:8000/api/v1/polls/{poll_id}/end`
- **Ver resultados:** `GET http://localhost:8000/api/v1/polls/{poll_id}/results`
- **Listar de reunión:** `GET http://localhost:8000/api/v1/polls/meeting/{meeting_id}/polls`

---

## 📱 EJEMPLO DE INTEGRACIÓN EN FRONTEND

```javascript
// 1. Copropietario escanea QR o ingresa código
const pollCode = "A7K9X2L1";

// 2. Obtener encuesta
const response = await fetch(`/api/v1/polls/code/${pollCode}`);
const poll = await response.json();

// 3. Mostrar opciones y permitir votar
const vote = {
  int_option_id: selectedOptionId,
  bln_is_abstention: false
};

await fetch(`/api/v1/polls/code/${pollCode}/vote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(vote)
});
```

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar migración SQL (`MIGRATION_POLL_FIX.sql`)
- [ ] Reiniciar servidor backend
- [ ] Probar crear encuesta como admin
- [ ] Probar iniciar encuesta
- [ ] Probar acceso público por código
- [ ] Probar votación sin autenticación
- [ ] Probar abstención
- [ ] Probar cerrar encuesta
- [ ] Verificar cálculo de estadísticas
- [ ] Verificar permisos de admin
- [ ] Probar diferentes tipos de encuestas (single, multiple, text, numeric)
