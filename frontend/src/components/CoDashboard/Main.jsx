import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, FileText, User, Calendar, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

// Importar servicios
import { MeetingService } from '../../services/api/MeetingService';

const CopropietarioDashboard = ({ userId, residentialUnitId }) => {
	const [selectedSection, setSelectedSection] = useState('meetings'); // meetings | polls | profile

	// OBTENER DATOS DEL USUARIO PARA VERIFICAR ROL
	const { data: userData } = useQuery({
		queryKey: ['user'],
		queryFn: () => {
			const user = localStorage.getItem('user');
			return user ? JSON.parse(user) : null;
		},
		staleTime: Infinity, // Los datos del usuario no cambian frecuentemente
	});

	// DETECTAR SI ES INVITADO (ROL 4)
	const userRole = userData?.role || 3; // Default: copropietario (3)
	const isGuest = userRole === 4;

	// Obtener reuniones de la unidad residencial del copropietario
	const {
		data: meetingsData,
		isLoading: isLoadingMeetings,
		isError: isErrorMeetings,
	} = useQuery({
		queryKey: ['copropietario-meetings', residentialUnitId],
		queryFn: () => MeetingService.getMeetingsByResidentialUnit(residentialUnitId),
		select: (response) => {
			if (response.success && response.data) {
				return response.data.map((meeting) => {
					const scheduledDate = new Date(meeting.dat_schedule_date);
					const now = new Date();
					const oneHourBefore = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
					
					let status = 'Programada';
					if (now >= scheduledDate) {
						status = 'En Curso';
					} else if (now >= oneHourBefore) {
						status = 'Disponible';
					}

					return {
						...meeting,
						id: meeting.id,
						title: meeting.str_title,
						description: meeting.str_description,
						type: meeting.str_meeting_type,
						scheduledDate: scheduledDate,
						status: status,
						zoomUrl: meeting.str_zoom_join_url,
						zoomMeetingId: meeting.int_zoom_meeting_id,
						estimatedDuration: meeting.int_estimated_duration,
					};
				});
			}
			return [];
		},
		enabled: !!residentialUnitId,
	});

	const renderMeetingsSection = () => {
		if (isLoadingMeetings) {
			return (
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
						<p className="text-gray-600">Cargando reuniones...</p>
					</div>
				</div>
			);
		}

		if (isErrorMeetings) {
			return (
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
					<p className="text-red-700 font-semibold">Error al cargar reuniones</p>
					<p className="text-red-600 text-sm mt-1">Por favor, intenta nuevamente más tarde</p>
				</div>
			);
		}

		if (!meetingsData || meetingsData.length === 0) {
			return (
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
					<Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 className="text-xl font-semibold text-gray-700 mb-2">
						No hay reuniones programadas
					</h3>
					<p className="text-gray-600">
						Cuando se programe una asamblea, aparecerá aquí
					</p>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				{meetingsData.map((meeting) => (
					<MeetingCard key={meeting.id} meeting={meeting} isGuest={isGuest} />
				))}
			</div>
		);
	};

	const renderPollsSection = () => {
		return (
			<div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-12 text-center">
				<FileText className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
				<h3 className="text-xl font-semibold text-yellow-800 mb-2">
					Módulo de Encuestas en Desarrollo
				</h3>
				<p className="text-yellow-700 mb-4">
					Próximamente podrás participar en encuestas y votaciones desde aquí
				</p>
				<div className="bg-white border border-yellow-300 rounded-lg p-4 max-w-md mx-auto">
					<p className="text-sm text-gray-700">
						<strong>Funcionalidades planeadas:</strong>
					</p>
					<ul className="text-sm text-gray-600 mt-2 space-y-1 text-left">
						<li>Ver encuestas activas</li>
						<li>Votar en tiempo real</li>
						<li>Ver resultados parciales</li>
						<li>Historial de votaciones</li>
					</ul>
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg">
				<h1 className="text-3xl font-bold">
					{isGuest ? 'Dashboard Invitado' : 'Dashboard Copropietario'}
				</h1>
				<p className="text-blue-100 mt-1">
					{isGuest 
						? '👋 Bienvenido como invitado - Puede asistir a reuniones como observador' 
						: 'Bienvenido a tu panel de control'}
				</p>
				{isGuest && (
					<div className="mt-3 bg-blue-700/50 border border-blue-500 rounded-lg p-3">
						<p className="text-sm text-blue-50">
							Como invitado, puede asistir a las asambleas pero no puede participar en votaciones ni encuestas
						</p>
					</div>
				)}
			</div>

			{/* Navigation Tabs */}
			<div className="bg-white border-b border-gray-200 shadow-sm">
				<div className="container mx-auto px-6">
					<div className="flex gap-1">
						<button
							onClick={() => setSelectedSection('meetings')}
							className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
								selectedSection === 'meetings'
									? 'border-blue-600 text-blue-600'
									: 'border-transparent text-gray-600 hover:text-gray-800'
							}`}
						>
							<Video size={20} />
							Reuniones
						</button>
						
						{/* OCULTAR TAB DE ENCUESTAS SI ES INVITADO (ROL 4) */}
						{!isGuest && (
							<button
								onClick={() => setSelectedSection('polls')}
								className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
									selectedSection === 'polls'
										? 'border-blue-600 text-blue-600'
										: 'border-transparent text-gray-600 hover:text-gray-800'
								}`}
							>
								<FileText size={20} />
								Encuestas
								<span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">
									Próximamente
								</span>
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="container mx-auto px-6 py-8">
				{selectedSection === 'meetings' && renderMeetingsSection()}
				{selectedSection === 'polls' && !isGuest && renderPollsSection()}
			</div>
		</div>
	);
};

// Componente de tarjeta de reunión
const MeetingCard = ({ meeting, isGuest = false }) => {
	const getStatusColor = () => {
		switch (meeting.status) {
			case 'En Curso':
				return 'bg-red-100 text-red-700 border-red-300';
			case 'Disponible':
				return 'bg-green-100 text-green-700 border-green-300';
			case 'Programada':
				return 'bg-blue-100 text-blue-700 border-blue-300';
			default:
				return 'bg-gray-100 text-gray-700 border-gray-300';
		}
	};

	const handleJoinMeeting = () => {
		if (!meeting.zoomUrl) {
			alert('⚠️ URL de Zoom no disponible');
			return;
		}
		window.open(meeting.zoomUrl, '_blank', 'noopener,noreferrer');
	};

	const canJoin = meeting.status === 'En Curso' || meeting.status === 'Disponible';

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
			<div className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<h3 className="text-xl font-bold text-gray-800">
								{meeting.title}
							</h3>
							<span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor()}`}>
								{meeting.status}
							</span>
							{/* BADGE DE INVITADO */}
							{isGuest && (
								<span className="px-3 py-1 rounded-full text-xs font-semibold border bg-orange-100 text-orange-700 border-orange-300">
									👁️ Observador
								</span>
							)}
						</div>
						{meeting.description && (
							<p className="text-gray-600 text-sm mb-3">{meeting.description}</p>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
					<div className="flex items-center gap-2 text-gray-600">
						<Calendar className="text-blue-500" size={18} />
						<div>
							<p className="text-xs text-gray-500">Fecha</p>
							<p className="text-sm font-semibold">
								{meeting.scheduledDate.toLocaleDateString('es-CO', {
									day: '2-digit',
									month: 'short',
									year: 'numeric',
								})}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 text-gray-600">
						<Clock className="text-blue-500" size={18} />
						<div>
							<p className="text-xs text-gray-500">Hora</p>
							<p className="text-sm font-semibold">
								{meeting.scheduledDate.toLocaleTimeString('es-CO', {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 text-gray-600">
						<FileText className="text-blue-500" size={18} />
						<div>
							<p className="text-xs text-gray-500">Tipo</p>
							<p className="text-sm font-semibold">{meeting.type}</p>
						</div>
					</div>
				</div>

				{/* ALERTA ESPECIAL PARA INVITADOS */}
				{isGuest && canJoin && (
					<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
						<p className="text-orange-800 font-semibold text-sm">
							👁️ Como invitado, podrá observar la reunión pero no participar en votaciones
						</p>
					</div>
				)}

				{meeting.status === 'En Curso' && !isGuest && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							<p className="text-red-800 font-semibold text-sm">
								🔴 Reunión en vivo ahora
							</p>
						</div>
					</div>
				)}

				{meeting.status === 'Disponible' && !isGuest && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
						<p className="text-green-800 font-semibold text-sm">
							Ya puedes unirte a la reunión
						</p>
					</div>
				)}

				<div className="flex gap-3">
					<button
						onClick={handleJoinMeeting}
						disabled={!canJoin}
						className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
							canJoin
								? isGuest
									? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg'
									: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg'
								: 'bg-gray-200 text-gray-500 cursor-not-allowed'
						}`}
					>
						<Video size={18} />
						{isGuest 
							? (meeting.status === 'En Curso' ? 'Observar Ahora' : meeting.status === 'Disponible' ? 'Observar' : 'No Disponible')
							: (meeting.status === 'En Curso' ? 'Unirse Ahora' : meeting.status === 'Disponible' ? 'Unirse' : 'No Disponible')
						}
					</button>

					{meeting.zoomMeetingId && (
						<div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg">
							<span className="text-xs text-gray-500">ID:</span>
							<span className="text-sm font-mono font-semibold text-gray-700">
								{meeting.zoomMeetingId}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default CopropietarioDashboard;