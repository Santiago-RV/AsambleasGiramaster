import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Plus, UserPlus } from 'lucide-react';
import Swal from 'sweetalert2';
import ResidentsList from "../common/ResidentsList";
import MeetingsList from "../common/MeetingsList";
import { ResidentialUnitService } from "../../services/api/ResidentialUnitService";
import { ResidentService } from "../../services/api/ResidentService";
import { MeetingService } from "../../services/api/MeetingService";
import CoownerService from "../../services/api/coownerService";

export default function UsersPage({ residentialUnitId, onCreateUser, onEditUser, onUploadExcel, onCreateMeeting, onJoinMeeting, onCreateGuest }) {
  const queryClient = useQueryClient();

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

  // Extraer los residentes del response
  const residents = residentsData?.success && residentsData?.data ? residentsData.data : [];

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
        ? new Date(meeting.dat_schedule_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : 'No definida',
      asistentes: meeting.int_total_invitated || 0,
      fechaCompleta: new Date(meeting.dat_schedule_date),
      // Usar los campos correctos de Zoom
      meeting_url: meeting.str_zoom_join_url,  // Corregido: era str_meeting_url (no existe)
      zoom_meeting_id: meeting.int_zoom_meeting_id,  // Corregido: era str_zoom_meeting_id (tipo incorrecto)
      zoom_password: meeting.str_zoom_password,  // Contraseña de la reunión
      str_modality: meeting.str_modality || 'virtual',
      int_zoom_account_id: meeting.int_zoom_account_id,
    }))
    : [];

  // Mutación para eliminar residente
  const deleteResidentMutation = useMutation({
    mutationFn: ({ userId, unitId }) => CoownerService.deleteResident(unitId, userId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      Swal.fire({
        icon: 'success',
        title: '¡Eliminado!',
        text: response.message || 'El usuario ha sido eliminado exitosamente',
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
        title: 'Error al Eliminar',
        text: error.response?.data?.message || error.message || 'No se pudo eliminar el usuario',
        confirmButtonColor: '#ef4444',
      });
    },
  });

  // Mutación para el envío masivo de credenciales
  const sendBulkCredentialsMutation = useMutation({
    mutationFn: async (residentIds) => {
      return await CoownerService.sendBulkCredentials(residentIds);
    },
    onSuccess: (response) => {
      const { successful, failed, total_processed } = response.data;

      Swal.fire({
        icon: successful === total_processed ? 'success' : 'warning',
        title: successful === total_processed ? '¡Credenciales Enviadas!' : 'Envío Parcial',
        html: `
          <div class="text-left">
            <div class="bg-blue-50 p-3 rounded-lg mb-3">
              <p class="text-sm text-blue-700">
                <strong>Total procesados:</strong> ${total_processed}
              </p>
              <p class="text-sm text-green-700">
                <strong>Exitosos:</strong> ${successful}
              </p>
              ${failed > 0 ? `<p class="text-sm text-red-700"><strong>Fallidos:</strong> ${failed}</p>` : ''}
            </div>
            ${response.data.errors && response.data.errors.length > 0
            ? `
                <div class="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                  <p class="font-semibold text-red-800 mb-2">Errores:</p>
                  <ul class="text-sm text-red-700 space-y-1">
                    ${response.data.errors.map((err) => `<li>ID ${err.resident_id}: ${err.error}</li>`).join('')}
                  </ul>
                </div>
              `
            : ''
          }
          </div>
        `,
        confirmButtonColor: '#27ae60',
        width: '500px',
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error al Enviar Credenciales',
        text: error.response?.data?.message || error.message || 'Error al enviar credenciales masivamente',
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
              <strong>Fecha:</strong> ${new Date(meeting.fecha).toLocaleDateString('es-ES')}
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
            <strong>Fecha:</strong> ${new Date(meeting.fecha).toLocaleDateString('es-ES')}
          </p>
        </div>
        <p class="text-xs text-gray-600 mt-3">
          ⚠️ Esta acción marcará la reunión como finalizada.
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

  // Mutación para toggle access masivo
  const toggleAccessBulkMutation = useMutation({
    mutationFn: async ({ userIds, enabled }) => {
      return await CoownerService.toggleCoownersAccessBulk(userIds, enabled);
    },
    onSuccess: (response) => {
      const { successful, failed, already_in_state, total_processed } = response.data;
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });

      Swal.fire({
        icon: successful === total_processed ? 'success' : 'warning',
        title: 'Acceso Modificado',
        html: `
        <div class="text-left">
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-700"><strong>Exitosos:</strong> ${successful}</p>
            ${already_in_state > 0 ? `<p class="text-sm text-gray-700"><strong>Sin cambios:</strong> ${already_in_state}</p>` : ''}
            ${failed > 0 ? `<p class="text-sm text-red-700"><strong>Fallidos:</strong> ${failed}</p>` : ''}
          </div>
        </div>
      `,
        confirmButtonColor: '#27ae60',
        width: '500px',
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al modificar acceso',
        confirmButtonColor: '#e74c3c',
      });
    },
  });

  // Función para reenviar credenciales individuales
  const handleResendCredentials = async (resident) => {
    const result = await Swal.fire({
      title: '¿Enviar credenciales?',
      html: `
        <div class="text-left">
          <p class="mb-3">Se generará una nueva contraseña temporal y se enviará por correo a:</p>
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="font-semibold text-blue-800">${resident.firstname} ${resident.lastname}</p>
            <p class="text-sm text-blue-700 mt-1">
              <strong>Email:</strong> ${resident.email}
            </p>
            <p class="text-sm text-blue-700">
              <strong>Usuario:</strong> ${resident.username}
            </p>
          </div>
          <p class="text-xs text-gray-600 mt-3">
            💡 La contraseña actual será reemplazada por una nueva contraseña temporal.
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
        title: '¡Credenciales Enviadas!',
        html: `
          <div class="text-left">
            <p class="mb-2">Las credenciales han sido enviadas exitosamente a:</p>
            <div class="bg-green-50 p-3 rounded-lg">
              <p class="text-sm text-green-700">
                <strong>Email:</strong> ${resident.email}
              </p>
              <p class="text-sm text-green-700 mt-1">
                <strong>Usuario:</strong> ${resident.username}
              </p>
            </div>
            <p class="text-xs text-gray-600 mt-3">
              📧 El copropietario recibirá un correo con su nueva contraseña temporal.
            </p>
          </div>
        `,
        confirmButtonColor: '#27ae60',
        width: '500px',
      });
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

    const action = enabled ? 'habilitar' : 'deshabilitar';
    const result = await Swal.fire({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} acceso?`,
      text: `Se ${action}á el acceso de ${selectedResidents.length} usuario(s)`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: enabled ? '#27ae60' : '#e74c3c',
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      toggleAccessBulkMutation.mutate({ userIds: selectedResidents, enabled });
    }
  };

  // Mostrar error
  if (isError) {
    return (
      <section>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Upload size={18} />
            <span>Cargar Excel</span>
          </button>
          <button
            onClick={onCreateUser}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            <span>Agregar Copropietario</span>
          </button>
          <button
            onClick={onCreateGuest}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <UserPlus size={18} />
            <span>Agregar Invitado</span>
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
            showSearch={true}
            title="Copropietarios"
            isSuperAdmin={false}
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
                title: '¿Enviar Credenciales?',
                html: `
                  <div class="text-left">
                    <p class="mb-3">Se enviarán credenciales por correo electrónico a:</p>
                    <div class="bg-blue-50 p-3 rounded-lg">
                      <p class="text-lg font-bold text-blue-800">
                        ${selectedResidents.length} copropietario(s) seleccionado(s)
                      </p>
                    </div>
                    <p class="text-xs text-gray-600 mt-3">
                      💡 Cada copropietario recibirá un correo con su contraseña temporal.
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
            variant="admin"
          />
        </div>
      </div>
    </section>
  );
}