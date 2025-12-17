import axios from 'axios';

// URL base del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Instancia de Axios pública (sin token) - para login y register
export const publicAxios = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
});

// Instancia de Axios privada (con token) - para endpoints protegidos
const axiosInstance = axios.create({
	baseURL: API_BASE_URL,
	// ✅ NO establecer Content-Type por defecto
	// Axios lo configurará automáticamente según el tipo de datos
	timeout: 10000,
});

// Interceptor para agregar el token a cada request
axiosInstance.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('access_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// ✅ Solo establecer Content-Type si no es FormData
		// Esto permite que FormData configure su propio Content-Type con boundary
		if (!(config.data instanceof FormData)) {
			config.headers['Content-Type'] = 'application/json';
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Interceptor para manejar errores de autenticación
axiosInstance.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Token expirado o inválido
			localStorage.removeItem('access_token');
			localStorage.removeItem('user');
			window.location.href = '/login';
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;