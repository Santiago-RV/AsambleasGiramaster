import React from 'react';
import { User, Home, Mail, Phone, Percent, CheckCircle, XCircle, Send, Calendar, X } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';

const ResidentDetailsModal = ({ resident, isOpen, onClose }) => {
	if (!isOpen || !resident) return null;

	const formatDate = (dateString) => dateString ? formatDateTime(dateString) : 'No disponible';

	const formatVotingWeight = (weight) => {
		if (weight === undefined || weight === null) return 'No disponible';
		return weight.toFixed(4);
	};

	const getCredentialStatus = () => {
		if (!resident.last_credential_notification) {
			return {
				sent: false,
				message: 'Sin credenciales enviadas',
				date: null,
				type: null
			};
		}
		return {
			sent: true,
			message: 'Credenciales enviadas',
			date: formatDate(resident.last_credential_notification.sent_at),
			type: resident.last_credential_notification.template === 'welcome' ? 'Bienvenida' : 'Reenvío'
		};
	};

	const credentialStatus = getCredentialStatus();

	const InfoCard = ({ icon: Icon, label, value, highlight = false }) => (
		<div className={`p-4 rounded-xl ${highlight ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
			<div className="flex items-center gap-2 mb-2">
				<Icon size={16} className={highlight ? 'text-purple-600' : 'text-gray-500'} />
				<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
			</div>
			<p className={`text-base font-semibold ${highlight ? 'text-purple-700' : 'text-gray-800'}`}>
				{value}
			</p>
		</div>
	);

	return (
		<div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4">
			{/* Overlay */}
			<div
				className="fixed inset-0 bg-black/50"
				onClick={onClose}
			></div>

			{/* Modal Container */}
			<div
				className="relative bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-white/20 rounded-lg">
							<User size={24} className="text-white" />
						</div>
						<h2 className="text-xl font-bold text-white">
							Detalle del Residente
						</h2>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						<X size={24} className="text-white" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					{/* Nombre completo - Fila completa */}
					<div className="mb-6">
						<h3 className="text-2xl font-bold text-gray-800">
							{resident.firstname} {resident.lastname}
						</h3>
						<p className="text-gray-500 text-sm mt-1">
							Usuario: {resident.username}
						</p>
					</div>

					{/* Grid de información - Primera fila */}
					<div className="grid grid-cols-2 gap-4 mb-4">
						<InfoCard
							icon={Home}
							label="Apartamento"
							value={resident.apartment_number || 'No asignado'}
						/>
						<InfoCard
							icon={Percent}
							label="Quorum (Peso voting)"
							value={formatVotingWeight(resident.voting_weight)}
						/>
					</div>

					{/* Grid de información - Segunda fila */}
					<div className="grid grid-cols-2 gap-4 mb-4">
						<InfoCard
							icon={Mail}
							label="Correo electrónico"
							value={resident.email || 'No disponible'}
						/>
						<InfoCard
							icon={Phone}
							label="Teléfono"
							value={resident.phone || 'No disponible'}
						/>
					</div>

					{/* Estado */}
					<div className="mb-4">
						<div className={`p-4 rounded-xl border-2 ${resident.bln_allow_entry ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
							<div className="flex items-center gap-3">
								{resident.bln_allow_entry ? (
									<CheckCircle size={24} className="text-green-600" />
								) : (
									<XCircle size={24} className="text-red-600" />
								)}
								<div>
									<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</span>
									<p className={`text-lg font-bold ${resident.bln_allow_entry ? 'text-green-700' : 'text-red-700'}`}>
										{resident.bln_allow_entry ? 'Habilitado' : 'Inhabilitado'}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Credenciales */}
					<div className="mb-4">
						<div className={`p-4 rounded-xl border-2 ${credentialStatus.sent ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
							<div className="flex items-center gap-3">
								{credentialStatus.sent ? (
									<CheckCircle size={24} className="text-blue-600" />
								) : (
									<Send size={24} className="text-amber-600" />
								)}
								<div>
									<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Credenciales</span>
									<p className={`text-base font-semibold ${credentialStatus.sent ? 'text-blue-700' : 'text-amber-700'}`}>
										{credentialStatus.message}
									</p>
									{credentialStatus.sent && credentialStatus.date && (
										<p className="text-sm text-blue-600 mt-1">
											{credentialStatus.date} ({credentialStatus.type})
										</p>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Invitación a reunión */}
					<div className="mb-4">
						{resident.last_meeting_invitation?.meeting_title && 
						 (resident.last_meeting_invitation.meeting_status === 'Programada' || 
						  resident.last_meeting_invitation.meeting_status === 'En Curso') ? (
							<div className="p-4 rounded-xl border-2 bg-indigo-50 border-indigo-200">
								<div className="flex items-center gap-3">
									<Calendar size={24} className="text-indigo-600" />
									<div>
										<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Última invitación</span>
										<p className="text-base font-semibold text-indigo-700">
											{resident.last_meeting_invitation.meeting_title}
										</p>
										<p className="text-sm text-indigo-600 mt-1">
											{formatDate(resident.last_meeting_invitation.sent_at)} - {resident.last_meeting_invitation.status}
										</p>
									</div>
								</div>
							</div>
						) : (
							<div className="p-4 rounded-xl border-2 bg-gray-50 border-gray-200">
								<div className="flex items-center gap-3">
									<Calendar size={24} className="text-gray-400" />
									<div>
										<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invitación a reunión</span>
										<p className="text-base font-semibold text-gray-600">
											Sin Invitaciones
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Fecha de creación */}
					<div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
						<div className="flex items-center gap-3">
							<Calendar size={20} className="text-gray-500" />
							<div>
								<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de creación</span>
								<p className="text-base font-semibold text-gray-700">
									{formatDate(resident.created_at)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-gray-200 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default ResidentDetailsModal;
