import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Users, Video, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MeetingCard({ meeting, onJoinMeeting }) {
	const [isJoining, setIsJoining] = useState(false);
	const [descExpanded, setDescExpanded] = useState(false);
	const [isTruncated, setIsTruncated] = useState(false);
	const descRef = useRef(null);

	useEffect(() => {
		const el = descRef.current;
		if (el) setIsTruncated(el.scrollHeight > el.clientHeight);
	}, [meeting.str_description]);

	// Obtener estado desde la base de datos
	const getStatus = () => {
		const status = meeting.str_status?.toLowerCase();
		
		switch (status) {
			case 'in progress':
			case 'en curso':
			case 'active':
				return { text: 'En Curso', color: 'red', canJoin: true, pulsing: true };
			case 'available':
			case 'disponible':
				return { text: 'Disponible', color: 'green', canJoin: true };
			case 'scheduled':
			case 'programada':
				return { text: 'Programada', color: 'blue', canJoin: false };
			case 'completed':
			case 'completada':
			case 'finalizada':
			case 'cerrada':
				return { text: 'Finalizada', color: 'gray', canJoin: false };
			default:
				return { text: meeting.str_status || 'Programada', color: 'blue', canJoin: false };
		}
	};

	const status = getStatus();

	// Formatear fecha y hora
	const formattedDate = format(
		new Date(meeting.dat_schedule_date),
		"d MMM yyyy",
		{ locale: es }
	);

	const formattedTime = format(
		new Date(meeting.dat_schedule_date),
		'h:mm a',
		{ locale: es }
	);

	const formatDuration = (minutes) => {
		if (!minutes || minutes === 0) return 'Duración indefinida';
		if (minutes < 60) return `${minutes} minutos`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}min` : `${hours} hora${hours > 1 ? 's' : ''}`;
	};

	const isVirtual = meeting.str_modality !== 'presencial';

	const handleJoinMeeting = async () => {
		if (!status.canJoin || !isVirtual) return;
		setIsJoining(true);
		try {
			await onJoinMeeting(meeting);
		} finally {
			setIsJoining(false);
		}
	};

	const palette = {
		red:  { bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800',  icon: 'text-green-600', accent: 'text-green-500', shadow: 'shadow-green-200 hover:shadow-green-300' },
		green: { bg: 'bg-blue-50',  badge: 'bg-blue-100 text-blue-800',    icon: 'text-blue-500',  accent: 'text-blue-400',  shadow: 'shadow-blue-200 hover:shadow-blue-300' },
		blue:  { bg: 'bg-white',    badge: 'bg-blue-100 text-blue-800',    icon: 'text-blue-600',  accent: 'text-blue-400',  shadow: 'shadow-blue-200 hover:shadow-blue-300' },
		gray:  { bg: 'bg-gray-50',  badge: 'bg-gray-100 text-gray-600',    icon: 'text-gray-400',  accent: 'text-gray-400',  shadow: 'shadow-gray-200 hover:shadow-gray-300' },
	}[status.color] ?? { bg: 'bg-white', badge: 'bg-blue-100 text-blue-800', icon: 'text-blue-600', accent: 'text-blue-400', shadow: 'shadow-blue-200 hover:shadow-blue-300' };

	const isEnCurso = status.text === 'En Curso';

	return (
		<div className={`rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col ${palette.bg} ${palette.shadow}`}>
			<div className="p-6 flex-1 flex flex-col">
				{/* Header */}
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<h3 className="text-xl font-bold text-gray-800 mb-2">
							{meeting.str_title}
						</h3>
						<span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${palette.badge} ${status.pulsing ? 'animate-pulse' : ''}`}>
							{status.text}
						</span>
					</div>
					{isVirtual ? (
						<Video className={`w-8 h-8 ${palette.icon}`} />
					) : (
						<MapPin className={`w-8 h-8 ${palette.icon}`} />
					)}
				</div>

				{/* Descripción */}
				{meeting.str_description && (
					<div className="mb-4">
						<p
							ref={descRef}
							className={`text-gray-600 ${descExpanded ? '' : 'line-clamp-2'}`}
						>
							{meeting.str_description}
						</p>
						{(isTruncated || descExpanded) && (
							<button
								onClick={() => setDescExpanded(v => !v)}
								className={`text-xs font-semibold mt-1 ${palette.icon} hover:underline`}
							>
								{descExpanded ? 'Ver menos' : 'Ver más'}
							</button>
						)}
					</div>
				)}

				{/* Info */}
				<div className="space-y-3 mb-4 flex-1">
					<div className="flex items-center text-gray-700">
						<Calendar className={`w-5 h-5 mr-3 ${palette.accent}`} />
						<span>{formattedDate}</span>
					</div>
					<div className="flex items-center text-gray-700">
						<Clock className={`w-5 h-5 mr-3 ${palette.accent}`} />
						<span>{formattedTime} ({formatDuration(meeting.int_estimated_duration)})</span>
					</div>
					<div className="flex items-center text-gray-700">
						<MapPin className={`w-5 h-5 mr-3 ${palette.accent}`} />
						<span className="capitalize">{meeting.str_meeting_type}</span>
					</div>
					{meeting.int_zoom_meeting_id && (
						<div className="flex items-center text-gray-700">
							<Users className={`w-5 h-5 mr-3 ${palette.accent}`} />
							<span className="text-sm">ID Zoom: {meeting.int_zoom_meeting_id}</span>
						</div>
					)}
				</div>

				{/* Botón solo para reuniones En Curso */}
				{isEnCurso && (
					isVirtual ? (
						<button
							onClick={handleJoinMeeting}
							disabled={isJoining}
							className="w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 hover:shadow-md disabled:opacity-60"
						>
							{isJoining ? (
								<><Loader2 size={18} className="animate-spin" />Ingresando...</>
							) : (
								<><Video size={18} />Acceder Ahora</>
							)}
						</button>
					) : (
						<div className="w-full py-3 px-4 rounded-lg border bg-green-100 border-green-300 text-center">
							<p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2 animate-pulse">
								<MapPin size={16} />
								Reunión Presencial — En Curso
							</p>
						</div>
					)
				)}
			</div>
		</div>
	);
}