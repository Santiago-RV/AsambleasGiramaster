// frontend/src/services/coownerService.js
/**
 * Servicio para la gestión de copropietarios desde el Dashboard del Administrador
 */

import axiosInstance from "./axiosconfig";

const CoownerService = {
	/**
	 * Obtiene todos los copropietarios de la unidad residencial del administrador
	 */
	getMyCoowners: async () => {
		const response = await axiosInstance.get('/admin/coowners/residential-unit');
		return response.data;
	},

	/**
	 * Obtiene los detalles completos de un copropietario específico
	 */
	getCoownerDetails: async (coownerId) => {
		const response = await axiosInstance.get(`/admin/coowners/${coownerId}`);
		return response.data;
	},

	/**
	 * Actualiza los datos de un copropietario
	 * @param {number} coownerId - ID del copropietario
	 * @param {object} updateData - Datos a actualizar
	 * @param {boolean} sendEmail - Si se debe enviar correo de notificación
	 */
	updateCoowner: async (coownerId, updateData, sendEmail = false) => {
		const response = await axiosInstance.put(
			`/admin/coowners/${coownerId}`,
			updateData,
			{
				params: { send_email: sendEmail }
			}
		);
		return response.data;
	},

	/**
	 * Habilita el acceso de un copropietario al sistema
	 */
	enableCoowner: async (coownerId, sendEmail = true) => {
		const response = await axiosInstance.post(
			`/admin/coowners/${coownerId}/enable`,
			{},
			{
				params: { send_email: sendEmail }
			}
		);
		return response.data;
	},

	/**
	 * Deshabilita el acceso de un copropietario al sistema
	 */
	disableCoowner: async (coownerId, sendEmail = true) => {
		const response = await axiosInstance.post(
			`/admin/coowners/${coownerId}/disable`,
			{},
			{
				params: { send_email: sendEmail }
			}
		);
		return response.data;
	},

	/**
	 * Habilita el acceso de TODOS los copropietarios de la unidad
	 */
	enableAllCoowners: async (sendEmails = true) => {
		const response = await axiosInstance.post(
			'/admin/coowners/enable-all',
			{},
			{
				params: { send_emails: sendEmails }
			}
		);
		return response.data;
	},

	/**
	 * Reenvía las credenciales de acceso a un copropietario
	 * (genera nueva contraseña temporal y la envía por correo)
	 */
	resendCredentials: async (coownerId) => {
		const response = await axiosInstance.post(
			`/admin/coowners/${coownerId}/resend-credentials`
		);
		return response.data;
	},

	/**
	 * Envía credenciales en masa a múltiples copropietarios seleccionados
	 * (genera nuevas contraseñas temporales y las envía por correo)
	 * @param {number[]} coownerIds - Array de IDs de copropietarios
	 */
	sendBulkCredentials: async (coownerIds) => {
		const response = await axiosInstance.post(
			'/admin/coowners/send-bulk-credentials',
			{
				resident_ids: coownerIds  // ← Cambiar de user_ids a resident_ids
			}
		);
		return response.data;
	},

	/**
	 * Habilita o deshabilita el acceso de múltiples copropietarios SELECCIONADOS
	 */
	toggleCoownersAccessBulk: async (coownerIds, enabled) => {
		const response = await axiosInstance.post(
			'/admin/coowners/toggle-access-bulk',
			{
				user_ids: coownerIds,
				enabled: enabled
			}
		);
		return response.data;
	},

	/**
	 * Elimina múltiples copropietarios seleccionados
	 * @param {number[]} coownerIds - Array de IDs de copropietarios
	 */
	deleteCoownersBulk: async (coownerIds) => {
		const response = await axiosInstance.delete(
			'/admin/coowners/delete-bulk',
			{
				data: {
					user_ids: coownerIds
				}
			}
		);
		return response.data;
	},

	/**
	 * Helper: Toggle individual (decide si habilitar o deshabilitar)
	 */
	toggleCoownerAccess: async (coownerId, enable, sendEmail = false) => {
		if (enable) {
			return await CoownerService.enableCoowner(coownerId, sendEmail);
		} else {
			return await CoownerService.disableCoowner(coownerId, sendEmail);
		}
	},
};

export default CoownerService;