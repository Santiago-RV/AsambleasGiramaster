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

  /**
   * Obtener reuniones en vivo (helper method)
   * Reuniones que están activas o accesibles:
   * - El anfitrión puede acceder 1 hora antes de la hora programada
   * - El anfitrión puede cerrar el acceso finalizando la reunión
   * - Debe tener invitados registrados
   * - No debe haber terminado
   * @param {number} residentialUnitId - ID de la unidad residencial
   * @returns {Promise}
   */
  static async getLiveMeetings(residentialUnitId) {
    const response = await axiosInstance.get('/meetings');

    console.log('📊 [getLiveMeetings] Respuesta del backend:', response.data);
    console.log('📊 [getLiveMeetings] ID Unidad Residencial:', residentialUnitId);

    if (response.data && response.data.success && response.data.data) {
      const now = new Date();
      const ONE_HOUR_MS = 60 * 60 * 1000;

      console.log('📊 [getLiveMeetings] Total reuniones recibidas:', response.data.data.length);

      // Filtrar reuniones en vivo
      const liveMeetings = response.data.data.filter((meeting) => {
        console.log('🔍 Evaluando reunión:', {
          id: meeting.id,
          titulo: meeting.str_title,
          estado: meeting.str_status,
          unidad_residencial: meeting.int_id_residential_unit,
          fecha_inicio_real: meeting.dat_actual_start_time,
          fecha_fin_real: meeting.dat_actual_end_time,
        });

        // ============================================
        // MODO PRUEBAS: SIN FILTROS
        // ============================================
        // Mostrar TODAS las reuniones que estén en estado "Programada" o "En curso"

        const isValidStatus = meeting.str_status === 'Programada' || meeting.str_status === 'En curso';

        console.log('✅ Estado válido?', isValidStatus, '- Estado:', meeting.str_status);

        return isValidStatus;

        // COMENTADO: Filtro de unidad residencial
        // if (meeting.int_id_residential_unit !== residentialUnitId) {
        //   return false;
        // }

        // COMENTADO: Debe tener invitados registrados (al menos 1)
        // if (!meeting.int_total_invitated || meeting.int_total_invitated === 0) {
        //   return false;
        // }

        // COMENTADO: No debe haber terminado
        // if (meeting.dat_actual_end_time) {
        //   return false;
        // }

        // COMENTADO: No debe estar en estado "Finalizada" o "Completada"
        // if (meeting.str_status === 'Finalizada' || meeting.str_status === 'Completada') {
        //   return false;
        // }

        // COMENTADO: Validación de ventana de 1 hora
        // const scheduleDate = new Date(meeting.dat_schedule_date);
        // const timeDifference = scheduleDate.getTime() - now.getTime();
        // if (timeDifference <= ONE_HOUR_MS) {
        //   return true;
        // }
      });

      console.log('📊 [getLiveMeetings] Reuniones filtradas:', liveMeetings.length);
      console.log('📊 [getLiveMeetings] Reuniones que se mostrarán:', liveMeetings);

      return {
        ...response.data,
        data: liveMeetings,
      };
    }
    return response.data;
  }
}

export default PollService;