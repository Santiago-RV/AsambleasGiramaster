import axiosInstance from './axiosconfig.js';

/**
 * Servicio para gestionar invitados (rol 4) en unidades residenciales
 */
export class GuestService {
    /**
     * Crea un nuevo invitado
     * @param {number} unitId - ID de la unidad residencial
     * @param {Object} guestData - Datos del invitado (firstname, lastname, email)
     * @returns {Promise} Respuesta del servidor
     */
    static async createGuest(unitId, guestData) {
        try {
            const response = await axiosInstance.post(
                `/guest/units/${unitId}/guest`,
                guestData
            );
            return response.data;
        } catch (error) {
            console.error('Error creating guest:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los invitados de una unidad residencial
     * @param {number} unitId - ID de la unidad residencial
     * @returns {Promise} Lista de invitados
     */
    static async getGuestsByUnit(unitId) {
        try {
            const response = await axiosInstance.get(`/guest/units/${unitId}/guests`);
            return response.data;
        } catch (error) {
            console.error('Error fetching guests:', error);
            throw error;
        }
    }

    /**
     * Elimina un invitado
     * @param {number} unitId - ID de la unidad residencial
     * @param {number} guestId - ID del invitado
     * @returns {Promise} Respuesta del servidor
     */
    static async deleteGuest(unitId, guestId) {
        try {
            const response = await axiosInstance.delete(
                `/guest/units/${unitId}/guest/${guestId}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting guest:', error);
            throw error;
        }
    }
}