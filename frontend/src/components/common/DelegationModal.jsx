import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserMinus, UserPlus, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import Modal from './Modal';
import { DelegationService } from '../../services/api/DelegationService';
import { MeetingService } from '../../services/api/MeetingService';

const DelegationModal = ({ isOpen, onClose, meetingId, onSuccess }) => {
  const [selectedDelegators, setSelectedDelegators] = useState([]);
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const queryClient = useQueryClient();

  // Query: obtener invitaciones de la reunión
  const { data: invitationsResponse, isLoading } = useQuery({
    queryKey: ['meeting-invitations', meetingId],
    queryFn: async () => {
      const response = await MeetingService.getMeetingInvitations(meetingId);
      return response;
    },
    enabled: !!meetingId && isOpen,
    retry: 1
  });

  const invitations = useMemo(() => {
    if (!invitationsResponse?.success || !invitationsResponse?.data) {
      return [];
    }
    return invitationsResponse.data;
  }, [invitationsResponse]);

  // Filtrar cedentes disponibles (no han delegado previamente)
  const availableDelegators = useMemo(() => {
    return invitations.filter(inv => !inv.int_delegated_id);
  }, [invitations]);

  // Filtrar delegados disponibles (no están en la lista de cedentes seleccionados y no han delegado)
  const availableDelegates = useMemo(() => {
    if (selectedDelegators.length === 0) {
      return [];
    }
    const delegatorIds = selectedDelegators.map(d => d.int_user_id);
    return invitations.filter(inv =>
      !delegatorIds.includes(inv.int_user_id) &&
      !inv.int_delegated_id  // No puede recibir si ya delegó
    );
  }, [invitations, selectedDelegators]);

  // Calcular peso total a ceder
  const totalWeightToDelegate = useMemo(() => {
    return selectedDelegators.reduce((sum, delegator) => {
      const weight = parseFloat(delegator.dec_voting_weight || 0);
      return sum + weight;
    }, 0);
  }, [selectedDelegators]);

  // Mutación para crear delegación
  const createDelegationMutation = useMutation({
    mutationFn: (data) => DelegationService.createDelegation(meetingId, data),
    onSuccess: () => {
      Swal.fire({
        icon: 'success',
        title: 'Delegación Exitosa',
        html: `
          <p class="text-gray-700">Se cedieron <strong>${totalWeightToDelegate.toFixed(2)}</strong> votos exitosamente.</p>
          <p class="mt-2 text-sm text-gray-600">
            ${selectedDelegators.length} copropietario(s) delegaron su poder a
            ${selectedDelegate?.str_firstname} ${selectedDelegate?.str_lastname}
          </p>
        `,
        confirmButtonColor: '#10b981'
      });

      // Invalidar queries
      queryClient.invalidateQueries(['meeting-invitations', meetingId]);
      queryClient.invalidateQueries(['delegations', meetingId]);
      queryClient.invalidateQueries(['meeting-delegations']);

      // Reset y cerrar
      handleReset();
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('Error al crear delegación:', error);

      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.detail ||
                          'Hubo un error al crear la delegación';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc2626'
      });
    }
  });

  // Handlers
  const handleDelegatorToggle = (invitation) => {
    setSelectedDelegators(prev => {
      const exists = prev.find(d => d.int_user_id === invitation.int_user_id);
      if (exists) {
        return prev.filter(d => d.int_user_id !== invitation.int_user_id);
      } else {
        return [...prev, invitation];
      }
    });

    // Si el delegado estaba seleccionado y ahora lo agregamos como cedente, deseleccionarlo
    if (selectedDelegate?.int_user_id === invitation.int_user_id) {
      setSelectedDelegate(null);
    }
  };

  const handleDelegateSelect = (invitation) => {
    setSelectedDelegate(invitation);
  };

  const handleReset = () => {
    setSelectedDelegators([]);
    setSelectedDelegate(null);
  };

  const handleConfirm = async () => {
    if (!selectedDelegate || selectedDelegators.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos Incompletos',
        text: 'Debes seleccionar al menos un cedente y un receptor',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    // Confirmación
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Confirmar Delegación?',
      html: `
        <div class="text-left space-y-2">
          <p class="text-gray-700"><strong>Cedentes:</strong></p>
          <ul class="list-disc pl-5 text-sm text-gray-600">
            ${selectedDelegators.map(d =>
              `<li>${d.str_firstname} ${d.str_lastname} (${parseFloat(d.dec_voting_weight).toFixed(2)} votos)</li>`
            ).join('')}
          </ul>
          <p class="mt-3 text-gray-700"><strong>Receptor:</strong></p>
          <p class="text-sm text-gray-600 pl-5">
            ${selectedDelegate.str_firstname} ${selectedDelegate.str_lastname}
          </p>
          <p class="mt-3 text-lg font-bold text-green-600">
            Peso total a ceder: ${totalWeightToDelegate.toFixed(2)} votos
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      createDelegationMutation.mutate({
        delegator_ids: selectedDelegators.map(d => d.int_user_id),
        delegate_id: selectedDelegate.int_user_id
      });
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Gestión de Poderes" size="xl">
      <div className="p-6">
        {/* Header con instrucciones */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Instrucciones:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Selecciona uno o más copropietarios que cederán su poder (izquierda)</li>
                <li>Selecciona el copropietario que recibirá el poder acumulado (derecha)</li>
                <li>Confirma la delegación</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Grid de dos columnas */}
        <div className="grid grid-cols-2 gap-6">
          {/* COLUMNA IZQUIERDA: Cedentes */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
              <div className="flex items-center gap-2 text-red-700">
                <UserMinus size={20} />
                <h3 className="font-semibold">Copropietarios que ceden poder</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                ({selectedDelegators.length} seleccionados)
              </p>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Cargando copropietarios...
                </div>
              ) : availableDelegators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay copropietarios disponibles para ceder poder
                </div>
              ) : (
                <div className="space-y-2">
                  {availableDelegators.map(invitation => {
                    const isSelected = selectedDelegators.find(d => d.int_user_id === invitation.int_user_id);

                    return (
                      <label
                        key={invitation.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-red-50 border-red-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-red-200 hover:bg-red-25'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => handleDelegatorToggle(invitation)}
                          className="w-5 h-5 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {invitation.str_firstname} {invitation.str_lastname}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">
                              Apto: {invitation.str_apartment_number}
                            </p>
                            <p className="text-sm font-semibold text-red-600">
                              {parseFloat(invitation.dec_voting_weight).toFixed(2)} votos
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resumen de peso total */}
            {selectedDelegators.length > 0 && (
              <div className="p-4 bg-red-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">Peso total a ceder:</p>
                <p className="text-2xl font-bold text-red-600">
                  {totalWeightToDelegate.toFixed(2)} votos
                </p>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: Receptor */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <div className="flex items-center gap-2 text-green-700">
                <UserPlus size={20} />
                <h3 className="font-semibold">Receptor del poder</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {selectedDelegate ? '1 seleccionado' : 'Ninguno seleccionado'}
              </p>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {selectedDelegators.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <UserPlus size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Selecciona primero los copropietarios</p>
                  <p className="text-sm mt-1">que cederán el poder</p>
                </div>
              ) : availableDelegates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay receptores disponibles
                </div>
              ) : (
                <div className="space-y-2">
                  {availableDelegates.map(invitation => {
                    const isSelected = selectedDelegate?.int_user_id === invitation.int_user_id;
                    const currentWeight = parseFloat(invitation.dec_voting_weight);
                    const newWeight = currentWeight + totalWeightToDelegate;

                    return (
                      <label
                        key={invitation.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-green-50 border-green-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-25'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delegate"
                          checked={isSelected}
                          onChange={() => handleDelegateSelect(invitation)}
                          className="w-5 h-5 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {invitation.str_firstname} {invitation.str_lastname}
                          </p>
                          <div className="mt-1 text-xs space-y-1">
                            <p className="text-gray-500">
                              Apto: {invitation.str_apartment_number}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Peso actual:</span>
                              <span className="font-semibold text-gray-700">
                                {currentWeight.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                              <span className="text-green-600 font-semibold">Nuevo peso:</span>
                              <span className="font-bold text-green-600">
                                {newWeight.toFixed(2)} votos
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={createDelegationMutation.isPending}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={selectedDelegators.length === 0 && !selectedDelegate || createDelegationMutation.isPending}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Limpiar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDelegate || selectedDelegators.length === 0 || createDelegationMutation.isPending}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createDelegationMutation.isPending ? 'Procesando...' : 'Confirmar Cesión'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DelegationModal;
