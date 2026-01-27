import axiosInstance from "./axiosconfig";
import ExcelJS from 'exceljs';

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
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user || !user.id) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

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
   * Crea un administrador manualmente para una unidad residencial
   * @param {number} unitId - ID de la unidad residencial
   * @param {Object} adminData - Datos del administrador
   * @returns {Promise} Respuesta del servidor
   */
  static async createManualAdministrator(unitId, adminData) {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      const response = await axiosInstance.post(
        `/super-admin/residential-units/${unitId}/administrator/manual`,
        adminData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al crear el administrador');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error creating manual administrator:', error);

      if (error.response?.status === 401) {
        throw new Error('Token inválido o expirado');
      }

      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      if (error.response?.status === 400) {
        const errorDetail = error.response?.data?.detail;
        if (errorDetail && errorDetail.includes('Ya existe un usuario')) {
          throw new Error(errorDetail);
        }
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al crear el administrador';

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

  /**
   *CARGA MASIVA DE COPROPIETARIOS DESDE EXCEL
   * @param {number} unitId - ID de la unidad residencial
   * @param {File} file - Archivo Excel
   * @returns {Promise} Resultado de la carga
   */
  static async uploadResidentsExcel(unitId, file) {
    try {
      console.log('📤 Iniciando carga de Excel...');
      console.log('   Unit ID:', unitId);
      console.log('   Archivo:', file.name);
      console.log('   Tamaño:', file.size, 'bytes');
      console.log('   Tipo:', file.type);

      // Verificar token
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);

      // Debug: Verificar contenido del FormData
      console.log('📋 Contenido del FormData:');
      for (let [key, value] of formData.entries()) {
        console.log(`   ${key}:`, value);
      }

      //CLAVE: NO especificar Content-Type manualmente
      // Axios lo configura automáticamente con el boundary correcto
      const response = await axiosInstance.post(
        `/super-admin/residential-units/${unitId}/upload-residents-excel`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
            // ❌ NO agregar 'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('✅ Respuesta exitosa:', response.data);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al cargar el archivo');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      console.error('❌ Error uploading residents Excel:', error);

      // Manejo específico de errores
      if (error.response?.status === 401) {
        throw new Error('Token inválido o expirado');
      }

      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
        console.error('   Headers:', error.response.headers);
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al cargar el archivo Excel';

      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene los usuarios disponibles (sin unidad residencial asociada)
   * @returns {Promise} Lista de usuarios disponibles
   */
  static async getAvailableUsers() {
    try {
      const response = await axiosInstance.get('/residential/available-users');

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al obtener usuarios disponibles');
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
        'Error al obtener usuarios disponibles';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene el administrador actual de una unidad residencial
   * @param {number} unitId - ID de la unidad residencial
   * @returns {Promise} Datos del administrador o null si no hay
   */
  static async getUnitAdministrator(unitId) {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      const response = await axiosInstance.get(
        `/super-admin/residential-units/${unitId}/administrator`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al obtener el administrador');
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
        'Error al obtener el administrador';
      throw new Error(errorMessage);
    }
  }

  /**
   * Cambia el administrador de una unidad residencial
   * @param {number} unitId - ID de la unidad residencial
   * @param {number} newAdminUserId - ID del usuario que será el nuevo administrador
   * @returns {Promise} Resultado del cambio
   */
  static async changeUnitAdministrator(unitId, newAdminUserId) {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      const response = await axiosInstance.put(
        `/super-admin/residential-units/${unitId}/administrator/${newAdminUserId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Error al cambiar el administrador');
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error changing administrator:', error);

      if (error.response?.status === 401) {
        throw new Error('Token inválido o expirado');
      }

      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Error al cambiar el administrador';

      throw new Error(errorMessage);
    }
  }

  /**
   * Descarga plantilla de Excel para carga masiva de copropietarios
   */
  static async downloadResidentsExcelTemplate() {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Copropietarios');

      // Definir columnas
      worksheet.columns = [
        { header: 'email', key: 'email', width: 30 },
        { header: 'firstname', key: 'firstname', width: 20 },
        { header: 'lastname', key: 'lastname', width: 20 },
        { header: 'phone', key: 'phone', width: 20 },
        { header: 'apartment_number', key: 'apartment_number', width: 15 },
        { header: 'voting_weight', key: 'voting_weight', width: 15 }
      ];

      // Agregar datos de ejemplo
      worksheet.addRows([
        {
          email: 'juan.perez@example.com',
          firstname: 'Juan',
          lastname: 'Pérez',
          phone: '+57 300 111 2222',
          apartment_number: '101',
          voting_weight: 0.25
        },
        {
          email: 'maria.garcia@example.com',
          firstname: 'María',
          lastname: 'García',
          phone: '+57 300 222 3333',
          apartment_number: '102',
          voting_weight: 0.30
        }
      ]);

      // Estilizar encabezados
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };

      // Generar y descargar el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla_copropietarios.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generando plantilla Excel:', error);
      throw new Error('No se pudo generar la plantilla de Excel');
    }
  }
}