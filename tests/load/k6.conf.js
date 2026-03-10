// k6.conf.js - Configuración global para pruebas de estrés
// Uso: k6 run --config k6.conf.js <script.js>

export const options = {
  scenarios: {
    // Configuración por defecto - puede ser sobrescrita por cada script
    default: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },    // Warmup
        { duration: '1m', target: 50 },      // Ramp up
        { duration: '2m', target: 100 },    // Peak
        { duration: '1m', target: 50 },     // Ramp down
        { duration: '30s', target: 0 },    // Cooldown
      ],
      gracefulRampDown: '30s',
    },
  },
  
  // Thresholds globales - se aplican a menos que se sobrescriban
  thresholds: {
    // HTTP
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],  // p95 < 1s, p99 < 2s
    http_req_failed: ['rate<0.05'],  // Menos del 5% de errores
    
    // Checks
    checks: ['rate>0.95'],  // 95% de checks deben pasar
    
    // Rendimiento
    http_reqs: ['rate>50'],  // Al menos 50 req/s
  },
};

// Configuración de entorno
export const config = {
  // URL base de la API - cambiar según entorno
  apiUrl: __ENV.API_URL || 'http://localhost:8001',
  apiVersion: __ENV.API_VERSION || '/api/v1',
  
  // Credenciales de prueba
  testAdmin: {
    username: __ENV.TEST_ADMIN_USER || 'admin',
    password: __ENV.TEST_ADMIN_PASS || 'Super@dmin.12345',
  },
  
  // Configuración de usuarios
  userCount: parseInt(__ENV.USER_COUNT || '1000'),
  
  // Tiempos
  thinkTime: {
    min: parseInt(__ENV.THINK_TIME_MIN || '500'),   // ms
    max: parseInt(__ENV.THINK_TIME_MAX || '2000'),  // ms
  },
};

// Función helper para obtener headers con auth
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// Función helper para login (OAuth2 form-urlencoded)
export async function loginUser(client, username, password) {
  const response = client.post(`${config.apiUrl}${config.apiVersion}/auth/login`, 
    `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  
  if (response.status === 200) {
    const data = response.json();
    return data.data?.access_token || data.access_token;
  }
  return null;
}

// Función helper para esperar entre acciones
export function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}
