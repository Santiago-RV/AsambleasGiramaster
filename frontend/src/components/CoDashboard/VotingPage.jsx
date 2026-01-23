import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Info, Loader2, CheckCircle, Clock, AlertCircle, Calendar, Users } from "lucide-react";
import Swal from 'sweetalert2';
import { PollService } from '../../services/api/PollService';
import { UserService } from '../../services/api/UserService';
import { MeetingService } from '../../services/api/MeetingService';

export default function VotingPage() {
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState({});
  const [votedPolls, setVotedPolls] = useState(new Set());

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

  // Función para verificar si una fecha es hoy
  const isToday = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filtrar encuestas por estado Y fecha (solo del día de hoy)
  const activePolls = allPollsData?.polls?.filter(poll => {
    const isActive = poll.str_status === 'active' || poll.str_status === 'Activa';
    const isFromToday = isToday(poll.dat_started_at);
    const hasNotVoted = !poll.has_voted; // ✅ Solo mostrar si NO ha votado
    return isActive && isFromToday && hasNotVoted;
  }) || [];

  const closedPolls = allPollsData?.polls?.filter(poll => {
    const isClosed = poll.str_status === 'closed' || poll.str_status === 'Cerrada';
    const isFromToday = isToday(poll.dat_ended_at);
    return isClosed && isFromToday;
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
        // Enviar un solo voto
        await voteMutation.mutateAsync({
          pollId: poll.id,
          voteData: {
            int_option_id: selections[0],
            bln_is_abstention: false,
          }
        });
      } else if (poll.str_poll_type === 'multiple') {
        // Enviar un voto por cada opción seleccionada
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
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">
            Sistema de Votaciones - Encuestas de Hoy
          </h3>
          <p className="text-sm text-blue-700">
            Aquí aparecerán las encuestas activas del día de hoy.
            Tu voto se registrará de forma segura y ponderada según tu coeficiente de propiedad.
          </p>
        </div>
      </div>

      {/* Encuestas Activas */}
      {activePolls.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-green-600" size={24} />
            Encuestas Activas de Hoy ({activePolls.length})
          </h2>

          {activePolls.map((poll) => {
            const hasVoted = poll.has_voted || votedPolls.has(poll.id); // ✅ Verificar backend Y local
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
                        <Calendar size={16} />
                        Finaliza: {formatDate(poll.dat_ended_at)}
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
                            : `Selecciona hasta ${poll.int_max_selections || 'todas las'} opciones:`}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {poll.str_poll_type === 'single' ? 'Opción única' : 'Múltiple opción'}
                          </span>
                          {poll.bln_is_anonymous && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              Anónima
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Opciones */}
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

                      {/* Botón de votar */}
                      <button
                        onClick={() => handleVote(poll)}
                        disabled={currentSelections.length === 0 || isVoting}
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                          currentSelections.length === 0 || isVoting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        {isVoting ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Enviando voto...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            Votar{currentSelections.length > 1 ? ` (${currentSelections.length})` : ''}
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
            No hay encuestas activas hoy
          </h3>
          <p className="text-gray-600">
            No hay encuestas activas para el día de hoy. Las encuestas activas aparecerán aquí cuando el administrador las inicie.
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