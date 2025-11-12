import axiosInstance from "./axiosconfig";

/**
 * Servicio para manejar las operaciones de unidades residenciales
 */
export class ResidentialUnitService {
  /**
   * Crea una nueva unidad residencial
   * @param {Object} unitData - Datos de la unidad residencial
   * @returns {Promise} Respuesta del servidor
   */
  static async createResidentialUnit(unitData) {
    try {
      // Obtener el usuario actual del localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user || !user.id) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Preparar los datos según el schema del backend
      const payload = {
        str_residential_code: unitData.str_residential_code,
        str_name: unitData.str_name,
        str_nit: unitData.str_nit,
        str_unit_type: unitData.str_unit_type,
        int_total_apartments: unitData.int_total_apartments,
        str_address: unitData.str_address,
        str_city: unitData.str_city,
        str_state: unitData.str_state,
        bln_is_active: unitData.bln_is_active ?? true,
        int_max_concurrent_meetings: unitData.int_max_concurrent_meetings,
        created_by: user.id,
        updated_by: user.id,
      };

      const response = await axiosInstance.post('/residential/create_unit', payload);

      // Validar que la respuesta tenga la estructura correcta
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al crear la unidad residencial');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al crear la unidad residencial';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene todas las unidades residenciales
   * @returns {Promise} Lista de unidades residenciales
   */
  static async getResidentialUnits() {
    try {
      const response = await axiosInstance.get('/residential/units');

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al obtener las unidades residenciales');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al obtener las unidades residenciales';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene una unidad residencial por su NIT
   * @param {string} nit - NIT de la unidad residencial
   * @returns {Promise} Unidad residencial
   */
  static async getResidentialUnitByNit(nit) {
    try {
      const response = await axiosInstance.get(`/residential/units/${nit}`);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al obtener la unidad residencial');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al obtener la unidad residencial';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene una unidad residencial por su ID
   * @param {number} id - ID de la unidad residencial
   * @returns {Promise} Unidad residencial
   */
  static async getResidentialUnitById(id) {
    try {
      // Obtener todas las unidades y filtrar por ID
      const response = await axiosInstance.get('/residential/units');

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al obtener la unidad residencial');
      }

      const unit = response.data.data?.find((u) => u.id === id);

      if (!unit) {
        throw new Error('Unidad residencial no encontrada');
      }

      return {
        success: true,
        message: 'Unidad residencial obtenida exitosamente',
        data: unit,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al obtener la unidad residencial';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene los residentes de una unidad residencial específica
   * @param {number} residentialUnitId - ID de la unidad residencial
   * @returns {Promise} Lista de residentes
   */
  static async getResidentsByResidentialUnit(residentialUnitId) {
    try {
      const response = await axiosInstance.get(`/residential/units/${residentialUnitId}/residents`);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al obtener los residentes');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al obtener los residentes';
      throw new Error(errorMessage);
    }
  }
}

