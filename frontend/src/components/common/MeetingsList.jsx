import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Users, Plus, Video, CheckCircle, XCircle, AlertCircle, ChevronRight, AlertTriangle, PlayCircle, StopCircle, MapPin, ScanLine, Edit, Trash2 } from 'lucide-react';
import QRScannerModal from './QRScannerModal';
import { showDeleteMeetingConfirmModal } from './BulkDeleteConfirmModal';
import Swal from 'sweetalert2';
import { formatDateLong } from '../../utils/dateUtils';

/**
 * Componente unificado para mostrar lista de reuniones
 * Usado tanto en Admin Dashboard como en Super Admin Dashboard
 *
 * @param {string} variant - 'admin' para diseño completo con gradient, 'compact' para diseño simple
 */
const MeetingsList = ({
	meetings = [],
	isLoading,
	onCreateMeeting,
	onJoinMeeting,
	onStartMeeting,
	onEndMeeting,
	onEditMeeting,
	onDeleteMeeting,
	variant = 'compact',
}) => {
	const [activeTab, setActiveTab] = useState('upcoming');
	const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

	// Unificar el handler de unirse a reunión
	const handleJoinMeeting = onJoinMeeting || onStartMeeting;

	// Filtrar y ordenar reuniones
	const { upcomingMeetings, pastMeetings } = useMemo(() => {
		const upcoming = [];
		const past = [];

		meetings.forEach(meeting => {
			const estadoLower = meeting.estado?.toLowerCase();

			// Las reuniones En Curso/Activa siempre van a upcoming
			if (estadoLower === 'en curso' || estadoLower === 'activa') {
				upcoming.push(meeting);
			}
			// Las reuniones Programadas/Pendientes siempre van a upcoming (aunque ya haya pasado la hora)
			else if (estadoLower === 'programada' || estadoLower === 'pendiente') {
				upcoming.push(meeting);
			}
			// Las demás van a historial
			else {
				past.push(meeting);
			}
		});

		// Ordenar próximas: primero En Curso, luego por fecha (más cercana primero)
		upcoming.sort((a, b) => {
			const now = new Date();
			const aIsActive = a.estado?.toLowerCase() === 'en curso' || a.estado?.toLowerCase() === 'activa';
			const bIsActive = b.estado?.toLowerCase() === 'en curso' || b.estado?.toLowerCase() === 'activa';

			// Primero: En Curso/Activa siempre primero
			if (aIsActive && !bIsActive) return -1;
			if (!aIsActive && bIsActive) return 1;

			// Segundo: Para programadas, las que ya pasaron su hora van al final
			const aFecha = new Date(a.fechaCompleta);
			const bFecha = new Date(b.fechaCompleta);
			const aPasada = aFecha < now;
			const bPasada = bFecha < now;

			if (!aPasada && bPasada) return -1;
			if (aPasada && !bPasada) return 1;

			// Tercero: orden normal por fecha
			return aFecha - bFecha;
		});

		// Ordenar pasadas: más recientes primero
		past.sort((a, b) => new Date(b.fechaCompleta) - new Date(a.fechaCompleta));

		return { upcomingMeetings: upcoming, pastMeetings: past };
	}, [meetings]);

	const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

	// Verificar si hay alguna reunion presencial activa (En Curso)
	const hasActivePresencialMeeting = useMemo(() => {
		return meetings.some(meeting => {
			const estadoLower = meeting.estado?.toLowerCase();
			return (estadoLower === 'en curso' || estadoLower === 'activa') && meeting.str_modality === 'presencial';
		});
	}, [meetings]);

	const getStatusInfo = (status) => {
		const statusLower = status?.toLowerCase();
		switch (statusLower) {
			case 'en curso':
			case 'activa':
				return {
					icon: CheckCircle,
					text: 'En Curso',
					bgClass: 'bg-emerald-50',
					borderClass: 'border-emerald-200',
					textClass: 'text-emerald-700',
					badgeClass: 'bg-emerald-100 text-emerald-700',
					badgeClassCompact: 'bg-green-100 text-green-700',
				};
			case 'programada':
			case 'pendiente':
				return {
					icon: Clock,
					text: 'Programada',
					bgClass: 'bg-blue-50',
					borderClass: 'border-blue-200',
					textClass: 'text-blue-700',
					badgeClass: 'bg-blue-100 text-blue-700',
					badgeClassCompact: 'bg-blue-100 text-blue-700',
				};
			case 'completada':
			case 'finalizada':
				return {
					icon: CheckCircle,
					text: 'Finalizada',
					bgClass: 'bg-gray-50',
					borderClass: 'border-gray-200',
					textClass: 'text-gray-600',
					badgeClass: 'bg-gray-100 text-gray-600',
					badgeClassCompact: 'bg-gray-100 text-gray-700',
				};
			case 'cancelada':
				return {
					icon: XCircle,
					text: 'Cancelada',
					bgClass: 'bg-red-50',
					borderClass: 'border-red-200',
					textClass: 'text-red-700',
					badgeClass: 'bg-red-100 text-red-700',
					badgeClassCompact: 'bg-red-100 text-red-700',
				};
			default:
				return {
					icon: AlertCircle,
					text: status || 'Sin estado',
					bgClass: 'bg-gray-50',
					borderClass: 'border-gray-200',
					textClass: 'text-gray-600',
					badgeClass: 'bg-gray-100 text-gray-600',
					badgeClassCompact: 'bg-gray-100 text-gray-700',
				};
		}
	};

	// const canAccessMeeting = (meetingDate) => {
	// 	const now = new Date();
	// 	const oneHourBefore = new Date(meetingDate.getTime() - 60 * 60 * 1000);
	// 	return now >= oneHourBefore;
	// };

	const getTimeUntilMeeting = (meetingDate) => {
		const now = new Date();
		const diff = meetingDate - now;

		if (diff < 0) return 'Ya pasó';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const days = Math.floor(hours / 24);

		if (days > 0) return `En ${days} día${days > 1 ? 's' : ''}`;
		if (hours > 0) return `En ${hours}h ${minutes}m`;
		if (minutes > 0) return `En ${minutes} minuto${minutes > 1 ? 's' : ''}`;
		return 'Ahora';
	};

	// ==================== VARIANTE ADMIN (diseño completo con gradient) ====================
	if (variant === 'admin') {
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
				{/* Header con gradient */}
				<div className="bg-gradient-to-r from-green-600 to-indigo-600 px-6 py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
								<Calendar className="text-white" size={24} />
							</div>
							<div>
								<h2 className="text-xl font-bold text-white">Reuniones</h2>
								<p className="text-green-100 text-sm">
									{upcomingMeetings.length} próxima{upcomingMeetings.length !== 1 ? 's' : ''} · {pastMeetings.length} pasada{pastMeetings.length !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{hasActivePresencialMeeting && (
								<button
									onClick={() => setIsQRScannerOpen(true)}
									className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-pulse"
								>
									<ScanLine size={14} />
									<span>Escanear QR</span>
								</button>
							)}
							<button
								onClick={onCreateMeeting}
								className="flex items-center gap-2 px-5 py-2.5 bg-white text-green-600 rounded-xl hover:bg-green-50 transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
							>
								<Plus size={14} />
								<span>Nueva Reunión</span>
							</button>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="border-b border-gray-200 bg-gray-50">
					<div className="flex">
						<button
							onClick={() => setActiveTab('upcoming')}
							className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'upcoming'
								? 'text-green-600 bg-white'
								: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
								}`}
						>
							<div className="flex items-center justify-center gap-2">
								<ChevronRight size={16} />
								<span>Próximas</span>
								{upcomingMeetings.length > 0 && (
									<span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
										{upcomingMeetings.length}
									</span>
								)}
							</div>
							{activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>}
						</button>
						<button
							onClick={() => setActiveTab('past')}
							className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'past'
								? 'text-green-600 bg-white'
								: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
								}`}
						>
							<div className="flex items-center justify-center gap-2">
								<Clock size={16} />
								<span>Historial</span>
								{pastMeetings.length > 0 && (
									<span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'past' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
										{pastMeetings.length}
									</span>
								)}
							</div>
							{activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>}
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-4 md:p-6 max-h-[520px] overflow-y-auto">
					{displayMeetings && displayMeetings.length > 0 ? (
						<div className="grid gap-4">
							{displayMeetings.map((meeting) => {
								const statusInfo = getStatusInfo(meeting.estado);
								const StatusIcon = statusInfo.icon;
								const isActive = meeting.estado?.toLowerCase() === 'en curso' || meeting.estado?.toLowerCase() === 'activa';
								const isProgrammed = meeting.estado?.toLowerCase() === 'programada';
								const timeUntil = getTimeUntilMeeting(meeting.fechaCompleta);

								return (
									<div
										key={meeting.id}
										className={`border-2 ${statusInfo.borderClass} ${statusInfo.bgClass} rounded-xl p-3 md:p-5 hover:shadow-md transition-all group overflow-hidden`}
									>
										{/* Header: Título, Badges y Botones acción - TODO EN UNA FILA */}
										<div className="flex flex-wrap items-center gap-2">
											{/* Título */}
											<h3 className="text-sm md:text-lg font-bold text-gray-800 group-hover:text-green-600 transition-colors truncate min-w-0 flex-shrink">
												{meeting.titulo}
											</h3>

											{/* Badge modalidad */}
											{meeting.str_modality === 'presencial' ? (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
													<MapPin size={10} />
													<span className="hidden md:inline">Presencial</span>
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 shrink-0">
													<Video size={10} />
													<span className="hidden md:inline">Virtual</span>
												</span>
											)}

											{/* Badge estado */}
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusInfo.badgeClass}`}>
												<StatusIcon size={10} />
												<span className="hidden md:inline">{statusInfo.text}</span>
											</span>

											{/* Time until */}
											{activeTab === 'upcoming' && isProgrammed && (
												<span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
													{timeUntil}
												</span>
											)}

											{/* Botones de acción (editar/eliminar) - al final con ml-auto */}
											<div className="flex gap-1 ml-auto shrink-0">
												{onEditMeeting && (
													<button
														onClick={() => onEditMeeting(meeting)}
														className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
														title="Editar reunión"
													>
														<Edit size={14} className="text-gray-600" />
													</button>
												)}
												{onDeleteMeeting && (
													meeting.estado?.toLowerCase() === 'en curso' || meeting.estado?.toLowerCase() === 'activa' ? (
														<button
															disabled
															className="p-1.5 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed opacity-50"
															title="No se puede eliminar una reunión en curso"
														>
															<Trash2 size={14} className="text-gray-400" />
														</button>
													) : (
														<button
															onClick={async () => {
																await showDeleteMeetingConfirmModal({
																	meetingTitle: meeting.titulo,
																	onConfirm: async () => {
																		try {
																			await onDeleteMeeting(meeting.id);
																		} catch (error) {
																			Swal.fire({
																				icon: 'error',
																				title: 'Error',
																				text: error.response?.data?.message || error.message || 'Error al eliminar la reunión',
																				confirmButtonColor: '#3498db',
																			});
																		}
																	}
																});
															}}
															className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
															title="Eliminar reunión"
														>
															<Trash2 size={14} className="text-red-600" />
														</button>
													)
												)}
											</div>
										</div>

										{/* Info: Fecha, Hora, Asistentes */}
										<div className="mt-3 pt-3 border-t border-gray-200">
											<div className="grid grid-cols-3 gap-2">
												<div className="flex items-center gap-1.5 text-xs text-gray-600">
													<div className="flex flex-col">
														<span className="text-[10px] text-gray-400 uppercase tracking-wide hidden md:block">Fecha</span>
														<div className="flex items-center gap-1">
															<Calendar size={12} className="text-green-600 shrink-0" />
															<span className="truncate">{formatDateLong(meeting.fecha)}</span>
														</div>
													</div>
												</div>
												<div className="flex items-center gap-1.5 text-xs text-gray-600">
													<div className="flex flex-col">
														<span className="text-[10px] text-gray-400 uppercase tracking-wide hidden md:block">Hora</span>
														<div className="flex items-center gap-1">
															<Clock size={12} className="text-indigo-600 shrink-0" />
															<span className="truncate">{meeting.hora}</span>
														</div>
													</div>
												</div>
												<div className="flex items-center gap-1.5 text-xs text-gray-600">
													<div className="flex flex-col">
														<span className="text-[10px] text-gray-400 uppercase tracking-wide hidden md:block">Invitados</span>
														<div className="flex items-center gap-1">
															<Users size={12} className="text-blue-600 shrink-0" />
															<span>{meeting.asistentes || 0}</span>
														</div>
													</div>
												</div>
											</div>
										</div>

										{/* Actions for upcoming */}
										{activeTab === 'upcoming' && (
											<div className="mt-3 pt-3 border-t border-gray-200">
												<div className="flex flex-wrap gap-2">
													{meeting.str_modality === 'presencial' ? (
														isActive ? (
															<>
																<button
																	onClick={() => setIsQRScannerOpen(true)}
																	className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all font-semibold"
																>
																	<ScanLine size={14} />
																	<span>Escanear QR</span>
																</button>
																{onEndMeeting && (
																	<button
																		onClick={() => onEndMeeting(meeting)}
																		className="flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold"
																		title="Finalizar reunion"
																	>
																		<StopCircle size={14} />
																		<span>Finalizar</span>
																	</button>
																)}
															</>
														) : isProgrammed ? (
															<>
																<button
																	onClick={() => onStartMeeting && onStartMeeting(meeting)}
																	className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-bold"
																>
																	<PlayCircle size={14} />
																	<span>Iniciar</span>
																</button>
																{onEndMeeting && (
																	<button
																		onClick={() => onEndMeeting(meeting)}
																		className="flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold"
																		title="Finalizar"
																	>
																		<StopCircle size={14} />
																		<span>Fin</span>
																	</button>
																)}
															</>
														) : (
															<div className="flex items-center gap-2 text-xs text-gray-500 py-2">
																<MapPin size={12} className="text-emerald-500" />
																<span>Reunion presencial</span>
															</div>
														)
													) : (
														isActive ? (
															<>
																<button
																	onClick={() => handleJoinMeeting && handleJoinMeeting(meeting)}
																	className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all font-semibold"
																>
																	<Video size={14} />
																	<span>Unirse</span>
																</button>
																{onEndMeeting && (
																	<button
																		onClick={() => onEndMeeting(meeting)}
																		className="flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold"
																		title="Finalizar reunion"
																	>
																		<StopCircle size={14} />
																		<span>Fin</span>
																	</button>
																)}
															</>
														) : isProgrammed && (
															<>
																<button
																	onClick={() => onStartMeeting && onStartMeeting(meeting)}
																	className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-bold"
																>
																	<PlayCircle size={14} />
																	<span>Iniciar</span>
																</button>
																{onEndMeeting && (
																	<button
																		onClick={() => onEndMeeting(meeting)}
																		className="flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold"
																		title="Finalizar"
																	>
																		<StopCircle size={14} />
																		<span>Fin</span>
																	</button>
																)}
															</>
														)
													)}
												</div>
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
							<div className="inline-flex p-6 bg-gradient-to-br from-green-100 to-indigo-100 rounded-full mb-4">
								<Calendar className="text-green-600" size={48} />
							</div>
							<h3 className="text-lg font-semibold text-gray-800 mb-2">
								{activeTab === 'upcoming' ? 'No hay reuniones programadas' : 'No hay reuniones en el historial'}
							</h3>
							<p className="text-gray-600 mb-6 max-w-md mx-auto">
								{activeTab === 'upcoming'
									? 'Crea tu primera reunión virtual para comenzar a gestionar las asambleas de tu unidad residencial'
									: 'Las reuniones finalizadas o pasadas aparecerán aquí'}
							</p>
							{activeTab === 'upcoming' && (
								<button
									onClick={onCreateMeeting}
									className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-indigo-600 text-white rounded-xl hover:from-green-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
								>
									<Plus size={20} />
									<span>Crear Primera Reunión</span>
								</button>
							)}
						</div>
					)}
				</div>
				{/* QR Scanner Modal - variante admin */}
				<QRScannerModal
					isOpen={isQRScannerOpen}
					onClose={() => setIsQRScannerOpen(false)}
				/>
			</div>
		);
	}

	// ==================== VARIANTE COMPACT (diseño simple para SuperAdmin) ====================
	return (
		<div
			className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col"
			style={{ maxHeight: '700px' }}
		>
			{/* Header */}
			<div className="p-4 md:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
				<h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
					<Calendar size={20} className="md:size-6" />
					<span className="truncate">Reuniones ({meetings?.length || 0})</span>
				</h2>
				<div className="flex items-center gap-2 flex-wrap">
					{hasActivePresencialMeeting && (
						<button
							onClick={() => setIsQRScannerOpen(true)}
							className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 hover:shadow-lg transition-all font-semibold text-xs md:text-sm animate-pulse"
						>
							<ScanLine size={14} className="md:size-[18px]" />
							<span className="hidden sm:inline">Escanear QR</span>
							<span className="sm:hidden">QR</span>
						</button>
					)}
					<button
						onClick={onCreateMeeting}
						className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-xs md:text-sm"
					>
						<Plus size={14} className="md:size-[18px]" />
						<span className="hidden sm:inline">Nueva Reunión</span>
						<span className="sm:hidden">Nueva</span>
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
				<div className="flex">
					<button
						onClick={() => setActiveTab('upcoming')}
						className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative ${activeTab === 'upcoming'
							? 'text-[#3498db] bg-white'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
							}`}
					>
						<div className="flex items-center justify-center gap-2">
							<ChevronRight size={14} />
							<span>Próximas</span>
							{upcomingMeetings.length > 0 && (
								<span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
									{upcomingMeetings.length}
								</span>
							)}
						</div>
						{activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3498db]"></div>}
					</button>
					<button
						onClick={() => setActiveTab('past')}
						className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative ${activeTab === 'past'
							? 'text-[#3498db] bg-white'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
							}`}
					>
						<div className="flex items-center justify-center gap-2">
							<Clock size={14} />
							<span>Historial</span>
							{pastMeetings.length > 0 && (
								<span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'past' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
									{pastMeetings.length}
								</span>
							)}
						</div>
						{activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3498db]"></div>}
					</button>
				</div>
			</div>

			{/* Content */}
			<div
				className="flex-1 overflow-y-auto overflow-x-hidden p-4"
				style={{ minHeight: 0 }}
			>
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<svg
							className="animate-spin h-8 w-8 text-[#3498db]"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					</div>
				) : displayMeetings && displayMeetings.length > 0 ? (
					<div className="space-y-4">
						{displayMeetings.map((reunion) => {
							const statusInfo = getStatusInfo(reunion.estado);
							const isActive = reunion.estado?.toLowerCase() === 'en curso' || reunion.estado?.toLowerCase() === 'activa';
							const isProgrammed = reunion.estado?.toLowerCase() === 'programada';

							return (
								<div
									key={reunion.id}
									className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all overflow-hidden"
								>
									{/* Fila 1: Solo Título */}
									<h3 className="font-bold text-gray-800 truncate text-sm min-w-0 mb-2">
										{reunion.titulo}
									</h3>

									{/* Fila 2: Badges y Botones de acción */}
									<div className="flex flex-wrap items-center gap-2 mb-2">
										{/* Badge modalidad */}
										{reunion.str_modality === 'presencial' ? (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
												<MapPin size={10} />
												<span className="hidden md:inline">Presencial</span>
											</span>
										) : (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 shrink-0">
												<Video size={10} />
												<span className="hidden md:inline">Virtual</span>
											</span>
										)}

										{/* Badge estado */}
										<span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusInfo.badgeClassCompact}`}>
											{reunion.estado}
										</span>

										{/* Botones de acción */}
										<div className="flex gap-1 ml-auto shrink-0">
											{onEditMeeting && (
												<button
													onClick={() => onEditMeeting(reunion)}
													className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
													title="Editar reunión"
												>
													<Edit size={14} className="text-gray-600" />
												</button>
											)}
											{onDeleteMeeting && (
												reunion.estado?.toLowerCase() === 'en curso' || reunion.estado?.toLowerCase() === 'activa' ? (
													<button
														disabled
														className="p-1.5 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed opacity-50"
														title="No se puede eliminar una reunión en curso"
													>
														<Trash2 size={14} className="text-gray-400" />
													</button>
												) : (
													<button
														onClick={async () => {
															await showDeleteMeetingConfirmModal({
																meetingTitle: reunion.titulo,
																onConfirm: async () => {
																	try {
																		await onDeleteMeeting(reunion.id);
																	} catch (error) {
																		Swal.fire({
																			icon: 'error',
																			title: 'Error',
																			text: error.response?.data?.message || error.message || 'Error al eliminar la reunión',
																			confirmButtonColor: '#3498db',
																		});
																	}
																}
															});
														}}
														className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
														title="Eliminar reunión"
													>
														<Trash2 size={14} className="text-red-600" />
													</button>
												)
											)}
										</div>
									</div>

									{/* Info: Fecha, Hora, Asistentes */}
									<div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
										<div className="flex flex-col">
											<span className="text-[10px] text-gray-400 uppercase tracking-wide hidden md:block">Fecha</span>
											<div className="flex items-center gap-1">
												<Calendar size={12} className="text-green-600 shrink-0" />
												<span className="truncate">{formatDateLong(reunion.fecha)}</span>
											</div>
										</div>
										<div className="flex flex-col">
											<span className="text-[10px] text-gray-400 uppercase tracking-wide hidden md:block">Hora</span>
											<div className="flex items-center gap-1">
												<Clock size={12} className="text-indigo-600 shrink-0" />
												<span className="truncate">{reunion.hora}</span>
											</div>
										</div>
										<div className="flex flex-col">
											<span className="text-[10px] text-gray-400 uppercase tracking-wide hidden md:block">Invitados</span>
											<div className="flex items-center gap-1">
												<Users size={12} className="text-blue-600 shrink-0" />
												<span>{reunion.asistentes}</span>
											</div>
										</div>
									</div>

									{/* Botones solo para proximas */}
									{activeTab === 'upcoming' && (
										<div className="flex flex-wrap gap-2">
											{reunion.str_modality === 'presencial' ? (
												isActive ? (
													<>
														<button
															onClick={() => setIsQRScannerOpen(true)}
															className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold text-xs"
														>
															<ScanLine size={12} />
															<span>QR</span>
														</button>
														{onEndMeeting && (
															<button
																onClick={() => onEndMeeting(reunion)}
																className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-xs"
																title="Finalizar"
															>
																<StopCircle size={12} />
															</button>
														)}
													</>
												) : isProgrammed ? (
													<>
														<button
															onClick={() => onStartMeeting && onStartMeeting(reunion)}
															className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-xs"
														>
															<PlayCircle size={12} />
															<span>Iniciar</span>
														</button>
														{onEndMeeting && (
															<button
																onClick={() => onEndMeeting(reunion)}
																className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-xs"
																title="Finalizar"
															>
																<StopCircle size={12} />
															</button>
														)}
													</>
												) : (
													<div className="flex items-center gap-1 text-xs text-gray-500 py-1">
														<MapPin size={10} />
														<span>Presencial</span>
													</div>
												)
											) : (
												isActive ? (
													<>
														<button
															onClick={() => handleJoinMeeting && handleJoinMeeting(reunion)}
															className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold text-xs"
														>
															<Video size={12} />
															<span>Unirse</span>
														</button>
														{onEndMeeting && (
															<button
																onClick={() => onEndMeeting(reunion)}
																className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-xs"
																title="Finalizar"
															>
																<StopCircle size={12} />
															</button>
														)}
													</>
												) : isProgrammed && (
													<>
														<button
															onClick={() => onStartMeeting && onStartMeeting(reunion)}
															className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-xs"
														>
															<PlayCircle size={12} />
															<span>Iniciar</span>
														</button>
														{onEndMeeting && (
															<button
																onClick={() => onEndMeeting(reunion)}
																className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-xs"
																title="Finalizar"
															>
																<StopCircle size={12} />
															</button>
														)}
													</>
												)
											)}
										</div>
									)}

									{/* Past meeting info */}
									{activeTab === 'past' && (
										<div className="mt-3 pt-3 border-t border-gray-200">
											<div className="text-center py-2 text-xs text-gray-500">
												<p className="font-medium flex items-center justify-center gap-2">
													{reunion.estado?.toLowerCase() === 'cancelada' ? (
														<>
															<AlertTriangle size={12} className="text-red-500" />
															<span>Cancelada</span>
														</>
													) : reunion.estado?.toLowerCase() === 'completada' || reunion.estado?.toLowerCase() === 'finalizada' ? (
														<>
															<CheckCircle size={12} className="text-green-500" />
															<span>Finalizada</span>
														</>
													) : (
														<>
															<Calendar size={12} className="text-gray-500" />
															<span>Pasada</span>
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
					<div className="text-center py-12">
						<Calendar className="mx-auto text-gray-400 mb-4" size={48} />
						<p className="text-gray-600 mb-2">
							{activeTab === 'upcoming' ? 'No hay reuniones programadas' : 'No hay reuniones en el historial'}
						</p>
						{activeTab === 'upcoming' && onCreateMeeting && (
							<button
								onClick={onCreateMeeting}
								className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] transition-colors font-semibold text-sm"
							>
								<Plus size={16} />
								<span>Crear Reunión</span>
							</button>
						)}
					</div>
				)}
			</div>
			<QRScannerModal
				isOpen={isQRScannerOpen}
				onClose={() => setIsQRScannerOpen(false)}
			/>
		</div>
	);
};

export default MeetingsList;