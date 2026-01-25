import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Plus, UserMinus, UserPlus, Loader2, AlertCircle, Trash2, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import DelegationModal from '../common/DelegationModal';
import { DelegationService } from '../../services/api/DelegationService';
import { PollService } from '../../services/api/PollService';
import { UserService } from '../../services/api/UserService';

export default function PowersManagementPage() {
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const queryClient = useQueryClient();

  // Obtener unidad residencial del admin
  const { data: residentialUnitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['admin-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
  });

  const residentialUnitId = residentialUnitData?.data?.residential_unit_id;

  // Obtener reuniones en vivo (activas)
  const {
    data: liveMeetingsData,
    isLoading: isLoadingMeetings,
    isError: isErrorMeetings,
  } = useQuery({
    queryKey: ['live-meetings', residentialUnitId],
    queryFn: async () => {
      if (!residentialUnitId) {
        return { success: false, data: [] };
      }
      return await PollService.getLiveMeetings(residentialUnitId);
    },
    enabled: !!residentialUnitId,
    refetchInterval: 30000,
  });

  // Obtener delegaciones de la reunión seleccionada
  const {
    data: delegationsData,
    isLoading: isLoadingDelegations,
    refetch: refetchDelegations
  } = useQuery({
    queryKey: ['delegations', selectedMeeting?.id],
    queryFn: async () => {
      return await DelegationService.getMeetingDelegations(selectedMeeting.id);
    },
    enabled: !!selectedMeeting,
    retry: 1
  });

  // Mutación para revocar delegación
  const revokeDelegationMutation = useMutation({
    mutationFn: ({ meetingId, delegatorId }) =>
      DelegationService.revokeDelegation(meetingId, delegatorId),
    onSuccess: (response) => {
      Swal.fire({
        icon: 'success',
        title: 'Delegación Revocada',
        text: response.message || 'La delegación se ha revocado exitosamente',
        confirmButtonColor: '#10b981'
      });

      // Invalidar queries
      queryClient.invalidateQueries(['delegations', selectedMeeting?.id]);
      queryClient.invalidateQueries(['meeting-invitations', selectedMeeting?.id]);
      refetchDelegations();
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo revocar la delegación',
        confirmButtonColor: '#dc2626'
      });
    }
  });

  const handleRevokeDelegation = async (delegation) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Revocar Delegación?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-2">Vas a revocar la siguiente delegación:</p>
          <div class="bg-gray-50 p-3 rounded">
            <p class="text-sm">
              <strong>Cedente:</strong> ${delegation.delegator.str_firstname} ${delegation.delegator.str_lastname}
            </p>
            <p class="text-sm">
              <strong>Receptor:</strong> ${delegation.delegate.str_firstname} ${delegation.delegate.str_lastname}
            </p>
            <p class="text-sm">
              <strong>Peso:</strong> ${parseFloat(delegation.delegated_weight).toFixed(2)} votos
            </p>
          </div>
          <p class="text-gray-600 text-sm mt-3">
            El poder será restaurado al copropietario original.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Revocar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      revokeDelegationMutation.mutate({
        meetingId: selectedMeeting.id,
        delegatorId: delegation.delegator.id
      });
    }
  };

  const liveMeetings = liveMeetingsData?.data || [];
  const delegations = delegationsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <HandCoins size={32} />
          <h2 className="text-2xl font-bold">Gestión de Poderes</h2>
        </div>
        <p className="text-indigo-100">
          Administra la delegación de poderes de votación para las reuniones activas
        </p>
      </div>

      {/* Loading State */}
      {(isLoadingMeetings || isLoadingUnit) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      )}

      {/* Error State */}
      {isErrorMeetings && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Error al cargar reuniones</h3>
            <p className="text-red-600 text-sm">
              No se pudieron cargar las reuniones activas. Por favor, intenta nuevamente.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoadingMeetings && !isLoadingUnit && !isErrorMeetings && (
        <>
          {/* Selector de Reunión */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Paso 1: Selecciona una Reunión Activa
            </h3>

            {liveMeetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <HandCoins size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay reuniones activas</p>
                <p className="text-sm mt-1">
                  Las delegaciones solo pueden gestionarse en reuniones con estado "En vivo"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => setSelectedMeeting(meeting)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedMeeting?.id === meeting.id
                        ? 'bg-indigo-50 border-indigo-500 shadow-md'
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 line-clamp-1">
                          {meeting.str_title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(meeting.dat_schedule_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          En vivo
                        </div>
                      </div>
                      <ChevronRight
                        className={`flex-shrink-0 ml-2 ${
                          selectedMeeting?.id === meeting.id
                            ? 'text-indigo-600'
                            : 'text-gray-400'
                        }`}
                        size={20}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel de Delegaciones */}
          {selectedMeeting && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Paso 2: Gestionar Delegaciones
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Reunión: <span className="font-medium">{selectedMeeting.str_title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowDelegationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Plus size={18} />
                  Nueva Delegación
                </button>
              </div>

              {/* Loading Delegations */}
              {isLoadingDelegations && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              )}

              {/* Delegations List */}
              {!isLoadingDelegations && (
                <>
                  {delegations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <UserPlus size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-medium text-lg">No hay delegaciones activas</p>
                      <p className="text-sm mt-2">
                        Crea una nueva delegación para comenzar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-4">
                        {delegations.length} delegación(es) activa(s)
                      </p>

                      {delegations.map((delegation, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-indigo-200 rounded-lg"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Delegator */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">
                                {delegation.delegator.str_firstname.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {delegation.delegator.str_firstname} {delegation.delegator.str_lastname}
                                </p>
                                <p className="text-xs text-gray-500">Cedente</p>
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex flex-col items-center px-4">
                              <ChevronRight className="text-indigo-600" size={24} />
                              <p className="text-xs font-semibold text-indigo-600 mt-1">
                                {parseFloat(delegation.delegated_weight).toFixed(2)} votos
                              </p>
                            </div>

                            {/* Delegate */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                {delegation.delegate.str_firstname.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {delegation.delegate.str_firstname} {delegation.delegate.str_lastname}
                                </p>
                                <p className="text-xs text-gray-500">Receptor</p>
                              </div>
                            </div>
                          </div>

                          {/* Revoke Button */}
                          <button
                            onClick={() => handleRevokeDelegation(delegation)}
                            disabled={revokeDelegationMutation.isPending}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Revocar delegación"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Delegation Modal */}
      {showDelegationModal && selectedMeeting && (
        <DelegationModal
          isOpen={showDelegationModal}
          onClose={() => setShowDelegationModal(false)}
          meetingId={selectedMeeting.id}
          onSuccess={() => {
            refetchDelegations();
          }}
        />
      )}
    </div>
  );
}
