import axiosInstance from './axiosconfig';

export class MeetingService {
  /**
   * Obtener todas las reuniones
   */
  static async getMeetings() {
    const response = await axiosInstance.get('/meetings');
    return response.data;
  }

  /**
   * Obtener reuniones filtradas por unidad residencial
   */
  static async getMeetingsByResidentialUnit(residentialUnitId) {
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
  }

  /**
   * Obtener una reunión por ID
   */
  static async getMeetingById(id) {
    const response = await axiosInstance.get(`/meetings/${id}`);
    return response.data;
  }

  /**
   * Crear una nueva reunión de Zoom
   */
  static async createMeeting(meetingData) {
    const response = await axiosInstance.post('/meetings', meetingData, {
      timeout: 35000 // 35 segundos para dar margen a la API de Zoom
    });
    return response.data;
  }

  /**
   * Actualizar una reunión
   */
  static async updateMeeting(id, meetingData) {
    const response = await axiosInstance.put(
      `/meetings/${id}`,
      meetingData
    );
    return response.data;
  }

  /**
   * Eliminar una reunión
   */
  static async deleteMeeting(id) {
    const response = await axiosInstance.delete(`/meetings/${id}`);
    return response.data;
  }

  /**
   * Iniciar una reunión
   */
  static async startMeeting(id) {
    const response = await axiosInstance.post(`/meetings/${id}/start`);
    return response.data;
  }

  /**
   * Finalizar una reunión
   */
  static async endMeeting(id) {
    const response = await axiosInstance.post(`/meetings/${id}/end`);
    return response.data;
  }

  /**
   * Enviar invitaciones por correo electrónico
   */
  static async sendInvitations(meetingId, userIds = null) {
    const response = await axiosInstance.post(
      `/meetings/${meetingId}/send-invitations`,
      { user_ids: userIds }
    );
    return response.data;
  }

  /**
   * Registrar asistencia a una reunión
   * Se llama cuando un usuario entra a la reunión
   */
  static async registerAttendance(meetingId) {
    const response = await axiosInstance.post(
      `/meetings/${meetingId}/register-attendance`
    );
    return response.data;
  }

  /**
   * Registrar salida de una reunión
   * Se llama cuando un usuario sale de la reunión
   */
  static async registerLeave(meetingId) {
    const response = await axiosInstance.post(
      `/meetings/${meetingId}/register-leave`
    );
    return response.data;
  }

  /**
   * Obtener invitaciones de una reunión
   * Retorna la lista de todos los invitados con su información
   */
  static async getMeetingInvitations(meetingId) {
    const response = await axiosInstance.get(
      `/meeting-invitations/meeting/${meetingId}`
    );
    return response.data;
  }
}