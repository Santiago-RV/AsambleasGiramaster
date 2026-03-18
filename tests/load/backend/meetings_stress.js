// meetings_stress.js - Prueba de estrés de REUNIONES
// Uso: k6 run --config k6.conf.js backend/meetings_stress.js

import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    meetings_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 30 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 100 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:8005';
const API_VERSION = __ENV.API_VERSION || '/api/v1';
const RESIDENTIAL_UNIT_ID = __ENV.RESIDENTIAL_UNIT_ID || '1';

export function setup() {
  console.log('=== SETUP: Obteniendo token de admin ===');
  
  // Login como admin (OAuth2 usa form-urlencoded)
  const adminLogin = http.post(`${API_URL}${API_VERSION}/auth/login`,
    `username=admin&password=Super@dmin.12345`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  let adminToken = null;
  if (adminLogin.status === 200) {
    adminToken = adminLogin.json().data?.access_token || adminLogin.json().access_token;
  }

  return { adminToken };
}

export default function (data) {
  const adminToken = data?.adminToken;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // === ESCENARIO 1: Listar reuniones ===
  const meetingsRes = http.get(
    `${API_URL}${API_VERSION}/meetings/residential-unit/${RESIDENTIAL_UNIT_ID}`,
    { headers }
  );

  check(meetingsRes, {
    'Lista de reuniones responde': (r) => r.status === 200,
    'Lista de reuniones < 1.5s': (r) => r.timings.duration < 1500,
  });

  // === ESCENARIO 2: Obtener detalles de una reunión ===
  // Usar ID de reunión del entorno o 1
  const meetingId = __ENV.MEETING_ID || '1';
  
  const meetingDetailRes = http.get(
    `${API_URL}${API_VERSION}/meetings/${meetingId}`,
    { headers }
  );

  check(meetingDetailRes, {
    'Detalles de reunión responden': (r) => r.status === 200 || r.status === 404,
  });

  // === ESCENARIO 3: Obtener invitaciones ===
  const invitationsRes = http.get(
    `${API_URL}${API_VERSION}/meetings/${meetingId}/invitations`,
    { headers }
  );

  check(invitationsRes, {
    'Invitaciones responden': (r) => r.status === 200 || r.status === 404,
  });

  // === ESCENARIO 4: Obtener encuestas de reunión ===
  const pollsRes = http.get(
    `${API_URL}${API_VERSION}/polls/meeting/${meetingId}/polls`,
    { headers }
  );

  check(pollsRes, {
    'Encuestas de reunión responden': (r) => r.status === 200,
  });

  sleep(Math.random() * 1 + 0.5);
}
