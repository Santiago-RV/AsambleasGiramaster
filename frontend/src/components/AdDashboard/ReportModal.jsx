import { useState, useEffect } from 'react';
import { X, Users, Vote, PieChart, BarChart3, Loader2, AlertCircle, CheckCircle, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { ReportsService } from '../../services/api/ReportsService';
import { MeetingService } from '../../services/api/MeetingService';

const ReportModal = ({ isOpen, onClose, reportType, meetingId, meetingTitle }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen && meetingId && reportType) {
      loadReportData();
    }
  }, [isOpen, meetingId, reportType]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch (reportType) {
        case 'participation':
          response = await ReportsService.getAttendanceReport(meetingId);
          break;
        case 'voting':
          response = await ReportsService.getPollsReport(meetingId);
          break;
        case 'powers':
          response = await ReportsService.getDelegationsReport(meetingId);
          break;
        default:
          throw new Error('Tipo de reporte desconocido');
      }
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Error al cargar el reporte');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const reportTitles = {
    participation: 'Reporte de Participación',
    voting: 'Reporte de Votaciones',
    powers: 'Reporte de Poderes'
  };

  const reportIcons = {
    participation: Users,
    voting: Vote,
    powers: BarChart3
  };

  const Icon = reportIcons[reportType] || Users;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{reportTitles[reportType]}</h2>
                <p className="text-emerald-100 text-sm">{meetingTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-red-800">Error</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && data && (
              <>
                {reportType === 'participation' && (
                  <AttendanceReportContent data={data} />
                )}
                {reportType === 'voting' && (
                  <PollsReportContent data={data} />
                )}
                {reportType === 'powers' && (
                  <DelegationsReportContent data={data} />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendanceReportContent = ({ data }) => {
  const { summary, attended, absent } = data;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-3xl font-bold text-blue-600">{summary.total_invited}</p>
          <p className="text-sm text-blue-700">Total Invitados</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-3xl font-bold text-emerald-600">{summary.total_attended}</p>
          <p className="text-sm text-emerald-700">Asistieron</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-3xl font-bold text-red-600">{summary.total_absent}</p>
          <p className="text-sm text-red-700">No Asistieron</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-3xl font-bold text-purple-600">{summary.attendance_percentage}%</p>
          <p className="text-sm text-purple-700">% Participación</p>
        </div>
      </div>

      {/* Quorum Info */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-amber-600" size={20} />
          <span className="font-semibold text-amber-800">Quórum Alcanzado</span>
        </div>
        <p className="text-2xl font-bold text-amber-700">{summary.quorum_achieved}</p>
      </div>

      {/* Attended List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
          <UserCheck className="text-emerald-600" size={18} />
          <h3 className="font-semibold text-emerald-800">Lista de Asistentes ({attended.length})</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Apartamento</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Peso Quórum</th>
              </tr>
            </thead>
            <tbody>
              {attended.map((person, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-4 py-2">{person.full_name}</td>
                  <td className="px-4 py-2">{person.apartment}</td>
                  <td className="px-4 py-2 text-right">{person.quorum_base}</td>
                </tr>
              ))}
              {attended.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No hay asistentes registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Absent List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
          <UserX className="text-red-600" size={18} />
          <h3 className="font-semibold text-red-800">Lista de No Asistentes ({absent.length})</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Apartamento</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Peso Quórum</th>
              </tr>
            </thead>
            <tbody>
              {absent.map((person, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-4 py-2">{person.full_name}</td>
                  <td className="px-4 py-2">{person.apartment}</td>
                  <td className="px-4 py-2 text-right">{person.quorum_base}</td>
                </tr>
              ))}
              {absent.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No hay ausentes</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const QuorumReportContent = ({ data }) => {
  const { quorum_analysis, comparison } = data;
  
  return (
    <div className="space-y-6">
      {/* Quorum Analysis Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-3xl font-bold text-blue-600">{quorum_analysis.total_invited}</p>
          <p className="text-sm text-blue-700">Total Invitados</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-3xl font-bold text-emerald-600">{quorum_analysis.total_attended}</p>
          <p className="text-sm text-emerald-700">Asistentes</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-3xl font-bold text-purple-600">{quorum_analysis.quorum_percentage}%</p>
          <p className="text-sm text-purple-700">% Quórum</p>
        </div>
        <div className={`rounded-xl p-4 border ${quorum_analysis.quorum_reached ? 'bg-emerald-100 border-emerald-300' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-3xl font-bold ${quorum_analysis.quorum_reached ? 'text-emerald-600' : 'text-red-600'}`}>
            {quorum_analysis.quorum_reached ? 'SÍ' : 'NO'}
          </p>
          <p className={`text-sm ${quorum_analysis.quorum_reached ? 'text-emerald-700' : 'text-red-700'}`}>Quórum Alcanzado</p>
        </div>
      </div>

      {/* Quorum Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Progreso de Quórum</h3>
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-500 ${quorum_analysis.quorum_reached ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(quorum_analysis.quorum_percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>0%</span>
          <span className="font-medium">{quorum_analysis.quorum_percentage.toFixed(1)}%</span>
          <span>100%</span>
        </div>
        <div className="mt-2 text-center">
          <span className="text-sm text-gray-500">Requerido: {quorum_analysis.required_percentage}%</span>
        </div>
      </div>

      {/* Weight Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Peso de Quórum</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Alcanzado</span>
                <span className="font-medium text-emerald-600">{comparison.quorum_weight.attended}</span>
              </div>
              <div className="h-2 bg-emerald-100 rounded-full">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(comparison.quorum_weight.attended / (comparison.quorum_weight.attended + comparison.quorum_weight.missing || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Faltante</span>
                <span className="font-medium text-red-500">{comparison.quorum_weight.missing}</span>
              </div>
              <div className="h-2 bg-red-100 rounded-full">
                <div 
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${(comparison.quorum_weight.missing / (comparison.quorum_weight.attended + comparison.quorum_weight.missing || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Comparación de Invitaciones</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Asistieron</span>
              <span className="font-bold text-emerald-600">{comparison.invitations.attended}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">No asistieron</span>
              <span className="font-bold text-red-500">{comparison.invitations.absent}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PollsReportContent = ({ data }) => {
  const { polls } = data;
  
  if (!polls || polls.length === 0) {
    return (
      <div className="text-center py-12">
        <Vote className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No hay encuestas</h3>
        <p className="text-gray-500">Esta reunión no tiene encuestas registradas</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {polls.map((poll) => (
        <div key={poll.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{poll.title}</h3>
                {poll.description && <p className="text-sm text-gray-500">{poll.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  poll.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  poll.status === 'active' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {poll.status === 'active' ? 'Activa' : poll.status === 'closed' ? 'Cerrada' : 'Borrador'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{poll.total_voters}</p>
                <p className="text-xs text-gray-500">Votantes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{poll.total_weight_voted}</p>
                <p className="text-xs text-gray-500">Peso Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{poll.options.length}</p>
                <p className="text-xs text-gray-500">Opciones</p>
              </div>
            </div>
            
            {poll.options.map((option, optIdx) => {
              const percentage = poll.total_weight_voted > 0 
                ? (option.votes_weight / poll.total_weight_voted * 100) 
                : 0;
              return (
                <div key={optIdx} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{option.text}</span>
                    <span className="font-medium">
                      {option.votes_count} votos ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {poll.abstentions && poll.abstentions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Abstenciones: {poll.abstentions.length}</p>
                <div className="flex flex-wrap gap-1">
                  {poll.abstentions.map((abs, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {abs.full_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const DelegationsReportContent = ({ data }) => {
  const { summary, delegations } = data;
  
  if (!delegations || delegations.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No hay poderes</h3>
        <p className="text-gray-500">Esta reunión no tiene poderes registrados</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-3xl font-bold text-blue-600">{summary.total_delegations}</p>
          <p className="text-sm text-blue-700">Total de Poderes</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-3xl font-bold text-purple-600">{summary.total_delegated_weight}</p>
          <p className="text-sm text-purple-700">Peso Total Delegado</p>
        </div>
      </div>

      {/* Delegations List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Lista de Poderes ({delegations.length})</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Otorga Poder</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Apartamento</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Recibe Poder</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Peso</th>
              </tr>
            </thead>
            <tbody>
              {delegations.map((delegation, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserX className="text-red-400" size={14} />
                      <span>{delegation.delegator.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{delegation.delegator.apartment}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="text-emerald-400" size={14} />
                      <span>{delegation.delegate.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{delegation.delegated_weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
