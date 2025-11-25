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
}
