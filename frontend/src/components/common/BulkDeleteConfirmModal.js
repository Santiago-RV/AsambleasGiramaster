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
 * @param {number} options.timeoutMs - Timeout en milisegundos (default: 120000 = 2 minutos)
 * @param {Function} options.onTimeout - Callback cuando expire el timeout
 * @returns {Promise} - Resuelve cuando el proceso termina
 */
export const showBulkSendProgressModal = async ({ total, pollProgressFn, startProgress, updateProgress, finishProgress, timeoutMs = 120000, onTimeout }) => {
  let pollingInterval = null;
  let progressData = { current: 0, total: total, status: 'processing', progress: 0 };
  let startTime = Date.now();
  
  const useToast = startProgress && typeof startProgress === 'function' && updateProgress && typeof updateProgress === 'function' && finishProgress && typeof finishProgress === 'function';
  let notificationId = null;
  
  const checkTimeout = () => {
    return Date.now() - startTime >= timeoutMs;
  };
  
  const handleError = (message) => {
    if (pollingInterval) clearInterval(pollingInterval);
    if (useToast && notificationId) {
      finishProgress({
        id: notificationId,
        status: 'failed',
        message: message
      });
    } else {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error en el envío de correos',
        html: `
          <div class="text-left">
            <p class="mb-2">${message}</p>
            <p class="text-sm text-gray-600 mb-2">El servicio de correos puede estar indisponible. Por favor:</p>
            <ul class="text-sm text-gray-600 list-disc pl-4 mb-2">
              <li>Verificar que el servicio de procesamiento de correos esté activo</li>
              <li>Intentar más tarde</li>
              <li>Contactar a soporte técnico si el problema persiste</li>
            </ul>
            <p class="text-xs text-gray-500">Los mensajes permanecerán en espera y se enviarán una vez corregido el problema.</p>
          </div>
        `,
        confirmButtonText: 'Contactar Soporte',
        confirmButtonColor: '#e74c3c',
        cancelButtonText: 'Cerrar'
      }).then((result) => {
        if (result.isConfirmed && onTimeout) {
          onTimeout();
        }
      });
    }
  };
  
  if (useToast) {
    notificationId = startProgress({
      title: 'Enviando Credenciales',
      message: `Enviando enlaces de acceso (0/${total})`,
      total: total,
      type: 'info'
    });
    
    pollingInterval = setInterval(async () => {
      try {
        if (checkTimeout()) {
          handleError('El servicio de correos está tardando más de lo esperado. La tarea puede haber fallado o el servicio está indisponible.');
          return;
        }
        
        const response = await pollProgressFn();
        const status = response.data?.status || 'unknown';
        
        if (status === 'not_found' || status === 'unknown') {
          if (checkTimeout()) {
            handleError('No se recibió confirmación del servicio de correos. La tarea puede no haberse iniciado correctamente.');
            return;
          }
          return;
        }
        
        progressData = {
          current: response.data?.current || 0,
          total: response.data?.total || total,
          status: status,
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
          const successful = response.data?.successful || 0;
          const failed = response.data?.failed || 0;
          const finishMessage = failed > 0
            ? `Enviadas: ${successful} exitosas, ${failed} fallidas`
            : progressData.status === 'completed'
              ? `Credenciales enviadas a ${progressData.current} copropietario(s)`
              : 'Error al enviar credenciales';
          finishProgress({
            id: notificationId,
            status: progressData.status === 'completed' ? 'completed' : 'failed',
            message: finishMessage
          });
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        if (checkTimeout()) {
          handleError('Error de conexión con el servicio de correos. Verifique la conexión e intente más tarde.');
          return;
        }
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
          if (checkTimeout()) {
            clearInterval(pollingInterval);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Tiempo de espera agotado',
              html: `
                <div class="text-left">
                  <p class="mb-3">El servicio de correos está tardando más de lo esperado.</p>
                  <p class="text-sm text-gray-600">La tarea puede haber fallado o el servicio está indisponible. Por favor:</p>
                  <ul class="text-sm text-gray-600 list-disc pl-4 mt-2">
                    <li>Verificar que el servicio de procesamiento de correos esté activo</li>
                    <li>Intentar más tarde</li>
                    <li>Contactar a soporte técnico si el problema persiste</li>
                  </ul>
                </div>
              `,
              confirmButtonText: 'Contactar Soporte',
              confirmButtonColor: '#e74c3c',
              cancelButtonText: 'Cerrar'
            }).then((result) => {
              if (result.isConfirmed && onTimeout) {
                onTimeout();
              }
            });
            return;
          }
          
          const response = await pollProgressFn();
          const status = response.data?.status || 'unknown';
          
          if (status === 'not_found' || status === 'unknown') {
            return;
          }
          
          progressData = {
            current: response.data?.current || 0,
            total: response.data?.total || total,
            status: status,
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
          if (checkTimeout()) {
            clearInterval(pollingInterval);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error de conexión',
              html: `
                <div class="text-left">
                  <p class="mb-3">No se pudo conectar con el servicio de correos.</p>
                  <p class="text-sm text-gray-600">Verifique su conexión a internet e intente más tarde.</p>
                </div>
              `,
              confirmButtonText: 'Cerrar'
            });
            return;
          }
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
 * Muestra un modal de confirmación + loading para habilitar/deshabilitar acceso masivo.
 *
 * @param {Object} options
 * @param {number} options.count - Cantidad de usuarios a modificar
 * @param {boolean} options.enabled - true = habilitar, false = deshabilitar
 * @param {Function} options.togglePromise - Función que ejecuta la operación y retorna la respuesta
 * @param {Function} options.onSuccess - Callback en éxito
 * @param {Function} options.onError - Callback en error (opcional)
 */
export const showBulkToggleAccessWithLoading = async ({ count, enabled, togglePromise, onSuccess, onError }) => {
  const action = enabled ? 'habilitar' : 'deshabilitar';
  const actionTitle = enabled ? 'Habilitar' : 'Deshabilitar';
  const actionColor = enabled ? '#27ae60' : '#e74c3c';
  const bgColor = enabled ? '#f0fdf4' : '#fef2f2';
  const borderColor = enabled ? '#bbf7d0' : '#fecaca';
  const textColor = enabled ? '#166534' : '#991b1b';

  const confirmResult = await Swal.fire({
    title: `¿${actionTitle} acceso?`,
    html: `
      <div class="text-left">
        <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:16px;">
          <p style="color:${textColor};font-weight:600;margin:0 0 8px 0;">
            Se va a ${action} el acceso de <strong>${count}</strong> copropietario(s).
          </p>
          <p style="color:${textColor};font-size:13px;margin:0;">
            ${enabled
              ? 'Los usuarios seleccionados podrán ingresar al sistema.'
              : 'Los usuarios seleccionados NO podrán ingresar al sistema.'}
          </p>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonColor: actionColor,
    cancelButtonColor: '#6b7280',
    confirmButtonText: `Sí, ${action}`,
    cancelButtonText: 'Cancelar',
  });

  if (!confirmResult.isConfirmed) return;

  Swal.fire({
    title: `${actionTitle}ndo acceso...`,
    html: `Procesando <strong>${count}</strong> usuario(s), por favor espera.`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await togglePromise();
    Swal.close();

    const { successful = 0, failed = 0, already_in_state = 0 } = response.data || {};

    Swal.fire({
      icon: successful > 0 ? 'success' : 'warning',
      title: `Acceso ${enabled ? 'habilitado' : 'deshabilitado'}`,
      html: `
        <div style="text-align:left;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:8px;">
            <p style="color:#166534;font-weight:600;text-align:center;margin:0;">
              ${successful} usuario(s) ${enabled ? 'habilitados' : 'deshabilitados'} exitosamente
            </p>
            ${already_in_state > 0 ? `<p style="color:#6b7280;font-size:13px;text-align:center;margin:6px 0 0 0;">${already_in_state} ya estaban en ese estado</p>` : ''}
            ${failed > 0 ? `<p style="color:#dc2626;font-size:13px;text-align:center;margin:6px 0 0 0;">${failed} no pudieron modificarse</p>` : ''}
          </div>
          <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">El listado se ha actualizado automáticamente</p>
        </div>
      `,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    if (onSuccess) onSuccess(response);
  } catch (error) {
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Error al modificar acceso',
      text: error.response?.data?.message || error.message,
      confirmButtonColor: '#3498db',
    });
    if (onError) onError(error);
  }
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
 * @param {Function} options.pollProgressFn - Función asíncrona para obtener el progreso
 * @param {number} options.timeoutMs - Timeout en milisegundos (default: 120000 = 2 minutos)
 * @param {Function} options.onTimeout - Callback cuando expire el timeout
 * @returns {Promise} - Resuelve cuando el proceso termina
 */
export const showMeetingInvitationProgressModal = async ({ 
  meetingTitle, 
  total, 
  pollProgressFn,
  startProgress,
  updateProgress,
  finishProgress,
  timeoutMs = 120000,
  onTimeout
}) => {
  let pollingInterval = null;
  let progressData = { current: 0, total: total, status: 'processing', progress: 0 };
  let startTime = Date.now();
  
  const useToast = startProgress && typeof startProgress === 'function' && updateProgress && typeof updateProgress === 'function' && finishProgress && typeof finishProgress === 'function';
  let notificationId = null;
  
  const checkTimeout = () => {
    return Date.now() - startTime >= timeoutMs;
  };
  
  const handleError = (message) => {
    if (pollingInterval) clearInterval(pollingInterval);
    if (useToast && notificationId) {
      finishProgress({
        id: notificationId,
        status: 'failed',
        message: message
      });
    } else {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error en el envío de invitaciones',
        html: `
          <div class="text-left">
            <p class="mb-2">${message}</p>
            <p class="text-sm text-gray-600 mb-2">El servicio de correos puede estar indisponible. Por favor:</p>
            <ul class="text-sm text-gray-600 list-disc pl-4 mb-2">
              <li>Verificar que el servicio de procesamiento de correos esté activo</li>
              <li>Intentar más tarde</li>
              <li>Contactar a soporte técnico si el problema persiste</li>
            </ul>
            <p class="text-xs text-gray-500">Los mensajes permanecerán en espera y se enviarán una vez corregido el problema.</p>
          </div>
        `,
        confirmButtonText: 'Contactar Soporte',
        confirmButtonColor: '#e74c3c',
        cancelButtonText: 'Cerrar'
      }).then((result) => {
        if (result.isConfirmed && onTimeout) {
          onTimeout();
        }
      });
    }
  };
  
  if (useToast) {
    notificationId = startProgress({
      title: 'Enviando Invitaciones',
      message: `Enviando a ${meetingTitle} (0/${total})`,
      total: total,
      type: 'info'
    });
    
    pollingInterval = setInterval(async () => {
      try {
        if (checkTimeout()) {
          handleError('El servicio de correos está tardando más de lo esperado. La tarea puede haber fallado o el servicio está indisponible.');
          return;
        }
        
        const response = await pollProgressFn();
        const status = response.data?.status || 'unknown';
        
        if (status === 'not_found' || status === 'unknown') {
          return;
        }
        
        progressData = {
          current: response.data?.current || 0,
          total: response.data?.total || total,
          status: status,
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
          const successful = response.data?.successful || 0;
          const failed = response.data?.failed || 0;
          const finishMessage = failed > 0
            ? `Enviadas: ${successful} exitosas, ${failed} fallidas`
            : progressData.status === 'completed'
              ? `Invitaciones enviadas a ${progressData.current} residentes`
              : 'Error al enviar invitaciones';
          finishProgress({
            id: notificationId,
            status: progressData.status,
            message: finishMessage
          });
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        if (checkTimeout()) {
          handleError('Error de conexión con el servicio de correos. Verifique la conexión e intente más tarde.');
          return;
        }
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
          if (checkTimeout()) {
            clearInterval(pollingInterval);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Tiempo de espera agotado',
              html: `
                <div class="text-left">
                  <p class="mb-3">El servicio de correos está tardando más de lo esperado.</p>
                  <p class="text-sm text-gray-600">La tarea puede haber fallado o el servicio está indisponible. Por favor:</p>
                  <ul class="text-sm text-gray-600 list-disc pl-4 mt-2">
                    <li>Verificar que el servicio de procesamiento de correos esté activo</li>
                    <li>Intentar más tarde</li>
                    <li>Contactar a soporte técnico si el problema persiste</li>
                  </ul>
                </div>
              `,
              confirmButtonText: 'Contactar Soporte',
              confirmButtonColor: '#e74c3c',
              cancelButtonText: 'Cerrar'
            }).then((result) => {
              if (result.isConfirmed && onTimeout) {
                onTimeout();
              }
            });
            return;
          }
          
          const response = await pollProgressFn();
          const status = response.data?.status || 'unknown';
          
          if (status === 'not_found' || status === 'unknown') {
            return;
          }
          
          progressData = {
            current: response.data?.current || 0,
            total: response.data?.total || total,
            status: status,
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
          if (checkTimeout()) {
            clearInterval(pollingInterval);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error de conexión',
              html: `
                <div class="text-left">
                  <p class="mb-3">No se pudo conectar con el servicio de correos.</p>
                  <p class="text-sm text-gray-600">Verifique su conexión a internet e intente más tarde.</p>
                </div>
              `,
              confirmButtonText: 'Cerrar'
            });
            return;
          }
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
