// smoke.js - Prueba básica de conectividad y salud del sistema
// Uso: k6 run --config k6.conf.js backend/smoke.js
// o: k6 run backend/smoke.js

import { check, sleep } from 'k6';
import http from 'k6/http';

// Configuración del escenario
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:8001';
const API_VERSION = __ENV.API_VERSION || '/api/v1';

export default function () {
  // 1. Verificar que el servidor está arriba
  const healthRes = http.get(`${API_URL}/health`);
  
  check(healthRes, {
    'Health endpoint responds': (r) => r.status === 200,
    'Health response time < 200ms': (r) => r.timings.duration < 200,
  });

  // 2. Verificar endpoint de login (OAuth2 usa form-urlencoded)
  const loginRes = http.post(`${API_URL}${API_VERSION}/auth/login`, 
    `username=admin&password=Super@dmin.12345`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  check(loginRes, {
    'Login endpoint responds': (r) => r.status === 200 || r.status === 401,
    'Login response has token': (r) => {
      if (r.status !== 200) return true;
      const body = r.json();
      return body.data?.access_token || body.access_token;
    },
  });

  // 3. Si login exitoso, probar endpoint protegido
  if (loginRes.status === 200) {
    const token = loginRes.json().data?.access_token || loginRes.json().access_token;
    
    const meetingsRes = http.get(
      `${API_URL}${API_VERSION}/meetings/residential-unit/1`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    check(meetingsRes, {
      'Meetings endpoint responds': (r) => r.status === 200 || r.status === 404,
    });
  }

  sleep(1);
}

// Función de setup (opcional)
export function setup() {
  console.log('=== SMOKE TEST - Verificando conectividad ===');
  
  const health = http.get(`${API_URL}/health`);
  console.log(`Health check: ${health.status}`);
  
  return { apiUrl: API_URL, apiVersion: API_VERSION };
}
