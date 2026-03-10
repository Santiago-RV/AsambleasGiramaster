// voting_stress.js - Prueba de estrés de VOTACIÓN (PRINCIPAL)
// Uso: k6 run --config k6.conf.js backend/voting_stress.js
// Configuración: 500 usuarios votando simultáneamente

import { check, sleep } from 'k6';
import http from 'k6/http';

// Configuración del escenario
export const options = {
  scenarios: {
    voting_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },    // Warmup - 50 usuarios
        { duration: '1m', target: 200 },    // Ramp up - 200 usuarios
        { duration: '2m', target: 500 },    // Peak - 500 usuarios
        { duration: '1m', target: 200 },    // Maintain
        { duration: '30s', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],  // p95 < 1s, p99 < 2s
    http_req_failed: ['rate<0.05'],  // Menos del 5% errores
    checks: ['rate>0.90'],  // 90% de checks pasan
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:8001';
const API_VERSION = __ENV.API_VERSION || '/api/v1';

// IDs de prueba - configurar antes de ejecutar
const POLL_ID = parseInt(__ENV.POLL_ID || '1');
const RESIDENTIAL_UNIT_ID = parseInt(__ENV.RESIDENTIAL_UNIT_ID || '1');
const MEETING_ID = parseInt(__ENV.MEETING_ID || '1');

// Variable global para almacenar datos
export const setupData = {
  users: [],
  polls: [],
  authTokens: new Map(),
};

// Setup: Obtener datos de prueba
export function setup() {
  console.log('=== SETUP: Preparando datos de prueba ===');
  
  // Login como admin para obtener datos
  const adminLogin = http.post(`${API_URL}${API_VERSION}/auth/login`,
    `username=admin&password=Super@dmin.12345`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  let adminToken = null;
  if (adminLogin.status === 200) {
    adminToken = adminLogin.json().data?.access_token || adminLogin.json().access_token;
  }

  if (!adminToken) {
    console.error('No se pudo obtener token de admin');
    return { users: [], polls: [] };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // Obtener encuestas activas
  const pollsRes = http.get(
    `${API_URL}${API_VERSION}/polls/meeting/${MEETING_ID}/polls`,
    { headers }
  );

  const polls = pollsRes.status === 200 ? (pollsRes.json().data || []) : [];
  
  // Filtrar encuestas activas
  const activePolls = polls.filter(p => 
    p.str_status === 'active' || p.str_status === 'Activa'
  );

  console.log(`Encuestas activas encontradas: ${activePolls.length}`);
  console.log(`Poll ID a usar: ${POLL_ID}`);

  // Obtener lista de usuarios para pruebas
  const usersRes = http.get(
    `${API_URL}${API_VERSION}/residential-units/${RESIDENTIAL_UNIT_ID}/residents`,
    { headers }
  );

  let users = [];
  if (usersRes.status === 200) {
    const data = usersRes.json();
    users = data.data || data || [];
  }

  // Reducir a 500 usuarios máx para la prueba
  users = users.slice(0, 500);

  console.log(`Usuarios disponibles: ${users.length}`);

  return {
    users: users,
    polls: activePolls,
    adminToken: adminToken,
  };
}

// Clase para simular usuario votante
class VotanteUser {
  constructor(userData, pollId) {
    this.user = userData;
    this.pollId = pollId;
    this.hasVoted = false;
    this.token = null;
  }

  async login(client) {
    // Intentar login con credenciales del usuario (OAuth2 form-urlencoded)
    const username = this.user.username || `user_${this.user.id}`;
    const res = client.post(`${API_URL}${API_VERSION}/auth/login`,
      `username=${encodeURIComponent(username)}&password=TempPass123!`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (res.status === 200) {
      this.token = res.json().data?.access_token || res.json().access_token;
      return true;
    }
    return false;
  }

  vote(client, optionId) {
    if (!this.token || this.hasVoted) return null;

    const res = client.post(
      `${API_URL}${API_VERSION}/polls/${this.pollId}/vote`,
      JSON.stringify({
        int_option_id: optionId,
        bln_is_abstention: false,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );

    if (res.status === 201) {
      this.hasVoted = true;
    }
    return res;
  }

  getStats(client) {
    if (!this.token) return null;

    return client.get(
      `${API_URL}${API_VERSION}/polls/${this.pollId}/statistics`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );
  }
}

// Escenario principal
export default function (data) {
  const setup = data || setupData;
  const users = setup.users || [];
  const polls = setup.polls || [];
  
  if (users.length === 0) {
    console.error('No hay usuarios para la prueba');
    return;
  }

  // Seleccionar un usuario basado en el VU actual
  const userIndex = __VU % users.length;
  const user = users[userIndex];
  
  // Seleccionar encuesta (usar la configurada o la primera activa)
  const pollId = polls.length > 0 ? polls[0].id : POLL_ID;

  // Crear instancia de usuario votante
  const votante = new VotanteUser(user, pollId);

  // 1. Login
  const loginSuccess = votante.login(http);
  
  check(loginSuccess, {
    'Usuario puede hacer login': (s) => s === true,
  });

  if (!votante.token) {
    // Si no puede login, intentar con el poll público (sin auth)
    // O simplemente continuar con siguiente paso
    console.debug(`Login falló para usuario ${userIndex}`);
  }

  // 2. Votar (solo si tiene token y no ha votado)
  if (votante.token) {
    // Seleccionar opción aleatoria (1-3)
    const optionId = Math.floor(Math.random() * 3) + 1;
    
    const voteRes = votante.vote(http, optionId);
    
    if (voteRes) {
      check(voteRes, {
        'Voto registrado correctamente': (r) => r.status === 201,
        'Voto no es 401 (unauthorized)': (r) => r.status !== 401,
        'Voto no es 400 (bad request)': (r) => r.status !== 400,
      });

      // 3. Obtener estadísticas (después de votar)
      if (voteRes.status === 201) {
        const statsRes = votante.getStats(http);
        
        check(statsRes, {
          'Estadísticas accesibles': (r) => r.status === 200,
          'Estadísticas en < 2s': (r) => r.timings.duration < 2000,
        });
      }
    }
  }

  // Espera aleatoria entre requests (0.5 - 2 segundos)
  sleep(Math.random() * 1.5 + 0.5);
}

// Función para verificar resultados
export function handleSummary(data) {
  console.log('=== RESUMEN DE PRUEBA DE VOTACIÓN ===');
  console.log(`Total requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Requests/seg: ${data.metrics.http_reqs.values.rate}`);
  console.log(`Errores: ${data.metrics.http_req_failed.values.passes}`);
  
  return {
    stdout: JSON.stringify(data.metrics, null, 2),
    './results/voting_stress.json': JSON.stringify(data, null, 2),
  };
}
