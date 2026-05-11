import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle, Hand, Loader2, Search, Hash, RefreshCw, MessageSquare, Calculator } from 'lucide-react';
import { PollService } from '../../services/api/PollService';
import { useMeetingPollsSSE } from '../../hooks/useMeetingPollsSSE';
import { formatDateTime } from '../../utils/dateUtils';

function Initials({ name }) {
  const parts = (name || '').trim().split(' ');
  const text = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : (parts[0]?.[0] || '?');
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
      {text.toUpperCase()}
    </div>
  );
}

function WeightBadge({ weight }) {
  if (weight == null) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">
      <Hash size={10} />
      {parseFloat(weight).toFixed(4)}%
    </span>
  );
}

function ResponseBadge({ voter, pollType }) {
  if (pollType === 'text') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-medium border border-amber-100 max-w-[200px] truncate" title={voter.response_text}>
        <MessageSquare size={11} className="flex-shrink-0" />
        {voter.response_text || '—'}
      </span>
    );
  }
  if (pollType === 'numeric') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-800 rounded-lg text-xs font-medium border border-cyan-100">
        <Calculator size={11} />
        {voter.response_number ?? '—'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-800 rounded-lg text-xs font-medium border border-green-100">
      <CheckCircle size={11} />
      {voter.option_text || '—'}
    </span>
  );
}

const VotersList = ({ pollId, meetingId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('votes');

  const { data: votersData, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['poll-voters', pollId],
    queryFn: () => PollService.getPollVotes(pollId),
    enabled: !!pollId,
    refetchInterval: 8000,
  });

  useMeetingPollsSSE({
    meetingId: meetingId ?? null,
    enabled: !!meetingId,
    onEvent: () => refetch(),
  });

  if (!pollId) return null;

  const pollType = votersData?.data?.poll_type;

  const allVoters = votersData?.data?.options?.flatMap(option =>
    (option.votes || []).map(vote => ({ ...vote, option_text: option.option_text, type: 'vote' }))
  ) || [];

  const abstentions = votersData?.data?.abstentions || [];

  const match = (v) =>
    v.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredVoters = allVoters.filter(match);
  const filteredAbstentions = abstentions.filter(match);

  const totalVoters = allVoters.length;
  const totalAbstentions = abstentions.length;

  const totalWeight = allVoters.reduce((sum, v) => sum + (parseFloat(v.voting_weight) || 0), 0);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Cargando participantes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <p className="text-sm text-red-500">Error al cargar los participantes</p>
        <button onClick={() => refetch()} className="mt-2 text-xs text-blue-600 underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Users size={17} />
            <span className="font-semibold text-sm">Participantes</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <CheckCircle size={12} className="text-green-400" />
                <span className="font-bold text-white">{totalVoters}</span> votos
              </span>
              <span className="text-slate-500">·</span>
              <span className="flex items-center gap-1">
                <Hand size={12} className="text-amber-400" />
                <span className="font-bold text-white">{totalAbstentions}</span> abst.
              </span>
              {totalWeight > 0 && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="flex items-center gap-1">
                    <Hash size={11} className="text-indigo-400" />
                    <span className="font-bold text-white">{totalWeight.toFixed(2)}%</span>
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-slate-400 mt-1">Actualizado: {lastUpdated}</p>
        )}
      </div>

      {/* Buscador */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o apartamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('votes')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'votes'
              ? 'text-green-700 bg-green-50 border-b-2 border-green-500'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <CheckCircle size={14} />
          Votos ({totalVoters})
        </button>
        <button
          onClick={() => setTab('abstentions')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'abstentions'
              ? 'text-amber-700 bg-amber-50 border-b-2 border-amber-500'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Hand size={14} />
          Abstenciones ({totalAbstentions})
        </button>
      </div>

      {/* Lista */}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {tab === 'votes' ? (
          filteredVoters.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {searchTerm ? 'Sin resultados para tu búsqueda' : 'Aún no hay votos registrados'}
            </div>
          ) : (
            filteredVoters.map((voter, i) => (
              <div key={`${voter.user_id}-${i}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                <Initials name={voter.full_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{voter.full_name}</p>
                  <p className="text-xs text-gray-400">{voter.apartment_number}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <ResponseBadge voter={voter} pollType={pollType} />
                  <div className="flex items-center gap-1.5">
                    <WeightBadge weight={voter.voting_weight} />
                    <span className="text-xs text-gray-300">{formatDateTime(voter.voted_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          filteredAbstentions.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {searchTerm ? 'Sin resultados para tu búsqueda' : 'No hay abstenciones'}
            </div>
          ) : (
            filteredAbstentions.map((voter, i) => (
              <div key={`${voter.user_id}-${i}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors">
                <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
                  <Hand size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{voter.full_name}</p>
                  <p className="text-xs text-gray-400">{voter.apartment_number}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-100">
                    <Hand size={11} /> Se abstuvo
                  </span>
                  <div className="flex items-center gap-1.5">
                    <WeightBadge weight={voter.voting_weight} />
                    <span className="text-xs text-gray-300">{formatDateTime(voter.abstained_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>
          {tab === 'votes' ? filteredVoters.length : filteredAbstentions.length} de {tab === 'votes' ? totalVoters : totalAbstentions} participantes
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Tiempo real
        </span>
      </div>
    </div>
  );
};

export default VotersList;
