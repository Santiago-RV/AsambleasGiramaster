import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import { MeetingService } from '../../services/api/MeetingService';
import MeetingCard from './MeetingCard';

const MeetingsPage = ({ residentialUnitId }) => {
	// Obtener reuniones de la unidad residencial
	const {
		data: meetingsData,
		isLoading: isLoadingMeetings,
		isError: isErrorMeetings,
		refetch: refetchMeetings,
	} = useQuery({
		queryKey: ['copropietario-meetings', residentialUnitId],
		queryFn: () => MeetingService.getMeetingsByResidentialUnit(residentialUnitId),
		enabled: !!residentialUnitId,
		refetchInterval: 60000, // Refrescar cada minuto para actualizar estados
		select: (response) => {
			if (response.success && response.data) {
				// Procesar y agregar estados dinámicos
				return response.data.map((meeting) => {
					const scheduledDate = new Date(meeting.dat_schedule_date);
					const now = new Date();
					const oneHourBefore = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
					const estimatedDuration = meeting.int_estimated_duration || 120; // default 2 horas
					const meetingEnd = new Date(scheduledDate.getTime() + estimatedDuration * 60 * 1000);

					let status = 'Programada';
					let statusColor = 'blue';

					if (now >= meetingEnd) {
						status = 'Finalizada';
						statusColor = 'gray';
					} else if (now >= scheduledDate) {
						status = 'En Curso';
						statusColor = 'red';
					} else if (now >= oneHourBefore) {
						status = 'Disponible';
						statusColor = 'green';
					}

					return {
						...meeting,
						id: meeting.id,
						title: meeting.str_title,
						description: meeting.str_description,
						type: meeting.str_meeting_type,
						scheduledDate: scheduledDate,
						status: status,
						statusColor: statusColor,
						zoomUrl: meeting.str_zoom_join_url,
						zoomMeetingId: meeting.int_zoom_meeting_id,
						estimatedDuration: estimatedDuration,
						canJoin: status === 'En Curso' || status === 'Disponible',
					};
				});
			}
			return [];
		},
	});

	// Renderizado de loading
	if (isLoadingMeetings) {
		return (
			<div className="bg-white rounded-xl shadow-sm p-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<svg
							className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
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
						<p className="text-gray-600 font-semibold">Cargando reuniones...</p>
					</div>
				</div>
			</div>
		);
	}

	// Renderizado de error
	if (isErrorMeetings) {
		return (
			<div className="bg-white rounded-xl shadow-sm p-8">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
					<p className="text-red-700 font-semibold mb-2">Error al cargar reuniones</p>
					<p className="text-red-600 text-sm mb-4">
						No se pudieron obtener las reuniones. Por favor, intenta nuevamente.
					</p>
					<button
						onClick={() => refetchMeetings()}
						className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						Reintentar
					</button>
				</div>
			</div>
		);
	}

	// Renderizado de lista vacía
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

	// Separar reuniones por estado
	const activeOrUpcoming = meetingsData.filter(
		(m) => m.status !== 'Finalizada'
	);
	const finished = meetingsData.filter((m) => m.status === 'Finalizada');

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl shadow-lg p-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold mb-2">📹 Mis Reuniones</h1>
						<p className="text-blue-100">
							Aquí puedes ver y unirte a las reuniones de tu unidad residencial
						</p>
					</div>
					<div className="bg-white/20 rounded-lg px-6 py-3 text-center">
						<p className="text-sm text-blue-100">Total de Reuniones</p>
						<p className="text-3xl font-bold">{meetingsData.length}</p>
					</div>
				</div>
			</div>

			{/* Reuniones Activas/Próximas */}
			{activeOrUpcoming.length > 0 && (
				<div>
					<h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
						<Calendar className="text-blue-600" />
						Reuniones Activas y Próximas
					</h2>
					<div className="space-y-4">
						{activeOrUpcoming.map((meeting) => (
							<MeetingCard key={meeting.id} meeting={meeting} />
						))}
					</div>
				</div>
			)}

			{/* Reuniones Finalizadas */}
			{finished.length > 0 && (
				<div>
					<h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
						<Clock className="text-gray-500" />
						Reuniones Finalizadas
					</h2>
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