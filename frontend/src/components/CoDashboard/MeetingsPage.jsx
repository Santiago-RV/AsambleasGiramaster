// MeetingsPage.jsx - VERSIÓN CORREGIDA

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, Calendar, Clock, AlertCircle } from 'lucide-react';
import { MeetingService } from '../../services/api/MeetingService';
import MeetingCard from './MeetingCard';

const MeetingsPage = ({ residentialUnitId }) => {
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

  // CALCULAR ESTADO DINÁMICO PARA CADA REUNIÓN
  const meetingsWithStatus = meetingsData.map((meeting) => {
    const now = new Date();
    const scheduledDate = new Date(meeting.dat_schedule_date);
    const oneHourBefore = new Date(scheduledDate.getTime() - 60 * 60 * 1000);

    const duration = meeting.int_estimated_duration > 0
      ? meeting.int_estimated_duration
      : 240;

    const meetingEnd = new Date(scheduledDate.getTime() + duration * 60 * 1000);

    let computedStatus;
    if (now < oneHourBefore) {
      computedStatus = 'Programada';
    } else if (now < scheduledDate) {
      computedStatus = 'Disponible';
    } else if (now < meetingEnd) {
      computedStatus = 'En Curso';
    } else {
      computedStatus = 'Finalizada';
    }

    return {
      ...meeting,
      computedStatus
    };
  });

  // Separar reuniones por estado CALCULADO
  const activeOrUpcoming = meetingsWithStatus.filter(
    (m) => m.computedStatus !== 'Finalizada'
  );
  const finished = meetingsWithStatus.filter(
    (m) => m.computedStatus === 'Finalizada'
  );

  // ORDENAR REUNIONES ACTIVAS PARA QUE "EN CURSO" APAREZCA PRIMERO
  const sortedActiveOrUpcoming = activeOrUpcoming.sort((a, b) => {
    const statusOrder = {
      'En Curso': 0,
      'Disponible': 1,
      'Programada': 2
    };
    
    const statusA = statusOrder[a.computedStatus] ?? 3;
    const statusB = statusOrder[b.computedStatus] ?? 3;
    
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    // Si tienen el mismo estado, ordenar por fecha (más reciente primero)
    return new Date(a.dat_schedule_date) - new Date(b.dat_schedule_date);
  });

  return (
    <div className="space-y-6">
      {/* Reuniones Activas/Próximas */}
      {sortedActiveOrUpcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">
              Reuniones Activas y Próximas
            </h2>
          </div>
          {/* CAMBIAR A UNA SOLA COLUMNA */}
          <div className="space-y-4">
            {sortedActiveOrUpcoming.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      )}

      {/* Reuniones Finalizadas */}
      {finished.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-gray-500" size={24} />
            <h2 className="text-xl font-bold text-gray-700">
              Reuniones Finalizadas
            </h2>
          </div>
          {/* CAMBIAR A UNA SOLA COLUMNA */}
          <div className="space-y-4">
            {finished.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;