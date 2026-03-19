import Swal from 'sweetalert2';

/**
 * Muestra un modal de confirmación para eliminar residentes de forma masiva.
 * Requiere que el usuario escriba el nombre de la unidad residencial para confirmar.
 * 
 * @param {Object} options - Opciones del modal
 * @param {number} options.count - Cantidad de residentes a eliminar
 * @param {string} options.unitName - Nombre de la unidad residencial
 * @param {Function} options.onConfirm - Función a ejecutar cuando se confirma la eliminación
 * @param {Function} options.onCancel - Función a ejecutar cuando se cancela (opcional)
 * @returns {Promise<boolean>} - true si se confirmó, false si se canceló
 */
const showBulkDeleteConfirmModal = async ({ count, unitName, onConfirm, onCancel }) => {
  const unitNameToShow = unitName || 'Unidad Residencial';

  const htmlContent = `
    <div class="text-left">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p class="text-red-800 font-semibold mb-2">
          ⚠️ Esta acción es irreversible
        </p>
        <p class="text-red-700 text-sm">
          Se eliminarán <strong>${count}</strong> copropietario(s) de forma permanente.
        </p>
        <p class="text-red-700 text-sm mt-2">
          Se eliminará:
        </p>
        <ul class="text-red-600 text-sm list-disc list-inside mt-1">
          <li>Datos personales del usuario</li>
          <li>Todas las invitaciones a reuniones</li>
          <li>Historial de votaciones</li>
          <li>Delegaciones realizadas</li>
        </ul>
      </div>
      
      <p class="text-gray-700 text-sm mb-3">
        Para confirmar, escriba el nombre de la unidad residencial:
      </p>
      <p class="text-gray-900 font-bold text-lg mb-2" id="swal-unit-name">
        ${unitNameToShow}
      </p>
      <input 
        type="text" 
        id="swal-input-confirm" 
        class="swal2-input" 
        placeholder="Escriba el nombre exacto"
        autocomplete="off"
        onpaste="return false"
        oncopy="return false"
        oncut="return false"
        style="width: 100%; margin: 0"
      >
    </div>
  `;

  const result = await Swal.fire({
    title: 'Eliminar Copropietarios',
    html: htmlContent,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const inputValue = document.getElementById('swal-input-confirm').value;
      if (inputValue !== unitNameToShow) {
        Swal.showValidationMessage('El nombre no coincide');
        return false;
      }
      return true;
    },
  });

  if (result.isConfirmed) {
    if (onConfirm) {
      onConfirm();
    }
    return true;
  } else {
    if (onCancel) {
      onCancel();
    }
    return false;
  }
};

/**
 * Muestra un modal de confirmación para eliminar residentes de forma masiva con loading.
 * Incluye un modal de carga mientras se procesa la eliminación.
 * 
 * @param {Object} options - Opciones del modal
 * @param {number} options.count - Cantidad de residentes a eliminar
 * @param {string} options.unitName - Nombre de la unidad residencial
 * @param {Promise} options.deletePromise - Promesa que ejecuta la eliminación
 * @param {Function} options.onSuccess - Callback cuando la eliminación es exitosa
 * @param {Function} options.onError - Callback cuando hay error en la eliminación
 * @returns {Promise}
 */
export const showBulkDeleteWithLoading = async ({ count, unitName, deletePromise, onSuccess, onError }) => {
  const unitNameToShow = unitName || 'Unidad Residencial';

  const htmlContent = `
    <div class="text-left">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p class="text-red-800 font-semibold mb-2">
          ⚠️ Esta acción es irreversible
        </p>
        <p class="text-red-700 text-sm">
          Se eliminarán <strong>${count}</strong> copropietario(s) de forma permanente.
        </p>
        <p class="text-red-700 text-sm mt-2">
          Se eliminará:
        </p>
        <ul class="text-red-600 text-sm list-disc list-inside mt-1">
          <li>Datos personales del usuario</li>
          <li>Todas las invitaciones a reuniones</li>
          <li>Historial de votaciones</li>
          <li>Delegaciones realizadas</li>
        </ul>
      </div>
      
      <p class="text-gray-700 text-sm mb-3">
        Para confirmar, escriba el nombre de la unidad residencial:
      </p>
      <p class="text-gray-900 font-bold text-lg mb-2" id="swal-unit-name">
        ${unitNameToShow}
      </p>
      <input 
        type="text" 
        id="swal-input-confirm" 
        class="swal2-input" 
        placeholder="Escriba el nombre exacto"
        autocomplete="off"
        onpaste="return false"
        oncopy="return false"
        oncut="return false"
        style="width: 100%; margin: 0"
      >
    </div>
  `;

  const confirmResult = await Swal.fire({
    title: 'Eliminar Copropietarios',
    html: htmlContent,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const inputValue = document.getElementById('swal-input-confirm').value;
      if (inputValue !== unitNameToShow) {
        Swal.showValidationMessage('El nombre no coincide');
        return false;
      }
      return true;
    },
  });

  if (!confirmResult.isConfirmed) {
    return;
  }

  // Mostrar loading mientras se elimina
  Swal.fire({
    title: 'Eliminando copropietarios...',
    html: `Procesando <strong>${count}</strong> usuario(s), por favor espera.`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await deletePromise();
    
    Swal.close();
    
    // Mostrar modal de éxito con auto-cierre
    const { successful = 0, failed = 0 } = response.data || {};
    
    Swal.fire({
      icon: 'success',
      title: '¡Eliminación completada!',
      html: `
        <div class="text-left">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
            <p class="text-green-800 font-semibold text-center">
              ${successful} copropietario(s) eliminado(s) exitosamente
            </p>
            ${failed > 0 ? `
              <p class="text-red-600 text-sm text-center mt-2">
                ${failed} no pudieron ser eliminados
              </p>
            ` : ''}
          </div>
          <p class="text-gray-500 text-sm text-center">
            El listado se ha actualizado automáticamente
          </p>
        </div>
      `,
      confirmButtonColor: '#27ae60',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    
    if (onSuccess) {
      onSuccess(response);
    }
  } catch (error) {
    Swal.close();
    
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    
    Swal.fire({
      icon: isTimeout ? 'warning' : 'error',
      title: isTimeout ? 'Tiempo agotado' : 'Error al eliminar',
      text: isTimeout
        ? 'El proceso tardó más de lo esperado, pero puede haberse completado. Verifica la lista.'
        : (error.response?.data?.message || error.message),
      confirmButtonColor: '#3498db',
    });

    if (onError) {
      onError(error);
    }
  }
};

export default showBulkDeleteConfirmModal;
