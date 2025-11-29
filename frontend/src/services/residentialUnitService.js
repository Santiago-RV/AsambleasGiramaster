import axiosInstance from "./api/axiosconfig";

/**
 * Sube un archivo Excel con copropietarios para una unidad residencial
 * @param {number} unitId - ID de la unidad residencial
 * @param {File} file - Archivo Excel con los copropietarios
 * @returns {Promise<Object>} Respuesta con estadísticas de la carga
 */
export const uploadResidentsExcel = async (unitId, file) => {
  try {
    console.log('📤 Iniciando carga de Excel...');
    console.log('   Unit ID:', unitId);
    console.log('   Archivo:', file.name);
    console.log('   Tamaño:', file.size, 'bytes');
    console.log('   Tipo:', file.type);

    // IMPORTANTE: Crear FormData para enviar archivos
    const formData = new FormData();
    formData.append('file', file);  // ← Campo debe llamarse 'file'

    // Debug: Verificar contenido del FormData
    console.log('📋 Contenido del FormData:');
    for (let [key, value] of formData.entries()) {
      console.log(`   ${key}:`, value);
    }

    // Enviar petición
    // IMPORTANTE: NO especificar Content-Type manualmente
    // Axios lo configura automáticamente como multipart/form-data
    const response = await axiosInstance.post(
      `/super-admin/residential-units/${unitId}/upload-residents-excel`,
      formData
      // NO agregar headers: { 'Content-Type': 'multipart/form-data' }
    );

    console.log('Respuesta exitosa:', response.data);
    return response.data;

  } catch (error) {
    console.error('Error uploading residents Excel:', error);
    
    // Extraer mensaje de error detallado
    const errorMessage = error.response?.data?.detail 
                        || error.response?.data?.message 
                        || 'Error al cargar el archivo Excel';
    
    // Mostrar información de debug
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
      console.error('   Headers:', error.response.headers);
    }
    
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
    const response = await axiosInstance.get(
      `/residential-units/${unitId}/residents`
    );
    return response.data.data;
  } catch (error) {
    console.error('Error fetching residents:', error);
    throw error;
  }
};

/**
 * Descarga una plantilla de Excel para cargar copropietarios
 * @returns {void} Descarga el archivo
 */
export const downloadResidentsExcelTemplate = () => {
  // Crear un archivo CSV con el formato requerido
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
    ['usuario1@example.com', 'Juan', 'Pérez', '+57 300 111 2222', '101', '0.25', 'Password123!'],
    ['usuario2@example.com', 'María', 'García', '+57 300 222 3333', '102', '0.30', 'Password456!'],
  ];
  
  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = 'plantilla_copropietarios.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};