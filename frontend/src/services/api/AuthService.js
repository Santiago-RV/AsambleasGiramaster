import { publicAxios } from './axiosconfig';

export class AuthService {
	/**
	 * Login de usuario
	 * @param {Object} credentials - Credenciales del usuario
	 * @param {string} credentials.username - Nombre de usuario o email
	 * @param {string} credentials.password - Contraseña
	 * @returns {Promise} Respuesta del servidor con token y datos de usuario
	 */
	static async login(credentials) {
		// Validación de campos
		if (!credentials.username || !credentials.password) {
			throw new Error('Usuario y contraseña son requeridos');
		}

		// Crear FormData para OAuth2PasswordRequestForm
		const formData = new FormData();
		formData.append('username', credentials.username.trim());
		formData.append('password', credentials.password);

		try {
			const response = await publicAxios.post('/auth/login', formData, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				timeout: 10000,
			});

			console.log('✅ Respuesta del servidor:', response.data);

			// Validar estructura de respuesta
			if (!response.data || !response.data.success) {
				throw new Error(response.data?.message || 'Error al iniciar sesión');
			}

			const { data } = response.data;

			// Validar que exista access_token
			if (!data.access_token) {
				throw new Error('El servidor no retornó el token de acceso');
			}

			// Validar que exista user
			if (!data.user || !data.user.username || !data.user.role || !data.user.id) {
				throw new Error('El servidor no retornó los datos de usuario correctamente');
			}

			// Guardar token
			localStorage.setItem('access_token', data.access_token);

			// Preparar datos del usuario
			const userData = {
				id: data.user.id,
				username: data.user.username,
				role: data.user.role,
				name: data.user.name || null,
				email: data.user.email || null,
			};

			// Guardar usuario
			localStorage.setItem('user', JSON.stringify(userData));

			console.log('✅ Login exitoso:', userData);

			return {
				success: true,
				message: response.data.message,
				data: {
					user: userData,
				},
			};
		} catch (error) {
			// Logging del error completo para debugging
			console.error('❌ Error en login:', {
				status: error.response?.status,
				statusText: error.response?.statusText,
				data: error.response?.data,
				message: error.message,
			});

			// Extraer mensaje de error del backend
			let errorMessage = 'Error al iniciar sesión';

			if (error.response?.data) {
				// FastAPI puede enviar errores en diferentes formatos
				if (error.response.data.detail) {
					errorMessage = error.response.data.detail;
				} else if (error.response.data.message) {
					errorMessage = error.response.data.message;
				} else if (typeof error.response.data === 'string') {
					errorMessage = error.response.data;
				}
			} else if (error.message) {
				errorMessage = error.message;
			}

			throw new Error(errorMessage);
		}
	}

	/**
	 * Logout - limpiar datos del usuario
	 */
	static logout() {
		localStorage.removeItem('access_token');
		localStorage.removeItem('user');
		console.log('✅ Logout exitoso');
	}

	/**
	 * Verificar si el usuario está autenticado
	 * @returns {boolean}
	 */
	static isAuthenticated() {
		const token = localStorage.getItem('access_token');
		const user = localStorage.getItem('user');
		return !!(token && user);
	}

	/**
	 * Obtener datos del usuario actual
	 * @returns {Object|null}
	 */
	static getUser() {
		const userStr = localStorage.getItem('user');
		if (!userStr) return null;

		try {
			return JSON.parse(userStr);
		} catch (error) {
			console.error('❌ Error al parsear datos de usuario:', error);
			return null;
		}
	}

	/**
	 * Obtener el token de acceso
	 * @returns {string|null}
	 */
	static getToken() {
		return localStorage.getItem('access_token');
	}
}