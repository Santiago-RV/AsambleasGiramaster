/**
 * Servicio de API ACTUALIZADO para carga de copropietarios con voting_weight
 * Reemplazar el archivo: frontend/src/services/residentialUnitService.js
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Sube un archivo Excel con copropietarios para una unidad residencial
 * @param {number} unitId - ID de la unidad residencial
 * @param {File} file - Archivo Excel con los copropietarios
 * @returns {Promise<Object>} Respuesta con estadísticas de la carga
 */
export const uploadResidentsExcel = async (unitId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    
    const response = await axios.post(
      `${API_BASE_URL}/super-admin/residential-units/${unitId}/upload-residents-excel`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading residents Excel:', error);
    
    // Extraer mensaje de error
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        'Error al cargar el archivo Excel';
    
    throw new Error(errorMessage);
  }
};

/**
 * Obtiene los residentes de una unidad residencial
 * @param {number} unitId - ID de la unidad residencial
 * @returns {Promise<Array>} Lista de residentes
 */
export const getResidentsByUnit = async (unitId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_BASE_URL}/residential-units/${unitId}/residents`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error fetching residents:', error);
    throw error;
  }
};

/**
 * Descarga una plantilla de Excel para cargar copropietarios con voting_weight
 * @returns {void} Descarga el archivo
 */
export const downloadResidentsExcelTemplate = () => {
  // Crear un archivo CSV con el formato actualizado incluyendo voting_weight
  const headers = [
    'email',
    'firstname',
    'lastname', 
    'phone',
    'apartment_number',
    'voting_weight',
    'password'
  ];
  
  const exampleRows = [
    ['ramirezvalencias27@gmail.com', 'Santiago', 'Ramirez', '305263366', '101', '0.25', 'RamirezV.20'],
    ['santiagorv796@gmail.com', 'Santiago', 'Valencia', '', '102', '0.30', 'RamirezV.21'],
    ['juan.perez@email.com', 'Juan', 'Pérez', '300123456', '103', '0.15', 'JuanPerez2024'],
    ['maria.gonzalez@email.com', 'María', 'González', '301234567', '201', '0.20', 'MariaG2024'],
    ['carlos.rodriguez@email.com', 'Carlos', 'Rodríguez', '', '202', '0.10', 'CarlosR2024']
  ];
  
  // Crear CSV (compatible con Excel)
  let csvContent = headers.join(',') + '\n';
  exampleRows.forEach(row => {
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  // Agregar instrucciones como comentarios
  const instructions = `
# INSTRUCCIONES PARA CARGAR COPROPIETARIOS
#
# Columnas REQUERIDAS:
# - email: Email único del copropietario (será su usuario de login)
# - firstname: Nombre del copropietario
# - lastname: Apellido del copropietario
# - apartment_number: Número de apartamento/unidad
# - voting_weight: Peso de votación (coeficiente de copropiedad, ej: 0.25 = 25%)
#
# Columnas OPCIONALES:
# - phone: Teléfono de contacto (puede estar vacío)
# - password: Contraseña inicial (si no se especifica, será 'Temporal123!')
#
# IMPORTANTE sobre voting_weight:
# - Representa el coeficiente de copropiedad
# - Ejemplo: 0.25 = 25%, 0.30 = 30%
# - La suma de todos los pesos debería ser 1.0 (100%)
# - Se usa para ponderar los votos en las encuestas
#
# DATOS DE EJEMPLO A CONTINUACIÓN:
#
`;
  
  const finalContent = instructions + csvContent;
  
  // Crear blob y descargar
  const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_copropietarios.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};