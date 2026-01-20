import axiosInstance from './axiosconfig';

export class UserService {
	/**
	 * Obtener la unidad residencial del usuario actual (desde token)
	 * Endpoint: GET /api/user/me/residential-unit
	 */
	static async getMyResidentialUnit() {
		const response = await axiosInstance.get('/user/me/residential-unit');
		return response.data;
	}

	/**
	 * Obtener la unidad residencial de un usuario específico
	 * Endpoint: GET /api/user/{user_id}/residential-unit
	 */
	static async getUserResidentialUnit(userId) {
		const response = await axiosInstance.get(`/user/${userId}/residential-unit`);
		return response.data;
	}

	/**
	 * Obtener datos completos del usuario actual
	 */
	static async getCurrentUserData() {
		try {
			const response = await axiosInstance.get('/user/me/complete-data');
			return response.data;
		} catch (error) {
			console.error('Error al obtener datos del usuario:', error);
			throw error;
		}
	}
}