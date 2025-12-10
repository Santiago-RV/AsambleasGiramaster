import { useState } from 'react';
import { Calendar, Clock, Users, Video, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ZoomMeetingContainer from './ZoomEmbed';

export default function MeetingCard({ meeting }) {
	const [showZoom, setShowZoom] = useState(false);

	// Calcular estado de la reunión
	const getStatus = () => {
		const now = new Date();
		const scheduledDate = new Date(meeting.dat_schedule_date);
		const oneHourBefore = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
		
		const duration = meeting.int_estimated_duration > 0 
			? meeting.int_estimated_duration 
			: 240;
			
		const meetingEnd = new Date(
			scheduledDate.getTime() + duration * 60 * 1000
		);

		if (now < oneHourBefore) {
			return { text: 'Programada', color: 'blue', canJoin: false };
		} else if (now < scheduledDate) {
			return { text: 'Disponible', color: 'green', canJoin: true };
		} else if (now < meetingEnd) {
			return { text: 'En Curso', color: 'red', canJoin: true, pulsing: true };
		} else {
			return { text: 'Finalizada', color: 'gray', canJoin: false };
		}
	};

	const status = getStatus();

	// Formatear fecha y hora
	const formattedDate = format(
		new Date(meeting.dat_schedule_date),
		"d 'de' MMMM, yyyy",
		{ locale: es }
	);

	const formattedTime = format(
		new Date(meeting.dat_schedule_date),
		'HH:mm',
		{ locale: es }
	);

	const formatDuration = (minutes) => {
		if (!minutes || minutes === 0) return 'Duración indefinida';
		if (minutes < 60) return `${minutes} minutos`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}min` : `${hours} hora${hours > 1 ? 's' : ''}`;
	};

	const handleJoinMeeting = () => {
		if (!status.canJoin) return;
		
		// Verificar que tenemos datos de Zoom
		if (!meeting.int_zoom_meeting_id && !meeting.str_zoom_join_url) {
			alert('Esta reunión no tiene datos de Zoom válidos');
			return;
		}
		
		setShowZoom(true);
	};

	const handleCloseMeeting = () => {
		setShowZoom(false);
	};

	// Si está mostrando Zoom, renderizar el contenedor
	if (showZoom) {
		return (
			<div className="space-y-4">
				{/* Card colapsado con info básica */}
				<div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-600">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-gray-800">
								{meeting.str_title}
							</h3>
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
								🔴 En vivo
							</span>
						</div>
						<button
							onClick={handleCloseMeeting}
							className="text-gray-500 hover:text-gray-700 text-sm"
						>
							Minimizar
						</button>
					</div>
				</div>

				{/* Zoom embebido usando SDK Embedded */}
				<ZoomMeetingContainer
					meetingData={meeting}
					onClose={handleCloseMeeting}
					startFullscreen={false}
				/>
			</div>
		);
	}

	// Card normal (cuando NO está mostrando Zoom)
	return (
		<div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
			{/* Header con estado */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex-1">
					<h3 className="text-xl font-bold text-gray-800 mb-2">
						{meeting.str_title}
					</h3>
					<span
						className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
							status.color === 'blue'
								? 'bg-blue-100 text-blue-800'
								: status.color === 'green'
								? 'bg-green-100 text-green-800'
								: status.color === 'red'
								? 'bg-red-100 text-red-800'
								: 'bg-gray-100 text-gray-800'
						} ${status.pulsing ? 'animate-pulse' : ''}`}
					>
						{status.text}
					</span>
				</div>
				<Video className="w-8 h-8 text-blue-600" />
			</div>

			{/* Descripción */}
			{meeting.str_description && (
				<p className="text-gray-600 mb-4 line-clamp-2">
					{meeting.str_description}
				</p>
			)}

			{/* Información de la reunión */}
			<div className="space-y-3 mb-4">
				<div className="flex items-center text-gray-700">
					<Calendar className="w-5 h-5 mr-3 text-gray-400" />
					<span>{formattedDate}</span>
				</div>

				<div className="flex items-center text-gray-700">
					<Clock className="w-5 h-5 mr-3 text-gray-400" />
					<span>
						{formattedTime} ({formatDuration(meeting.int_estimated_duration)})
					</span>
				</div>

				<div className="flex items-center text-gray-700">
					<MapPin className="w-5 h-5 mr-3 text-gray-400" />
					<span className="capitalize">{meeting.str_meeting_type}</span>
				</div>

				{meeting.int_zoom_meeting_id && (
					<div className="flex items-center text-gray-700">
						<Users className="w-5 h-5 mr-3 text-gray-400" />
						<span className="text-sm">
							ID Zoom: {meeting.int_zoom_meeting_id}
						</span>
					</div>
				)}
			</div>

			{/* Botón para unirse */}
			<button
				onClick={handleJoinMeeting}
				disabled={!status.canJoin}
				className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
					status.canJoin
						? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
						: 'bg-gray-300 text-gray-500 cursor-not-allowed'
				}`}
			>
				{status.canJoin ? '🎥 Unirse a la Reunión' : '📅 Reunión No Disponible'}
			</button>
		</div>
	);
}