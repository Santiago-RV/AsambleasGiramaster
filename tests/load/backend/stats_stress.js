// stats_stress.js - Prueba de estrés de ESTADÍSTICAS EN TIEMPO REAL
// Uso: k6 run --config k6.conf.js backend/stats_stress.js
// Objetivo: 200 admins consultando estadísticas cada 2 segundos

import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    stats_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 200 },   // Peak - 200 admins
        { duration: '30s', target: 100 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // Stats pueden ser más lentos
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:8001';
const API_VERSION = __ENV.API_VERSION || '/api/v1';
const POLL_ID = __ENV.POLL_ID || '1';

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

  // === ESCENARIO 1: Obtener estadísticas de encuesta ===
  const statsRes = http.get(
    `${API_URL}${API_VERSION}/polls/${POLL_ID}/statistics`,
    { headers }
  );

  check(statsRes, {
    'Estadísticas responden': (r) => r.status === 200,
    'Estadísticas < 2s': (r) => r.timings.duration < 2000,
    'Estadísticas contienen datos': (r) => {
      if (r.status !== 200) return false;
      const body = r.json();
      return body.data?.statistics || body.statistics;
    },
  });

  // === ESCENARIO 2: Obtener resultados de encuesta ===
  const resultsRes = http.get(
    `${API_URL}${API_VERSION}/polls/${POLL_ID}/results`,
    { headers }
  );

  check(resultsRes, {
    'Resultados responden': (r) => r.status === 200 || r.status === 404,
  });

  // === ESCENARIO 3: Obtener lista de respuestas ===
  const votesRes = http.get(
    `${API_URL}${API_VERSION}/polls/${POLL_ID}/votes`,
    { headers }
  );

  check(votesRes, {
    'Lista de votos responde': (r) => r.status === 200 || r.status === 404,
  });

  // Espera para simular refresco cada 2 segundos
  sleep(2);
}
