import axiosInstance from './axiosconfig';

/**
 * Servicio para gestionar delegaciones de poder de votación
 */
export class DelegationService {
  /**
   * ==================== ADMIN - GESTIÓN DE DELEGACIONES ====================
   */

  /**
   * Crear una nueva delegación de poder
   * @param {number} meetingId - ID de la reunión
   * @param {Object} delegationData - Datos de la delegación
   * @param {number[]} delegationData.delegator_ids - IDs de usuarios que ceden poder
   * @param {number} delegationData.delegate_id - ID del usuario que recibe el poder
   * @returns {Promise}
   */
  static async createDelegation(meetingId, delegationData) {
    const response = await axiosInstance.post(
      `/delegations/meetings/${meetingId}/delegations`,
      delegationData
    );
    return response.data;
  }

  /**
   * Obtener todas las delegaciones activas de una reunión
   * @param {number} meetingId - ID de la reunión
   * @returns {Promise}
   */
  static async getMeetingDelegations(meetingId) {
    const response = await axiosInstance.get(
      `/delegations/meetings/${meetingId}/delegations`
    );
    return response.data;
  }

  /**
   * Revocar una delegación específica
   * @param {number} meetingId - ID de la reunión
   * @param {number} delegatorId - ID del usuario que había delegado
   * @returns {Promise}
   */
  static async revokeDelegation(meetingId, delegatorId) {
    const response = await axiosInstance.delete(
      `/delegations/meetings/${meetingId}/delegations/${delegatorId}`
    );
    return response.data;
  }

  /**
   * 🔥 NUEVO: Obtener histórico completo de delegaciones de una reunión
   * Incluye delegaciones activas Y revocadas
   * @param {number} meetingId - ID de la reunión
   * @param {string|null} statusFilter - Filtro opcional: 'active', 'revoked' o null para todas
   * @returns {Promise<{
   *   meeting_id: number,
   *   statistics: {
   *     total_delegations: number,
   *     active_delegations: number,
   *     revoked_delegations: number,
   *     total_weight_delegated_active: number
   *   },
   *   history: Array<{
   *     id: number,
   *     delegator: Object,
   *     delegate: Object,
   *     delegated_weight: number,
   *     status: string,
   *     delegated_at: string,
   *     revoked_at: string|null
   *   }>
   * }>}
   */
  static async getDelegationHistory(meetingId, statusFilter = null) {
    let url = `/delegation-history/meetings/${meetingId}/delegation-history`;
    
    if (statusFilter) {
      url += `?status_filter=${statusFilter}`;
    }
    
    const response = await axiosInstance.get(url);
    return response.data;
  }

  /**
   * ==================== COPROPIETARIO - CONSULTA DE DELEGACIÓN ====================
   */

  /**
   * Obtener el estado de delegación del usuario actual
   * (Para vista de solo lectura del copropietario)
   * @param {number} meetingId - ID de la reunión
   * @returns {Promise<{
   *   has_delegated: boolean,
   *   delegated_to: Object|null,
   *   received_delegations: Array,
   *   total_weight: number,
   *   original_weight: number
   * }>}
   */
  static async getUserDelegationStatus(meetingId) {
    const response = await axiosInstance.get(
      `/delegations/meetings/${meetingId}/user-delegation-status`
    );
    return response.data;
  }

  /**
   * ==================== UTILIDADES ====================
   */

  /**
   * Calcular el peso total de una lista de usuarios
   * @param {Array<{dec_voting_weight: number}>} users - Lista de usuarios
   * @returns {number} - Peso total
   */
  static calculateTotalWeight(users) {
    if (!Array.isArray(users) || users.length === 0) {
      return 0;
    }
    return users.reduce((sum, user) => {
      const weight = parseFloat(user.dec_voting_weight || 0);
      return sum + weight;
    }, 0);
  }

  /**
   * Formatear información de delegación para mostrar en UI
   * @param {Object} delegation - Datos de delegación
   * @returns {string} - Texto formateado
   */
  static formatDelegationInfo(delegation) {
    const delegatorName = `${delegation.delegator.str_firstname} ${delegation.delegator.str_lastname}`;
    const delegateName = `${delegation.delegate.str_firstname} ${delegation.delegate.str_lastname}`;
    const weight = parseFloat(delegation.delegated_weight).toFixed(2);

    return `${delegatorName} → ${delegateName} (${weight} votos)`;
  }

  /**
   * 🔥 NUEVO: Formatear fecha de delegación para mostrar en UI
   * @param {string} dateString - Fecha en formato ISO
   * @returns {string} - Fecha formateada
   */
  static formatDelegationDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * 🔥 NUEVO: Obtener estadísticas resumidas del histórico
   * @param {Object} historyData - Datos del histórico (respuesta de getDelegationHistory)
   * @returns {Object} - Estadísticas formateadas
   */
  static getHistoryStatistics(historyData) {
    if (!historyData || !historyData.statistics) {
      return {
        total: 0,
        active: 0,
        revoked: 0,
        totalWeight: 0
      };
    }

    return {
      total: historyData.statistics.total_delegations,
      active: historyData.statistics.active_delegations,
      revoked: historyData.statistics.revoked_delegations,
      totalWeight: parseFloat(historyData.statistics.total_weight_delegated_active).toFixed(2)
    };
  }
}

export default DelegationService;