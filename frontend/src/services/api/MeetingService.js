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
    const response = await axiosInstance.get(`/meetings/residential-unit/${residentialUnitId}`);
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
   * Cambia el estado a "En Curso" y crea invitaciones automáticamente
   */
  static async startMeeting(meetingId) {
    const response = await axiosInstance.post(
      `/meetings/${meetingId}/start`
    );
    return response.data;
  }

  /**
   * Finalizar una reunión
   * Cambia el estado a "Finalizada"
   */
  static async endMeeting(meetingId) {
    const response = await axiosInstance.post(
      `/meetings/${meetingId}/end`
    );
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

  /**
   * Crear múltiples invitaciones a una reunión
   * @param {number} meetingId - ID de la reunión
   * @param {number[]} userIds - Lista de IDs de usuarios a invitar
   */
  static async createBatchInvitations(meetingId, userIds) {
    const response = await axiosInstance.post(
      '/meeting-invitations/invitations/batch',
      {
        int_meeting_id: meetingId,
        user_ids: userIds
      }
    );
    return response.data;
  }

  /**
   * Registrar asistencia presencial mediante escaneo QR
   * El administrador escanea el QR del copropietario para registrar asistencia
   * @param {string} qrToken - Token JWT extraído del código QR
   */
  static async scanQRAttendance(qrToken) {
    const response = await axiosInstance.post(
      '/meetings/scan-qr-attendance',
      { qr_token: qrToken }
    );
    return response.data;
  }
}