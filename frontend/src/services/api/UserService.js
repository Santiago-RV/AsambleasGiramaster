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
}