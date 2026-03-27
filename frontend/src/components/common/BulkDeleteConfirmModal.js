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

/**
 * Muestra un modal de confirmación para eliminar un solo residente.
 * Requiere que el usuario escriba el nombre de la unidad residencial para confirmar.
 * 
 * @param {Object} options - Opciones del modal
 * @param {string} options.name - Nombre del residente a eliminar
 * @param {string} options.apartment - Número de apartamento
 * @param {string} options.unitName - Nombre de la unidad residencial
 * @param {Function} options.onConfirm - Función a ejecutar cuando se confirma la eliminación
 * @returns {Promise<boolean>} - true si se confirmó, false si se canceló
 */
export const showSingleDeleteConfirmModal = async ({ name, apartment, unitName, onConfirm }) => {
  const unitNameToShow = unitName || 'Unidad Residencial';

  const htmlContent = `
    <div class="text-left">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p class="text-red-800 font-semibold mb-2">
          ⚠️ Esta acción es irreversible
        </p>
        <p class="text-red-700 text-sm">
          Se eliminará <strong>1</strong> copropietario de forma permanente.
        </p>
        <p class="text-red-700 text-sm mt-2">
          Se eliminará:
        </p>
        <ul class="text-red-600 text-sm list-disc list-inside mt-1">
          <li>${name} (Apartamento ${apartment})</li>
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
    title: 'Eliminar Copropietario',
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
      await onConfirm();
    }
    return true;
  }

  return false;
};

/**
 * Muestra un modal de confirmación para eliminar una reunión.
 * Requiere que el usuario escriba el nombre de la reunión para confirmar.
 * 
 * @param {Object} options - Opciones del modal
 * @param {string} options.meetingTitle - Título de la reunión a eliminar
 * @param {Function} options.onConfirm - Función a ejecutar cuando se confirma la eliminación
 * @returns {Promise<boolean>} - true si se confirmó, false si se canceló
 */
export const showDeleteMeetingConfirmModal = async ({ meetingTitle, onConfirm }) => {
  const htmlContent = `
    <div class="text-left">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p class="text-red-800 font-semibold mb-2">
          ⚠️ Esta acción es irreversible
        </p>
        <p class="text-red-700 text-sm">
          Se eliminará la reunión: <strong>${meetingTitle}</strong>
        </p>
        <p class="text-red-700 text-sm mt-2">
          Se eliminará:
        </p>
        <ul class="text-red-600 text-sm list-disc list-inside mt-1">
          <li>Datos de la reunión</li>
          <li>Invitaciones enviadas a los residentes</li>
          <li>Registro de asistencia</li>
          <li>Resultados de encuestas y votaciones</li>
          <li>Sesiones Zoom relacionadas</li>
          <li>Historial de delegaciones asociadas</li>
        </ul>
      </div>
      
      <p class="text-gray-700 text-sm mb-3">
        Para confirmar, escriba el nombre de la reunión:
      </p>
      <p class="text-gray-900 font-bold text-lg mb-2" id="swal-meeting-name">
        ${meetingTitle}
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
    title: 'Eliminar Reunión',
    html: htmlContent,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const inputValue = document.getElementById('swal-input-confirm').value;
      if (inputValue !== meetingTitle) {
        Swal.showValidationMessage('El nombre no coincide');
        return false;
      }
      return true;
    },
  });

  if (result.isConfirmed) {
    if (onConfirm) {
      await onConfirm();
    }
    return true;
  }

  return false;
};

export default showBulkDeleteConfirmModal;

/**
 * Muestra un modal de progreso para el envío masivo de credenciales.
 * pollProgressFn debe ser una función que retorne el estado de la tarea.
 * 
 * @param {Object} options - Opciones del modal
 * @param {number} options.total - Cantidad total de correos a enviar
 * @param {Function} options.pollProgressFn - Función asíncrona para obtener el progreso
 * @returns {Promise} - Resuelve cuando el proceso termina
 */
export const showBulkSendProgressModal = async ({ total, pollProgressFn, startProgress, updateProgress, finishProgress }) => {
  let pollingInterval = null;
  let progressData = { current: 0, total: total, status: 'processing', progress: 0 };
  
  const useToast = startProgress && typeof startProgress === 'function' && updateProgress && typeof updateProgress === 'function' && finishProgress && typeof finishProgress === 'function';
  let notificationId = null;
  
  if (useToast) {
    notificationId = startProgress({
      title: 'Enviando Credenciales',
      message: `Enviando enlaces de acceso (0/${total})`,
      total: total,
      type: 'info'
    });
    
    pollingInterval = setInterval(async () => {
      try {
        const response = await pollProgressFn();
        progressData = {
          current: response.data?.current || 0,
          total: response.data?.total || total,
          status: response.data?.status || 'processing',
          progress: response.data?.progress || 0
        };
        
        updateProgress({
          id: notificationId,
          current: progressData.current,
          total: progressData.total,
          message: `Enviando enlaces de acceso (${progressData.current}/${progressData.total})`,
          status: progressData.status,
          progress: progressData.progress
        });
        
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          clearInterval(pollingInterval);
          finishProgress({
            id: notificationId,
            status: progressData.status === 'completed' ? 'completed' : 'failed',
            message: progressData.status === 'completed' 
              ? `Credenciales enviadas a ${progressData.current} copropietario(s)` 
              : 'Error al enviar credenciales'
          });
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        finishProgress({ 
          id: notificationId,
          status: 'failed', 
          message: 'Error al obtener progreso' 
        });
      }
    }, 1500);
    
    return progressData;
  }
  
  const updateProgressHtml = () => {
    const { current, total, progress } = progressData;
    return `
      <div class="text-left">
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-700">Procesando...</span>
            <span class="text-blue-600 font-medium">${current} / ${total}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
          </div>
        </div>
        <p class="text-xs text-gray-500 text-center">
          Enviando correos electrónicos de forma masiva
        </p>
      </div>
    `;
  };

  await Swal.fire({
    title: 'Enviando Credenciales',
    html: updateProgressHtml(),
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: async () => {
      Swal.showLoading();
      
      pollingInterval = setInterval(async () => {
        try {
          const response = await pollProgressFn();
          progressData = {
            current: response.data?.current || 0,
            total: response.data?.total || total,
            status: response.data?.status || 'processing',
            progress: response.data?.progress || 0
          };
          
          Swal.update({
            html: updateProgressHtml()
          });
          
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            clearInterval(pollingInterval);
            Swal.close();
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }, 1500);
    },
    willClose: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    }
  });

  return progressData;
};

/**
 * Muestra un modal de progreso para el envío de invitaciones de reunión.
 * 
 * @param {Object} options - Opciones del modal
 * @param {string} options.meetingTitle - Título de la reunión
 * @param {number} options.total - Cantidad total de invitados
 * @param {Function} options.pollProgressFn - Función asíncrona para obtener el progreso
 * @param {Function} options.startProgress - Función para iniciar progreso (opcional, usa toast si se provee)
 * @param {Function} options.updateProgress - Función para actualizar progreso (opcional)
 * @param {Function} options.finishProgress - Función para finalizar progreso (opcional)
 * @returns {Promise} - Resuelve cuando el proceso termina
 */
export const showMeetingInvitationProgressModal = async ({ 
  meetingTitle, 
  total, 
  pollProgressFn,
  startProgress,
  updateProgress,
  finishProgress
}) => {
  let pollingInterval = null;
  let progressData = { current: 0, total: total, status: 'processing', progress: 0 };
  
  const useToast = startProgress && typeof startProgress === 'function' && updateProgress && typeof updateProgress === 'function' && finishProgress && typeof finishProgress === 'function';
  let notificationId = null;
  
  if (useToast) {
    notificationId = startProgress({
      title: 'Enviando Invitaciones',
      message: `Enviando a ${meetingTitle} (0/${total})`,
      total: total,
      type: 'info'
    });
    
    pollingInterval = setInterval(async () => {
      try {
        const response = await pollProgressFn();
        progressData = {
          current: response.data?.current || 0,
          total: response.data?.total || total,
          status: response.data?.status || 'processing',
          progress: response.data?.progress || 0
        };
        
        updateProgress({
          id: notificationId,
          current: progressData.current,
          total: progressData.total,
          message: `Enviando a ${meetingTitle} (${progressData.current}/${progressData.total})`,
          status: progressData.status,
          progress: progressData.progress
        });
        
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          clearInterval(pollingInterval);
          finishProgress({
            id: notificationId,
            status: progressData.status,
            message: progressData.status === 'completed' 
              ? `Invitaciones enviadas a ${progressData.current} residentes` 
              : 'Error al enviar invitaciones'
          });
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        finishProgress({ 
          id: notificationId,
          status: 'failed', 
          message: 'Error al obtener progreso' 
        });
      }
    }, 1500);
    
    return progressData;
  }
  
  const updateProgressHtml = () => {
    const { current, total, progress } = progressData;
    return `
      <div class="text-left">
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-700">Enviando invitaciones: <strong>${meetingTitle}</strong></span>
            <span class="text-blue-600 font-medium">${current} / ${total}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
          </div>
        </div>
        <p class="text-xs text-gray-400 text-center">⏳ La barra se actualiza cada 10 envíos</p>
      </div>
    `;
  };

  await Swal.fire({
    title: 'Enviando Invitaciones',
    html: updateProgressHtml(),
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: async () => {
      Swal.showLoading();
      
      pollingInterval = setInterval(async () => {
        try {
          const response = await pollProgressFn();
          progressData = {
            current: response.data?.current || 0,
            total: response.data?.total || total,
            status: response.data?.status || 'processing',
            progress: response.data?.progress || 0
          };
          
          Swal.update({
            html: updateProgressHtml()
          });
          
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            clearInterval(pollingInterval);
            Swal.close();
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }, 1500);
    },
    willClose: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    }
  });

  return progressData;
};
