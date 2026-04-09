import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle, Hand, Loader2, Search } from 'lucide-react';
import { PollService } from '../../services/api/PollService';
import { formatDateTime } from '../../utils/dateUtils';

const VotersList = ({ pollId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState('votes');

  const { data: votersData, isLoading, error } = useQuery({
    queryKey: ['poll-voters', pollId],
    queryFn: async () => await PollService.getPollVotes(pollId),
    enabled: !!pollId,
  });

  if (!pollId) return null;

  const allVoters = votersData?.data?.options?.flatMap(option => 
    (option.votes || []).map(vote => ({
      ...vote,
      option_text: option.option_text,
      type: 'vote'
    }))
  ) || [];

  const abstentions = votersData?.data?.abstentions || [];

  const filteredVoters = allVoters.filter(voter => 
    voter.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAbstentions = abstentions.filter(voter => 
    voter.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Cargando listado de voters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-red-200">
        <p className="text-red-600">Error al cargar los voters</p>
      </div>
    );
  }

  const totalVoters = allVoters.length;
  const totalAbstentions = abstentions.length;
  const totalParticipants = totalVoters + totalAbstentions;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header con estadísticas */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Users size={20} />
            <h3 className="text-lg font-bold">Listado de Participantes</h3>
          </div>
          <div className="flex items-center gap-4 text-white text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle size={16} />
              <span className="font-semibold">{totalVoters}</span>
              <span className="opacity-80">votos</span>
            </div>
            <div className="flex items-center gap-1">
              <Hand size={16} />
              <span className="font-semibold">{totalAbstentions}</span>
              <span className="opacity-80">abst.</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
              <span className="font-bold">{totalParticipants}</span>
              <span className="opacity-80">total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o apartamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setExpandedSection('votes')}
          className={`flex-1 py-3 px-4 text-center font-semibold transition-all flex items-center justify-center gap-2 ${
            expandedSection === 'votes'
              ? 'text-green-600 bg-green-50 border-b-2 border-green-600'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <CheckCircle size={18} />
          Votos ({totalVoters})
        </button>
        <button
          onClick={() => setExpandedSection('abstentions')}
          className={`flex-1 py-3 px-4 text-center font-semibold transition-all flex items-center justify-center gap-2 ${
            expandedSection === 'abstentions'
              ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-600'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Hand size={18} />
          Abstenciones ({totalAbstentions})
        </button>
      </div>

      {/* Contenido */}
      <div className="max-h-96 overflow-y-auto">
        {expandedSection === 'votes' ? (
          filteredVoters.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay votos registrados
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Apartamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Votó por</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVoters.map((voter, index) => (
                  <tr key={index} className="hover:bg-green-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{voter.full_name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{voter.apartment_number}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {voter.option_text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDateTime(voter.voted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          filteredAbstentions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay abstenciones registradas
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Apartamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAbstentions.map((voter, index) => (
                  <tr key={index} className="hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{voter.full_name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{voter.apartment_number}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        Se abstuvo
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDateTime(voter.abstained_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Footer con total */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-500">
        Mostrando {expandedSection === 'votes' ? filteredVoters.length : filteredAbstentions.length} de {expandedSection === 'votes' ? totalVoters : totalAbstentions} participantes
      </div>
    </div>
  );
};

export default VotersList;