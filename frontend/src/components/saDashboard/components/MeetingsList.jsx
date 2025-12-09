import React from 'react';
import { Calendar, Clock, Users as UsersIcon, Plus, PlayCircle } from 'lucide-react';

const MeetingsList = ({
	meetings,
	isLoading,
	onCreateMeeting,
	onStartMeeting,
}) => {
	const getEstadoColor = (estado) => {
		const estadoLower = estado?.toLowerCase();
		switch (estadoLower) {
			case 'en curso':
			case 'activa':
				return 'bg-green-100 text-green-700';
			case 'programada':
			case 'pendiente':
				return 'bg-blue-100 text-blue-700';
			case 'completada':
			case 'finalizada':
				return 'bg-gray-100 text-gray-700';
			case 'cancelada':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const puedeAccederReunion = (fechaReunion) => {
		const ahora = new Date();
		const unaHoraAntes = new Date(fechaReunion.getTime() - 60 * 60 * 1000);
		return ahora >= unaHoraAntes;
	};

	return (
		<div
			className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col"
			style={{ maxHeight: '700px' }}
		>
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
					</div>
				) : meetings && meetings.length > 0 ? (
					<div className="space-y-4">
						{meetings.map((reunion) => (
							<div
								key={reunion.id}
								className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
							>
								<div className="flex items-start justify-between mb-3">
									<div className="flex-1">
										<h3 className="font-bold text-gray-800 mb-1">
											{reunion.titulo}
										</h3>
										<span
											className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getEstadoColor(
												reunion.estado
											)}`}
										>
											{reunion.estado}
										</span>
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
										<UsersIcon size={14} />
										{reunion.asistentes} asistentes
									</div>
								</div>

								{/* Botón para reuniones en curso o activas */}
								{(reunion.estado?.toLowerCase() === 'en curso' ||
									reunion.estado?.toLowerCase() === 'activa') && (
									<button
										onClick={() => onStartMeeting && onStartMeeting(reunion)}
										className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
									>
										<PlayCircle size={18} />
										Unirse a la Reunión
									</button>
								)}

								{/* Botón para reuniones programadas */}
								{reunion.estado?.toLowerCase() === 'programada' &&
									(puedeAccederReunion(reunion.fechaCompleta) ? (
										<button
											onClick={() =>
												onStartMeeting && onStartMeeting(reunion)
											}
											className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-sm"
										>
											<PlayCircle size={18} />
											Acceder a la Reunión
										</button>
									) : (
										<div className="w-full">
											<button
												disabled
												className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-semibold text-sm"
											>
												<Clock size={18} />
												Disponible 1 hora antes
											</button>
											<p className="text-xs text-center text-gray-500 mt-2">
												El acceso se habilitará a las{' '}
												{new Date(
													reunion.fechaCompleta.getTime() - 60 * 60 * 1000
												).toLocaleTimeString('es-ES', {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</p>
										</div>
									))}
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<Calendar className="mx-auto text-gray-400 mb-4" size={48} />
						<p className="text-gray-600">No hay reuniones programadas</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default MeetingsList;