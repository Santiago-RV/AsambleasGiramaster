// frontend/src/services/api/SupportService.js
import axiosInstance from './axiosconfig';

export class SupportService {

    /**
     * Obtiene el contacto de soporte técnico de una unidad residencial.
     * @param {number} unitId - ID de la unidad residencial
     */
    static async getSupportInfo(unitId) {
        const response = await axiosInstance.get(`/support/${unitId}`);
        return response.data;
    }

    /**
     * Crea o actualiza el contacto de soporte técnico (upsert).
     * @param {number} unitId - ID de la unidad residencial
     * @param {{ str_support_name: string, str_support_email: string, str_support_phone?: string }} data
     */
    static async upsertSupportInfo(unitId, data) {
        const response = await axiosInstance.post(`/support/${unitId}`, data);
        return response.data;
    }

    /**
     * Elimina el contacto de soporte técnico de una unidad residencial.
     * @param {number} unitId - ID de la unidad residencial
     */
    static async deleteSupportInfo(unitId) {
        const response = await axiosInstance.delete(`/support/${unitId}`);
        return response.data;
    }
}