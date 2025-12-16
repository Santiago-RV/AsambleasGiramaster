import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Users, Plus, Video, CheckCircle, XCircle, AlertCircle, ChevronRight, AlertTriangle } from 'lucide-react';

const MeetingsSection = ({ meetings, isLoading, onCreateMeeting, onJoinMeeting }) => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' o 'past'

  // Filtrar y ordenar reuniones
  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = new Date();

    const upcoming = [];
    const past = [];

    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.fechaCompleta);

      if (meetingDate >= now || meeting.estado?.toLowerCase() === 'en curso' || meeting.estado?.toLowerCase() === 'activa') {
        upcoming.push(meeting);
      } else {
        past.push(meeting);
      }
    });

    // Ordenar próximas reuniones: más cercanas primero
    upcoming.sort((a, b) => new Date(a.fechaCompleta) - new Date(b.fechaCompleta));

    // Ordenar reuniones pasadas: más recientes primero
    past.sort((a, b) => new Date(b.fechaCompleta) - new Date(a.fechaCompleta));

    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [meetings]);

  const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const getStatusInfo = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'en curso':
      case 'activa':
        return {
          color: 'emerald',
          icon: CheckCircle,
          text: 'En Curso',
          bgClass: 'bg-emerald-50',
          borderClass: 'border-emerald-200',
          textClass: 'text-emerald-700',
          badgeClass: 'bg-emerald-100 text-emerald-700',
        };
      case 'programada':
      case 'pendiente':
        return {
          color: 'blue',
          icon: Clock,
          text: 'Programada',
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-200',
          textClass: 'text-blue-700',
          badgeClass: 'bg-blue-100 text-blue-700',
        };
      case 'completada':
      case 'finalizada':
        return {
          color: 'gray',
          icon: CheckCircle,
          text: 'Finalizada',
          bgClass: 'bg-gray-50',
          borderClass: 'border-gray-200',
          textClass: 'text-gray-600',
          badgeClass: 'bg-gray-100 text-gray-600',
        };
      case 'cancelada':
        return {
          color: 'red',
          icon: XCircle,
          text: 'Cancelada',
          bgClass: 'bg-red-50',
          borderClass: 'border-red-200',
          textClass: 'text-red-700',
          badgeClass: 'bg-red-100 text-red-700',
        };
      default:
        return {
          color: 'gray',
          icon: AlertCircle,
          text: status || 'Sin estado',
          bgClass: 'bg-gray-50',
          borderClass: 'border-gray-200',
          textClass: 'text-gray-600',
          badgeClass: 'bg-gray-100 text-gray-600',
        };
    }
  };

  const canAccessMeeting = (meetingDate) => {
    const now = new Date();
    const oneHourBefore = new Date(meetingDate.getTime() - 60 * 60 * 1000);
    return now >= oneHourBefore;
  };

  const getTimeUntilMeeting = (meetingDate) => {
    const now = new Date();
    const diff = meetingDate - now;

    if (diff < 0) return 'Ya pasó';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `En ${days} día${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `En ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `En ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      return 'Ahora';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <Calendar className="absolute inset-0 m-auto text-blue-600" size={24} />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Cargando reuniones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reuniones Virtuales</h2>
              <p className="text-purple-100 text-sm">
                {upcomingMeetings.length} próxima{upcomingMeetings.length !== 1 ? 's' : ''} · {pastMeetings.length} pasada{pastMeetings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onCreateMeeting}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span>Nueva Reunión</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${
              activeTab === 'upcoming'
                ? 'text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ChevronRight size={16} />
              <span>Próximas</span>
              {upcomingMeetings.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'upcoming'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {upcomingMeetings.length}
                </span>
              )}
            </div>
            {activeTab === 'upcoming' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${
              activeTab === 'past'
                ? 'text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock size={16} />
              <span>Historial</span>
              {pastMeetings.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'past'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {pastMeetings.length}
                </span>
              )}
            </div>
            {activeTab === 'past' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {displayMeetings && displayMeetings.length > 0 ? (
          <div className="grid gap-4">
            {displayMeetings.map((meeting) => {
              const statusInfo = getStatusInfo(meeting.estado);
              const StatusIcon = statusInfo.icon;
              const isActive = meeting.estado?.toLowerCase() === 'en curso' || meeting.estado?.toLowerCase() === 'activa';
              const isProgrammed = meeting.estado?.toLowerCase() === 'programada';
              const canAccess = isProgrammed && canAccessMeeting(meeting.fechaCompleta);
              const timeUntil = getTimeUntilMeeting(meeting.fechaCompleta);

              return (
                <div
                  key={meeting.id}
                  className={`relative border-2 ${statusInfo.borderClass} ${statusInfo.bgClass} rounded-xl p-5 hover:shadow-md transition-all group`}
                >
                  {/* Status badge and time until */}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.badgeClass}`}>
                      <StatusIcon size={14} />
                      {statusInfo.text}
                    </span>
                    {activeTab === 'upcoming' && isProgrammed && (
                      <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                        {timeUntil}
                      </span>
                    )}
                  </div>

                  {/* Meeting info */}
                  <div className="pr-32">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-purple-600 transition-colors">
                      {meeting.titulo}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="p-1.5 bg-white rounded-lg">
                          <Calendar size={16} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Fecha</p>
                          <p className="font-semibold text-gray-700">
                            {new Date(meeting.fecha).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="p-1.5 bg-white rounded-lg">
                          <Clock size={16} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Hora</p>
                          <p className="font-semibold text-gray-700">{meeting.hora}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="p-1.5 bg-white rounded-lg">
                          <Users size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Asistentes</p>
                          <p className="font-semibold text-gray-700">{meeting.asistentes || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === 'upcoming' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {isActive && (
                        <button
                          onClick={() => onJoinMeeting && onJoinMeeting(meeting)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg"
                        >
                          <Video size={20} />
                          <span>Unirse a la Reunión</span>
                        </button>
                      )}

                      {isProgrammed && (
                        canAccess ? (
                          <button
                            onClick={() => onJoinMeeting && onJoinMeeting(meeting)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg"
                          >
                            <Video size={20} />
                            <span>Acceder a la Reunión</span>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <button
                              disabled
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed font-semibold"
                            >
                              <Clock size={20} />
                              <span>Reunión Programada</span>
                            </button>
                            <div className="flex items-center gap-2 justify-center text-xs text-gray-500">
                              <AlertCircle size={14} />
                              <span>
                                Disponible desde{' '}
                                {new Date(meeting.fechaCompleta.getTime() - 60 * 60 * 1000).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Past meeting info */}
                  {activeTab === 'past' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-center py-2 text-sm text-gray-500">
                        <p className="font-medium flex items-center justify-center gap-2">
                          {meeting.estado?.toLowerCase() === 'cancelada' ? (
                            <>
                              <AlertTriangle size={16} className="text-red-500" />
                              <span>Reunión cancelada</span>
                            </>
                          ) : meeting.estado?.toLowerCase() === 'completada' || meeting.estado?.toLowerCase() === 'finalizada' ? (
                            <>
                              <CheckCircle size={16} className="text-green-500" />
                              <span>Reunión finalizada</span>
                            </>
                          ) : (
                            <>
                              <Calendar size={16} className="text-gray-500" />
                              <span>Reunión pasada</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex p-6 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full mb-4">
              <Calendar className="text-purple-600" size={48} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {activeTab === 'upcoming'
                ? 'No hay reuniones programadas'
                : 'No hay reuniones en el historial'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {activeTab === 'upcoming'
                ? 'Crea tu primera reunión virtual para comenzar a gestionar las asambleas de tu unidad residencial'
                : 'Las reuniones finalizadas o pasadas aparecerán aquí'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={onCreateMeeting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                <Plus size={20} />
                <span>Crear Primera Reunión</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingsSection;
