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
 * Obtener encuestas de todas las reuniones de una unidad residencial
 * @param {number} residentialUnitId - ID de la unidad residencial
 * @returns {Promise}
 */
  static async getPollsByResidentialUnit(residentialUnitId) {
    try {
      // 1. Obtener todas las reuniones de la unidad
      const meetingsResponse = await axiosInstance.get(`/meetings/residential-unit/${residentialUnitId}`);

      if (!meetingsResponse.data.success || !meetingsResponse.data.data) {
        return { success: true, data: [] };
      }

      const meetings = meetingsResponse.data.data;

      // 2. Obtener encuestas de cada reunión
      const pollsPromises = meetings.map(meeting =>
        this.getPollsByMeeting(meeting.id).catch(() => ({ success: false, data: [] }))
      );

      const pollsResponses = await Promise.all(pollsPromises);

      // 3. Combinar todas las encuestas con información de la reunión
      const allPolls = [];
      pollsResponses.forEach((pollsResponse, index) => {
        if (pollsResponse.success && pollsResponse.data) {
          const meeting = meetings[index];
          pollsResponse.data.forEach(poll => {
            allPolls.push({
              ...poll,
              meeting: {
                id: meeting.id,
                str_title: meeting.str_title,
                dat_schedule_date: meeting.dat_schedule_date
              }
            });
          });
        }
      });

      // 4. Ordenar por fecha de creación (más recientes primero)
      allPolls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log('📊 [PollService] Encuestas obtenidas:', allPolls.length);
      return { success: true, data: allPolls };
    } catch (error) {
      console.error('Error al obtener encuestas de la unidad:', error);
      return { success: false, data: [] };
    }
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
   * NUEVO - Enviar voto con soporte para múltiples opciones (requiere autenticación)
   * Este método maneja tanto single como multiple choice
   * @param {number} pollId - ID de la encuesta
   * @param {Array<number>} selectedOptionIds - Array de IDs de opciones seleccionadas
   * @returns {Promise}
   */
  static async submitVote(pollId, selectedOptionIds) {
    console.log('📝 [PollService] submitVote llamado:', {
      pollId,
      selectedOptionIds,
      isArray: Array.isArray(selectedOptionIds),
      length: selectedOptionIds?.length
    });

    // Validar que selectedOptionIds sea un array
    if (!Array.isArray(selectedOptionIds)) {
      throw new Error('selectedOptionIds debe ser un array');
    }

    // Validar que tenga al menos una opción
    if (selectedOptionIds.length === 0) {
      throw new Error('Debes seleccionar al menos una opción');
    }

    try {
      // Para single choice (1 opción) o multiple choice (múltiples opciones)
      // Enviamos cada voto individualmente
      const votePromises = selectedOptionIds.map(optionId => {
        const voteData = {
          int_option_id: optionId,
          bln_is_abstention: false,
        };
        console.log('📤 [PollService] Enviando voto individual:', voteData);
        return axiosInstance.post(`/polls/${pollId}/vote`, voteData);
      });

      // Esperar a que todos los votos se envíen
      const responses = await Promise.all(votePromises);

      console.log('[PollService] Todos los votos enviados:', responses.length);

      // Retornar el último response (o el primero para single choice)
      return responses[responses.length - 1].data;
    } catch (error) {
      console.error('❌ [PollService] Error en submitVote:', error);
      throw error;
    }
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
   * Obtener reuniones en vivo para gestión de encuestas
   * Incluye reuniones en curso y programadas para la próxima hora
   */
  static async getLiveMeetings(residentialUnitId) {
    const response = await axiosInstance.get(`/meetings/residential-unit/${residentialUnitId}`);

    if (response.data.success) {
      const now = new Date();
      const ONE_HOUR_MS = 60 * 60 * 1000;

      const liveMeetings = response.data.data.filter((meeting) => {
        const status = (meeting.str_status || '').toLowerCase();

        // Reuniones en curso siempre se muestran
        if (status === 'en curso') {
          console.log('🔍 [getLiveMeetings] Reunión en curso:', meeting.str_title);
          return true;
        }

        // Reuniones programadas: mostrar si están dentro de la próxima hora
        if (status === 'programada') {
          const scheduleDate = new Date(meeting.dat_schedule_date);
          const timeDiff = scheduleDate.getTime() - now.getTime();

          // Mostrar si la reunión está programada para dentro de una hora o ya pasó la hora (pero aún está programada)
          const isWithinOneHour = timeDiff <= ONE_HOUR_MS && timeDiff >= -ONE_HOUR_MS;
          console.log('🔍 [getLiveMeetings] Reunión programada:', meeting.str_title, '- Fecha:', scheduleDate, '- Dentro de 1 hora:', isWithinOneHour);
          return isWithinOneHour;
        }

        return false;
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