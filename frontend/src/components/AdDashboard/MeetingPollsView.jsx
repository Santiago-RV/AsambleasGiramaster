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
    refetchInterval: 5000,
  });

  // Obtener estadísticas de una encuesta
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['poll-statistics', selectedPoll?.id],
    queryFn: async () => await PollService.getStatistics(selectedPoll.id),
    enabled: !!selectedPoll,
    refetchInterval: 3000,
  });

  // Mutación para iniciar encuesta
  const startPollMutation = useMutation({
    mutationFn: async ({ pollId, durationMinutes }) => {
      console.log('🚀 [MeetingPollsView] Iniciando encuesta:', { pollId, durationMinutes });
      return await PollService.startPoll(pollId, durationMinutes);
    },
    onSuccess: (response) => {
      console.log('✅ [MeetingPollsView] Encuesta iniciada exitosamente:', response);

      if (selectedPoll) {
        setSelectedPoll({
          ...selectedPoll,
          str_status: 'active',
          dat_started_at: new Date().toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });

      Swal.fire({
        icon: 'success',
        title: 'Encuesta Iniciada',
        text: 'La encuesta está activa y disponible en la reunión',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
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

      if (selectedPoll) {
        setSelectedPoll({
          ...selectedPoll,
          str_status: 'closed',
          dat_ended_at: new Date().toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });

      Swal.fire({
        icon: 'success',
        title: 'Encuesta Finalizada',
        text: 'La encuesta ha sido cerrada',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
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
      queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
      queryClient.invalidateQueries({ queryKey: ['live-meetings'] });

      Swal.fire({
        icon: 'success',
        title: 'Encuesta Creada',
        text: response.message || 'La encuesta ha sido creada exitosamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
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
    const normalizedStatus = status?.toLowerCase();

    switch (normalizedStatus) {
      case 'active':
      case 'activa':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Activa
          </span>
        );
      case 'draft':
      case 'borrador':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            <Clock size={14} className="mr-1" />
            Borrador
          </span>
        );
      case 'closed':
      case 'finalizada':
      case 'cerrada':
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

  if (showCreatePoll) {
    return (
      <CreatePollView
        meeting={meeting}
        onBack={() => setShowCreatePoll(false)}
        onPollCreated={handlePollCreated}
      />
    );
  }

  if (selectedPoll) {
    const stats = statsData?.data?.statistics;
    const statsOptions = statsData?.data?.options;
    const textResponses = statsData?.data?.text_responses || [];

    return (
      <div className="space-y-6">
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
                {selectedPoll.bln_requires_quorum && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    Quórum: {selectedPoll.dec_minimum_quorum_percentage}%
                  </span>
                )}
                {selectedPoll.int_duration_minutes && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    Límite: {selectedPoll.int_duration_minutes} min
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              {(selectedPoll.str_status?.toLowerCase() === 'draft' || selectedPoll.str_status === 'Borrador') && (
                <button
                  onClick={() => handleStartPoll(selectedPoll)}
                  disabled={startPollMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {startPollMutation.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Play size={18} />
                  )}
                  {startPollMutation.isPending ? 'Iniciando...' : 'Iniciar Encuesta'}
                </button>
              )}
              {(selectedPoll.str_status?.toLowerCase() === 'active' || selectedPoll.str_status === 'Activa') && (
                <button
                  onClick={() => handleEndPoll(selectedPoll)}
                  disabled={endPollMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {endPollMutation.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Square size={18} />
                  )}
                  {endPollMutation.isPending ? 'Finalizando...' : 'Finalizar Encuesta'}
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoadingStats ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando estadísticas...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
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
                  <CheckCircle className={stats.quorum_reached ? "text-green-600" : "text-red-500"} size={24} />
                  <h3 className="font-semibold text-gray-700">Quórum</h3>
                </div>
                <p className={`text-3xl font-bold ${stats.quorum_reached ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.quorum_reached ? 'Alcanzado' : 'No alcanzado'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Requiere: {stats.required_quorum || 0}%
                </p>
              </div>
            </div>

            {statsOptions && statsOptions.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Resultados</h3>
                <div className="space-y-4">
                  {statsOptions.map((option, index) => (
                    <div key={option.id || index}>
                      <div className="flex items-center justify-between mb-2">
                        <span>{option.str_option_text}</span>
                        <span>{option.int_votes_count} votos ({option.dec_percentage?.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${option.dec_percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {textResponses.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Respuestas de Texto</h3>
                <div className="space-y-3">
                  {textResponses.map((response, index) => (
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

  const polls = pollsData?.data || [];

  return (
    <div className="space-y-6">
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
            className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
          >
            <Plus size={20} />
            Nueva Encuesta
          </button>
        </div>
      </div>

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
            className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
          >
            <Plus size={20} />
            Crear Primera Encuesta
          </button>
        </div>
      )}
    </div>
  );
}
