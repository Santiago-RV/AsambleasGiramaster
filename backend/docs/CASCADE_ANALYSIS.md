# Análisis de Eliminación en Cascada - Modelos SQLAlchemy

**Fecha**: 2026-01-14
**Proyecto**: Asambleas Giramaster

## Resumen Ejecutivo

Este documento analiza la configuración actual de eliminación en cascada (`CASCADE`, `RESTRICT`) en todos los modelos de la aplicación y proporciona recomendaciones para asegurar la integridad de datos.

---

## Estado Actual de las Relaciones

### ✅ Configuraciones CORRECTAS (Ya implementadas)

#### 1. ResidentialUnit → Meeting
```python
# Modelo: ResidentialUnitModel
meetings = relationship("MeetingModel", back_populates="residential_unit", cascade="all, delete-orphan")

# ForeignKey en MeetingModel
int_id_residential_unit = Column(Integer, ForeignKey("tbl_residential_units.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Cuando se elimina una unidad residencial, todas sus reuniones deben eliminarse.

---

#### 2. Meeting → Poll
```python
# Modelo: MeetingModel
polls = relationship("PollModel", back_populates="meeting", cascade="all, delete-orphan")

# ForeignKey en PollModel
int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Si una reunión se elimina, sus encuestas pierden contexto y deben eliminarse.

---

#### 3. Poll → PollOption
```python
# Modelo: PollModel
options = relationship("PollOptionModel", back_populates="poll", cascade="all, delete-orphan")

# ForeignKey en PollOptionModel
int_poll_id = Column(Integer, ForeignKey("tbl_polls.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Las opciones de una encuesta no tienen sentido sin la encuesta.

---

#### 4. Poll → PollResponse
```python
# Modelo: PollModel
responses = relationship("PollResponseModel", back_populates="poll", cascade="all, delete-orphan")

# ForeignKey en PollResponseModel
int_poll_id = Column(Integer, ForeignKey("tbl_polls.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Las respuestas de una encuesta deben eliminarse con la encuesta.

---

#### 5. PollOption → PollResponse
```python
# Modelo: PollOptionModel
responses = relationship("PollResponseModel", back_populates="option", cascade="all, delete-orphan")

# ForeignKey en PollResponseModel
int_option_id = Column(Integer, ForeignKey("tbl_poll_options.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Si una opción se elimina, sus respuestas deben eliminarse también.

---

#### 6. Meeting → MeetingInvitation
```python
# ForeignKey en MeetingInvitationModel
int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Las invitaciones sin reunión no tienen propósito.

---

#### 7. Meeting → MeetingAttendance
```python
# ForeignKey en MeetingAttendanceModel
int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id", ondelete="CASCADE", onupdate="CASCADE"))
```
**Estado**: ✅ CORRECTO
**Razón**: Los registros de asistencia sin reunión no tienen sentido.

---

### ⚠️ Configuraciones con RESTRICT (Intencionales y Correctas)

Estas configuraciones usan `RESTRICT` para **prevenir eliminaciones accidentales** de datos importantes:

#### 1. User References (created_by, updated_by, organizer_id)
```python
# En múltiples modelos
created_by = Column(Integer, ForeignKey("tbl_users.id", ondelete="RESTRICT"))
updated_by = Column(Integer, ForeignKey("tbl_users.id", ondelete="RESTRICT"))
int_organizer_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="RESTRICT"))
```
**Estado**: ✅ CORRECTO (INTENCIONAL)
**Razón**: Preserva auditoría. No se debe eliminar un usuario que creó/modificó registros importantes.

---

#### 2. User → PollResponse
```python
# En PollResponseModel
int_user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="RESTRICT"))
```
**Estado**: ✅ CORRECTO (INTENCIONAL)
**Razón**: No se debe eliminar un usuario que ha votado, para preservar el historial de votaciones.

---

#### 3. User → MeetingInvitation
```python
# En MeetingInvitationModel
int_user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="RESTRICT"))
```
**Estado**: ✅ CORRECTO (INTENCIONAL)
**Razón**: Preserva el historial de quiénes fueron invitados a reuniones.

---

#### 4. User → MeetingAttendance
```python
# En MeetingAttendanceModel
int_user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="RESTRICT"))
```
**Estado**: ✅ CORRECTO (INTENCIONAL)
**Razón**: Mantiene registros de asistencia históricos.

---

#### 5. DataUser → User
```python
# En UserModel
int_data_user_id = Column(Integer, ForeignKey("tbl_data_users.id", ondelete="RESTRICT"))
```
**Estado**: ✅ CORRECTO (INTENCIONAL)
**Razón**: No se debe eliminar datos personales que están asociados a usuarios activos.

---

#### 6. Rol → User
```python
# En UserModel
int_id_rol = Column(Integer, ForeignKey("tbl_rols.id", ondelete="RESTRICT"))
```
**Estado**: ✅ CORRECTO (INTENCIONAL)
**Razón**: No se debe eliminar un rol que está siendo usado por usuarios.

---

## ⚠️ FALTANTES IMPORTANTES - Relaciones sin definir en SQLAlchemy

### 1. DataUserModel → UserModel
```python
# ACTUAL en DataUserModel
users = relationship("UserModel", back_populates="data_user")
# ❌ FALTA: cascade="all, delete-orphan"
```

**Problema**: Si se elimina un DataUser, los UserModel asociados NO se eliminan automáticamente por SQLAlchemy.

**Recomendación**:
```python
# Opción A: Si quieres eliminar usuarios al eliminar data_user
users = relationship("UserModel", back_populates="data_user", cascade="all, delete-orphan")

# Opción B: Si quieres prevenir eliminación (más seguro)
# Mantener como está y agregar lógica de negocio para manejar usuarios huérfanos
```

**Recomendación final**: **Opción B** - Mantener RESTRICT por razones de auditoría.

---

### 2. MeetingModel - Falta relationship inversa

El modelo `MeetingModel` debería tener relaciones inversas para:

```python
# AGREGAR en MeetingModel
invitations = relationship("MeetingInvitationModel", back_populates="meeting", cascade="all, delete-orphan")
attendances = relationship("MeetingAttendanceModel", back_populates="meeting", cascade="all, delete-orphan")
```

Y en los modelos MeetingInvitationModel y MeetingAttendanceModel:
```python
# AGREGAR
meeting = relationship("MeetingModel", back_populates="invitations")  # En MeetingInvitationModel
meeting = relationship("MeetingModel", back_populates="attendances")  # En MeetingAttendanceModel
```

---

## 📊 Diagrama de Cascada

```
ResidentialUnit (DELETE CASCADE)
    └── Meeting (DELETE CASCADE)
        ├── Poll (DELETE CASCADE)
        │   ├── PollOption (DELETE CASCADE)
        │   │   └── PollResponse (DELETE CASCADE)
        │   └── PollResponse (DELETE CASCADE)
        ├── MeetingInvitation (DELETE CASCADE)
        └── MeetingAttendance (DELETE CASCADE)

User (DELETE RESTRICT)
    ├── Created/Updated records (RESTRICT - auditoría)
    ├── PollResponse (RESTRICT - historial)
    ├── MeetingInvitation (RESTRICT - historial)
    └── MeetingAttendance (RESTRICT - historial)

DataUser (DELETE RESTRICT)
    └── User (RESTRICT - seguridad)

Rol (DELETE RESTRICT)
    └── User (RESTRICT - seguridad)
```

---

## 🔧 Recomendaciones de Implementación

### 1. Agregar relaciones faltantes en MeetingModel

**Archivo**: `backend/app/models/meeting_model.py`

```python
# Agregar después de la línea 37
invitations = relationship("MeetingInvitationModel", back_populates="meeting", cascade="all, delete-orphan")
attendances = relationship("MeetingAttendanceModel", back_populates="meeting", cascade="all, delete-orphan")
```

### 2. Actualizar MeetingInvitationModel

**Archivo**: `backend/app/models/meeting_invitation_model.py`

```python
# Agregar después de la línea 31
meeting = relationship("MeetingModel", back_populates="invitations")
```

### 3. Actualizar MeetingAttendanceModel

**Archivo**: `backend/app/models/meeting_attendance_model.py`

```python
# Agregar después de la línea 23
meeting = relationship("MeetingModel", back_populates="attendances")
```

---

## ✅ Verificación de Integridad

### Test de eliminación de ResidentialUnit

Al eliminar una ResidentialUnit, se deben eliminar automáticamente:
1. ✅ Meetings asociados
2. ✅ Polls de esos meetings
3. ✅ PollOptions de esos polls
4. ✅ PollResponses de esos polls
5. ✅ MeetingInvitations de esos meetings
6. ✅ MeetingAttendances de esos meetings

### Test de eliminación de User

Al intentar eliminar un User, debe **FALLAR** si:
1. ✅ Tiene records creados/actualizados (auditoría)
2. ✅ Tiene PollResponses (historial de votación)
3. ✅ Tiene MeetingInvitations (historial de invitaciones)
4. ✅ Tiene MeetingAttendances (historial de asistencia)

---

## 🚨 Casos de Uso Críticos

### Caso 1: Eliminar una Unidad Residencial
**Comportamiento esperado**:
- Se eliminan todas las reuniones
- Se eliminan todas las encuestas
- Se eliminan todas las respuestas
- Se eliminan todas las invitaciones
- Se eliminan todos los registros de asistencia

**Estado actual**: ✅ FUNCIONA CORRECTAMENTE

### Caso 2: Eliminar un Usuario
**Comportamiento esperado**:
- **FALLA** si el usuario tiene votaciones, invitaciones o asistencias
- **ÉXITO** solo si el usuario no tiene relaciones importantes

**Estado actual**: ✅ FUNCIONA CORRECTAMENTE

### Caso 3: Eliminar una Reunión
**Comportamiento esperado**:
- Se eliminan todas las encuestas
- Se eliminan todas las invitaciones
- Se eliminan todos los registros de asistencia

**Estado actual**: ✅ FUNCIONA CORRECTAMENTE (con las relaciones agregadas)

---

## 📝 Resumen de Cambios Necesarios

1. ✅ **No requiere cambios en ForeignKeys** - Todas las configuraciones `ondelete` en ForeignKey están correctas
2. ⚠️ **Requiere agregar 3 relaciones en modelos** para completar el ORM:
   - `MeetingModel.invitations`
   - `MeetingModel.attendances`
   - Relaciones inversas correspondientes

---

## 🔍 Conclusión

Tu configuración actual de cascadas es **excelente y bien pensada**:

- ✅ Usas CASCADE donde tiene sentido (datos dependientes)
- ✅ Usas RESTRICT para preservar auditoría e historial
- ✅ Las ForeignKeys están correctamente configuradas
- ⚠️ Solo falta completar algunas relaciones bidireccionales en SQLAlchemy para mejor usabilidad del ORM

**Prioridad**: BAJA - El sistema funciona correctamente a nivel de base de datos. Las relaciones faltantes son para mejorar la usabilidad del ORM en Python.
