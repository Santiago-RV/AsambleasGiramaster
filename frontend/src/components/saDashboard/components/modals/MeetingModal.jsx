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
		<Modal isOpen={isOpen} onClose={handleClose} title="Crear Nueva Reunión" size="lg">
			<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
				{/* BANNER INFORMATIVO ZOOM */}
				<div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
					<div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
					<div className="relative flex items-start gap-4">
						<div className="p-3 bg-blue-500 rounded-xl shrink-0">
							<Video className="w-6 h-6 text-white" />
						</div>
						<div>
							<h3 className="font-bold text-blue-900 mb-1 text-lg flex items-center gap-2">
								<Video className="w-5 h-5" />
								Reunión Virtual con Zoom
							</h3>
							<p className="text-sm text-blue-700 leading-relaxed">
								Se creará automáticamente una reunión en Zoom con un enlace único para
								todos los participantes. Los datos de acceso se enviarán por correo
								electrónico.
							</p>
						</div>
					</div>
				</div>

				{/* SECCIÓN: Información General */}
				<div className="space-y-5">
					<div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
						<FileText className="w-5 h-5 text-indigo-600" />
						<h3 className="text-lg font-bold text-gray-800">Información General</h3>
					</div>

					<div className="space-y-5">
						{/* Título */}
						<div className="group">
							<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
								<FileText className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
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
								className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
									errors.str_title
										? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
										: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
								}`}
							/>
							{errors.str_title && (
								<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
									<AlertCircle className="w-3.5 h-3.5" />
									{errors.str_title.message}
								</p>
							)}
						</div>

						{/* Descripción */}
						<div className="group">
							<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
								<FileText className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
								Descripción
							</label>
							<textarea
								{...register('str_description', {
									maxLength: {
										value: 1000,
										message: 'La descripción no puede exceder 1000 caracteres',
									},
								})}
								placeholder="Descripción de la reunión, agenda, temas a tratar..."
								rows={4}
								className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 resize-none ${
									errors.str_description
										? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
										: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
								}`}
							/>
							{errors.str_description && (
								<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
									<AlertCircle className="w-3.5 h-3.5" />
									{errors.str_description.message}
								</p>
							)}
							<p className="text-xs text-gray-500 mt-1.5">
								Opcional: Incluye agenda, orden del día, o temas a tratar
							</p>
						</div>

						<div className="grid gap-5 grid-cols-1 md:grid-cols-2">
							{/* Tipo de Reunión */}
							<div className="group">
								<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
									<UsersIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
									Tipo de Reunión *
								</label>
								<select
									{...register('str_meeting_type', {
										required: 'El tipo de reunión es obligatorio',
									})}
									className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 cursor-pointer ${
										errors.str_meeting_type
											? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
											: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
									}`}
								>
									<option value="Ordinaria">Asamblea Ordinaria</option>
									<option value="Extraordinaria">Asamblea Extraordinaria</option>
									<option value="Comite">Reunión de Comité</option>
									<option value="Informativa">Reunión Informativa</option>
								</select>
								{errors.str_meeting_type && (
									<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" />
										{errors.str_meeting_type.message}
									</p>
								)}
							</div>

							{/* Líder de la Reunión */}
							<div className="group">
								<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
									<UserCheck className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
									ID del Líder de Reunión *
								</label>
								<input
									type="number"
									{...register('int_meeting_leader_id', {
										required: 'El líder de la reunión es obligatorio',
										min: {
											value: 1,
											message: 'ID inválido',
										},
										valueAsNumber: true,
									})}
									placeholder="Ej: 123"
									className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
										errors.int_meeting_leader_id
											? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
											: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
									}`}
								/>
								{errors.int_meeting_leader_id && (
									<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" />
										{errors.int_meeting_leader_id.message}
									</p>
								)}
								<p className="text-xs text-gray-500 mt-1.5">
									Usuario que moderará la reunión
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* SECCIÓN: Fecha y Hora */}
				<div className="space-y-5">
					<div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
						<Calendar className="w-5 h-5 text-emerald-600" />
						<h3 className="text-lg font-bold text-gray-800">
							Fecha y Hora de Inicio
						</h3>
					</div>

					<div className="group">
						<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
							<Calendar className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
							Fecha y Hora de Inicio *
						</label>
						<input
							type="datetime-local"
							{...register('dat_schedule_start', {
								required: 'La fecha y hora de inicio son obligatorias',
								validate: (value) => {
									const selectedDate = new Date(value);
									const now = new Date();
									if (selectedDate < now) {
										return 'La fecha no puede ser en el pasado';
									}
									return true;
								},
							})}
							className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
								errors.dat_schedule_start
									? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
									: 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
							}`}
						/>
						{errors.dat_schedule_start && (
							<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
								<AlertCircle className="w-3.5 h-3.5" />
								{errors.dat_schedule_start.message}
							</p>
						)}
						<p className="text-xs text-gray-500 mt-1.5">
							La reunión puede tener una duración indefinida
						</p>
					</div>
				</div>

				{/* SECCIÓN: Configuración Adicional */}
				<div className="space-y-5">
					<div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
						<AlertCircle className="w-5 h-5 text-purple-600" />
						<h3 className="text-lg font-bold text-gray-800">
							Configuración Adicional
						</h3>
					</div>

					<div className="space-y-4">
						<label className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
							<input
								type="checkbox"
								{...register('bln_allow_delegates')}
								className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mt-0.5 cursor-pointer"
							/>
							<div className="flex-1">
								<span className="font-semibold text-gray-800 block">
									Permitir delegados
								</span>
								<span className="text-sm text-gray-600">
									Los propietarios podrán delegar su voto a otras personas
									autorizadas
								</span>
							</div>
						</label>
					</div>
				</div>

				{/* BOTONES */}
				<div className="flex flex-wrap gap-3 pt-6 border-t-2 border-gray-100">
					<button
						type="submit"
						disabled={isSubmitting}
						className={`flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 ${
							isSubmitting
								? 'opacity-50 cursor-not-allowed'
								: 'hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
						}`}
					>
						{isSubmitting ? (
							<>
								<Clock className="animate-spin h-5 w-5" />
								Creando reunión...
							</>
						) : (
							<>
								<Plus className="w-5 h-5" />
								Crear Reunión
							</>
						)}
					</button>

					<button
						type="button"
						onClick={handleClose}
						disabled={isSubmitting}
						className="bg-gray-100 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancelar
					</button>
				</div>
			</form>
		</Modal>
	);
};

export default MeetingModal;