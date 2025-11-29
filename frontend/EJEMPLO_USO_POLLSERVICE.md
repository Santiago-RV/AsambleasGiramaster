# Ejemplos de Uso - PollService en Frontend

## 📦 Importación

```javascript
import { PollService } from '@/services/api/PollService';
```

---

## 🔐 ADMIN - Crear y Gestionar Encuestas

### 1. Crear Encuesta Simple (Sí/No)

```javascript
// En tu componente
const handleCreatePoll = async () => {
  try {
    const response = await PollService.createSingleChoicePoll(
      meetingId,
      '¿Aprobar la renovación del ascensor?',
      'Votación para aprobar el presupuesto de $50,000',
      ['A favor', 'En contra'],
      {
        isAnonymous: false,
        requiresQuorum: true,
        minimumQuorum: 51.0,
        allowsAbstention: true,
        durationMinutes: 30
      }
    );

    if (response.success) {
      console.log('Encuesta creada:', response.data);
      alert(`Código de encuesta: ${response.data.poll_code}`);
      // Guardar poll_id y poll_code para uso posterior
      setPollId(response.data.id);
      setPollCode(response.data.poll_code);
    }
  } catch (error) {
    console.error('Error al crear encuesta:', error);
  }
};
```

### 2. Crear Encuesta Múltiple

```javascript
const handleCreateMultipleChoicePoll = async () => {
  try {
    const response = await PollService.createMultipleChoicePoll(
      meetingId,
      '¿Qué mejoras quieres para el edificio?',
      'Selecciona hasta 3 opciones',
      ['Renovar piscina', 'Agregar gimnasio', 'Mejorar jardines', 'Instalar cámaras', 'Pintar fachada'],
      3, // Máximo 3 selecciones
      {
        isAnonymous: true,
        requiresQuorum: false,
        allowsAbstention: true,
        durationMinutes: 60
      }
    );

    if (response.success) {
      console.log('Encuesta múltiple creada:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 3. Crear Encuesta de Texto Libre

```javascript
const handleCreateTextPoll = async () => {
  try {
    const response = await PollService.createTextPoll(
      meetingId,
      '¿Qué sugerencias tienes para mejorar la seguridad?',
      'Escribe tu sugerencia',
      {
        isAnonymous: true,
        durationMinutes: 60
      }
    );

    if (response.success) {
      console.log('Encuesta de texto creada:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 4. Listar Encuestas de una Reunión

```javascript
const [polls, setPolls] = useState([]);

const loadPolls = async () => {
  try {
    const response = await PollService.getPollsByMeeting(meetingId);

    if (response.success) {
      setPolls(response.data);
    }
  } catch (error) {
    console.error('Error al cargar encuestas:', error);
  }
};

useEffect(() => {
  loadPolls();
}, [meetingId]);
```

### 5. Iniciar una Encuesta

```javascript
const handleStartPoll = async (pollId) => {
  try {
    const response = await PollService.startPoll(pollId, 60); // 60 minutos

    if (response.success) {
      alert('Encuesta iniciada exitosamente');
      loadPolls(); // Recargar lista
    }
  } catch (error) {
    console.error('Error al iniciar encuesta:', error);
  }
};
```

### 6. Finalizar una Encuesta

```javascript
const handleEndPoll = async (pollId) => {
  try {
    const response = await PollService.endPoll(pollId);

    if (response.success) {
      alert('Encuesta finalizada exitosamente');
      loadPolls();
    }
  } catch (error) {
    console.error('Error al finalizar encuesta:', error);
  }
};
```

### 7. Ver Estadísticas en Tiempo Real

```javascript
const [statistics, setStatistics] = useState(null);

const loadStatistics = async (pollId) => {
  try {
    const response = await PollService.getStatistics(pollId);

    if (response.success) {
      setStatistics(response.data);
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
};

// Actualizar estadísticas cada 5 segundos
useEffect(() => {
  if (pollId && pollStatus === 'active') {
    const interval = setInterval(() => {
      loadStatistics(pollId);
    }, 5000);

    return () => clearInterval(interval);
  }
}, [pollId, pollStatus]);
```

---

## 🌐 PÚBLICO - Acceso Sin Autenticación

### 8. Obtener Encuesta por Código (Sin Login)

```javascript
import { useState, useEffect } from 'react';
import { PollService } from '@/services/api/PollService';

function PublicVotingPage() {
  const [poll, setPoll] = useState(null);
  const [pollCode, setPollCode] = useState('');

  const handleGetPoll = async () => {
    try {
      const response = await PollService.getPollByCode(pollCode);

      if (response.success) {
        setPoll(response.data);
      }
    } catch (error) {
      alert('Encuesta no encontrada o código incorrecto');
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Ingresa el código de la encuesta"
        value={pollCode}
        onChange={(e) => setPollCode(e.target.value.toUpperCase())}
        maxLength={8}
      />
      <button onClick={handleGetPoll}>Buscar Encuesta</button>

      {poll && (
        <div>
          <h2>{poll.str_title}</h2>
          <p>{poll.str_description}</p>
          {/* Mostrar opciones */}
        </div>
      )}
    </div>
  );
}
```

### 9. Votar Sin Autenticación

```javascript
function VotingForm({ poll }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAbstention, setIsAbstention] = useState(false);

  const handleVote = async () => {
    try {
      const voteData = {
        int_option_id: selectedOption,
        bln_is_abstention: isAbstention
      };

      const response = await PollService.voteByCode(poll.str_poll_code, voteData);

      if (response.success) {
        alert('¡Voto registrado exitosamente!');
      }
    } catch (error) {
      if (error.response?.data?.error_code === 'ALREADY_VOTED') {
        alert('Ya has votado en esta encuesta');
      } else if (error.response?.data?.error_code === 'POLL_NOT_ACTIVE') {
        alert('Esta encuesta no está activa');
      } else {
        alert('Error al registrar el voto');
      }
    }
  };

  return (
    <div>
      <h3>{poll.str_title}</h3>

      {poll.options.map((option) => (
        <label key={option.id}>
          <input
            type="radio"
            name="option"
            value={option.id}
            onChange={() => {
              setSelectedOption(option.id);
              setIsAbstention(false);
            }}
          />
          {option.str_option_text}
        </label>
      ))}

      {poll.bln_allows_abstention && (
        <label>
          <input
            type="radio"
            name="option"
            onChange={() => {
              setIsAbstention(true);
              setSelectedOption(null);
            }}
          />
          Abstención
        </label>
      )}

      <button onClick={handleVote} disabled={!selectedOption && !isAbstention}>
        Votar
      </button>
    </div>
  );
}
```

### 10. Votar con Texto Libre (Sin Auth)

```javascript
function TextVotingForm({ poll }) {
  const [textResponse, setTextResponse] = useState('');

  const handleVote = async () => {
    try {
      const voteData = {
        str_response_text: textResponse,
        bln_is_abstention: false
      };

      const response = await PollService.voteByCode(poll.str_poll_code, voteData);

      if (response.success) {
        alert('¡Respuesta enviada exitosamente!');
        setTextResponse('');
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
    }
  };

  return (
    <div>
      <h3>{poll.str_title}</h3>
      <p>{poll.str_description}</p>

      <textarea
        value={textResponse}
        onChange={(e) => setTextResponse(e.target.value)}
        placeholder="Escribe tu respuesta aquí..."
        rows={5}
        maxLength={2000}
      />

      <button onClick={handleVote} disabled={!textResponse.trim()}>
        Enviar Respuesta
      </button>
    </div>
  );
}
```

---

## 📊 COMPONENTE COMPLETO DE EJEMPLO

```javascript
import { useState, useEffect } from 'react';
import { PollService } from '@/services/api/PollService';

function PollManager({ meetingId }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar encuestas
  const loadPolls = async () => {
    setLoading(true);
    try {
      const response = await PollService.getPollsByMeeting(meetingId);
      if (response.success) {
        setPolls(response.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, [meetingId]);

  // Crear encuesta
  const handleCreatePoll = async () => {
    try {
      const response = await PollService.createSingleChoicePoll(
        meetingId,
        '¿Aprobar propuesta?',
        'Votación para aprobar la propuesta presentada',
        ['A favor', 'En contra'],
        {
          requiresQuorum: true,
          minimumQuorum: 51,
          allowsAbstention: true,
          durationMinutes: 30
        }
      );

      if (response.success) {
        alert(`Encuesta creada. Código: ${response.data.poll_code}`);
        loadPolls();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Iniciar encuesta
  const handleStartPoll = async (pollId) => {
    try {
      const response = await PollService.startPoll(pollId);
      if (response.success) {
        alert('Encuesta iniciada');
        loadPolls();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Finalizar encuesta
  const handleEndPoll = async (pollId) => {
    try {
      const response = await PollService.endPoll(pollId);
      if (response.success) {
        alert('Encuesta finalizada');
        loadPolls();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h2>Encuestas de la Reunión</h2>

      <button onClick={handleCreatePoll}>
        Crear Nueva Encuesta
      </button>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div>
          {polls.map((poll) => (
            <div key={poll.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h3>{poll.str_title}</h3>
              <p>Código: <strong>{poll.str_poll_code}</strong></p>
              <p>Estado: <span style={{ color: poll.str_status === 'active' ? 'green' : 'gray' }}>{poll.str_status}</span></p>

              {poll.str_status === 'draft' && (
                <button onClick={() => handleStartPoll(poll.id)}>
                  Iniciar Encuesta
                </button>
              )}

              {poll.str_status === 'active' && (
                <button onClick={() => handleEndPoll(poll.id)}>
                  Finalizar Encuesta
                </button>
              )}

              {poll.str_status === 'closed' && (
                <button onClick={() => window.open(`/polls/${poll.id}/results`)}>
                  Ver Resultados
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PollManager;
```

---

## 🛠️ MANEJO DE ERRORES

```javascript
const handleVote = async (pollCode, voteData) => {
  try {
    const response = await PollService.voteByCode(pollCode, voteData);

    if (response.success) {
      return { success: true, message: 'Voto registrado' };
    }
  } catch (error) {
    // Errores específicos del backend
    const errorCode = error.response?.data?.error_code;
    const errorMessage = error.response?.data?.message;

    switch (errorCode) {
      case 'POLL_NOT_FOUND':
        return { success: false, message: 'Encuesta no encontrada' };

      case 'POLL_NOT_ACTIVE':
        return { success: false, message: 'Esta encuesta no está activa' };

      case 'ALREADY_VOTED':
        return { success: false, message: 'Ya has votado en esta encuesta' };

      case 'OPTION_REQUIRED':
        return { success: false, message: 'Debes seleccionar una opción' };

      case 'USER_NOT_INVITED':
        return { success: false, message: 'No estás invitado a esta reunión' };

      default:
        return { success: false, message: errorMessage || 'Error al registrar el voto' };
    }
  }
};
```

---

## TIPS

1. **Usar códigos QR:** Genera un QR con el `poll_code` para que los usuarios escaneen y voten fácilmente
2. **Actualización en tiempo real:** Usa `setInterval` para actualizar estadísticas cada 5-10 segundos
3. **LocalStorage:** Guarda votos localmente para evitar votos duplicados en encuestas anónimas
4. **Validación:** Valida opciones antes de enviar para mejorar UX
5. **Loading states:** Siempre muestra estados de carga para mejor experiencia

---

## 🔗 URLs Importantes

- **Admin Dashboard:** `/admin/meetings/{meetingId}/polls`
- **Página Pública de Votación:** `/vote/{pollCode}`
- **Resultados:** `/polls/{pollId}/results`
