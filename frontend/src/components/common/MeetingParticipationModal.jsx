import React from 'react';
import { Users, Calendar, Clock, LogIn, X } from 'lucide-react';

const MeetingParticipationModal = ({ show, meeting, onConfirm, onDecline, isLoading }) => {
    if (!show || !meeting) return null;

    const formatMeetingType = (type) => {
        const types = {
            'virtual': 'Virtual',
            'presencial': 'Presencial',
            'hibrida': 'Híbrida'
        };
        return types[type] || type;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-blue-600 rounded-t-lg">
                    <div className="flex items-center gap-2 text-white">
                        <Users size={24} />
                        <h2 className="text-xl font-bold">Reunión Activa</h2>
                    </div>
                    <button
                        onClick={onDecline}
                        className="p-1 hover:bg-blue-700 rounded"
                        disabled={isLoading}
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-center">
                    <div className="mb-4">
                        <div className="bg-blue-100 rounded-full p-4 inline-flex mb-3">
                            <Calendar size={48} className="text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{meeting.title}</h3>
                        {meeting.description && (
                            <p className="text-sm text-gray-500 mb-3">{meeting.description}</p>
                        )}
                    </div>

                    <div className="flex justify-center gap-6 mb-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                                <Users size={14} />
                                <span>Tipo</span>
                            </div>
                            <span className="font-semibold text-gray-700">
                                {formatMeetingType(meeting.meeting_type)}
                            </span>
                        </div>
                        {meeting.already_participated && (
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                                    <Clock size={14} />
                                    <span>Estado</span>
                                </div>
                                <span className="font-semibold text-green-600">Ya participaste</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 flex items-center gap-2 p-3 rounded-lg">
                        <LogIn size={20} className="text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-blue-700 text-left">
                            {meeting.already_participated
                                ? '¿Desea registrar su reconexión a la reunión?'
                                : '¿Desea registrar su participación en esta reunión?'}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-center gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onDecline}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Más tarde
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Registrando...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                {meeting.already_participated ? 'Reconectar' : 'Participar'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingParticipationModal;
