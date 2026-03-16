import axios from 'axios';
import { AuthService } from './AuthService';

// URL base del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005/api/v1';

// Instancia de Axios pública (sin token) - para login y register
export const publicAxios = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 30000, // 30s de base, o poner 0 para sin límite
});

// Instancia de Axios privada (con token) - para endpoints protegidos
const axiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 0, // ← subir a 30s de base, o poner 0 para sin límite
});

// Bandera para evitar múltiples intentos de refresh simultáneos
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
	failedQueue.forEach(prom => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});
	failedQueue = [];
};

// Interceptor para agregar el token a cada request
axiosInstance.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('access_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		//Solo establecer Content-Type si no es FormData
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
	async (error) => {
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then(token => {
						originalRequest.headers.Authorization = `Bearer ${token}`;
						return axiosInstance(originalRequest);
					})
					.catch(err => {
						return Promise.reject(err);
					});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				const refreshToken = AuthService.getRefreshToken();
				
				if (!refreshToken) {
					throw new Error('No hay refresh token');
				}

				const result = await AuthService.refreshAccessToken();
				
				if (result.success) {
					processQueue(null, result.access_token);
					originalRequest.headers.Authorization = `Bearer ${result.access_token}`;
					isRefreshing = false;
					return axiosInstance(originalRequest);
				}
				
				throw new Error('Refresh falló');
			} catch (refreshError) {
				processQueue(refreshError, null);
				isRefreshing = false;
				
				AuthService.logout();
				window.location.href = '/login';
				return Promise.reject(refreshError);
			}
		}
		
		return Promise.reject(error);
	}
);

export default axiosInstance;