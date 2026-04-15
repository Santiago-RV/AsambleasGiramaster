import { Calendar, Clock, Users, Video } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateLong, formatDateTime } from '../../utils/dateUtils';

export default function LiveMeetingCard({ meeting, onClick }) {
  const getStatusBadge = () => {
    const now = new Date();
    const scheduleDate = new Date(meeting.dat_schedule_date);
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const timeDifference = scheduleDate.getTime() - now.getTime();
    const status = (meeting.str_status || '').toLowerCase();

    // Verificar si está en curso por tiempo de inicio o por estado
    if (meeting.dat_actual_start_time || status === 'en curso') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          En Curso
        </span>
      );
    }

    // Si está dentro de 1 hora antes o ya pasó la hora
    if (timeDifference <= ONE_HOUR_MS) {
      if (timeDifference < 0) {
        // Ya pasó la hora pero no ha iniciado formalmente
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
            Esperando Inicio
          </span>
        );
      } else {
        // Falta menos de 1 hora
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Accesible
          </span>
        );
      }
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
        Programada
      </span>
    );
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'h:mm a', { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-green-400 overflow-hidden group"
    >
      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors truncate">
              {meeting.str_title}
            </h3>
            <div className="flex-shrink-0">{getStatusBadge()}</div>
          </div>
          <div className="p-2 md:p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors shrink-0">
            <Video className="text-green-600 md:size-6" size={20} />
          </div>
        </div>

        {meeting.str_description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {meeting.str_description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center text-xs md:text-sm text-gray-600">
            <Calendar size={14} className="mr-2 text-green-500 md:size-4" />
            <span>{formatDate(meeting.dat_schedule_date)}</span>
          </div>

          <div className="flex items-center text-xs md:text-sm text-gray-600 flex-wrap">
            <Clock size={14} className="mr-2 text-green-500 md:size-4" />
            <span>{formatTime(meeting.dat_schedule_date)}</span>
            {meeting.int_estimated_duration > 0 && (
              <span className="ml-1">({meeting.int_estimated_duration} min)</span>
            )}
          </div>

          <div className="flex items-center text-xs md:text-sm text-gray-600">
            <Users size={14} className="mr-2 text-green-500 md:size-4" />
            <span className="truncate">
              {meeting.connected_users_count || 0} conectados de {meeting.int_total_invitated || 0} invitados
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs md:text-sm text-gray-500">
              Tipo: {meeting.str_meeting_type}
            </span>
            {meeting.bln_quorum_reached && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Quórum alcanzado
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-center py-2 text-xs md:text-sm text-gray-600">
            <p>Haz clic para ver las encuestas de esta reunión</p>
          </div>
        </div>
      </div>
    </div>
  );
}
