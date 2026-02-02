import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserMinus,
  UserPlus,
  AlertCircle,
  Loader2,
  Search,
  UserCheck,
  Lock,
  CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';
import Modal from './Modal';
import { MeetingService } from '../../services/api/MeetingService';
import { DelegationService } from '../../services/api/DelegationService';

export const DelegationModal = ({ isOpen, onClose, meetingId, onSuccess }) => {

  console.log("🟢 DelegationModal - isOpen:", isOpen);
  console.log("🟢 DelegationModal - meetingId:", meetingId);
  const [selectedDelegators, setSelectedDelegators] = useState([]);
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Obtener invitaciones con quorum base
  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ['meeting-invitations', meetingId],
    queryFn: () => MeetingService.getMeetingInvitations(meetingId),
    enabled: isOpen && !!meetingId,
  });

  // ← AGREGAR ESTOS LOGS DESPUÉS DE LA QUERY
  console.log("🟡 Query enabled:", isOpen && !!meetingId);
  console.log("🟡 invitationsData:", invitationsData);
  console.log("🟡 isLoading:", isLoading);

  const invitations = invitationsData?.data || [];
  console.log("🟡 invitations array:", invitations); // ← AGREGAR ESTO


  // Filtrar por búsqueda
  const filteredInvitations = useMemo(() => {
    if (!searchTerm.trim()) return invitations;

    const search = searchTerm.toLowerCase();
    return invitations.filter(inv =>
      inv.str_firstname?.toLowerCase().includes(search) ||
      inv.str_lastname?.toLowerCase().includes(search) ||
      inv.str_apartment_number?.toLowerCase().includes(search) ||
      inv.str_email?.toLowerCase().includes(search)
    );
  }, [invitations, searchTerm]);

  // Separar usuarios por estado
  const usersByState = useMemo(() => {
    const available = [];
    const alreadyDelegated = [];

    filteredInvitations.forEach(inv => {
      if (inv.int_delegated_id) {
        alreadyDelegated.push(inv);
      } else {
        available.push(inv);
      }
    });

    return { available, alreadyDelegated };
  }, [filteredInvitations]);

  // Filtrar: disponibles para recibir (no han delegado y no están en lista de cedentes)
  const availableDelegates = useMemo(() => {
    const delegatorIds = selectedDelegators.map(d => d.int_user_id);
    return usersByState.available.filter(inv =>
      !delegatorIds.includes(inv.int_user_id)
    );
  }, [usersByState.available, selectedDelegators]);

  // Filtrar: disponibles para ceder (no han delegado y no es el delegado seleccionado)
  const availableDelegators = useMemo(() => {
    return usersByState.available.filter(inv =>
      inv.int_user_id !== selectedDelegate?.int_user_id
    );
  }, [usersByState.available, selectedDelegate]);

  // Calcular peso total a ceder
  const totalWeightToDelegate = useMemo(() => {
    return selectedDelegators.reduce((sum, d) => sum + (parseFloat(d.dec_quorum_base) || 0), 0);
  }, [selectedDelegators]);

  // Mutación para crear delegación
  const createDelegationMutation = useMutation({
    mutationFn: (data) => DelegationService.createDelegation(meetingId, data),
    onSuccess: () => {
      Swal.fire({
        icon: 'success',
        title: 'Delegación Exitosa',
        html: `
          <p class="text-gray-700">Se cedieron <strong>${totalWeightToDelegate.toFixed(2)}</strong> quorum exitosamente.</p>
          <p class="mt-2 text-sm text-gray-600">
            ${selectedDelegators.length} copropietario(s) delegaron su poder a
            ${selectedDelegate?.str_firstname} ${selectedDelegate?.str_lastname}
          </p>
        `,
        confirmButtonColor: '#10b981'
      });

      queryClient.invalidateQueries(['meeting-invitations', meetingId]);
      queryClient.invalidateQueries(['delegations', meetingId]);

      handleReset();
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Hubo un error al crear la delegación';
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
    setSearchTerm('');
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

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Confirmar Delegación?',
      html: `
        <div class="text-left space-y-2">
          <p class="text-gray-700"><strong>Receptor:</strong></p>
          <p class="text-sm text-gray-600 pl-5">
            ${selectedDelegate.str_firstname} ${selectedDelegate.str_lastname} - Apto: ${selectedDelegate.str_apartment_number}
          </p>
          
          <p class="mt-3 text-gray-700"><strong>Cedentes:</strong></p>
          <ul class="list-disc pl-5 text-sm text-gray-600">
            ${selectedDelegators.map(d =>
        `<li>${d.str_firstname} ${d.str_lastname} - Apto: ${d.str_apartment_number} (${parseFloat(d.dec_quorum_base).toFixed(2)} quorum)</li>`
      ).join('')}
          </ul>
          
          <p class="mt-3 text-lg font-bold text-green-600">
            Peso total a ceder: ${totalWeightToDelegate.toFixed(2)} quorum
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Gestión de Poderes" size="3xl">
      <div className="p-6">
        {/* Header con instrucciones */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Instrucciones:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Selecciona el copropietario que <strong>recibirá</strong> el poder (izquierda)</li>
                <li>Selecciona uno o más copropietarios que <strong>cederán</strong> su poder (centro)</li>
                <li>Los copropietarios que ya cedieron aparecen en el histórico (derecha)</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, apartamento o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2">
              Mostrando {filteredInvitations.length} de {invitations.length} copropietarios
            </p>
          )}
        </div>

        {/* Grid de tres columnas */}
        <div className="grid grid-cols-3 gap-4">

          {/* COLUMNA 1: RECEPTOR (Izquierda) */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <div className="flex items-center gap-2 text-green-700">
                <UserPlus size={20} />
                <h3 className="font-semibold text-sm">Receptor</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {selectedDelegate ? '1 seleccionado' : 'Ninguno'} • {availableDelegates.length} disponibles
              </p>
            </div>

            <div className="p-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : availableDelegates.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <UserPlus size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay receptores</p>
                  <p className="text-xs mt-1">disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableDelegates.map(invitation => {
                    const isSelected = selectedDelegate?.int_user_id === invitation.int_user_id;
                    const currentQuorum = parseFloat(invitation.dec_quorum_base || 0);
                    const newQuorum = currentQuorum + totalWeightToDelegate;

                    return (
                      <label
                        key={invitation.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                            ? 'bg-green-50 border-green-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-green-200'
                          }`}
                      >
                        <input
                          type="radio"
                          name="delegate"
                          checked={isSelected}
                          onChange={() => handleDelegateSelect(invitation)}
                          className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {invitation.str_firstname} {invitation.str_lastname}
                          </p>
                          <p className="text-xs text-gray-500">
                            Apto: {invitation.str_apartment_number}
                          </p>
                          {selectedDelegators.length > 0 && (
                            <div className="mt-1 text-xs bg-white rounded px-2 py-1 border border-gray-200">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Actual:</span>
                                <span className="font-semibold">{currentQuorum.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between mt-0.5 pt-0.5 border-t border-gray-200">
                                <span className="text-green-600 font-semibold">Nuevo:</span>
                                <span className="font-bold text-green-600">{newQuorum.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 2: CEDENTES (Centro) */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
              <div className="flex items-center gap-2 text-red-700">
                <UserMinus size={20} />
                <h3 className="font-semibold text-sm">Cedentes</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {selectedDelegators.length} seleccionado(s) • {availableDelegators.length} disponibles
              </p>
            </div>

            <div className="p-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : availableDelegators.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <UserMinus size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableDelegators.map(invitation => {
                    const isSelected = selectedDelegators.some(d => d.int_user_id === invitation.int_user_id);
                    const quorumBase = parseFloat(invitation.dec_quorum_base || 0);

                    return (
                      <label
                        key={invitation.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                            ? 'bg-red-50 border-red-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-red-200'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleDelegatorToggle(invitation)}
                          className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {invitation.str_firstname} {invitation.str_lastname}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500">
                              Apto: {invitation.str_apartment_number}
                            </p>
                            <p className="text-xs font-semibold text-red-600">
                              {quorumBase.toFixed(2)}
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
              <div className="p-3 bg-red-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">Peso total a ceder:</p>
                <p className="text-xl font-bold text-red-600">
                  {totalWeightToDelegate.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* COLUMNA 3: HISTÓRICO (Derecha) */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-700">
                <Lock size={20} />
                <h3 className="font-semibold text-sm">Ya Cedieron</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {usersByState.alreadyDelegated.length} copropietario(s)
              </p>
            </div>

            <div className="p-3 max-h-96 overflow-y-auto">
              {usersByState.alreadyDelegated.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle2 size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Ninguno ha</p>
                  <p className="text-xs mt-1">cedido poder</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usersByState.alreadyDelegated.map(invitation => {
                    const quorumBase = parseFloat(invitation.dec_quorum_base || 0);

                    return (
                      <div
                        key={invitation.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-gray-100 border-2 border-gray-200 opacity-60"
                      >
                        <Lock size={16} className="text-gray-400 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-700 truncate">
                            {invitation.str_firstname} {invitation.str_lastname}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500">
                              Apto: {invitation.str_apartment_number}
                            </p>
                            <p className="text-xs font-semibold text-gray-500">
                              {quorumBase.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <UserCheck size={12} className="text-gray-400" />
                            <p className="text-xs text-gray-500">Poder cedido</p>
                          </div>
                        </div>
                      </div>
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
            disabled={(selectedDelegators.length === 0 && !selectedDelegate) || createDelegationMutation.isPending}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Limpiar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDelegate || selectedDelegators.length === 0 || createDelegationMutation.isPending}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createDelegationMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Procesando...
              </>
            ) : (
              'Confirmar Cesión'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DelegationModal;