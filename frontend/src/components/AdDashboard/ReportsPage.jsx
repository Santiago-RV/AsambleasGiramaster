import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, Vote, BarChart3, Calendar, Info, Eye, Loader2, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { UserService } from '../../services/api/UserService';
import { MeetingService } from '../../services/api/MeetingService';
import ReportModal from './ReportModal';

export default function ReportsPage() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

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

  const handleViewReport = (reportType) => {
    if (!meetings || meetings.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay reuniones',
        text: 'No hay reuniones disponibles para generar reportes',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const completedMeetings = meetings.filter(m => 
      m.str_status === 'Finalizada' || m.str_status === 'Completada' || m.str_status === 'En Curso'
    );

    if (completedMeetings.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin reuniones finalizadas',
        text: 'No hay reuniones finalizadas o en curso para ver el reporte',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (completedMeetings.length === 1) {
      setSelectedMeeting(completedMeetings[0]);
      setSelectedReportType(reportType);
      setShowReportModal(true);
      return;
    }

    const meetingOptions = completedMeetings.map(m => ({
      id: m.id,
      title: m.str_title || m.titulo,
      date: m.dat_schedule_date ? new Date(m.dat_schedule_date).toLocaleDateString('es-ES') : 'Sin fecha',
      status: m.str_status
    }));

    let optionsHtml = meetingOptions.map(m => 
      `<option value="${m.id}">${m.title} - ${m.date} (${m.status})</option>`
    ).join('');

    Swal.fire({
      title: 'Seleccionar Reunión',
      width: '400px',
      html: `
        <div style="width: 100%; margin: 0; padding: 0;">
          <p class="mb-3 text-sm text-gray-600">Selecciona una reunión para ver el reporte:</p>
          <select id="meeting-select" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background-color: white; box-sizing: border-box;">
            ${optionsHtml}
          </select>
        </div>
      `,
      confirmButtonText: 'Ver Reporte',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#6b7280',
      showCancelButton: true,
      preConfirm: () => {
        const select = document.getElementById('meeting-select');
        const meetingId = select.value;
        return meetingOptions.find(m => m.id === parseInt(meetingId));
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const meeting = meetings.find(m => m.id === result.value.id);
        setSelectedMeeting(meeting);
        setSelectedReportType(reportType);
        setShowReportModal(true);
      }
    });
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

  const meetings = meetingsData?.data || [];
  const completedMeetings = meetings.filter(m => 
    m.str_status === 'Finalizada' || m.str_status === 'Completada' || m.str_status === 'En Curso'
  );

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
            <p className="text-2xl font-bold">{completedMeetings.length}</p>
            <p className="text-xs text-emerald-100">Disponibles</p>
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

      {/* Grid de Reportes - Solo lectura */}
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
                
                {/* Botón Ver Reporte - siempre en parte inferior */}
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => handleViewReport(report.id)}
                    disabled={completedMeetings.length === 0}
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
            Los reportes contienen información histórica de las reuniones finalizadas o en curso de tu unidad residencial.
            Selecciona una reunión para visualizar los datos en detalle.
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
