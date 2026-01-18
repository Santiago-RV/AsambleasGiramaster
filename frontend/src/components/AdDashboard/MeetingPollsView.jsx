import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle, Clock, Users, TrendingUp, Play, Square } from 'lucide-react';
import { PollService } from '../../services/api/PollService';
import CreatePollView from './CreatePollView';
import Swal from 'sweetalert2';

export default function MeetingPollsView({ meeting, onBack }) {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const queryClient = useQueryClient();

  // Obtener encuestas de la reunión
  const { data: pollsData, isLoading: isLoadingPolls } = useQuery({
    queryKey: ['meeting-polls', meeting.id],
    queryFn: async () => await PollService.getPollsByMeeting(meeting.id),
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  // Obtener estadísticas de una encuesta
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['poll-statistics', selectedPoll?.id],
    queryFn: async () => await PollService.getStatistics(selectedPoll.id),
    enabled: !!selectedPoll,
    refetchInterval: 3000, // Refrescar cada 3 segundos
  });

  // Mutación para iniciar encuesta
  const startPollMutation = useMutation({
    mutationFn: async ({ pollId, durationMinutes }) => {
      console.log('🚀 [MeetingPollsView] Iniciando encuesta:', { pollId, durationMinutes });
      return await PollService.startPoll(pollId, durationMinutes);
    },
    onSuccess: (response) => {
      console.log('✅ [MeetingPollsView] Encuesta iniciada exitosamente:', response);
      // Invalidar TODAS las queries de encuestas para actualizar en todos lados
      queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });

      Swal.fire({
        icon: 'success',
        title: 'Encuesta Iniciada',
        text: 'La encuesta está activa y disponible en la reunión',
        showConfirmButton: false,
        timer: 3000,
        toast: true,
        position: 'top-end',
      });
    },
    onError: (error) => {
      console.error('❌ [MeetingPollsView] Error al iniciar encuesta:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al iniciar la encuesta',
      });
    },
  });

  // Mutación para finalizar encuesta
  const endPollMutation = useMutation({
    mutationFn: async (pollId) => {
      console.log('🛑 [MeetingPollsView] Finalizando encuesta:', { pollId });
      return await PollService.endPoll(pollId);
    },
    onSuccess: (response) => {
      console.log('✅ [MeetingPollsView] Encuesta finalizada exitosamente:', response);
      // Invalidar TODAS las queries de encuestas
      queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });

      Swal.fire({
        icon: 'success',
        title: 'Encuesta Finalizada',
        text: 'La encuesta ha sido cerrada',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });
    },
    onError: (error) => {
      console.error('❌ [MeetingPollsView] Error al finalizar encuesta:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al finalizar la encuesta',
      });
    },
  });

  // Mutación para crear encuesta
  const createPollMutation = useMutation({
    mutationFn: async (pollData) => {
      console.log('📝 [MeetingPollsView] Creando encuesta:', pollData);
      return await PollService.createPoll(pollData);
    },
    onSuccess: (response) => {
      console.log('✅ [MeetingPollsView] Encuesta creada exitosamente:', response);
      // Invalidar TODAS las queries de encuestas
      queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
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
      setShowCreatePoll(false);
    },
    onError: (error) => {
      console.error('❌ [MeetingPollsView] Error al crear encuesta:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al crear la encuesta',
      });
    },
  });

  const handleStartPoll = async (poll) => {
    const result = await Swal.fire({
      title: '¿Iniciar encuesta?',
      text: 'La encuesta estará disponible para votación',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, iniciar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      startPollMutation.mutate({
        pollId: poll.id,
        durationMinutes: poll.int_duration_minutes,
      });
    }
  };

  const handleEndPoll = async (poll) => {
    const result = await Swal.fire({
      title: '¿Finalizar encuesta?',
      text: 'No se podrán registrar más votos después de finalizar',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      endPollMutation.mutate(poll.id);
    }
  };

  const handlePollCreated = async (pollData, startImmediately) => {
    console.log('🎯 [MeetingPollsView] handlePollCreated llamado:', {
      pollData,
      startImmediately,
      pollTitle: pollData.str_title
    });

    try {
      console.log('📝 [MeetingPollsView] Creando encuesta...');
      const response = await createPollMutation.mutateAsync(pollData);
      console.log('✅ [MeetingPollsView] Encuesta creada, respuesta:', response);

      if (startImmediately) {
        console.log('🚀 [MeetingPollsView] startImmediately es TRUE, verificando datos...');
        console.log('🔍 [MeetingPollsView] Datos de respuesta:', {
          success: response?.success,
          hasData: !!response?.data,
          pollId: response?.data?.id,
          durationMinutes: pollData.int_duration_minutes
        });

        if (response?.success && response?.data?.id) {
          console.log('✅ [MeetingPollsView] Iniciando encuesta automáticamente...');
          await startPollMutation.mutateAsync({
            pollId: response.data.id,
            durationMinutes: pollData.int_duration_minutes,
          });
          console.log('✅ [MeetingPollsView] Encuesta iniciada exitosamente');
        } else {
          console.warn('⚠️ [MeetingPollsView] No se puede iniciar automáticamente:', {
            reason: !response?.success ? 'response.success is falsy' :
                    !response?.data ? 'response.data is falsy' :
                    !response?.data?.id ? 'response.data.id is falsy' : 'unknown'
          });
        }
      } else {
        console.log('ℹ️ [MeetingPollsView] startImmediately es FALSE, guardando como borrador');
      }
    } catch (error) {
      console.error('❌ [MeetingPollsView] Error en handlePollCreated:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Activa':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Activa
          </span>
        );
      case 'Borrador':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            <Clock size={14} className="mr-1" />
            Borrador
          </span>
        );
      case 'Finalizada':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <CheckCircle size={14} className="mr-1" />
            Finalizada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  // Vista para crear encuesta
  if (showCreatePoll) {
    return (
      <CreatePollView
        meeting={meeting}
        onBack={() => setShowCreatePoll(false)}
        onPollCreated={handlePollCreated}
      />
    );
  }

  // Vista de estadísticas de encuesta seleccionada
  if (selectedPoll) {
    const stats = statsData?.data;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <button
            onClick={() => setSelectedPoll(null)}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Volver a encuestas
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {selectedPoll.str_title}
              </h2>
              {selectedPoll.str_description && (
                <p className="text-gray-600 mb-4">{selectedPoll.str_description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(selectedPoll.str_status)}
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {selectedPoll.str_poll_type === 'single' ? 'Opción única' :
                   selectedPoll.str_poll_type === 'multiple' ? 'Múltiple opción' :
                   selectedPoll.str_poll_type === 'text' ? 'Texto libre' : 'Numérica'}
                </span>
                {selectedPoll.bln_is_anonymous && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Anónima
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              {selectedPoll.str_status === 'Borrador' && (
                <button
                  onClick={() => handleStartPoll(selectedPoll)}
                  disabled={startPollMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
                >
                  <Play size={18} />
                  Iniciar
                </button>
              )}
              {selectedPoll.str_status === 'Activa' && (
                <button
                  onClick={() => handleEndPoll(selectedPoll)}
                  disabled={endPollMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
                >
                  <Square size={18} />
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {isLoadingStats ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando estadísticas...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Resumen de participación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-blue-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Total Votos</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">{stats.total_votes || 0}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-green-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Participación</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {stats.participation_percentage ? `${stats.participation_percentage.toFixed(1)}%` : '0%'}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="text-green-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Quórum</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {stats.has_quorum ? 'Alcanzado' : 'No alcanzado'}
                </p>
              </div>
            </div>

            {/* Resultados por opción */}
            {stats.options_stats && stats.options_stats.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Resultados</h3>
                <div className="space-y-4">
                  {stats.options_stats.map((option, index) => (
                    <div key={option.option_id || index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">{option.option_text}</span>
                        <span className="text-sm text-gray-600">
                          {option.votes_count} votos ({option.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${option.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respuestas de texto (si aplica) */}
            {stats.text_responses && stats.text_responses.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Respuestas de Texto</h3>
                <div className="space-y-3">
                  {stats.text_responses.map((response, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700">{response.str_response_text}</p>
                      {!selectedPoll.bln_is_anonymous && response.user_name && (
                        <p className="text-sm text-gray-500 mt-2">- {response.user_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay estadísticas disponibles</p>
          </div>
        )}
      </div>
    );
  }

  // Vista principal: lista de encuestas
  const polls = pollsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-4"
        >
          <ArrowLeft size={20} />
          Volver a reuniones
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Encuestas: {meeting.str_title}
            </h2>
            <p className="text-gray-600">
              {polls.length} encuesta{polls.length !== 1 ? 's' : ''} creada{polls.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreatePoll(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
          >
            <Plus size={20} />
            Nueva Encuesta
          </button>
        </div>
      </div>

      {/* Lista de encuestas */}
      {isLoadingPolls ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando encuestas...</p>
        </div>
      ) : polls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <div
              key={poll.id}
              onClick={() => setSelectedPoll(poll)}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-green-400 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-green-600 transition-colors flex-1">
                    {poll.str_title}
                  </h3>
                  {getStatusBadge(poll.str_status)}
                </div>

                {poll.str_description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {poll.str_description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {poll.str_poll_type === 'single' ? 'Opción única' :
                     poll.str_poll_type === 'multiple' ? 'Múltiple' :
                     poll.str_poll_type === 'text' ? 'Texto' : 'Numérica'}
                  </span>
                  {poll.bln_is_anonymous && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      Anónima
                    </span>
                  )}
                  {poll.options && poll.options.length > 0 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                      {poll.options.length} opciones
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Haz clic para ver detalles</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No hay encuestas creadas
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu primera encuesta para esta reunión
          </p>
          <button
            onClick={() => setShowCreatePoll(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
          >
            <Plus size={20} />
            Crear Primera Encuesta
          </button>
        </div>
      )}
    </div>
  );
}
