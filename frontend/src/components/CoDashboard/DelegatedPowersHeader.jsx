import { useQuery } from '@tanstack/react-query';
import { UserPlus, Hash, User, Info } from 'lucide-react';
import { DelegationService } from '../../services/api/DelegationService';

/**
 * Componente para mostrar los poderes delegados recibidos en el header del copropietario
 * Se muestra en reuniones activas donde el usuario ha recibido poderes
 */
export default function DelegatedPowersHeader({ meetingId }) {
    // Obtener estado de delegación del usuario
    const { data: delegationStatusData, isLoading, isError, error } = useQuery({
        queryKey: ['delegation-status', meetingId],
        queryFn: () => DelegationService.getUserDelegationStatus(meetingId),
        enabled: !!meetingId,
        refetchInterval: 10000, // Refrescar cada 10 segundos para mantener actualizado
    });

    const delegationStatus = delegationStatusData?.data;

    // 🔍 DEBUGGING - Ver qué está pasando
    console.log('🔍 [DelegatedPowersHeader] Debug:', {
        meetingId,
        isLoading,
        isError,
        error,
        delegationStatusData,
        delegationStatus,
        received_delegations: delegationStatus?.received_delegations,
        length: delegationStatus?.received_delegations?.length
    });

    // No mostrar nada si no hay delegaciones recibidas o está cargando
    if (isLoading) {
        console.log('⏳ [DelegatedPowersHeader] Cargando...');
        return null;
    }

    if (isError) {
        console.error('❌ [DelegatedPowersHeader] Error:', error);
        return null;
    }

    if (!delegationStatus?.received_delegations || delegationStatus.received_delegations.length === 0) {
        console.log('⚠️ [DelegatedPowersHeader] No hay delegaciones recibidas');
        return null;
    }

    console.log('✅ [DelegatedPowersHeader] Mostrando poderes delegados');

    const receivedDelegations = delegationStatus.received_delegations;
    const totalReceivedWeight = receivedDelegations.reduce(
        (sum, delegation) => sum + parseFloat(delegation.delegated_weight),
        0
    );

    return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 shadow-md">
            <div className="flex items-start gap-4">
                {/* Icono */}
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <UserPlus className="text-white" size={24} />
                </div>

                {/* Contenido */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-green-900">
                            Poderes de Votación Recibidos
                        </h3>
                        <span className="px-2 py-1 bg-green-200 text-green-900 rounded-full text-xs font-bold">
                            {receivedDelegations.length} delegación{receivedDelegations.length !== 1 ? 'es' : ''}
                        </span>
                    </div>

                    <p className="text-sm text-green-700 mb-3">
                        Los siguientes copropietarios te han cedido su poder de votación:
                    </p>

                    {/* Lista de delegaciones */}
                    <div className="space-y-2">
                        {receivedDelegations.map((delegation, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-lg border border-green-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    {/* Información del delegador */}
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shadow">
                                            {delegation.delegator.str_firstname?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-gray-500" />
                                                <p className="font-semibold text-gray-900">
                                                    {delegation.delegator.str_firstname} {delegation.delegator.str_lastname}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {delegation.delegator.str_email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Peso cedido */}
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <Hash size={14} className="text-green-600" />
                                            <p className="text-sm font-bold text-green-700">
                                                +{parseFloat(delegation.delegated_weight).toFixed(4)}%
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500">Poder cedido</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Resumen total */}
                    <div className="mt-4 p-3 bg-green-100 rounded-lg border-2 border-green-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-green-800">Tu peso original:</p>
                                <p className="text-xs text-green-700">
                                    {parseFloat(delegationStatus.original_weight).toFixed(4)}%
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-green-800">Peso recibido:</p>
                                <p className="text-xs text-green-700">
                                    +{totalReceivedWeight.toFixed(4)}%
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-green-900">Peso Total de Votación:</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {parseFloat(delegationStatus.total_weight).toFixed(4)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                        <Info size={14} className="font-bold" />
                        <p>
                            Cuando votes en cualquier encuesta de esta reunión, tu voto contará con el peso total acumulado
                            de <strong>{parseFloat(delegationStatus.total_weight).toFixed(4)}%</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}