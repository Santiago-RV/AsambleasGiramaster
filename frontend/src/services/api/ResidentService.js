import axiosInstance from './axiosconfig.js';

export class ResidentService {
    static async getResidentsByUnit(unitId) {
        const response = await axiosInstance.get(`/residential/units/${unitId}/residents`);
        return response.data;
    }

    static async updateResident(unitId, userId, residentData) {
        const response = await axiosInstance.put(
            `/residential/units/${unitId}/residents/${userId}`,
            residentData
        );
        return response.data;
    }

    static async deleteResident(unitId, userId) {
        const response = await axiosInstance.delete(
            `/residential/units/${unitId}/residents/${userId}`
        );
        return response.data;
    }

    static async createResident(unitId, residentData) {
        try {
            const response = await axiosInstance.post(
                `/residential/units/${unitId}/residents`,
                residentData
            );
            return response.data;
        } catch (error) {
            console.error('Error creating resident:', error);
            throw error;
        }
    }

    static async resendCredentials(unitId, userId) {
        try {
            const response = await axiosInstance.post(
                `/residential/units/${unitId}/residents/${userId}/resend-credentials`
            );
            return response.data;
        } catch (error) {
            console.error('Error resending credentials:', error);
            throw error;
        }
    }

    static async sendBulkCredentials(unitId, residentIds) {
        const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');

        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const response = await axiosInstance.post(
            `/super-admin/residential-units/${unitId}/residents/send-credentials-bulk`,  //Correcto
            { resident_ids: residentIds },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data || !response.data.success) {
            throw new Error(response.data?.message || 'Error al enviar credenciales');
        }

        return {
            success: true,
            message: response.data.message,
            data: response.data.data,
        };
    }
}
