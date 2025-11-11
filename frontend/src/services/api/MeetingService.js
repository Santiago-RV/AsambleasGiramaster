import axiosInstance from './axiosconfig';

export class MeetingService {
  /**
   * Obtener todas las reuniones
   */
  static async getMeetings() {
    try {
      const response = await axiosInstance.get('/meetings');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener reuniones filtradas por unidad residencial
   */
  static async getMeetingsByResidentialUnit(residentialUnitId) {
    try {
      const response = await axiosInstance.get('/meetings');
      if (response.data && response.data.success && response.data.data) {
        // Filtrar las reuniones por unidad residencial
        const filteredMeetings = response.data.data.filter(
          (meeting) => meeting.int_id_residential_unit === residentialUnitId
        );
        return {
          ...response.data,
          data: filteredMeetings,
        };
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener una reunión por ID
   */
  static async getMeetingById(id) {
    try {
      const response = await axiosInstance.get(`/meetings/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Crear una nueva reunión de Zoom
   */
  static async createMeeting(meetingData) {
    try {
      const response = await axiosInstance.post('/meetings', meetingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar una reunión
   */
  static async updateMeeting(id, meetingData) {
    try {
      const response = await axiosInstance.put(
        `/meetings/${id}`,
        meetingData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar una reunión
   */
  static async deleteMeeting(id) {
    try {
      const response = await axiosInstance.delete(`/meetings/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Iniciar una reunión
   */
  static async startMeeting(id) {
    try {
      const response = await axiosInstance.post(`/meetings/${id}/start`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finalizar una reunión
   */
  static async endMeeting(id) {
    try {
      const response = await axiosInstance.post(`/meetings/${id}/end`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enviar invitaciones por correo electrónico
   */
  static async sendInvitations(meetingId, userIds = null) {
    try {
      const response = await axiosInstance.post(
        `/meetings/${meetingId}/send-invitations`,
        { user_ids: userIds }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

