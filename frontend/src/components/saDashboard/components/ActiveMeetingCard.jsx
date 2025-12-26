import React from 'react';
import {
	PlayCircle,
	Users,
	Clock,
	CheckCircle,
	Vote,
	Building2,
} from 'lucide-react';
import {
	calculateMeetingDuration,
	calculateAttendancePercentage,
	formatMeetingStartTime,
	getQuorumBadgeColor,
} from '../../../services/api/ActiveMeetingService';

const ActiveMeetingCard = ({ meeting, onClick }) => {
	const duration = calculateMeetingDuration(meeting.started_at);
	const attendancePercentage = calculateAttendancePercentage(
		meeting.connected_users_count,
		meeting.total_invited
	);

	return (
		<div
			onClick={() => onClick(meeting.meeting_id)}
			className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
		>
			{/* Header con gradiente */}
			<div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm animate-pulse">
							<PlayCircle size={24} />
						</div>
						<div className="flex-1">
							<h3 className="font-bold text-lg line-clamp-1">
								{meeting.title}
							</h3>
							<p className="text-green-100 text-sm flex items-center gap-1">
								<Building2 size={14} />
								{meeting.residential_unit_name}
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 text-sm">
					<span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
						{meeting.meeting_type}
					</span>
					<span
						className={`px-2 py-1 rounded-full text-xs font-semibold ${getQuorumBadgeColor(meeting.quorum_reached)}`}
					>
						{meeting.quorum_reached ? 'Con Quórum' : 'Sin Quórum'}
					</span>
				</div>
			</div>

			{/* Estadísticas */}
			<div className="p-4">
				<div className="grid grid-cols-2 gap-3">
					<div className="bg-blue-50 rounded-lg p-3">
						<div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
							<Users size={14} />
							<span className="font-medium">Conectados</span>
						</div>
						<p className="text-2xl font-bold text-gray-800">
							{meeting.connected_users_count}
							<span className="text-sm text-gray-500 ml-1">
								/ {meeting.total_invited}
							</span>
						</p>
						<p className="text-xs text-gray-500 mt-1">
							{attendancePercentage}% asistencia
						</p>
					</div>

					<div className="bg-purple-50 rounded-lg p-3">
						<div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
							<Clock size={14} />
							<span className="font-medium">Duración</span>
						</div>
						<p className="text-2xl font-bold text-gray-800">
							{duration}
						</p>
						<p className="text-xs text-gray-500 mt-1">
							{formatMeetingStartTime(meeting.started_at)}
						</p>
					</div>
				</div>

				{/* Encuestas activas */}
				{meeting.active_polls_count > 0 && (
					<div className="mt-3 flex items-center justify-between p-2 bg-orange-50 rounded-lg">
						<div className="flex items-center gap-2 text-orange-700">
							<Vote size={16} />
							<span className="text-sm font-semibold">
								{meeting.active_polls_count} encuesta
								{meeting.active_polls_count !== 1 ? 's' : ''}{' '}
								activa
								{meeting.active_polls_count !== 1 ? 's' : ''}
							</span>
						</div>
						<CheckCircle
							size={16}
							className="text-orange-600 animate-pulse"
						/>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="px-4 pb-4">
				<button className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md">
					Ver Detalles
				</button>
			</div>
		</div>
	);
};

export default ActiveMeetingCard;
