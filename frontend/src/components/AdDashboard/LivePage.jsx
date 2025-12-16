import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import LiveMeetingCard from "./LiveMeetingCard";
import CreatePollView from "./CreatePollView";
import ZoomMeetingContainer from "./ZoomMeetingContainer";
import { PollService } from "../../services/api/PollService";
import { UserService } from "../../services/api/UserService";
import { MeetingService } from "../../services/api/MeetingService";

export default function LivePage() {
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showZoomMeeting, setShowZoomMeeting] = useState(null);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const queryClient = useQueryClient();

  // Obtener la unidad residencial del administrador
  const { data: residentialUnitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['admin-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
  });

  const residentialUnitId = residentialUnitData?.data?.residential_unit_id;

  console.log('🏠 [LivePage] Residential Unit ID:', residentialUnitId);
  console.log('🏠 [LivePage] Residential Unit Data:', residentialUnitData);

  // Obtener reuniones en vivo
  const {
    data: liveMeetingsData,
    isLoading: isLoadingMeetings,
    isError: isErrorMeetings,
  } = useQuery({
    queryKey: ['live-meetings', residentialUnitId],
    queryFn: async () => {
      console.log('🔄 [LivePage] Ejecutando query de reuniones...');
      if (!residentialUnitId) {
        console.warn('⚠️ [LivePage] No hay residentialUnitId, retornando array vacío');
        return { success: false, data: [] };
      }
      return await PollService.getLiveMeetings(residentialUnitId);
    },
    enabled: !!residentialUnitId,
    refetchInterval: 30000,
  });

  // Mutación para crear encuesta
  const createPollMutation = useMutation({
    mutationFn: async (pollData) => {
      return await PollService.createPoll(pollData);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });
      Swal.fire({
        icon: 'success',
        title: 'Encuesta Creada',
        text: response.message || 'La encuesta ha sido creada exitosamente',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });
      setSelectedMeeting(null);
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al crear la encuesta',
      });
    },
  });

  // Mutación para iniciar encuesta
  const startPollMutation = useMutation({
    mutationFn: async ({ pollId, durationMinutes }) => {
      return await PollService.startPoll(pollId, durationMinutes);
    },
    onSuccess: (response) => {
      Swal.fire({
        icon: 'success',
        title: 'Encuesta Iniciada',
        text: response.message || 'La encuesta está activa',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al iniciar la encuesta',
      });
    },
  });

  // Mutación para cerrar acceso a la reunión
  const endMeetingMutation = useMutation({
    mutationFn: async (meetingId) => {
      return await MeetingService.endMeeting(meetingId);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });
      Swal.fire({
        icon: 'success',
        title: 'Acceso Cerrado',
        text: 'El acceso a la reunión ha sido cerrado exitosamente',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al cerrar el acceso',
      });
    },
  });

  // Handler para crear encuesta
  const handlePollCreated = async (pollData, startImmediately) => {
    try {
      const response = await createPollMutation.mutateAsync(pollData);

      if (startImmediately && response?.success && response?.data?.id) {
        await startPollMutation.mutateAsync({
          pollId: response.data.id,
          durationMinutes: pollData.int_duration_minutes,
        });
      }
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };

  // Handler para cerrar acceso a la reunión
  const handleCloseAccess = async (meeting) => {
    const result = await Swal.fire({
      title: '¿Cerrar acceso a la reunión?',
      html: `
        <p>Al cerrar el acceso:</p>
        <ul style="text-align: left; margin-top: 10px;">
          <li>La reunión ya no aparecerá en la lista de reuniones en vivo</li>
          <li>No se podrán crear más encuestas</li>
          <li>Se marcará como finalizada</li>
        </ul>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cerrar acceso',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      endMeetingMutation.mutate(meeting.id);
    }
  };

  // Handler para unirse a la reunión
  const handleJoinMeeting = async (meeting) => {
    // Validar que la reunión tenga datos de Zoom
    if (!meeting.int_zoom_meeting_id && !meeting.str_zoom_join_url) {
      Swal.fire({
        icon: 'error',
        title: 'URL no disponible',
        text: 'La URL de la reunión no está disponible aún. Por favor, verifica que la reunión haya sido creada correctamente en Zoom.',
        confirmButtonColor: '#3498db',
      });
      return;
    }

    try {
      setIsJoiningMeeting(true);

      // Registrar la hora de inicio en la base de datos
      await MeetingService.startMeeting(meeting.id);

      // Mostrar el contenedor de Zoom
      setShowZoomMeeting(meeting);
    } catch (error) {

      // Verificar si el error es por falta de datos de Zoom
      if (!meeting.int_zoom_meeting_id && !meeting.str_zoom_join_url) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se puede acceder a la reunión porque no tiene datos de Zoom válidos.',
          confirmButtonColor: '#3498db',
        });
      } else {
        // Si hay datos de Zoom pero falló el registro, mostrar Zoom de todas formas
        setShowZoomMeeting(meeting);
      }
    } finally {
      setIsJoiningMeeting(false);
    }
  };

  // Handler para cerrar el Zoom
  const handleCloseZoom = () => {
    setShowZoomMeeting(null);
  };

  // Vista de Zoom
  if (showZoomMeeting) {
    return (
      <div className="space-y-4">
        {/* Card colapsado con info básica */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {showZoomMeeting.str_title}
              </h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                🔴 En vivo
              </span>
            </div>
            <button
              onClick={handleCloseZoom}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Minimizar
            </button>
          </div>
        </div>

        {/* Zoom embebido usando SDK Embedded */}
        <ZoomMeetingContainer
          meetingData={showZoomMeeting}
          onClose={handleCloseZoom}
          startFullscreen={false}
        />
      </div>
    );
  }

  // Vista de creación de encuesta
  if (selectedMeeting) {
    return (
      <CreatePollView
        meeting={selectedMeeting}
        onBack={() => setSelectedMeeting(null)}
        onPollCreated={handlePollCreated}
      />
    );
  }

  const liveMeetings = liveMeetingsData?.data || [];

  return (
    <section className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Gestión de Encuestas</h2>
        <p className="text-purple-100">
          Selecciona una reunión en vivo para crear encuestas y votaciones
        </p>
      </div>

      {(isLoadingMeetings || isLoadingUnit) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-purple-600" size={48} />
        </div>
      )}

      {isErrorMeetings && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Error al cargar reuniones</h3>
            <p className="text-red-600 text-sm">
              No se pudieron cargar las reuniones en vivo. Por favor, intenta nuevamente.
            </p>
          </div>
        </div>
      )}

      {!isLoadingMeetings && !isLoadingUnit && !isErrorMeetings && (
        <>
          {liveMeetings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="mb-4 text-gray-400">
                <svg
                  className="mx-auto h-24 w-24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No hay reuniones en vivo
              </h3>
              <p className="text-gray-600">
                No hay reuniones activas en este momento. Las reuniones aparecerán aquí cuando
                estén en curso o programadas para la hora actual.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  Reuniones en Vivo ({liveMeetings.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveMeetings.map((meeting) => (
                  <LiveMeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => setSelectedMeeting(meeting)}
                    onJoinMeeting={handleJoinMeeting}
                    onCloseAccess={handleCloseAccess}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
