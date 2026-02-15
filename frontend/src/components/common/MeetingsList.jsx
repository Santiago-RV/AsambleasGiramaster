import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Users, Plus, Video, CheckCircle, XCircle, AlertCircle, ChevronRight, AlertTriangle, PlayCircle, StopCircle, MapPin } from 'lucide-react';

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
	variant = 'compact',
}) => {
	const [activeTab, setActiveTab] = useState('upcoming');

	// Unificar el handler de unirse a reunión
	const handleJoinMeeting = onJoinMeeting || onStartMeeting;

	// Filtrar y ordenar reuniones
	const { upcomingMeetings, pastMeetings } = useMemo(() => {
		const now = new Date();
		const upcoming = [];
		const past = [];

		meetings.forEach(meeting => {
			const meetingDate = new Date(meeting.fechaCompleta);
			const estadoLower = meeting.estado?.toLowerCase();

			if (meetingDate >= now || estadoLower === 'en curso' || estadoLower === 'activa') {
				upcoming.push(meeting);
			} else {
				past.push(meeting);
			}
		});

		// Ordenar próximas: más cercanas primero
		upcoming.sort((a, b) => new Date(a.fechaCompleta) - new Date(b.fechaCompleta));
		// Ordenar pasadas: más recientes primero
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
								<h2 className="text-xl font-bold text-white">Reuniones Virtuales</h2>
								<p className="text-green-100 text-sm">
									{upcomingMeetings.length} próxima{upcomingMeetings.length !== 1 ? 's' : ''} · {pastMeetings.length} pasada{pastMeetings.length !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
						<button
							onClick={onCreateMeeting}
							className="flex items-center gap-2 px-5 py-2.5 bg-white text-green-600 rounded-xl hover:bg-green-50 transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
				<div className="p-6 max-h-[520px] overflow-y-auto">
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
											<div className="flex items-center gap-2 mb-3">
												<h3 className="text-lg font-bold text-gray-800 group-hover:text-green-600 transition-colors">
													{meeting.titulo}
												</h3>
												{meeting.str_modality === 'presencial' ? (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
														<MapPin size={12} />
														Presencial
													</span>
												) : (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
														<Video size={12} />
														Virtual
													</span>
												)}
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
												<div className="flex items-center gap-2 text-sm text-gray-600">
													<div className="p-1.5 bg-white rounded-lg">
														<Calendar size={16} className="text-green-600" />
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

										{/* Actions for upcoming */}
										{activeTab === 'upcoming' && (
											<div className="mt-4 pt-4 border-t border-gray-200">
												{meeting.str_modality === 'presencial' ? (
													/* Reunion presencial - sin boton Zoom */
													<div className="text-center py-2">
														<p className="text-sm text-gray-500 flex items-center justify-center gap-2">
															<MapPin size={16} className="text-emerald-500" />
															Reunion presencial - Sin enlace de Zoom
														</p>
													</div>
												) : (
													<>
														{/* Botones para reuniones EN CURSO (virtual) */}
														{isActive && (
															<div className="flex gap-3">
																<button
																	onClick={() => handleJoinMeeting && handleJoinMeeting(meeting)}
																	className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg"
																>
																	<Video size={20} />
																	<span>Unirse a la Reunion</span>
																</button>
																{onEndMeeting && (
																	<button
																		onClick={() => onEndMeeting(meeting)}
																		className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-md hover:shadow-lg"
																		title="Finalizar reunion"
																	>
																		<StopCircle size={20} />
																		<span>Finalizar</span>
																	</button>
																)}
															</div>
														)}

														{/* Botones para reuniones PROGRAMADAS (virtual) */}
														{isProgrammed && (
															<button
																onClick={() => onStartMeeting && onStartMeeting(meeting)}
																className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg"
															>
																<PlayCircle size={20} />
																<span>Iniciar Reunion</span>
															</button>
														)}
													</>
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
			<div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
				<h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
					<Calendar size={24} />
					Reuniones ({meetings?.length || 0})
				</h2>
				<button
					onClick={onCreateMeeting}
					className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<Plus size={18} />
					Nueva Reunión
				</button>
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
									className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
								>
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h3 className="font-bold text-gray-800">
													{reunion.titulo}
												</h3>
												{reunion.str_modality === 'presencial' ? (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
														<MapPin size={10} />
														Presencial
													</span>
												) : (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
														<Video size={10} />
														Virtual
													</span>
												)}
												<span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.badgeClassCompact}`}>
													{reunion.estado}
												</span>
											</div>
										</div>
									</div>

									<div className="space-y-2 mb-3">
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Calendar size={14} />
											{new Date(reunion.fecha).toLocaleDateString('es-ES', {
												day: '2-digit',
												month: 'short',
												year: 'numeric',
											})}
										</div>
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Clock size={14} />
											{reunion.hora}
										</div>
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Users size={14} />
											{reunion.asistentes} asistentes
										</div>
									</div>

									{/* Botones solo para proximas */}
									{activeTab === 'upcoming' && (
										<>
											{reunion.str_modality === 'presencial' ? (
												<div className="text-center py-2 mt-2 border-t border-gray-100">
													<p className="text-sm text-gray-500 flex items-center justify-center gap-2">
														<MapPin size={14} className="text-emerald-500" />
														Reunion presencial
													</p>
												</div>
											) : (
												<>
													{/* Boton para reuniones en curso o activas */}
													{isActive && (
														<div className="flex gap-2">
															<button
																onClick={() => handleJoinMeeting && handleJoinMeeting(reunion)}
																className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
															>
																<PlayCircle size={18} />
																Unirse a la Reunion
															</button>
															{onEndMeeting && (
																<button
																	onClick={() => onEndMeeting(reunion)}
																	className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm"
																	title="Finalizar reunion"
																>
																	<StopCircle size={18} />
																</button>
															)}
														</div>
													)}

													{/* Boton para reuniones programadas */}
													{isProgrammed && (
														<button
															onClick={() => onStartMeeting && onStartMeeting(reunion)}
															className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
														>
															<PlayCircle size={18} />
															Iniciar Reunion
														</button>
													)}
												</>
											)}
										</>
									)}

									{/* Info para historial */}
									{activeTab === 'past' && (
										<div className="text-center py-2 text-sm text-gray-500 border-t border-gray-100 mt-2">
											<p className="font-medium flex items-center justify-center gap-2">
												{reunion.estado?.toLowerCase() === 'cancelada' ? (
													<>
														<AlertTriangle size={14} className="text-red-500" />
														<span>Cancelada</span>
													</>
												) : reunion.estado?.toLowerCase() === 'completada' || reunion.estado?.toLowerCase() === 'finalizada' ? (
													<>
														<CheckCircle size={14} className="text-green-500" />
														<span>Finalizada</span>
													</>
												) : (
													<>
														<Calendar size={14} className="text-gray-500" />
														<span>Pasada</span>
													</>
												)}
											</p>
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
						{activeTab === 'upcoming' && (
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
		</div>
	);
};

export default MeetingsList;