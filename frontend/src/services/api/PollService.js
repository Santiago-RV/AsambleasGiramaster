import axiosInstance, { publicAxios } from './axiosconfig';

/**
 * Servicio para gestionar encuestas (Polls)
 */
export class PollService {
  /**
   * ==================== ADMIN - GESTIÓN DE ENCUESTAS ====================
   */

  /**
   * Crear una nueva encuesta (requiere autenticación)
   * @param {Object} pollData - Datos de la encuesta
   * @returns {Promise}
   */
  static async createPoll(pollData) {
    const response = await axiosInstance.post('/polls/', pollData);
    return response.data;
  }

  /**
   * Obtener todas las encuestas de una reunión (requiere autenticación)
   * @param {number} meetingId - ID de la reunión
   * @returns {Promise}
   */
  static async getPollsByMeeting(meetingId) {
    const response = await axiosInstance.get(`/polls/meeting/${meetingId}/polls`);
    return response.data;
  }

  /**
   * Obtener una encuesta por ID (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @returns {Promise}
   */
  static async getPollById(pollId) {
    const response = await axiosInstance.get(`/polls/${pollId}`);
    return response.data;
  }

  /**
   * Iniciar una encuesta (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @param {number} durationMinutes - Duración en minutos (opcional)
   * @returns {Promise}
   */
  static async startPoll(pollId, durationMinutes = null) {
    const payload = durationMinutes ? { duration_minutes: durationMinutes } : {};
    const response = await axiosInstance.post(`/polls/${pollId}/start`, payload);
    return response.data;
  }

  /**
   * Finalizar una encuesta (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @returns {Promise}
   */
  static async endPoll(pollId) {
    const response = await axiosInstance.post(`/polls/${pollId}/end`);
    return response.data;
  }

  /**
   * Actualizar una encuesta (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @param {Object} pollData - Datos a actualizar
   * @returns {Promise}
   */
  static async updatePoll(pollId, pollData) {
    const response = await axiosInstance.put(`/polls/${pollId}`, pollData);
    return response.data;
  }

  /**
   * Eliminar una encuesta (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @returns {Promise}
   */
  static async deletePoll(pollId) {
    const response = await axiosInstance.delete(`/polls/${pollId}`);
    return response.data;
  }

  /**
   * ==================== PÚBLICO - ACCESO SIN AUTENTICACIÓN ====================
   */

  /**
   * Obtener encuesta por código (NO requiere autenticación)
   * @param {string} pollCode - Código de la encuesta
   * @returns {Promise}
   */
  static async getPollByCode(pollCode) {
    const response = await publicAxios.get(`/polls/code/${pollCode}`);
    return response.data;
  }

  /**
   * Votar en una encuesta usando código (NO requiere autenticación)
   * @param {string} pollCode - Código de la encuesta
   * @param {Object} voteData - Datos del voto
   * @returns {Promise}
   *
   * Ejemplos de voteData:
   * - Opción simple: { int_option_id: 1, bln_is_abstention: false }
   * - Abstención: { bln_is_abstention: true }
   * - Texto: { str_response_text: "Mi respuesta", bln_is_abstention: false }
   * - Numérico: { dec_response_number: 50.5, bln_is_abstention: false }
   */
  static async voteByCode(pollCode, voteData) {
    const response = await publicAxios.post(`/polls/code/${pollCode}/vote`, voteData);
    return response.data;
  }

  /**
   * ==================== AUTENTICADO - VOTACIÓN ====================
   */

  /**
   * Votar en una encuesta (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @param {Object} voteData - Datos del voto
   * @returns {Promise}
   */
  static async vote(pollId, voteData) {
    const response = await axiosInstance.post(`/polls/${pollId}/vote`, voteData);
    return response.data;
  }

  /**
   * ==================== ESTADÍSTICAS Y RESULTADOS ====================
   */

  /**
   * Obtener estadísticas en tiempo real (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @returns {Promise}
   */
  static async getStatistics(pollId) {
    const response = await axiosInstance.get(`/polls/${pollId}/statistics`);
    return response.data;
  }

  /**
   * Obtener resultados finales (requiere autenticación)
   * @param {number} pollId - ID de la encuesta
   * @returns {Promise}
   */
  static async getResults(pollId) {
    const response = await axiosInstance.get(`/polls/${pollId}/results`);
    return response.data;
  }

  /**
   * ==================== UTILIDADES ====================
   */

  /**
   * Helper para crear una encuesta tipo single choice
   * @param {number} meetingId - ID de la reunión
   * @param {string} title - Título de la encuesta
   * @param {string} description - Descripción
   * @param {Array<string>} optionTexts - Textos de las opciones
   * @param {Object} config - Configuración adicional
   * @returns {Promise}
   */
  static async createSingleChoicePoll(meetingId, title, description, optionTexts, config = {}) {
    const pollData = {
      int_meeting_id: meetingId,
      str_title: title,
      str_description: description,
      str_poll_type: 'single',
      bln_is_anonymous: config.isAnonymous || false,
      bln_requires_quorum: config.requiresQuorum || false,
      dec_minimum_quorum_percentage: config.minimumQuorum || 0,
      bln_allows_abstention: config.allowsAbstention !== undefined ? config.allowsAbstention : true,
      int_max_selections: 1,
      int_duration_minutes: config.durationMinutes || null,
      options: optionTexts.map((text, index) => ({
        str_option_text: text,
        int_option_order: index + 1
      }))
    };

    return this.createPoll(pollData);
  }

  /**
   * Helper para crear una encuesta tipo multiple choice
   */
  static async createMultipleChoicePoll(meetingId, title, description, optionTexts, maxSelections = 3, config = {}) {
    const pollData = {
      int_meeting_id: meetingId,
      str_title: title,
      str_description: description,
      str_poll_type: 'multiple',
      bln_is_anonymous: config.isAnonymous || false,
      bln_requires_quorum: config.requiresQuorum || false,
      dec_minimum_quorum_percentage: config.minimumQuorum || 0,
      bln_allows_abstention: config.allowsAbstention !== undefined ? config.allowsAbstention : true,
      int_max_selections: maxSelections,
      int_duration_minutes: config.durationMinutes || null,
      options: optionTexts.map((text, index) => ({
        str_option_text: text,
        int_option_order: index + 1
      }))
    };

    return this.createPoll(pollData);
  }

  /**
   * Helper para crear una encuesta de texto libre
   */
  static async createTextPoll(meetingId, title, description, config = {}) {
    const pollData = {
      int_meeting_id: meetingId,
      str_title: title,
      str_description: description,
      str_poll_type: 'text',
      bln_is_anonymous: config.isAnonymous !== undefined ? config.isAnonymous : true,
      bln_requires_quorum: config.requiresQuorum || false,
      dec_minimum_quorum_percentage: config.minimumQuorum || 0,
      bln_allows_abstention: config.allowsAbstention || false,
      int_duration_minutes: config.durationMinutes || null,
      options: []
    };

    return this.createPoll(pollData);
  }

  /**
   * Helper para crear una encuesta numérica
   */
  static async createNumericPoll(meetingId, title, description, config = {}) {
    const pollData = {
      int_meeting_id: meetingId,
      str_title: title,
      str_description: description,
      str_poll_type: 'numeric',
      bln_is_anonymous: config.isAnonymous !== undefined ? config.isAnonymous : true,
      bln_requires_quorum: config.requiresQuorum || false,
      dec_minimum_quorum_percentage: config.minimumQuorum || 0,
      bln_allows_abstention: config.allowsAbstention || false,
      int_duration_minutes: config.durationMinutes || null,
      options: []
    };

    return this.createPoll(pollData);
  }
}

export default PollService;