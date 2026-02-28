import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Info, Loader2, CheckCircle, Clock, AlertCircle, Calendar, Users, History, Award, Timer } from "lucide-react";
import Swal from 'sweetalert2';
import { PollService } from '../../services/api/PollService';
import { UserService } from '../../services/api/UserService';
import { MeetingService } from '../../services/api/MeetingService';

export default function VotingPage() {
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState({});
  const [textResponses, setTextResponses] = useState({});
  const [numericResponses, setNumericResponses] = useState({});
  const [votedPolls, setVotedPolls] = useState(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeRemaining = (endDateStr) => {
    if (!endDateStr) return null;
    const endDate = new Date(endDateStr);
    const diff = endDate - currentTime;
    if (diff <= 0) return { expired: true, minutes: 0, seconds: 0 };
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { expired: false, minutes, seconds };
  };

  const formatTimeRemaining = (endDateStr) => {
    const time = getTimeRemaining(endDateStr);
    if (!time) return null;
    if (time.expired) return null;
    return `${time.minutes}:${time.seconds.toString().padStart(2, '0')}`;
  };

  // Obtener datos del usuario y su unidad residencial
  const { data: userData } = useQuery({
    queryKey: ['copropietario-data'],
    queryFn: async () => {
      const response = await UserService.getCurrentUserData();
      return response.data;
    },
    retry: 1,
  });

  const residentialUnitId = userData?.residential_unit?.id;

  // Obtener todas las reuniones de la unidad residencial
  const { data: meetingsData, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['residential-meetings', residentialUnitId],
    queryFn: async () => {
      if (!residentialUnitId) return { data: [] };
      const response = await MeetingService.getMeetingsByResidentialUnit(residentialUnitId);
      return response;
    },
    enabled: !!residentialUnitId,
  });

  // Obtener todas las encuestas de todas las reuniones
  const { data: allPollsData, isLoading: isLoadingPolls, refetch: refetchPolls } = useQuery({
    queryKey: ['all-polls', residentialUnitId],
    queryFn: async () => {
      if (!meetingsData?.data || meetingsData.data.length === 0) {
        return { polls: [] };
      }

      // Obtener encuestas de cada reunión
      const pollsPromises = meetingsData.data.map(async (meeting) => {
        try {
          const result = await PollService.getPollsByMeeting(meeting.id);
          return result.data || [];
        } catch (error) {
          console.error(`Error obteniendo encuestas de reunión ${meeting.id}:`, error);
          return [];
        }
      });

      const pollsArrays = await Promise.all(pollsPromises);
      const allPolls = pollsArrays.flat();

      return { polls: allPolls };
    },
    enabled: !!meetingsData?.data && meetingsData.data.length > 0,
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  console.log('🔍 [VotingPage] Reuniones obtenidas:', meetingsData?.data);

  // DEBUG: Log de todas las encuestas recibidas
  console.log('🔍 [VotingPage] Todas las encuestas recibidas:', allPollsData?.polls);
  console.log('🔍 [VotingPage] currentTime:', currentTime);

  // Filtrar encuestas activas (sin fecha límite, solo estado y expiración)
  const activePolls = allPollsData?.polls?.filter((poll) => {
    const isActive = poll.str_status === 'active' || poll.str_status === 'Activa';
    const hasNotVoted = !poll.has_voted;
    
    if (!isActive || hasNotVoted) return false;
    
    // Verificar si la encuesta ha expirado por tiempo límite
    if (poll.dat_ended_at) {
      const endDate = new Date(poll.dat_ended_at);
      if (currentTime > endDate) return false;
    }
    
    return true;
  }) || [];

  console.log('🔍 [VotingPage] Encuestas activas después del filtro:', activePolls);

  // Mostrar encuestas cerradas que el usuario no ha visto (todas, no solo de hoy)
  const closedPolls = allPollsData?.polls?.filter(poll => {
    const isClosed = poll.str_status === 'closed' || poll.str_status === 'Cerrada';
    return isClosed;
  }) || [];

  // ✅ NUEVO: Filtrar encuestas votadas (historial completo, no solo de hoy)
  const votedPollsHistory = allPollsData?.polls?.filter(poll => {
    return poll.has_voted === true;
  }) || [];

  // Mutación para votar
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, voteData }) => {
      return await PollService.vote(pollId, voteData);
    },
    onSuccess: async (data, variables) => {
      // Agregar al set de encuestas votadas
      setVotedPolls(prev => new Set([...prev, variables.pollId]));

      // Limpiar selecciones
      setSelectedOptions(prev => {
        const newSelections = { ...prev };
        delete newSelections[variables.pollId];
        return newSelections;
      });

      // Limpiar respuestas de texto y número
      setTextResponses(prev => {
        const newResponses = { ...prev };
        delete newResponses[variables.pollId];
        return newResponses;
      });
      setNumericResponses(prev => {
        const newResponses = { ...prev };
        delete newResponses[variables.pollId];
        return newResponses;
      });

      // ✅ Invalidar TODAS las queries relacionadas con polls
      await Promise.all([
        refetchPolls(),
        queryClient.invalidateQueries({ queryKey: ['all-polls'] }),
        queryClient.invalidateQueries({ queryKey: ['meeting-polls'] })
      ]);

      Swal.fire({
        icon: 'success',
        title: '¡Voto Registrado!',
        text: 'Tu voto ha sido registrado exitosamente',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Error al votar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al votar',
        text: error.response?.data?.message || 'Hubo un error al registrar tu voto. Intenta nuevamente.',
        confirmButtonColor: '#ef4444',
      });
    },
  });

  const handleOptionToggle = (pollId, optionId, pollType, maxSelections) => {
    setSelectedOptions(prev => {
      const currentSelections = prev[pollId] || [];

      if (pollType === 'single') {
        // Para single choice, solo una opción
        return { ...prev, [pollId]: [optionId] };
      } else if (pollType === 'multiple') {
        // Para multiple choice
        if (currentSelections.includes(optionId)) {
          // Quitar opción
          return {
            ...prev,
            [pollId]: currentSelections.filter(id => id !== optionId)
          };
        } else {
          // Agregar opción (verificar límite)
          if (currentSelections.length < (maxSelections || 999)) {
            return {
              ...prev,
              [pollId]: [...currentSelections, optionId]
            };
          }
          return prev;
        }
      }
      return prev;
    });
  };

  const handleVote = async (poll) => {
    const selections = selectedOptions[poll.id] || [];
    const textResponse = textResponses[poll.id] || '';
    const numericResponse = numericResponses[poll.id];

    if (poll.str_poll_type === 'text') {
      if (!textResponse.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Respuesta requerida',
          text: 'Debes ingresar una respuesta de texto',
          confirmButtonColor: '#3b82f6',
        });
        return;
      }
      try {
        await voteMutation.mutateAsync({
          pollId: poll.id,
          voteData: {
            str_response_text: textResponse.trim(),
            bln_is_abstention: false,
          }
        });
      } catch (error) {
        // Error manejado en onError
      }
      return;
    }

    if (poll.str_poll_type === 'numeric') {
      if (numericResponse === undefined || numericResponse === null || isNaN(numericResponse)) {
        Swal.fire({
          icon: 'warning',
          title: 'Respuesta requerida',
          text: 'Debes ingresar un valor numérico',
          confirmButtonColor: '#3b82f6',
        });
        return;
      }
      try {
        await voteMutation.mutateAsync({
          pollId: poll.id,
          voteData: {
            dec_response_number: parseFloat(numericResponse),
            bln_is_abstention: false,
          }
        });
      } catch (error) {
        // Error manejado en onError
      }
      return;
    }

    // Para single y multiple
    if (selections.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona una opción',
        text: 'Debes seleccionar al menos una opción para votar',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    try {
      if (poll.str_poll_type === 'single') {
        await voteMutation.mutateAsync({
          pollId: poll.id,
          voteData: {
            int_option_id: selections[0],
            bln_is_abstention: false,
          }
        });
      } else if (poll.str_poll_type === 'multiple') {
        for (const optionId of selections) {
          await voteMutation.mutateAsync({
            pollId: poll.id,
            voteData: {
              int_option_id: optionId,
              bln_is_abstention: false,
            }
          });
        }
      }
    } catch (error) {
      // Error manejado en onError de la mutación
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingMeetings || isLoadingPolls) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="ml-4 text-gray-600">Cargando encuestas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">
            Sistema de Votaciones - Encuestas de Hoy
          </h3>
          <p className="text-sm text-blue-700">
            Aquí aparecerán las encuestas activas disponibles.
            Tu voto se registrará de forma segura y ponderada según tu coeficiente de propiedad.
          </p>
        </div>
        
        {/* ✅ NUEVO: Botón para ver historial */}
        {votedPollsHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              showHistory
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50'
            }`}
          >
            <History size={20} />
            {showHistory ? 'Ocultar' : 'Ver'} Historial ({votedPollsHistory.length})
          </button>
        )}
      </div>

      {/* ✅ NUEVO: Sección de Historial de Votaciones */}
      {showHistory && votedPollsHistory.length > 0 && (
        <div className="space-y-4 bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-3">
            <Award className="text-purple-600" size={28} />
            Mis Votaciones ({votedPollsHistory.length})
          </h2>
          <p className="text-sm text-purple-700 mb-4">
            Historial completo de todas las encuestas en las que has participado
          </p>

          <div className="space-y-3">
            {votedPollsHistory.map((poll) => {
              const isPollClosed = poll.str_status === 'closed' || poll.str_status === 'Cerrada';
              const isPollActive = poll.str_status === 'active' || poll.str_status === 'Activa';
              const userVotes = poll.user_votes || []; // ✅ Opciones votadas

              return (
                <div
                  key={poll.id}
                  className="bg-white rounded-lg border-2 border-purple-200 p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                        <h4 className="font-bold text-gray-900 text-lg">
                          {poll.str_title}
                        </h4>
                      </div>
                      
                      {poll.str_description && (
                        <p className="text-gray-600 text-sm mb-3 ml-9">
                          {poll.str_description}
                        </p>
                      )}

                      {/* ✅ NUEVO: Mostrar opciones votadas */}
                      {userVotes.length > 0 && (
                        <div className="ml-9 mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-800 mb-2 uppercase">
                            {userVotes.length > 1 ? 'Tus votos:' : 'Tu voto:'}
                          </p>
                          <div className="space-y-2">
                            {userVotes.map((vote, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                <span className="text-sm font-medium text-gray-800">
                                  {vote.option_text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {poll.bln_is_anonymous && (
                        <div className="ml-9 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-700 flex items-center gap-2">
                            <Info size={14} />
                            Encuesta anónima - No se puede mostrar tu voto específico
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 ml-9 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          poll.str_poll_type === 'single' ? 'bg-blue-100 text-blue-700' :
                          poll.str_poll_type === 'multiple' ? 'bg-indigo-100 text-indigo-700' :
                          poll.str_poll_type === 'text' ? 'bg-amber-100 text-amber-700' :
                          'bg-cyan-100 text-cyan-700'
                        }`}>
                          {poll.str_poll_type === 'single' ? 'Opción única' :
                           poll.str_poll_type === 'multiple' ? 'Múltiple opción' :
                           poll.str_poll_type === 'text' ? 'Texto libre' : 'Numérica'}
                        </span>
                        
                        {poll.bln_is_anonymous && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            Anónima
                          </span>
                        )}
                        
                        {poll.bln_requires_quorum && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Quórum: {poll.dec_minimum_quorum_percentage}%
                          </span>
                        )}
                        
                        {poll.int_duration_minutes && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Límite: {poll.int_duration_minutes} min
                          </span>
                        )}

                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isPollActive
                            ? 'bg-green-100 text-green-700'
                            : isPollClosed
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isPollActive ? '✓ Activa' : isPollClosed ? '■ Cerrada' : 'Borrador'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
                        <CheckCircle size={18} />
                        <span className="font-bold text-sm">VOTADO</span>
                      </div>
                      
                      {poll.options && (
                        <span className="text-xs text-gray-500">
                          {poll.options.length} opciones
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Encuestas Activas */}
      {activePolls.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-green-600" size={24} />
            Encuestas Activas ({activePolls.length})
          </h2>

          {activePolls.map((poll) => {
            const hasVoted = poll.has_voted || votedPolls.has(poll.id);
            const currentSelections = selectedOptions[poll.id] || [];
            const isVoting = voteMutation.isPending;

            return (
              <div
                key={poll.id}
                className={`bg-white rounded-xl shadow-md border-2 overflow-hidden transition-all ${
                  hasVoted
                    ? 'border-green-300 bg-green-50/30'
                    : 'border-blue-200 hover:shadow-lg'
                }`}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{poll.str_title}</h3>
                      {poll.str_description && (
                        <p className="text-blue-100 text-sm">{poll.str_description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-semibold">
                        ACTIVA
                      </span>
                      {hasVoted && (
                        <span className="px-3 py-1 bg-green-400 rounded-full text-xs font-semibold flex items-center gap-1">
                          <CheckCircle size={14} />
                          Votado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm text-blue-100">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      Iniciada: {formatDate(poll.dat_started_at)}
                    </div>
                    {poll.dat_ended_at && (
                      <div className="flex items-center gap-1">
                        {formatTimeRemaining(poll.dat_ended_at) ? (
                          <>
                            <Timer size={16} />
                            <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                              {formatTimeRemaining(poll.dat_ended_at)}
                            </span>
                          </>
                        ) : (
                          <span className="text-red-300 font-semibold">Expirada</span>
                        )}
                      </div>
                    )}
                    {poll.bln_requires_quorum && (
                      <div className="flex items-center gap-1 bg-purple-500/30 px-2 py-1 rounded">
                        <Users size={14} />
                        Requiere {poll.dec_minimum_quorum_percentage}% quórum
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  {hasVoted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-gray-800 mb-2">
                        ¡Voto Registrado!
                      </h4>
                      <p className="text-gray-600">
                        Tu voto ha sido registrado exitosamente para esta encuesta.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-2">
                          {poll.str_poll_type === 'single'
                            ? 'Selecciona una opción:'
                            : poll.str_poll_type === 'multiple'
                            ? `Selecciona hasta ${poll.int_max_selections || 'todas las'} opciones:`
                            : poll.str_poll_type === 'text'
                            ? 'Ingresa tu respuesta:'
                            : 'Ingresa tu valor numérico:'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {poll.str_poll_type === 'single' ? 'Opción única' : 
                             poll.str_poll_type === 'multiple' ? 'Múltiple opción' :
                             poll.str_poll_type === 'text' ? 'Texto libre' : 'Numérica'}
                          </span>
                          {poll.bln_is_anonymous && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              Anónima
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Encuesta de Texto Libre */}
                      {poll.str_poll_type === 'text' && (
                        <div className="mb-6">
                          <textarea
                            value={textResponses[poll.id] || ''}
                            onChange={(e) => setTextResponses(prev => ({ ...prev, [poll.id]: e.target.value }))}
                            placeholder="Escribe tu respuesta..."
                            disabled={isVoting}
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Encuesta Numérica */}
                      {poll.str_poll_type === 'numeric' && (
                        <div className="mb-6">
                          <input
                            type="number"
                            value={numericResponses[poll.id] || ''}
                            onChange={(e) => setNumericResponses(prev => ({ ...prev, [poll.id]: e.target.value }))}
                            placeholder="Ingresa un número"
                            disabled={isVoting}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Opciones para single/multiple */}
                      {(poll.str_poll_type === 'single' || poll.str_poll_type === 'multiple') && (
                        <>
                          <div className="space-y-3 mb-6">
                            {poll.options?.map((option) => {
                              const isSelected = currentSelections.includes(option.id);
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => handleOptionToggle(
                                    poll.id,
                                    option.id,
                                    poll.str_poll_type,
                                    poll.int_max_selections
                                  )}
                                  disabled={isVoting}
                                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-50'
                                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                  } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">
                                      {option.str_option_text}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle className="text-blue-600" size={20} />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Información de selecciones */}
                          {poll.str_poll_type === 'multiple' && currentSelections.length > 0 && (
                            <p className="text-sm text-gray-600 mb-4 text-center">
                              {currentSelections.length} de {poll.int_max_selections || poll.options?.length} seleccionada(s)
                            </p>
                          )}
                        </>
                      )}

                      {/* Botón de votar */}
                      <button
                        onClick={() => handleVote(poll)}
                        disabled={
                          (poll.str_poll_type === 'single' && currentSelections.length === 0) ||
                          (poll.str_poll_type === 'multiple' && currentSelections.length === 0) ||
                          (poll.str_poll_type === 'text' && !textResponses[poll.id]?.trim()) ||
                          (poll.str_poll_type === 'numeric' && (numericResponses[poll.id] === undefined || numericResponses[poll.id] === '')) ||
                          isVoting
                        }
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                          ((poll.str_poll_type === 'single' && currentSelections.length === 0) ||
                          (poll.str_poll_type === 'multiple' && currentSelections.length === 0) ||
                          (poll.str_poll_type === 'text' && !textResponses[poll.id]?.trim()) ||
                          (poll.str_poll_type === 'numeric' && (numericResponses[poll.id] === undefined || numericResponses[poll.id] === '')) ||
                          isVoting)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        {isVoting ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Enviando respuesta...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            {(poll.str_poll_type === 'single' || poll.str_poll_type === 'multiple')
                              ? `Votar${currentSelections.length > 1 ? ` (${currentSelections.length})` : ''}`
                              : 'Enviar Respuesta'}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No hay encuestas activas
          </h3>
          <p className="text-gray-600">
            No hay encuestas activas en este momento. Las encuestas aparecerán aquí cuando el administrador las inicie.
          </p>
        </div>
      )}

      {/* Encuestas Cerradas */}
      {closedPolls.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-gray-600" size={24} />
            Encuestas Cerradas Hoy ({closedPolls.length})
          </h2>

          <div className="space-y-3">
            {closedPolls.map((poll) => (
              <div
                key={poll.id}
                className="bg-gray-50 rounded-lg border border-gray-300 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">{poll.str_title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Finalizada: {formatDate(poll.dat_ended_at)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-gray-300 text-gray-700 rounded-full text-xs font-semibold">
                    CERRADA
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}