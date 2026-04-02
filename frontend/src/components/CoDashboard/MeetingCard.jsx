import { useState } from 'react';
import { Calendar, Clock, Users, Video, MapPin, Loader2, Play, CalendarX } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ZoomMeetingContainer from './ZoomEmbed';
import { MeetingService } from '../../services/api/MeetingService';

export default function MeetingCard({ meeting }) {
	const [showZoom, setShowZoom] = useState(false);
	const [isJoining, setIsJoining] = useState(false);

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

	const isVirtual = meeting.str_modality !== 'presencial';

	const handleJoinMeeting = async () => {
		if (!status.canJoin || !isVirtual) return;

		// Verificar que tenemos datos de Zoom
		if (!meeting.int_zoom_meeting_id && !meeting.str_zoom_join_url) {
			toast.error('Esta reunión no tiene datos de Zoom válidos');
			return;
		}

		try {
			setIsJoining(true);

			// Registrar la hora de inicio en la base de datos
			console.log('📝 Registrando hora de inicio de la reunión...');
			await MeetingService.startMeeting(meeting.id);
			console.log('Hora de inicio registrada exitosamente');

			// Mostrar el contenedor de Zoom
			setShowZoom(true);
		} catch (error) {
			console.error('❌ Error al registrar inicio de reunión:', error);
			// Mostrar Zoom de todas formas, el registro del inicio es secundario
			setShowZoom(true);
		} finally {
			setIsJoining(false);
		}
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
							<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
								<Play size={12} className="fill-green-800" />
								En vivo
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

	// Card normal (cuando NO está mostrando Zoom) - ALTURA COMPLETA
	return (
		<div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col">
			{/* SIN min-h ya que las cards van una debajo de otra */}
			<div className="p-6 flex-1 flex flex-col">
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
					{isVirtual ? (
						<Video className="w-8 h-8 text-blue-600" />
					) : (
						<MapPin className="w-8 h-8 text-emerald-600" />
					)}
				</div>

				{/* Descripción */}
				{meeting.str_description && (
					<p className="text-gray-600 mb-4 line-clamp-2">
						{meeting.str_description}
					</p>
				)}

				{/* Información de la reunión - ICONOS DE LUCIDE-REACT */}
				<div className="space-y-3 mb-4 flex-1">
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

				{/* Boton para unirse o info de presencial */}
				{isVirtual ? (
					<button
						onClick={handleJoinMeeting}
						disabled={!status.canJoin || isJoining}
						className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
							status.canJoin && !isJoining
								? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
								: 'bg-gray-300 text-gray-500 cursor-not-allowed'
						}`}
					>
						{isJoining ? (
							<>
								<Loader2 size={18} className="animate-spin" />
								Ingresando...
							</>
						) : status.canJoin ? (
							<>
								<Video size={18} />
								Unirse a la Reunion
							</>
						) : (
							<>
								<CalendarX size={18} />
								Reunion No Disponible
							</>
						)}
					</button>
				) : (
					<div className={`w-full py-3 px-4 rounded-lg border text-center ${
						status.text === 'En Curso'
							? 'bg-emerald-100 border-emerald-300'
							: 'bg-emerald-50 border-emerald-200'
					}`}>
						<p className={`text-sm text-emerald-700 font-medium flex items-center justify-center gap-2 ${
							status.text === 'En Curso' ? 'animate-pulse' : ''
						}`}>
							<MapPin size={16} />
							{status.text === 'En Curso'
								? 'Reunion Presencial - En Curso'
								: status.text === 'Finalizada'
								? 'Reunion Presencial - Finalizada'
								: 'Reunion Presencial'}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}