import React from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../common/Modal';
import {
	Video,
	FileText,
	Calendar,
	UsersIcon,
	UserCheck,
	AlertCircle,
	Clock,
	Plus,
} from 'lucide-react';

const MeetingModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
		watch,
	} = useForm({
		defaultValues: {
			str_title: '',
			str_description: '',
			str_meeting_type: 'Ordinaria',
			dat_schedule_start: '',
			bln_allow_delegates: true,
		},
	});

	const watchStart = watch('dat_schedule_start');

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleFormSubmit = (data) => {
		onSubmit(data, () => {
			reset();
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Crear Nueva Reunión" size="2xl">
			<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
				{/* BANNER INFORMATIVO ZOOM - Mejorado */}
				<div className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 p-5 rounded-xl shadow-lg">
					<div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
					<div className="relative flex items-center gap-4">
						<div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg shrink-0">
							<Video className="w-6 h-6 text-white" />
						</div>
						<div className="flex-1">
							<h3 className="font-bold text-white mb-1 text-base">
								Reunión Virtual con Zoom
							</h3>
							<p className="text-sm text-blue-50 leading-relaxed">
								Se creará automáticamente una reunión en Zoom. Los datos de acceso se enviarán por correo electrónico a todos los copropietarios.
							</p>
						</div>
					</div>
				</div>

				{/* SECCIÓN: Información General */}
				<div className="space-y-4">
					<div className="flex items-center gap-2 pb-2 border-b border-gray-200">
						<FileText className="w-5 h-5 text-indigo-600" />
						<h3 className="text-base font-bold text-gray-800">Información General</h3>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Título - Ocupa 2 columnas */}
						<div className="md:col-span-2 group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<FileText className="w-4 h-4 text-indigo-500" />
								Título de la Reunión *
							</label>
							<input
								type="text"
								{...register('str_title', {
									required: 'El título es obligatorio',
									minLength: {
										value: 5,
										message: 'El título debe tener al menos 5 caracteres',
									},
									maxLength: {
										value: 200,
										message: 'El título no puede exceder 200 caracteres',
									},
								})}
								placeholder="Ej: Asamblea Ordinaria Anual 2025"
								className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm focus:outline-none transition-all ${
									errors.str_title
										? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
										: 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
								}`}
							/>
							{errors.str_title && (
								<p className="text-red-500 text-xs mt-1 flex items-center gap-1">
									<AlertCircle className="w-3 h-3" />
									{errors.str_title.message}
								</p>
							)}
						</div>

						{/* Tipo de Reunión */}
						<div className="group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<UsersIcon className="w-4 h-4 text-indigo-500" />
								Tipo de Reunión *
							</label>
							<select
								{...register('str_meeting_type', {
									required: 'El tipo de reunión es obligatorio',
								})}
								className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm focus:outline-none transition-all cursor-pointer ${
									errors.str_meeting_type
										? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
										: 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
								}`}
							>
								<option value="Ordinaria">Asamblea Ordinaria</option>
								<option value="Extraordinaria">Asamblea Extraordinaria</option>
								<option value="Comite">Reunión de Comité</option>
								<option value="Informativa">Reunión Informativa</option>
							</select>
							{errors.str_meeting_type && (
								<p className="text-red-500 text-xs mt-1 flex items-center gap-1">
									<AlertCircle className="w-3 h-3" />
									{errors.str_meeting_type.message}
								</p>
							)}
						</div>

						{/* Fecha y Hora */}
						<div className="group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<Calendar className="w-4 h-4 text-emerald-500" />
								Fecha y Hora *
							</label>
							<input
								type="datetime-local"
								{...register('dat_schedule_start', {
									required: 'La fecha y hora son obligatorias',
									validate: (value) => {
										const selectedDate = new Date(value);
										const now = new Date();
										if (selectedDate < now) {
											return 'La fecha no puede ser en el pasado';
										}
										return true;
									},
								})}
								className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm focus:outline-none transition-all ${
									errors.dat_schedule_start
										? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
										: 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
								}`}
							/>
							{errors.dat_schedule_start && (
								<p className="text-red-500 text-xs mt-1 flex items-center gap-1">
									<AlertCircle className="w-3 h-3" />
									{errors.dat_schedule_start.message}
								</p>
							)}
						</div>

						{/* Descripción - Ocupa 2 columnas */}
						<div className="md:col-span-2 group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<FileText className="w-4 h-4 text-indigo-500" />
								Descripción / Agenda
							</label>
							<textarea
								{...register('str_description', {
									maxLength: {
										value: 1000,
										message: 'La descripción no puede exceder 1000 caracteres',
									},
								})}
								placeholder="Agenda, orden del día, temas a tratar..."
								rows={3}
								className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm focus:outline-none transition-all resize-none ${
									errors.str_description
										? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
										: 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
								}`}
							/>
							{errors.str_description && (
								<p className="text-red-500 text-xs mt-1 flex items-center gap-1">
									<AlertCircle className="w-3 h-3" />
									{errors.str_description.message}
								</p>
							)}
							<p className="text-xs text-gray-500 mt-1">
								Opcional - Máximo 1000 caracteres
							</p>
						</div>
					</div>
				</div>

				{/* SECCIÓN: Configuración */}
				<div className="space-y-4">
					<div className="flex items-center gap-2 pb-2 border-b border-gray-200">
						<UserCheck className="w-5 h-5 text-purple-600" />
						<h3 className="text-base font-bold text-gray-800">Configuración</h3>
					</div>

					<div className="grid grid-cols-1 gap-4">
						{/* Info del líder */}
						<div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
							<div className="flex items-start gap-3">
								<div className="p-2 bg-indigo-500 rounded-lg shrink-0">
									<UserCheck className="w-4 h-4 text-white" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-gray-800 text-sm mb-1">
										Líder de la Reunión
									</h4>
									<p className="text-xs text-gray-600 leading-relaxed">
										El líder se asignará automáticamente al administrador de la unidad residencial
									</p>
								</div>
							</div>
						</div>

						{/* Permitir delegados */}
						<label className="flex items-start gap-3 p-4 bg-white border-2 border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
							<input
								type="checkbox"
								{...register('bln_allow_delegates')}
								className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mt-0.5 cursor-pointer"
							/>
							<div className="flex-1">
								<span className="font-semibold text-gray-800 block text-sm">
									Permitir delegados
								</span>
								<span className="text-xs text-gray-600">
									Los copropietarios podrán delegar su voto a otras personas autorizadas
								</span>
							</div>
						</label>

						{/* Info de duración */}
						<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
							<div className="flex items-start gap-2">
								<Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
								<p className="text-xs text-amber-800 leading-relaxed">
									<strong>Duración:</strong> La reunión tendrá una duración indefinida. El administrador podrá cerrar el acceso manualmente cuando finalice.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* BOTONES */}
				<div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onClick={handleClose}
						disabled={isSubmitting}
						className="flex-1 sm:flex-none bg-white border-2 border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancelar
					</button>

					<button
						type="submit"
						disabled={isSubmitting}
						className={`flex-1 sm:flex-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold px-8 py-2.5 rounded-lg transition-all duration-200 shadow-md ${
							isSubmitting
								? 'opacity-50 cursor-not-allowed'
								: 'hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
						}`}
					>
						{isSubmitting ? (
							<>
								<Clock className="animate-spin h-5 w-5" />
								<span>Creando reunión...</span>
							</>
						) : (
							<>
								<Plus className="w-5 h-5" />
								<span>Crear Reunión</span>
							</>
						)}
					</button>
				</div>
			</form>
		</Modal>
	);
};

export default MeetingModal;