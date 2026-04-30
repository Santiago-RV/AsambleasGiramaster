import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, Vote, BarChart3, Calendar, Info, Eye, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { UserService } from '../../services/api/UserService';
import { MeetingService } from '../../services/api/MeetingService';
import ReportModal from './ReportModal';
import { formatDateLong } from '../../utils/dateUtils';

export default function ReportsPage() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');

  const { data: residentialUnitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['admin-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
  });

  const residentialUnitId = residentialUnitData?.data?.residential_unit_id;

  const { data: meetingsData, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['meetings', residentialUnitId],
    queryFn: () => MeetingService.getMeetingsByResidentialUnit(residentialUnitId),
    enabled: !!residentialUnitId,
    retry: 1,
  });

  const reports = [
    {
      id: 'participation',
      title: 'Reporte de Participación',
      description: 'Asistencia y participación en reuniones.',
      icon: Users,
      color: 'emerald',
      features: [
        'Lista completa de asistentes',
        'Porcentaje de participación',
        'Histórico de reuniones',
        'Análisis por apartamento'
      ]
    },
    {
      id: 'voting',
      title: 'Reporte de Votaciones',
      description: 'Votaciones y decisiones tomadas en reuniones.',
      icon: Vote,
      color: 'blue',
      features: [
        'Resultados por encuesta',
        'Votos por opción',
        'Porcentajes de aprobación',
        'Histórico de votaciones'
      ]
    },
    {
      id: 'powers',
      title: 'Reporte de Poderes',
      description: 'Poderes otorgados y recibidos en reuniones.',
      icon: BarChart3,
      color: 'amber',
      features: [
        'Poderes otorgados',
        'Poderes recibidos',
        'Relaciones de poder',
        'Histórico de delegaciones'
      ]
    }
  ];

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
      button: 'from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      button: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'bg-purple-100 text-purple-600',
      button: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'bg-amber-100 text-amber-600',
      button: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    }
  };

  const meetings = meetingsData?.data || [];

  // Auto-seleccionar la primera reunión cuando cargan los datos (debe estar antes del return temprano)
  useEffect(() => {
    if (meetings.length > 0 && !selectedMeetingId) {
      setSelectedMeetingId(String(meetings[0].id));
    }
  }, [meetings.length]);

  const handleViewReport = (reportType) => {
    if (!selectedMeetingId) return;
    const meeting = meetings.find(m => m.id === parseInt(selectedMeetingId));
    if (!meeting) return;
    setSelectedMeeting(meeting);
    setSelectedReportType(reportType);
    setShowReportModal(true);
  };

  const handleCloseModal = () => {
    setShowReportModal(false);
    setSelectedReportType(null);
    setSelectedMeeting(null);
  };

  if (isLoadingUnit || isLoadingMeetings) {
    return (
      <section className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </section>
    );
  }

  const statusBadge = (status) => {
    const map = {
      'En Curso':   'bg-green-100 text-green-700',
      'Completada': 'bg-blue-100 text-blue-700',
      'Finalizada': 'bg-gray-100 text-gray-600',
      'Programada': 'bg-yellow-100 text-yellow-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const activeMeeting = meetings.find(m => m.id === parseInt(selectedMeetingId));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FileText size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Reportes</h2>
            <p className="text-emerald-100 mt-1">
              Visualiza los reportes disponibles de tu unidad residencial
            </p>
          </div>
        </div>

        {/* Stats resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{meetings.length}</p>
            <p className="text-xs text-emerald-100">Total Reuniones</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{meetings.filter(m => m.str_status === 'Completada' || m.str_status === 'Finalizada').length}</p>
            <p className="text-xs text-emerald-100">Finalizadas</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{meetings.filter(m => m.str_status === 'Programada').length}</p>
            <p className="text-xs text-emerald-100">Programadas</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{meetings.filter(m => m.str_status === 'En Curso').length}</p>
            <p className="text-xs text-emerald-100">En Curso</p>
          </div>
        </div>
      </div>

      {/* Selector de reunión */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="text-emerald-600" size={20} />
          <h3 className="font-semibold text-gray-800">Seleccionar Reunión</h3>
        </div>

        {meetings.length === 0 ? (
          <p className="text-sm text-gray-500">No hay reuniones registradas para esta unidad residencial.</p>
        ) : (
          <div className="relative">
            <select
              value={selectedMeetingId}
              onChange={e => setSelectedMeetingId(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            >
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.str_title} — {m.dat_schedule_date ? formatDateLong(m.dat_schedule_date) : 'Sin fecha'} ({m.str_status})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        )}

        {activeMeeting && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Estado:</span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${statusBadge(activeMeeting.str_status)}`}>
              {activeMeeting.str_status}
            </span>
            <span className="ml-2">Tipo: {activeMeeting.str_meeting_type}</span>
          </div>
        )}
      </div>

      {/* Grid de Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const colors = colorClasses[report.color];

          return (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
            >
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${colors.icon}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{report.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  </div>
                </div>

                {/* Features */}
                <div className={`mt-4 p-4 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Incluye:</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {report.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                        <CheckCircle size={12} className="text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón Ver Reporte */}
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => handleViewReport(report.id)}
                    disabled={!selectedMeetingId || meetings.length === 0}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${colors.button} text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Eye size={18} />
                    <span>Ver Reporte</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-semibold text-blue-800 text-sm">Información</h4>
          <p className="text-xs text-blue-700 mt-1">
            Puedes ver reportes de cualquier reunión de tu unidad residencial sin importar su estado actual.
          </p>
        </div>
      </div>

      {/* Modal de Reporte */}
      <ReportModal
        isOpen={showReportModal}
        onClose={handleCloseModal}
        reportType={selectedReportType}
        meetingId={selectedMeeting?.id}
        meetingTitle={selectedMeeting?.str_title || selectedMeeting?.titulo}
      />
    </section>
  );
}
