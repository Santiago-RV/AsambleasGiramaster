import React from 'react';
import {
	X,
	Calendar,
	Building2,
	Users,
	CheckCircle,
	Clock,
	Vote,
	User,
	Mail,
	Phone,
	Video,
	Home,
	FileText,
	TrendingUp,
} from 'lucide-react';
import {
	formatMeetingStartTime,
	calculateMeetingDuration,
	getPollStatusColor,
	formatAttendanceType,
	getInitials,
} from '../../../services/api/ActiveMeetingService';

const ActiveMeetingDetailsModal = ({ isOpen, onClose, meetingDetails }) => {
	if (!isOpen || !meetingDetails) return null;

	const duration = calculateMeetingDuration(
		meetingDetails.actual_start_time
	);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4 flex-1">
							<div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
								<Video size={32} />
							</div>
							<div className="flex-1">
								<h2 className="text-2xl font-bold mb-1">
									{meetingDetails.title}
								</h2>
								<p className="text-green-100 flex items-center gap-2">
									<Building2 size={16} />
								{meetingDetails.residential_unit?.name || meetingDetails.residential_unit_name}
							</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
						>
							<X size={24} />
						</button>
					</div>

					{/* Stats rápidos */}
					<div className="grid grid-cols-4 gap-4">
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<Clock size={14} />
								<span>Duración</span>
							</div>
							<p className="text-xl font-bold">{duration}</p>
						</div>
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<Users size={14} />
								<span>Conectados</span>
							</div>
							<p className="text-xl font-bold">
								{meetingDetails.connected_users.length} /{' '}
								{meetingDetails.total_invited}
							</p>
						</div>
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<CheckCircle size={14} />
								<span>Quórum</span>
							</div>
							<p className="text-xl font-bold">
								{meetingDetails.quorum_reached ? 'Sí' : 'No'}
							</p>
						</div>
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<Vote size={14} />
								<span>Encuestas</span>
							</div>
							<p className="text-xl font-bold">
								{meetingDetails.polls.length}
							</p>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Columna izquierda - Información general */}
						<div className="lg:col-span-2 space-y-6">
							{/* Información de la reunión */}
							<div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<FileText size={20} />
									Información de la Reunión
								</h3>
								<div className="space-y-3">
									<div className="flex items-start gap-3">
										<Calendar className="text-gray-500 mt-1" size={18} />
										<div>
											<p className="text-sm text-gray-500">
												Fecha programada
											</p>
											<p className="font-semibold text-gray-800">
												{formatMeetingStartTime(
													meetingDetails.scheduled_date
												)}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<Clock className="text-gray-500 mt-1" size={18} />
										<div>
											<p className="text-sm text-gray-500">
												Hora de inicio real
											</p>
											<p className="font-semibold text-gray-800">
												{formatMeetingStartTime(
													meetingDetails.actual_start_time
												)}
											</p>
										</div>
									</div>
									{meetingDetails.description && (
										<div className="flex items-start gap-3">
											<FileText className="text-gray-500 mt-1" size={18} />
											<div>
												<p className="text-sm text-gray-500">
													Descripción
												</p>
												<p className="font-medium text-gray-800">
													{meetingDetails.description}
												</p>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Administrador */}
							{meetingDetails.administrator && (
								<div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
									<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
										<User size={20} />
										Administrador
									</h3>
									<div className="flex items-center gap-4">
										<div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
											{getInitials(
												meetingDetails.administrator
													.full_name
											)}
										</div>
										<div className="flex-1">
											<p className="font-bold text-gray-800">
												{
													meetingDetails.administrator
														.full_name
												}
											</p>
											<div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
												<Mail size={14} />
												{
													meetingDetails.administrator
														.email
												}
											</div>
											{meetingDetails.administrator
												.phone && (
												<div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
													<Phone size={14} />
													{
														meetingDetails
															.administrator.phone
													}
												</div>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Encuestas */}
							<div className="bg-white rounded-xl p-5 border border-gray-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Vote size={20} />
									Encuestas ({meetingDetails.polls.length})
								</h3>
								<div className="space-y-3 max-h-64 overflow-y-auto">
									{meetingDetails.polls.length > 0 ? (
										meetingDetails.polls.map((poll) => (
											<div
												key={poll.poll_id}
												className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
											>
												<div className="flex items-start justify-between mb-2">
													<div className="flex-1">
														<h4 className="font-semibold text-gray-800 mb-1">
															{poll.title}
														</h4>
														{poll.description && (
															<p className="text-sm text-gray-600">
																{
																	poll.description
																}
															</p>
														)}
													</div>
													<span
														className={`px-2 py-1 rounded-full text-xs font-semibold ${getPollStatusColor(poll.status)} whitespace-nowrap ml-2`}
													>
														{poll.status}
													</span>
												</div>
												<div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
													<div className="flex items-center gap-1">
														<TrendingUp size={14} />
														<span>
															{poll.total_votes}{' '}
															votos
														</span>
													</div>
													<span>•</span>
													<span>{poll.poll_type}</span>
													{poll.requires_quorum && (
														<>
															<span>•</span>
															<span>
																Quórum:{' '}
																{
																	poll.minimum_quorum_percentage
																}
																%
															</span>
														</>
													)}
												</div>
											</div>
										))
									) : (
										<p className="text-center text-gray-500 py-8">
											No hay encuestas creadas
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Columna derecha - Participantes */}
						<div className="space-y-6">
							<div className="bg-white rounded-xl p-5 border border-gray-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Users size={20} />
									Participantes Conectados (
									{meetingDetails.connected_users.length})
								</h3>
								<div className="space-y-2 max-h-[600px] overflow-y-auto">
									{meetingDetails.connected_users.length >
									0 ? (
										meetingDetails.connected_users.map(
											(user) => (
												<div
													key={user.user_id}
													className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
												>
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
															{getInitials(
																user.full_name
															)}
														</div>
														<div className="flex-1 min-w-0">
															<p className="font-semibold text-gray-800 text-sm truncate">
																{user.full_name}
															</p>
															<div className="flex items-center gap-2 text-xs text-gray-500">
																<Home
																	size={12}
																/>
																<span>
																	Apto.{' '}
																	{
																		user.apartment_number
																	}
																</span>
																<span>•</span>
																<span>
																	{formatAttendanceType(
																		user.attendance_type
																	)}
																</span>
															</div>
															<div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
																<span className="flex items-center gap-1">
																	Peso:{' '}
																	{
																		user.voting_weight
																	}
																</span>
															</div>
														</div>
														{user.is_present && (
															<div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse"></div>
														)}
													</div>
												</div>
											)
										)
									) : (
										<p className="text-center text-gray-500 py-8">
											No hay usuarios conectados
										</p>
									)}
								</div>
							</div>

							{/* Información de la unidad */}
							<div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
								<h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
									<Building2 size={20} />
									Unidad Residencial
								</h3>
								<div className="space-y-2">
									<p className="text-sm text-gray-600">
										Nombre
									</p>
									<p className="font-semibold text-gray-800">
										{meetingDetails.residential_unit?.name || meetingDetails.residential_unit_name}
									</p>
									<p className="text-sm text-gray-600 mt-3">
										NIT
									</p>
									<p className="font-semibold text-gray-800">
										{meetingDetails.residential_unit?.nit || meetingDetails.residential_unit_nit}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
					{meetingDetails.zoom_join_url && (
						<a
							href={meetingDetails.zoom_join_url}
							target="_blank"
							rel="noopener noreferrer"
							className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
						>
							<Video size={18} />
							Unirse a Zoom
						</a>
					)}
					<button
						onClick={onClose}
						className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default ActiveMeetingDetailsModal;
