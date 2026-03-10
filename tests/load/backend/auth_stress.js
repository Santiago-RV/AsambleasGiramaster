// auth_stress.js - Prueba de estrés de AUTENTICACIÓN
// Uso: k6 run --config k6.conf.js backend/auth_stress.js
// Objetivo: 300 usuarios iniciando sesión simultáneamente

import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    auth_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },    // Warmup
        { duration: '30s', target: 150 },   // Ramp up
        { duration: '1m', target: 300 },    // Peak - 300 usuarios
        { duration: '30s', target: 150 },   // Maintain
        { duration: '20s', target: 0 },     // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:8001';
const API_VERSION = __ENV.API_VERSION || '/api/v1';

// Credenciales de prueba - deben existir o generarse antes
const TEST_CREDENTIALS = {
  users: [],
};

// Setup: Obtener lista de usuarios
export function setup() {
  console.log('=== SETUP: Obteniendo usuarios para prueba de auth ===');
  
  // Login como admin (OAuth2 usa form-urlencoded)
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
    return { users: [] };
  }

  // Obtener residentes
  const unitId = __ENV.RESIDENTIAL_UNIT_ID || '1';
  const usersRes = http.get(
    `${API_URL}${API_VERSION}/residential-units/${unitId}/residents`,
    { headers: { 'Authorization': `Bearer ${adminToken}` } }
  );

  let users = [];
  if (usersRes.status === 200) {
    const data = usersRes.json();
    users = data.data || data || [];
  }

  // Tomar hasta 300 usuarios
  users = users.slice(0, 300).map(u => ({
    username: u.username || `user_${u.id}`,
    password: 'TempPass123!',  // Contraseña temporal
  }));

  console.log(`Usuarios disponibles para auth: ${users.length}`);

  return { users };
}

export default function (data) {
  const users = data?.users || [];
  
  if (users.length === 0) {
    console.error('No hay usuarios para probar');
    return;
  }

  // Seleccionar usuario basado en VU actual
  const userIndex = __VU % users.length;
  const user = users[userIndex];

  // === ESCENARIO 1: Login básico (OAuth2 form-urlencoded) ===
  const loginRes = http.post(
    `${API_URL}${API_VERSION}/auth/login`,
    `username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password)}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  check(loginRes, {
    'Login responde': (r) => r.status === 200 || r.status === 401,
    'Login es rápido (< 1.5s)': (r) => r.timings.duration < 1500,
    'Login retorna token o error válido': (r) => {
      if (r.status === 200) {
        const body = r.json();
        return body.data?.access_token || body.access_token;
      }
      return r.status === 401; // Credenciales inválidas es válido
    },
  });

  // === ESCENARIO 2: Validar token (si login exitoso) ===
  if (loginRes.status === 200) {
    const token = loginRes.json().data?.access_token || loginRes.json().access_token;
    
    // Intentar obtener perfil de usuario
    const profileRes = http.get(
      `${API_URL}${API_VERSION}/users/me`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    check(profileRes, {
      'Perfil accesible con token': (r) => r.status === 200,
    });
  }

  // Espera entre requests
  sleep(Math.random() * 0.5 + 0.2);
}
