
//Solicitudes
import axios from "axios"
import Swal from "sweetalert2"
const API_BASE_URL = import.meta.env.API_BASE_URL || "http://localhost:8000/api/v1"
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken")
        if (token && !config.headers["Skip-Auth"]) {
            config.headers.set("Authorization", `Bearer ${token}`)
        }
        if (config.headers["Skip-Auth"]) {
            delete config.headers["Skip-Auth"]
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)
let isRefresing = false
let refreshAttempts = 0
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config & {
            _retry
        };

        // Manejo de errores 401 (no autorizado)
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Verificar si hemos excedido el número máximo de intentos de refresh
            if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
                // Limpiar tokens y redirigir a login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }

                return Promise.reject(
                    new Error('Máximo número de intentos de refresh excedido')
                );
            }

            // Si ya estamos refrescando, agregar a la cola
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        }
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;
            refreshAttempts++;

            try {
                // Usar el nuevo método de AuthService para refresh token
                const response = await AuthService.refreshToken();

                if (response.success && response.data) {
                    const { access_token } = response.data;

                    // Resetear contador de intentos de refresh
                    refreshAttempts = 0;

                    // Procesar cola de peticiones fallidas
                    processQueue(null, access_token);

                    // Reintentar petición original con el nuevo token
                    if (originalRequest.headers) {
                        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
                    }

                    return axiosInstance(originalRequest);
                } else {
                    throw new Error('Invalid refresh token response');
                }
            } catch (refreshError) {
                // Si falla el refresh, limpiar tokens y procesar cola
                processQueue(refreshError, null);

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                // Evitar redirección si ya estamos en login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Manejo de otros errores - solo mostrar toast si no es una petición de login
        const isLoginRequest = originalRequest.url?.includes('/auth/login');

        if (!isLoginRequest) {
            if (error.response?.data) {
                const message =
                    error.response.data.message ||
                    error.response.data.detail ||
                    'Ha ocurrido un error';
                Swal.fire({
                    title: "ERROR",
                    text: message,
                    icon: "error"
                });
            } else if (error.request) {
                Swal.fire({
                    title: "ERROR",
                    text: 'Error de conexión. Por favor, verifica tu conexión a internet.',
                    icon: "error"
                }
                );
            } else {
                Swal.fire({
                    title: "ERROR",
                    text: 'Ha ocurrido un error inesperado',
                    icon: "error"
                })
            }
        }
        return Promise.reject(error);
    }
);
// Crear una instancia para peticiones públicas (sin autenticación)
export const publicAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agregar interceptor a publicAxios para manejo de errores (sin autenticación)
publicAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo manejar errores que no sean de autenticación
    if (error.response && error.response.status !== 401) {
      if (error.response.data) {
        const message =
          error.response.data.message ||
          error.response.data.detail ||
          'Ha ocurrido un error';
        toast.error(message);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;