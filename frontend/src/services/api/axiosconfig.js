//Solicitudes
import axios from "axios"
import Swal from "sweetalert2"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"

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

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Manejo de errores 401 (no autorizado)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // Limpiar tokens y redirigir a login
      localStorage.removeItem('access_token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      // Evitar redirección si ya estamos en login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      return Promise.reject(new Error('Sesión expirada. Por favor, inicia sesión nuevamente.'));
    }

    // Manejo de otros errores - solo mostrar toast si no es una petición de login
    const isLoginRequest = originalRequest?.url?.includes('/auth/login');

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
    // Solo manejar errores que no sean de autenticación y no sean peticiones de login
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response && error.response.status !== 401 && !isLoginRequest) {
      if (error.response.data) {
        const message =
          error.response.data.message ||
          error.response.data.detail ||
          'Ha ocurrido un error';
        Swal.fire({
          title: "Error",
          text: message,
          icon: "error"
        });
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;