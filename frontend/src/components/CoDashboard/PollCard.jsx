import { Clock, Play, Square, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PollCard({ poll, onClick }) {
	// Determinar el estado de la encuesta - ✅ MISMA LÓGICA QUE ZOOM EMBED
	const getStatusConfig = () => {
		const status = poll.str_status;
		
		// Activa
		if (status === 'Activa' || status === 'active') {
			return {
				text: 'Activa',
				color: 'bg-green-100 text-green-800 border-green-300',
				icon: Play,
				iconColor: 'text-green-600',
				pulsing: true
			};
		}
		
		// Finalizada
		if (status === 'finalizada' || status === 'Finalizada' || status === 'closed') {
			return {
				text: 'Finalizada',
				color: 'bg-gray-100 text-gray-800 border-gray-300',
				icon: Square,
				iconColor: 'text-gray-600',
				pulsing: false
			};
		}
		
		// Pendiente / Draft
		return {
			text: 'Pendiente',
			color: 'bg-blue-100 text-blue-800 border-blue-300',
			icon: Clock,
			iconColor: 'text-blue-600',
			pulsing: false
		};
	};

	const statusConfig = getStatusConfig();
	const StatusIcon = statusConfig.icon;

	// Formatear fecha de creación
	const createdDate = poll.created_at 
		? format(new Date(poll.created_at), "d 'de' MMM, yyyy", { locale: es })
		: 'N/D';

	// Información de la reunión
	const meetingTitle = poll.meeting?.str_title || 'Reunión General';

	// Tipo de encuesta en español
	const getPollTypeText = () => {
		switch (poll.str_poll_type) {
			case 'single':
				return 'Opción única';
			case 'multiple':
				return 'Opción múltiple';
			case 'text':
				return 'Texto libre';
			case 'numeric':
				return 'Numérica';
			default:
				return 'Desconocido';
		}
	};

	return (
		<button
			onClick={() => onClick(poll)}
			className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 p-6 text-left group"
		>
			{/* Header con estado */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex-1">
					<h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
						{poll.str_title}
					</h3>
					
					{/* Información de la reunión */}
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
						<Calendar size={14} />
						<span>{meetingTitle}</span>
					</div>

					{/* Badge de estado */}
					<span
						className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color} ${
							statusConfig.pulsing ? 'animate-pulse' : ''
						}`}
					>
						<StatusIcon size={14} className={statusConfig.iconColor} />
						{statusConfig.text}
					</span>
				</div>

				<StatusIcon size={32} className={`${statusConfig.iconColor} flex-shrink-0`} />
			</div>

			{/* Descripción */}
			{poll.str_description && (
				<p className="text-gray-600 text-sm mb-4 line-clamp-2">
					{poll.str_description}
				</p>
			)}

			{/* Información adicional */}
			<div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1">
						<Users size={14} />
						<span>{poll.options?.length || 0} opciones</span>
					</div>
					
					<div className="flex items-center gap-1">
						<Clock size={14} />
						<span>{createdDate}</span>
					</div>
				</div>

				{/* Tipo de encuesta */}
				<span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
					{getPollTypeText()}
				</span>
			</div>
		</button>
	);
}