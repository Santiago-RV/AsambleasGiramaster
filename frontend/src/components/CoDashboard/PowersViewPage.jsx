import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Loader2, AlertCircle, UserMinus, UserPlus, Info, CheckCircle } from 'lucide-react';
import { DelegationService } from '../../services/api/DelegationService';
import { MeetingService } from '../../services/api/MeetingService';

export default function PowersViewPage() {
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Obtener reuniones del copropietario
  const {
    data: meetingsData,
    isLoading: isLoadingMeetings,
    isError: isErrorMeetings
  } = useQuery({
    queryKey: ['my-meetings'],
    queryFn: async () => {
      return await MeetingService.getMyMeetings();
    },
    retry: 1
  });

  // Obtener estado de delegación del usuario
  const {
    data: delegationStatusData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['delegation-status', selectedMeeting?.id],
    queryFn: async () => {
      return await DelegationService.getUserDelegationStatus(selectedMeeting.id);
    },
    enabled: !!selectedMeeting,
    retry: 1,
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });

  const meetings = meetingsData?.data || [];
  const delegationStatus = delegationStatusData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <HandCoins size={32} />
          <h2 className="text-2xl font-bold">Mis Poderes de Votación</h2>
        </div>
        <p className="text-blue-100">
          Consulta el estado de tus poderes de votación en las reuniones
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Información importante:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Solo el administrador puede gestionar las delegaciones de poder</li>
            <li>Si cediste tu poder, no podrás votar en las encuestas de esa reunión</li>
            <li>Si recibiste poderes, tu voto contará con el peso acumulado</li>
          </ul>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingMeetings && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      )}

      {/* Error State */}
      {isErrorMeetings && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Error al cargar reuniones</h3>
            <p className="text-red-600 text-sm">
              No se pudieron cargar tus reuniones. Por favor, intenta nuevamente.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoadingMeetings && !isErrorMeetings && (
        <>
          {/* Selector de Reunión */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Selecciona una Reunión
            </h3>

            {meetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <HandCoins size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tienes reuniones disponibles</p>
                <p className="text-sm mt-1">
                  Serás invitado cuando haya reuniones programadas
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => setSelectedMeeting(meeting)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedMeeting?.id === meeting.id
                        ? 'bg-blue-50 border-blue-500 shadow-md'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">
                          {meeting.str_title}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>
                            {new Date(meeting.dat_schedule_date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                            meeting.str_status === 'En vivo'
                              ? 'bg-green-100 text-green-700'
                              : meeting.str_status === 'Programada'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {meeting.str_status}
                          </span>
                        </div>
                      </div>
                      {selectedMeeting?.id === meeting.id && (
                        <CheckCircle className="text-blue-600 flex-shrink-0" size={24} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estado de Delegación */}
          {selectedMeeting && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Estado de Poderes - {selectedMeeting.str_title}
              </h3>

              {isLoadingStatus ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : delegationStatus ? (
                <div className="space-y-4">
                  {/* Si delegó su voto */}
                  {delegationStatus.has_delegated && delegationStatus.delegated_to && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                          <UserMinus className="text-yellow-700" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-yellow-800 mb-1">
                            Has cedido tu derecho a voto
                          </p>
                          <p className="text-sm text-yellow-700">
                            Delegaste tu poder de votación a:
                          </p>
                          <div className="mt-2 p-3 bg-white rounded border border-yellow-200">
                            <p className="font-semibold text-gray-800">
                              {delegationStatus.delegated_to.str_firstname} {delegationStatus.delegated_to.str_lastname}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {delegationStatus.delegated_to.str_email}
                            </p>
                          </div>
                          <p className="text-xs text-yellow-600 mt-3">
                            ⚠️ No podrás votar en las encuestas de esta reunión. Tu voto será ejercido por el delegado.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Si recibió delegaciones */}
                  {delegationStatus.received_delegations && delegationStatus.received_delegations.length > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <UserPlus className="text-green-700" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-green-800 mb-1">
                            Has recibido poderes de votación
                          </p>
                          <p className="text-sm text-green-700 mb-3">
                            Los siguientes copropietarios te han cedido su poder:
                          </p>
                          <div className="space-y-2">
                            {delegationStatus.received_delegations.map((delegation, index) => (
                              <div key={index} className="p-3 bg-white rounded border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-800">
                                      {delegation.delegator.str_firstname} {delegation.delegator.str_lastname}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {delegation.delegator.str_email}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-green-600">
                                      +{parseFloat(delegation.delegated_weight).toFixed(2)} votos
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 p-3 bg-green-100 rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-700">Tu peso original:</p>
                                <p className="text-xs text-green-600 mt-1">Peso que recibes:</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-800">
                                  {parseFloat(delegationStatus.original_weight).toFixed(2)}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  +{(delegationStatus.total_weight - delegationStatus.original_weight).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-green-800">Peso total de votación:</p>
                                <p className="text-2xl font-bold text-green-700">
                                  {parseFloat(delegationStatus.total_weight).toFixed(2)} votos
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-green-600 mt-3">
                            ✅ Tus votos contarán con este peso acumulado en todas las encuestas de esta reunión.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Si no tiene delegaciones */}
                  {!delegationStatus.has_delegated &&
                   (!delegationStatus.received_delegations || delegationStatus.received_delegations.length === 0) && (
                    <div className="p-8 bg-gray-50 rounded-lg text-center">
                      <HandCoins size={48} className="mx-auto mb-3 text-gray-400 opacity-50" />
                      <p className="font-medium text-gray-600">
                        No hay delegaciones activas
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Tu peso de votación es: <span className="font-semibold">{parseFloat(delegationStatus.total_weight).toFixed(2)} votos</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-3">
                        Si el administrador realiza cambios en las delegaciones, se reflejarán aquí automáticamente.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
