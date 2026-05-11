// MeetingsPage.jsx - VERSIÓN CORREGIDA

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, Calendar, Clock, AlertCircle } from 'lucide-react';
import { MeetingService } from '../../services/api/MeetingService';
import MeetingCard from './MeetingCard';

const MeetingsPage = ({ residentialUnitId, onJoinMeeting }) => {
  const {
    data: meetingsData,
    isLoading: isLoadingMeetings,
    isError: isErrorMeetings,
    refetch: refetchMeetings,
  } = useQuery({
    queryKey: ['copropietario-meetings', residentialUnitId],
    queryFn: () => MeetingService.getMeetingsByResidentialUnit(residentialUnitId),
    select: (response) => {
      // EXTRAER EL ARRAY DE REUNIONES DEL RESPONSE
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!residentialUnitId,
  });

  // Estado de carga
  if (isLoadingMeetings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 font-medium">Cargando reuniones...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (isErrorMeetings) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error al cargar reuniones</h3>
          <p className="text-red-600 text-sm mb-4">
            No se pudieron cargar las reuniones. Por favor, intenta nuevamente.
          </p>
          <button
            onClick={() => refetchMeetings()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Lista vacía (ahora meetingsData es un array gracias al select)
  if (!meetingsData || meetingsData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay reuniones programadas
          </h3>
          <p className="text-gray-600">
            Cuando se programe una asamblea, aparecerá aquí y recibirás una notificación por correo
          </p>
        </div>
      </div>
    );
  }

  // Obtener estado desde la base de datos
  const getMeetingStatus = (meeting) => {
    const status = meeting.str_status?.toLowerCase();
    
    switch (status) {
      case 'in progress':
      case 'en curso':
      case 'active':
        return 'En Curso';
      case 'available':
      case 'disponible':
        return 'Disponible';
      case 'scheduled':
      case 'programada':
        return 'Programada';
      case 'completed':
      case 'completada':
      case 'finalizada':
      case 'cerrada':
        return 'Finalizada';
      default:
        return meeting.str_status || 'Programada';
    }
  };

  // Usar estado直接从 la base de datos
  const meetingsWithStatus = meetingsData.map((meeting) => ({
    ...meeting,
    computedStatus: getMeetingStatus(meeting)
  }));

  const byDate = (a, b) => new Date(a.dat_schedule_date) - new Date(b.dat_schedule_date);

  const sections = [
    {
      meetings: meetingsWithStatus.filter((m) => m.computedStatus === 'En Curso').sort(byDate),
      icon: <Video className="text-green-600" size={24} />,
      title: 'En Curso',
      titleClass: 'text-green-800',
    },
    {
      meetings: meetingsWithStatus
        .filter((m) => m.computedStatus === 'Programada' || m.computedStatus === 'Disponible')
        .sort(byDate),
      icon: <Calendar className="text-blue-600" size={24} />,
      title: 'Programadas',
      titleClass: 'text-gray-800',
    },
    {
      meetings: meetingsWithStatus.filter((m) => m.computedStatus === 'Finalizada').sort(byDate),
      icon: <Clock className="text-gray-500" size={24} />,
      title: 'Completadas',
      titleClass: 'text-gray-700',
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ meetings, icon, title, titleClass }) =>
        meetings.length > 0 ? (
          <div key={title}>
            <div className="flex items-center gap-2 mb-4">
              {icon}
              <h2 className={`text-xl font-bold ${titleClass}`}>{title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} onJoinMeeting={onJoinMeeting} />
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};

export default MeetingsPage;