import { X, CheckCircle, Clock, Users, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PollDetailModal({ poll, isOpen, onClose }) {
	if (!isOpen || !poll) return null;

	// Formatear fechas
	const formattedCreatedAt = poll.created_at
		? format(new Date(poll.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
		: 'N/D';

	const formattedStartedAt = poll.dat_started_at
		? format(new Date(poll.dat_started_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
		: 'No iniciada';

	// Determinar si el poll está activo - ✅ MISMA LÓGICA QUE ZOOM EMBED
	const isActive = poll.str_status === 'Activa' || poll.str_status === 'active';
	const isClosed = poll.str_status === 'closed' || poll.str_status === 'Finalizada' || poll.str_status === 'finalizada';
	const isPending = poll.str_status === 'draft' || poll.str_status === 'Creada' || poll.str_status === 'creada';

	console.log('🎯 [PollDetailModal] Estado de la encuesta:', {
		status: poll.str_status,
		isActive,
		isClosed,
		isPending
	});

	// Tipo de encuesta
	const getPollTypeText = () => {
		switch (poll.str_poll_type) {
			case 'single':
				return 'Selección única';
			case 'multiple':
				return `Selección múltiple (máx. ${poll.int_max_selections} opciones)`;
			case 'text':
				return 'Respuesta de texto libre';
			case 'numeric':
				return 'Respuesta numérica';
			default:
				return 'Desconocido';
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl flex items-start justify-between">
					<div className="flex-1">
						<h2 className="text-2xl font-bold mb-2">{poll.str_title}</h2>
						<div className="flex items-center gap-2 text-blue-100">
							<Clock size={16} />
							<span className="text-sm">{formattedCreatedAt}</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
					>
						<X size={24} />
					</button>
				</div>

				{/* Contenido */}
				<div className="p-6 space-y-6">
					{/* Estado de la encuesta */}
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-2">
							<div
								className={`w-3 h-3 rounded-full ${
									isActive ? 'bg-green-500 animate-pulse' :
									isClosed ? 'bg-gray-400' : 'bg-blue-500'
								}`}
							></div>
							<span className="font-semibold text-gray-700">
								Estado: {
									isActive ? 'Activa - Puedes votar' :
									isClosed ? 'Finalizada' :
									'Pendiente'
								}
							</span>
						</div>
						<span className="text-sm text-gray-500">
							{isActive ? 'Iniciada: ' + formattedStartedAt : 'Aún no iniciada'}
						</span>
					</div>

					{/* Descripción */}
					{poll.str_description && (
						<div className="space-y-2">
							<h3 className="font-semibold text-gray-800 flex items-center gap-2">
								<Info size={18} className="text-blue-600" />
								Descripción
							</h3>
							<p className="text-gray-600 text-sm pl-6">{poll.str_description}</p>
						</div>
					)}

					{/* Información de la encuesta */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<p className="text-sm text-gray-500">Tipo de encuesta</p>
							<p className="font-semibold text-gray-800">{getPollTypeText()}</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-gray-500">Total de opciones</p>
							<p className="font-semibold text-gray-800 flex items-center gap-1">
								<Users size={16} />
								{poll.options?.length || 0} opciones
							</p>
						</div>
					</div>

					{/* Opciones disponibles */}
					<div className="space-y-3">
						<h3 className="font-semibold text-gray-800 flex items-center gap-2">
							<CheckCircle size={18} className="text-blue-600" />
							Opciones disponibles
						</h3>
						
						<div className="space-y-2 pl-6">
							{poll.options && poll.options.length > 0 ? (
								poll.options
									.sort((a, b) => a.int_option_order - b.int_option_order)
									.map((option, index) => (
										<div
											key={option.id}
											className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
										>
											<span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
												{index + 1}
											</span>
											<p className="text-gray-700 flex-1">{option.str_option_text}</p>
										</div>
									))
							) : (
								<p className="text-gray-500 text-sm italic">No hay opciones disponibles</p>
							)}
						</div>
					</div>

					{/* Banner informativo */}
					{isActive && (
						<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
							<Info size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<p className="font-semibold text-green-800 mb-1">Encuesta activa</p>
								<p className="text-sm text-green-700">
									Esta encuesta está activa y disponible para votación.
									La funcionalidad de votación estará disponible próximamente.
								</p>
							</div>
						</div>
					)}

					{isClosed && (
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
							<Info size={20} className="text-gray-600 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<p className="font-semibold text-gray-800 mb-1">Encuesta finalizada</p>
								<p className="text-sm text-gray-600">
									Esta encuesta ha finalizado y ya no acepta votos.
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-xl border-t border-gray-200 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
					>
						Cerrar
					</button>
					
					{/* Botón de votar (deshabilitado por ahora) */}
					{isActive && (
						<button
							disabled
							className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-semibold"
							title="Funcionalidad de votación próximamente"
						>
							Votar (Próximamente)
						</button>
					)}
				</div>
			</div>
		</div>
	);
}