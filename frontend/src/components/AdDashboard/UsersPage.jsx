import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Plus, UserPlus, Lightbulb, Mail, AlertTriangle, Headphones, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import ResidentsList from "../common/ResidentsList";
import MeetingsList from "../common/MeetingsList";
import { showBulkDeleteWithLoading, showBulkToggleAccessWithLoading, showBulkSendProgressModal } from "../common/BulkDeleteConfirmModal";
import { ResidentialUnitService } from "../../services/api/ResidentialUnitService";
import { ResidentService } from "../../services/api/ResidentService";
import { MeetingService } from "../../services/api/MeetingService";
import CoownerService from "../../services/api/coownerService";
import SupportModal from '../saDashboard/components/modals/SupportModal';
import HelpModalAdmin from "./HelpModalAdmin";
import { useProgressNotification } from '../../contexts/ProgressNotificationContext';
import { formatDateLong, formatTime } from '../../utils/dateUtils';

const SVG_ICONS = {
  lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
  alertTriangle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
};


export default function UsersPage({ residentialUnitId, unitName = '', onCreateUser, onEditUser, onUploadExcel, onCreateMeeting, onJoinMeeting, onCreateGuest, onEditMeeting }) {
  const queryClient = useQueryClient();
  const { startProgress, updateProgress, finishProgress } = useProgressNotification();

  // Obtener los residentes de la unidad residencial
  const {
    data: residentsData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['residential-unit-residents', residentialUnitId],
    queryFn: () => ResidentialUnitService.getResidentsByResidentialUnit(residentialUnitId),
    enabled: !!residentialUnitId,
    retry: 1,
  });

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalAdminOpen] = useState(false);

  // Extraer los residentes del response, excluyendo admin y soporte de la vista de administrador
  const residents = residentsData?.success && residentsData?.data
    ? residentsData.data.filter(r => r.apartment_number !== 'ADMIN' && r.apartment_number !== 'SOPORTE')
    : [];

  // Obtener las reuniones de la unidad residencial
  const {
    data: meetingsData,
    isLoading: isLoadingMeetings,
  } = useQuery({
    queryKey: ['meetings', residentialUnitId],
    queryFn: () => MeetingService.getMeetingsByResidentialUnit(residentialUnitId),
    enabled: !!residentialUnitId,
    retry: 1,
  });

  // Transformar las reuniones al formato esperado
  const meetings = meetingsData?.success && meetingsData?.data
    ? meetingsData.data.map(meeting => ({
      id: meeting.id,
      titulo: meeting.str_title || 'Sin título',
      estado: meeting.str_status || 'Programada',
      fecha: meeting.dat_schedule_date,
      hora: meeting.dat_schedule_date
        ? formatTime(meeting.dat_schedule_date)
        : 'No definida',
      asistentes: meeting.int_total_invitated || 0,
      fechaCompleta: new Date(meeting.dat_schedule_date),
      // Usar los campos correctos de Zoom
      meeting_url: meeting.str_zoom_join_url,  // Corregido: era str_meeting_url (no existe)
      zoom_meeting_id: meeting.int_zoom_meeting_id,  // Corregido: era str_zoom_meeting_id (tipo incorrecto)
      zoom_password: meeting.str_zoom_password,  // Contraseña de la reunión
      str_modality: meeting.str_modality || 'virtual',
      int_zoom_account_id: meeting.int_zoom_account_id,
      // Campos adicionales para edición
      str_meeting_type: meeting.str_meeting_type,
      str_description: meeting.str_description,
      bln_allow_delegates: meeting.bln_allow_delegates,
    }))
    : [];

  // Mutación para eliminar residente individual
  const deleteResidentMutation = useMutation({
    mutationFn: ({ userId, unitId }) => ResidentService.deleteResident(unitId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      Swal.fire({
        icon: 'success',
        title: '¡Eliminado!',
        text: 'El copropietario ha sido eliminado exitosamente',
        confirmButtonColor: '#3498db',
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: error.response?.data?.message || error.message,
        confirmButtonColor: '#3498db',
      });
    },
  });

  // Mutación para eliminar residentes de forma masiva
  const deleteCoownersBulkMutation = useMutation({
    mutationFn: async (userIds) => {
      // Mostrar Swal de progreso ANTES de la petición
      Swal.fire({
        title: 'Eliminando copropietarios...',
        html: `Procesando <strong>${userIds.length}</strong> usuario(s), por favor espera.`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });
      return await CoownerService.deleteCoownersBulk(userIds);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      const { successful, failed } = response.data || {};
      Swal.fire({
        icon: failed > 0 ? 'warning' : 'success',
        title: failed > 0 ? 'Eliminación parcial' : '¡Eliminados!',
        html: `
        <div class="text-left">
          <p class="text-green-700"><strong>Eliminados:</strong> ${successful}</p>
          ${failed > 0 ? `<p class="text-red-700"><strong>Fallidos:</strong> ${failed}</p>` : ''}
        </div>
      `,
        confirmButtonColor: '#3498db',
      });
    },
    onError: (error) => {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      Swal.fire({
        icon: isTimeout ? 'warning' : 'error',
        title: isTimeout ? 'Tiempo agotado' : 'Error al eliminar',
        text: isTimeout
          ? 'El proceso tardó más de lo esperado, pero puede haberse completado. Verifica la lista.'
          : (error.response?.data?.message || error.message),
        confirmButtonColor: '#3498db',
      });
    },
  });

  const handleBulkDelete = async (selectedIds, unitName = '') => {
    if (selectedIds.length === 0) return;

    await showBulkDeleteWithLoading({
      count: selectedIds.length,
      unitName: unitName,
      deletePromise: () => CoownerService.deleteCoownersBulk(selectedIds, residentialUnitId),
      onSuccess: () => {
        refetch();
      },
    });
  };

  // Mutación para el envío masivo de credenciales
  const sendBulkCredentialsMutation = useMutation({
    mutationFn: async (residentIds) => {
      const statusCheck = await ResidentService.checkCeleryStatus();
      if (!statusCheck.data?.celery_available) {
        throw new Error(statusCheck.data?.message || 'El servicio de correos no está disponible en este momento. Por favor, contacte a soporte técnico.');
      }
      return await CoownerService.sendBulkCredentials(residentIds);
    },
    onSuccess: (response) => {
      const { total_processed, task_id } = response.data;

      if (task_id) {
        const total = response.data.total || total_processed;
        
        showBulkSendProgressModal({
          total: total,
          pollProgressFn: () => ResidentService.getEmailTaskStatus(task_id),
          startProgress,
          updateProgress,
          finishProgress,
          timeoutMs: 120000,
          onTimeout: () => {
            Swal.fire({
              icon: 'warning',
              title: 'Tiempo de espera agotado',
              text: 'El servicio de correos tardó más de lo esperado. Por favor, contacte a soporte técnico.',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      }
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error al Enviar Enlace',
        text: error.response?.data?.message || error.message || 'Error al enviar el enlace de acceso',
        confirmButtonColor: '#e74c3c',
      });
    },
  });

  // MUTACIÓN PARA INICIAR REUNIÓN
  const startMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, modality }) => {
      const response = await MeetingService.startMeeting(meetingId);
      return { ...response, modality };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', residentialUnitId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-invitations'] });

      const isPresencial = response.modality === 'presencial';

      Swal.fire({
        icon: 'success',
        title: isPresencial ? 'Reunion Presencial Iniciada' : 'Reunion Iniciada',
        html: `
          <div class="text-left">
            <p class="mb-3">${response.message || 'La reunion ha sido iniciada exitosamente'}</p>
            <div class="${isPresencial ? 'bg-emerald-50' : 'bg-green-50'} p-3 rounded-lg">
              <p class="text-sm ${isPresencial ? 'text-emerald-700' : 'text-green-700'}">
                Estado: <strong>En Curso</strong>
              </p>
            </div>
            ${isPresencial ? '<p class="text-sm text-gray-600 mt-3">Utilice el escaner QR para registrar la asistencia de los copropietarios.</p>' : ''}
          </div>
        `,
        confirmButtonColor: '#10b981',
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al iniciar la reunion',
        confirmButtonColor: '#dc2626',
      });
    },
  });

  // MUTACIÓN PARA FINALIZAR REUNIÓN
  const endMeetingMutation = useMutation({
    mutationFn: async (meetingId) => {
      return await MeetingService.endMeeting(meetingId);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', residentialUnitId] });
      Swal.fire({
        icon: 'success',
        title: 'Reunión Finalizada',
        text: response.message || 'La reunión ha sido finalizada exitosamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al finalizar la reunión',
        confirmButtonColor: '#dc2626',
      });
    },
  });

  const handleStartMeeting = async (meeting) => {
    const isPresencial = meeting.str_modality === 'presencial';

    const result = await Swal.fire({
      title: isPresencial ? '¿Iniciar Reunion Presencial?' : '¿Iniciar Reunion?',
      html: `
        <div class="text-left">
          <p class="mb-3">¿Estas seguro de iniciar esta reunion?</p>
          <div class="${isPresencial ? 'bg-emerald-50' : 'bg-blue-50'} p-3 rounded-lg">
            <p class="font-semibold ${isPresencial ? 'text-emerald-800' : 'text-blue-800'}">${meeting.titulo}</p>
            <p class="text-sm ${isPresencial ? 'text-emerald-700' : 'text-blue-700'} mt-1">
              <strong>Fecha:</strong> ${formatDateLong(meeting.fecha)}
            </p>
            <p class="text-sm ${isPresencial ? 'text-emerald-700' : 'text-blue-700'} mt-1">
              <strong>Modalidad:</strong> ${isPresencial ? 'Presencial' : 'Virtual'}
            </p>
          </div>
          <p class="text-xs text-gray-600 mt-3">
            ${isPresencial
          ? 'La reunion cambiara a estado "En Curso". Utilice el escaner QR para registrar asistencia.'
          : 'Se crearan invitaciones automaticamente para todos los copropietarios'}
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Si, Iniciar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      startMeetingMutation.mutate({ meetingId: meeting.id, modality: meeting.str_modality });
    }
  };

  const handleEndMeeting = async (meeting) => {
    const result = await Swal.fire({
      title: '¿Finalizar Reunión?',
      html: `
      <div class="text-left">
        <p class="mb-3">¿Estás seguro de que deseas finalizar esta reunión?</p>
        <div class="bg-blue-50 p-3 rounded-lg">
          <p class="font-semibold text-blue-800">${meeting.titulo}</p>
          <p class="text-sm text-blue-700 mt-1">
            <strong>Fecha:</strong> ${formatDateLong(meeting.fecha)}
          </p>
        </div>
        <p class="text-xs text-gray-600 mt-3">
          ${SVG_ICONS.alertTriangle} Esta acción marcará la reunión como finalizada.
        </p>
      </div>
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Finalizar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      endMeetingMutation.mutate(meeting.id);
    }
  };

  // Handler para eliminar reunión
  const handleDeleteMeeting = async (meetingId) => {
    await MeetingService.deleteMeeting(meetingId);
    queryClient.invalidateQueries({ queryKey: ['meetings', residentialUnitId] });
    
    Swal.fire({
      icon: 'success',
      title: '¡Reunión Eliminada!',
      text: 'La reunión ha sido eliminada exitosamente',
      confirmButtonColor: '#27ae60',
    });
  };

  // Mutación para toggle access individual
  const toggleAccessMutation = useMutation({
    mutationFn: async ({ userId, enabled }) => {
      return await CoownerService.toggleCoownerAccess(userId, enabled, false);
    },
    onSuccess: (response, variables) => {
      const action = variables.enabled ? 'habilitado' : 'deshabilitado';
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });

      Swal.fire({
        icon: 'success',
        title: '¡Acceso Modificado!',
        text: `Acceso ${action} exitosamente`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo modificar el acceso',
        confirmButtonColor: '#ef4444',
      });
    },
  });

  // Función para reenviar credenciales individuales
  const handleResendCredentials = async (resident) => {
	// Mostrar loader mientras se verifica el servicio de correo
	Swal.fire({
		title: 'Verificando servicio de correo...',
		allowOutsideClick: false,
		showConfirmButton: false,
		didOpen: () => {
			Swal.showLoading();
		}
	});

	// Timeout de 3 segundos
	const timeoutPromise = new Promise((_, reject) =>
		setTimeout(() => reject(new Error('Timeout de verificación')), 3000)
	);

	try {
		const statusCheck = await Promise.race([
			ResidentService.checkCeleryStatus(),
			timeoutPromise
		]);

		if (!statusCheck.data?.celery_available) {
			Swal.close();
			Swal.fire({
          icon: 'error',
          title: 'Servicio no disponible',
          html: `
            <div class="text-left">
              <p class="mb-2">${statusCheck.data?.message || 'El servicio de correos no está disponible en este momento.'}</p>
              <p class="text-sm text-gray-600 mb-2">Por favor, contacte a soporte técnico.</p>
              <p class="text-xs text-gray-500">Los mensajes permanecerán en espera y se enviarán una vez corregido el problema.</p>
            </div>
          `,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#e74c3c',
        });
        return;
      }
    } catch {
      // Si falla por timeout o error, continuar con el envío
      Swal.close();
    }

    // Continuar con el flujo normal de confirmación
    const result = await Swal.fire({
      title: '¿Reenviar credenciales?',
      html: `
        <div class="text-left">
          <p class="mb-3">Se enviará un enlace de acceso directo por correo a:</p>
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="font-semibold text-blue-800">${resident.firstname} ${resident.lastname}</p></p>
            <p class="text-sm text-blue-700 mt-1">
              <strong>Email:</strong> ${resident.email}
            </p>
            <p class="text-sm text-blue-700">
              <strong>Usuario:</strong> ${resident.username}
            </p>
          </div>
          <p class="text-xs text-gray-600 mt-3">
            💡 Podrá acceder directamente al sistema sin escribir contraseña. El enlace tiene vigencia de 24 horas.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3498db',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      width: '500px',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const response = await ResidentService.resendCredentials(residentialUnitId, resident.id);
          return response;
        } catch (error) {
          Swal.showValidationMessage(
            error.response?.data?.message || error.message || 'Error al enviar credenciales'
          );
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });

    if (result.isConfirmed && result.value?.success) {
      Swal.fire({
        icon: 'success',
        title: '¡Enlace Enviado!',
        html: `
          <div class="text-left">
            <p class="mb-2">El enlace de acceso ha sido enviado exitosamente a:</p>
            <div class="bg-green-50 p-3 rounded-lg">
              <p class="text-sm text-green-700">
                <strong>Email:</strong> ${resident.email}
              </p>
              <p class="text-sm text-green-700 mt-1">
                <strong>Usuario:</strong> ${resident.username}
              </p>
            </div>
            <p class="text-xs text-gray-600 mt-3">
              💡 Recibirá un enlace para acceder directamente al sistema sin contraseña. Vigencia de 24 horas.
            </p>
          </div>
        `,
        confirmButtonColor: '#27ae60',
        width: '500px',
      });
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
    }
  };

  // Función para eliminar residente con confirmación
  const handleDeleteResident = async (residentId, residentName) => {
    const result = await Swal.fire({
      title: 'Eliminar Copropietario',
      text: `¿Estás seguro de eliminar a ${residentName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      deleteResidentMutation.mutate({ userId: residentId, unitId: residentialUnitId });
    }
  };

  // Función para toggle access individual
  const handleToggleAccess = async (resident) => {
    const newStatus = !resident.bln_allow_entry;
    const action = newStatus ? 'habilitar' : 'deshabilitar';

    const result = await Swal.fire({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} acceso?`,
      html: `<p>${resident.firstname} ${resident.lastname} ${newStatus ? 'PODRÁ' : 'NO PODRÁ'} acceder al sistema.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#27ae60' : '#e74c3c',
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      toggleAccessMutation.mutate({ userId: resident.id, enabled: newStatus });
    }
  };

  // Función para toggle access masivo
  const handleBulkToggleAccess = async (selectedResidents, enabled) => {
    if (selectedResidents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin selección',
        text: 'Debes seleccionar al menos un usuario',
        confirmButtonColor: '#3498db',
      });
      return;
    }

    await showBulkToggleAccessWithLoading({
      count: selectedResidents.length,
      enabled,
      togglePromise: () => CoownerService.toggleCoownersAccessBulk(selectedResidents, enabled),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      },
    });
  };

  // Mostrar error
  if (isError) {
    return (
      <section>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Error al cargar usuarios
          </h3>
          <p className="text-red-600 mb-4">
            {error?.message || 'No se pudieron cargar los usuarios de la unidad residencial'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Intentar nuevamente
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header con botones de acción */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Copropietarios</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total de copropietarios: <span className="font-semibold">{residents.length}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onUploadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Upload size={18} />
            <span>Cargar Excel</span>
          </button>
          <button
            onClick={onCreateUser}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            <span>Agregar Copropietario</span>
          </button>
          <button
            onClick={onCreateGuest}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <UserPlus size={18} />
            <span>Agregar Invitado</span>
          </button>

          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"
            title="Configurar contacto de soporte técnico"
          >
            <Headphones size={18} />
            <span>Soporte Técnico</span>
          </button>

          <button
            onClick={() => setIsHelpModalAdminOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Grid con dos columnas: Residentes y Reuniones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Lista de residentes */}
        <div className="lg:col-span-1">
          <ResidentsList
            residents={residents}
            isLoading={isLoading}
            onResendCredentials={handleResendCredentials}
            onEditResident={onEditUser}
            onDeleteResident={handleDeleteResident}
            onToggleAccess={handleToggleAccess}
            onBulkToggleAccess={handleBulkToggleAccess}
            onBulkDelete={handleBulkDelete}
            isBulkDeleting={deleteCoownersBulkMutation.isPending}
            showSearch={true}
            title="Copropietarios"
            isSuperAdmin={false}
            residentialUnitName={unitName}
            onSendBulkCredentials={(selectedResidents) => {
              if (selectedResidents.length === 0) {
                Swal.fire({
                  icon: 'warning',
                  title: 'Sin selección',
                  text: 'Debes seleccionar al menos un copropietario',
                  confirmButtonColor: '#3498db',
                });
                return;
              }

              Swal.fire({
                title: '¿Reenviar Credenciales?',
                html: `
                  <div class="text-left">
                    <p class="mb-3">Se enviarán credenciales por correo electrónico a:</p>
                    <div class="bg-blue-50 p-3 rounded-lg">
                      <p class="text-lg font-bold text-blue-800">
                        ${selectedResidents.length} copropietario(s) seleccionado(s)
                      </p>
                    </div>
                    <p class="text-xs text-gray-600 mt-3">
                      💡 Cada copropietario recibirá un enlace para acceder directamente al sistema sin escribir contraseña. El enlace tiene vigencia de 24 horas.
                    </p>
                  </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3498db',
                cancelButtonColor: '#95a5a6',
                confirmButtonText: 'Sí, enviar',
                cancelButtonText: 'Cancelar',
                width: '500px',
              }).then((result) => {
                if (result.isConfirmed) {
                  sendBulkCredentialsMutation.mutate(selectedResidents);
                }
              });
            }}
            isSendingBulk={sendBulkCredentialsMutation.isPending}
            showInviteButton={true}
            residentialUnitId={residentialUnitId}
            onInviteToMeeting={() => {
              queryClient.invalidateQueries({ queryKey: ['meeting-invitations'] });
              queryClient.invalidateQueries({ queryKey: ['meetings', residentialUnitId] });
              queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
              queryClient.refetchQueries({
                queryKey: ['residential-unit-residents', residentialUnitId],
                type: 'active',
                throwOnError: false
              });
            }}
          />
        </div>

        {/* Columna derecha: Reuniones */}
        <div className="lg:col-span-1">
          <MeetingsList
            meetings={meetings}
            isLoading={isLoadingMeetings}
            onCreateMeeting={onCreateMeeting}
            onJoinMeeting={onJoinMeeting}
            onStartMeeting={handleStartMeeting}
            onEndMeeting={handleEndMeeting}
            onEditMeeting={onEditMeeting}
            onDeleteMeeting={handleDeleteMeeting}
            variant="admin"
          />
        </div>
      </div>
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        unitId={residentialUnitId}
      />
        <HelpModalAdmin
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalAdminOpen(false)}
        />
    </section>
  );
}