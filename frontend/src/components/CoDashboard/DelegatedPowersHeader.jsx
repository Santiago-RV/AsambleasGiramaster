import { useQuery } from '@tanstack/react-query';
import { UserPlus, Hash } from 'lucide-react';
import { DelegationService } from '../../services/api/DelegationService';

export default function DelegatedPowersHeader({ meetingId }) {
    const { data: delegationStatusData, isLoading, isError } = useQuery({
        queryKey: ['delegation-status', meetingId],
        queryFn: () => DelegationService.getUserDelegationStatus(meetingId),
        enabled: !!meetingId,
        refetchInterval: 10000,
    });

    const delegationStatus = delegationStatusData?.data;

    if (isLoading || isError) return null;
    if (!delegationStatus?.received_delegations?.length) return null;

    const receivedDelegations = delegationStatus.received_delegations;

    const getName = (delegator) => {
        const full = `${delegator.str_firstname || ''} ${delegator.str_lastname || ''}`.trim();
        return full || delegator.str_email || '—';
    };

    return (
        <div className="bg-green-50 border border-green-300 rounded-lg px-3 py-2.5">
            {/* Fila superior: título + conteo + peso total */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                <div className="flex items-center gap-1.5">
                    <UserPlus size={14} className="text-green-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-green-900">Votas con poderes de:</span>
                    <span className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                        {receivedDelegations.length}
                    </span>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                    <Hash size={12} className="text-green-600" />
                    <span className="text-xs text-green-700">Propio:</span>
                    <span className="text-xs font-bold text-green-800">
                        {parseFloat(delegationStatus.original_weight).toFixed(4)}%
                    </span>
                    <span className="text-green-400 mx-1">|</span>
                    <span className="text-xs text-green-700">Total:</span>
                    <span className="text-sm font-bold text-green-800">
                        {parseFloat(delegationStatus.total_weight).toFixed(4)}%
                    </span>
                </div>
            </div>

            {/* Pills de delegadores */}
            <div className="flex flex-wrap gap-1.5">
                {receivedDelegations.map((d, i) => {
                    const name = getName(d.delegator);
                    const initial = name.charAt(0).toUpperCase();
                    return (
                        <div
                            key={i}
                            className="flex items-center gap-1.5 bg-white border border-green-200 rounded-full pl-1 pr-2.5 py-0.5 text-xs shadow-sm"
                        >
                            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {initial}
                            </span>
                            <span className="font-medium text-gray-800 max-w-[120px] sm:max-w-none truncate">
                                {name}
                            </span>
                            <span className="font-bold text-green-700 whitespace-nowrap">
                                +{parseFloat(d.delegated_weight).toFixed(4)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
