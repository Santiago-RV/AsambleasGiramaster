# Correcciones al Sistema de Encuestas

## Fecha: 2025-11-15

---

## ✅ PROBLEMAS CORREGIDOS

### 1. **Schemas Corregidos**

#### **poll_schema.py**
- ✅ **PollCreate**: Ahora solo requiere los campos necesarios para crear una encuesta
  - Incluye lista de opciones (`options: List[PollOptionInput]`)
  - Validación de tipo de encuesta
  - Validación de mínimo 2 opciones para tipo single/multiple
  - Campos opcionales tienen valores por defecto

- ✅ **PollUpdate**: Solo campos actualizables (título, descripción, etc.)

- ✅ **PollBase**: Schema de respuesta con todos los campos (incluye created_at, id, etc.)

#### **pool_response_schema.py**
- ✅ **PollResponseCreate**: Solo campos necesarios para votar
  - `int_option_id` (opcional)
  - `str_response_text` (opcional)
  - `dec_response_number` (opcional)
  - `bln_is_abstention` (default: false)

- ✅ **PollMultipleResponseCreate**: Para votos múltiples
  - `int_option_ids: List[int]`

### 2. **Modelo de Base de Datos Actualizado**

#### **poll_model.py**
```python
# Campos ahora son nullable
dat_started_at = Column(DateTime, nullable=True)  # ✅ Ahora puede ser NULL
dat_ended_at = Column(DateTime, nullable=True)    # ✅ Ahora puede ser NULL
int_duration_minutes = Column(Integer, nullable=True)  # ✅ Ahora puede ser NULL

# Valores por defecto
int_max_selections = Column(Integer, nullable=False, default=1)
str_status = Column(String(50), index=True, nullable=False, default='draft')
```

**⚠️ IMPORTANTE:** Ejecutar migración SQL: `MIGRATION_POLL_FIX.sql`

### 3. **Peso de Votación Implementado**

#### **pool_service.py:290-309**
```python
async def _get_user_voting_weight(self, user_id: int, meeting_id: int) -> float:
    """Obtiene el peso de votación real desde meeting_invitations"""
    # ✅ Ahora consulta dec_voting_weight de tbl_meeting_invitations
    # ✅ Valida que el usuario esté invitado
    # ✅ Retorna el coeficiente real
```

### 4. **Cálculo de Participantes Real**

#### **pool_service.py:366-379**
```python
# ✅ Cuenta invitados reales desde tbl_meeting_invitations
total_participants_result = await self.db.execute(
    select(func.count(MeetingInvitationModel.id))
    .where(MeetingInvitationModel.int_meeting_id == poll.int_meeting_id)
)
# ✅ Cálculo de quorum ahora es preciso
```

### 5. **Validación de Permisos de Administrador**

#### **pool_service.py:29-50**
```python
async def _verify_admin_permissions(self, meeting_id: int, user_id: int):
    """
    ✅ Verifica que el usuario sea:
       - Organizador de la reunión (int_organizer_id)
       - O líder de la reunión (int_meeting_leader_id)
    ✅ Se aplica en:
       - create_poll()
       - start_poll()
       - end_poll()
    """
```

### 6. **Endpoint de Votación Público**

#### **poll_endpoint.py:331-382**
```python
@router.post("/code/{poll_code}/vote")
async def vote_poll_by_code(poll_code: str, ...):
    """
    ✅ NO requiere autenticación
    ✅ Acceso mediante código de encuesta
    ✅ Peso de votación = 1.0 para votos anónimos
    ✅ Ideal para copropietarios sin cuenta
    """
```

#### **Mantenido: Endpoint Autenticado**
```python
@router.post("/{poll_id}/vote")
async def vote_poll(poll_id: int, current_user: str = Depends(get_current_user), ...):
    """
    ✅ Requiere autenticación
    ✅ Usa peso de votación del usuario desde meeting_invitations
    ✅ Previene voto duplicado
    """
```

### 7. **Nueva Excepción Agregada**

#### **exceptions.py:195-204**
```python
class UnauthorizedException(BaseAPIException):
    """Para permisos insuficientes (403)"""
```

---

## 🔄 FLUJO COMPLETO AHORA FUNCIONAL

### **1. Administrador crea encuesta**
```
POST /polls/
Body: {
  "int_meeting_id": 1,
  "str_title": "¿Aprobar la renovación del ascensor?",
  "str_poll_type": "single",
  "options": [
    {"str_option_text": "A favor"},
    {"str_option_text": "En contra"}
  ]
}
```
✅ Valida que el usuario sea admin de la reunión
✅ Genera código único (ej: "A7K9X2L1")
✅ Estado: `draft`

### **2. Administrador inicia encuesta**
```
POST /polls/{poll_id}/start
```
✅ Cambia estado a `active`
✅ Asigna `dat_started_at`
✅ Solo el organizador/líder puede iniciar

### **3. Copropietarios acceden (sin login)**
```
GET /polls/code/A7K9X2L1
```
✅ Acceso público sin autenticación
✅ Retorna info de la encuesta y opciones

### **4. Copropietarios votan (sin login)**
```
POST /polls/code/A7K9X2L1/vote
Body: {
  "int_option_id": 123,
  "bln_is_abstention": false
}
```
✅ No requiere autenticación
✅ Registra IP y User-Agent
✅ Peso = 1.0 (o el configurado si está autenticado)

### **5. Administrador cierra encuesta**
```
POST /polls/{poll_id}/end
```
✅ Cambia estado a `closed`
✅ Calcula estadísticas finales
✅ Solo el organizador/líder puede cerrar

### **6. Ver resultados**
```
GET /polls/{poll_id}/results
```
✅ Solo disponible si está en estado `closed`
✅ Muestra participación real
✅ Verifica si se alcanzó el quorum

---

## 📋 PASOS PARA IMPLEMENTAR

### 1. **Ejecutar Migración de Base de Datos**
```bash
psql -U tu_usuario -d tu_base_de_datos -f MIGRATION_POLL_FIX.sql
```

### 2. **Reiniciar el servidor backend**
```bash
cd backend
uvicorn app.main:app --reload
```

### 3. **Probar flujo completo**
- Crear encuesta como admin
- Iniciar encuesta
- Acceder sin auth usando código
- Votar sin auth
- Cerrar encuesta
- Ver resultados

---

## 🔐 SEGURIDAD

### **Protecciones implementadas:**
✅ Solo admins pueden crear/iniciar/cerrar encuestas
✅ Verificación de estado de encuesta antes de votar
✅ Prevención de voto duplicado (si no es anónima)
✅ Validación de opciones válidas
✅ Registro de IP y User-Agent
✅ Validación de tipo de respuesta según tipo de encuesta

### **Pendientes (opcional):**
- Rate limiting en endpoint público de votación
- CAPTCHA para votos anónimos
- Validación de IP duplicadas para encuestas anónimas

---

## 📊 CAMBIOS EN LOS DATOS

### **Campos del modelo Poll:**
| Campo | Antes | Ahora | Motivo |
|-------|-------|-------|--------|
| `dat_started_at` | NOT NULL | NULL | Encuestas en draft no tienen fecha de inicio |
| `dat_ended_at` | NOT NULL | NULL | Encuestas activas no tienen fecha de fin |
| `int_duration_minutes` | NOT NULL | NULL | Es opcional al crear |
| `int_max_selections` | NOT NULL | NOT NULL (default=1) | Valor por defecto |
| `str_status` | NOT NULL | NOT NULL (default='draft') | Valor por defecto |

### **Nuevos schemas:**
- `PollOptionInput`: Para crear opciones
- `PollMultipleResponseCreate`: Para votos múltiples

---

## ✨ MEJORAS ADICIONALES INCLUIDAS

1. **Validadores Pydantic**
   - Tipo de encuesta debe ser: single, multiple, text, numeric
   - Mínimo 2 opciones para single/multiple

2. **Manejo de errores mejorado**
   - Excepciones específicas para cada caso
   - Mensajes claros en español

3. **Documentación de API**
   - Descripciones actualizadas en endpoints
   - Ejemplos de uso en docstrings

---

## 🐛 BUGS CORREGIDOS

| # | Bug | Solución |
|---|-----|----------|
| 1 | Schemas requerían todos los campos incluyendo IDs y fechas | Separados en Create/Update/Response |
| 2 | Modelo esperaba fechas NOT NULL pero servicio asignaba NULL | Campos ahora nullable |
| 3 | Falta campo `options` en PollCreate | Agregado con validación |
| 4 | Peso de votación siempre 1.0 | Implementado desde meeting_invitations |
| 5 | Participantes hardcodeado en 100 | Cálculo real desde invitaciones |
| 6 | Cualquier usuario podía crear encuestas | Validación de permisos de admin |
| 7 | Votos públicos requerían autenticación | Nuevo endpoint sin auth |

---

## 📞 SOPORTE

Si encuentras algún problema:
1. Verifica que ejecutaste la migración SQL
2. Revisa los logs del servidor
3. Confirma que los datos de meeting_invitations están correctos

**Estado:** ✅ TODAS LAS CORRECCIONES IMPLEMENTADAS
