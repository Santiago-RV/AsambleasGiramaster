import React, { useState, useEffect, useMemo } from 'react';
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
	MapPin,
	Edit,
} from 'lucide-react';
import SystemConfigService from '../../../../services/api/SystemConfigService';

const MeetingModal = ({ isOpen, onClose, onSubmit, isSubmitting, meetingMode = 'virtual', meetingToEdit = null }) => {
	const [zoomAccounts, setZoomAccounts] = useState([]);
	const [loadingAccounts, setLoadingAccounts] = useState(false);

	const isEditing = useMemo(() => !!meetingToEdit, [meetingToEdit]);

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
			int_zoom_account_id: '',
		},
	});

	const watchStart = watch('dat_schedule_start');

	// Cargar cuentas Zoom al abrir el modal (solo si es virtual)
	useEffect(() => {
		if (isOpen && meetingMode === 'virtual') {
			loadZoomAccounts();
		}
	}, [isOpen, meetingMode]);

	// Cargar datos de la reunión a editar
	useEffect(() => {
		if (meetingToEdit) {
			let fecha = '';
			let hora = '';
			
			// Procesar la fecha - puede venir como Date, string, o tener fecha/hora separados
			const fechaRaw = meetingToEdit.fechaCompleta || meetingToEdit.fecha;
			
			if (fechaRaw) {
				// Si es un objeto Date
				if (fechaRaw instanceof Date && !isNaN(fechaRaw.getTime())) {
					fecha = fechaRaw.toISOString().split('T')[0];
					hora = fechaRaw.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
				} 
				// Si es un string
				else if (typeof fechaRaw === 'string') {
					const parts = fechaRaw.split('T');
					fecha = parts[0] || '';
					hora = parts[1] ? parts[1].substring(0, 5) : '';
				}
			}
			
			reset({
				str_title: meetingToEdit.titulo || meetingToEdit.str_title || '',
				str_description: meetingToEdit.descripcion || meetingToEdit.str_description || '',
				str_meeting_type: meetingToEdit.str_meeting_type || meetingToEdit.tipo || 'Ordinaria',
				dat_schedule_start: fecha ? `${fecha}T${hora || '00:00'}` : '',
				bln_allow_delegates: meetingToEdit.bln_allow_delegates ?? meetingToEdit.delegados ?? true,
				int_zoom_account_id: meetingToEdit.int_zoom_account_id || '',
			});
		} else {
			reset({
				str_title: '',
				str_description: '',
				str_meeting_type: 'Ordinaria',
				dat_schedule_start: '',
				bln_allow_delegates: true,
				int_zoom_account_id: '',
			});
		}
	}, [meetingToEdit, reset]);

	const loadZoomAccounts = async () => {
		setLoadingAccounts(true);
		try {
			const response = await SystemConfigService.getZoomAccounts();
			if (response.success) {
				const accounts = response.data.accounts || [];
				setZoomAccounts(accounts);
			}
		} catch (error) {
			console.error('Error al cargar cuentas Zoom:', error);
			setZoomAccounts([]);
		} finally {
			setLoadingAccounts(false);
		}
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleFormSubmit = (data) => {
		onSubmit(data, {
			isEditing,
			meetingId: meetingToEdit?.id,
			onSuccess: () => {
				reset();
			}
		});
	};

	const isVirtual = meetingMode === 'virtual';
	const showZoomAccountSelector = isVirtual && zoomAccounts.length > 1;

	return (
		<Modal 
			isOpen={isOpen} 
			onClose={handleClose} 
			title={
				isEditing 
					? (isVirtual ? "Editar Reunion Virtual" : "Editar Reunion Presencial")
					: (isVirtual ? "Crear Reunion Virtual" : "Crear Reunion Presencial")
			} 
			size="2xl"
		>
			<div className="relative">
				{/* OVERLAY DE CARGANDO */}
				{isSubmitting && (
					<div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
						<div className="text-center">
							<div className="relative">
								<div className="w-16 h-16 mx-auto mb-4">
									<svg className="animate-spin h-16 w-16 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								</div>
								<div className="absolute inset-0 flex items-center justify-center">
									{isEditing ? (
										<Edit className="w-6 h-6 text-emerald-600" />
									) : (
										<Plus className="w-6 h-6 text-emerald-600" />
									)}
								</div>
							</div>
							<p className="text-gray-700 font-semibold text-lg">
								{isEditing ? 'Guardando cambios...' : 'Creando reunion...'}
							</p>
							<p className="text-gray-500 text-sm mt-1">
								Por favor espera
							</p>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
				{isVirtual ? (
					<div className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 p-5 rounded-xl shadow-lg">
						<div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
						<div className="relative flex items-center gap-4">
							<div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg shrink-0">
								<Video className="w-6 h-6 text-white" />
							</div>
							<div className="flex-1">
								<h3 className="font-bold text-white mb-1 text-base">
									Reunion Virtual con Zoom
								</h3>
								<p className="text-sm text-blue-50 leading-relaxed">
									Se creara automaticamente una reunion en Zoom. Los datos de acceso se enviaran por correo electronico a todos los copropietarios.
								</p>
							</div>
						</div>
					</div>
				) : (
					<div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 p-5 rounded-xl shadow-lg">
						<div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
						<div className="relative flex items-center gap-4">
							<div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg shrink-0">
								<MapPin className="w-6 h-6 text-white" />
							</div>
							<div className="flex-1">
								<h3 className="font-bold text-white mb-1 text-base">
									Reunion Presencial
								</h3>
								<p className="text-sm text-emerald-50 leading-relaxed">
									La reunion sera en un lugar fisico. Se enviaran las invitaciones por correo electronico a todos los copropietarios.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* SECCION: Informacion General */}
				<div className="space-y-4">
					<div className="flex items-center gap-2 pb-2 border-b border-gray-200">
						<FileText className="w-5 h-5 text-indigo-600" />
						<h3 className="text-base font-bold text-gray-800">Informacion General</h3>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Titulo - Ocupa 2 columnas */}
						<div className="md:col-span-2 group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<FileText className="w-4 h-4 text-indigo-500" />
								Titulo de la Reunion *
							</label>
							<input
								type="text"
								{...register('str_title', {
									required: 'El titulo es obligatorio',
									minLength: {
										value: 5,
										message: 'El titulo debe tener al menos 5 caracteres',
									},
									maxLength: {
										value: 200,
										message: 'El titulo no puede exceder 200 caracteres',
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

						{/* Tipo de Reunion */}
						<div className="group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<UsersIcon className="w-4 h-4 text-indigo-500" />
								Tipo de Reunion *
							</label>
							<select
								{...register('str_meeting_type', {
									required: 'El tipo de reunion es obligatorio',
								})}
								className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm focus:outline-none transition-all cursor-pointer ${
									errors.str_meeting_type
										? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
										: 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
								}`}
							>
								<option value="Ordinaria">Asamblea Ordinaria</option>
								<option value="Extraordinaria">Asamblea Extraordinaria</option>
								<option value="Comite">Reunion de Comite</option>
								<option value="Informativa">Reunion Informativa</option>
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

						{/* Descripcion - Ocupa 2 columnas */}
						<div className="md:col-span-2 group">
							<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
								<FileText className="w-4 h-4 text-indigo-500" />
								Descripcion / Agenda
							</label>
							<textarea
								{...register('str_description', {
									maxLength: {
										value: 1000,
										message: 'La descripcion no puede exceder 1000 caracteres',
									},
								})}
								placeholder="Agenda, orden del dia, temas a tratar..."
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
								Opcional - Maximo 1000 caracteres
							</p>
						</div>
					</div>
				</div>

				{/* SECCION: Configuracion */}
				<div className="space-y-4">
					<div className="flex items-center gap-2 pb-2 border-b border-gray-200">
						<UserCheck className="w-5 h-5 text-purple-600" />
						<h3 className="text-base font-bold text-gray-800">Configuracion</h3>
					</div>

					<div className="grid grid-cols-1 gap-4">
						{/* Selector de Cuenta Zoom (solo si hay mas de 1) */}
						{showZoomAccountSelector && (
							<div className="group">
								<label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
									<Video className="w-4 h-4 text-blue-500" />
									Cuenta Zoom *
								</label>
								<select
									{...register('int_zoom_account_id', {
										required: showZoomAccountSelector ? 'Selecciona una cuenta Zoom' : false,
									})}
									className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm focus:outline-none transition-all cursor-pointer ${
										errors.int_zoom_account_id
											? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
											: 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
									}`}
								>
									<option value="">-- Seleccionar cuenta Zoom --</option>
									{zoomAccounts.map((account) => (
										<option key={account.id} value={account.id}>
											{account.name} (Cuenta #{account.id})
										</option>
									))}
								</select>
								{errors.int_zoom_account_id && (
									<p className="text-red-500 text-xs mt-1 flex items-center gap-1">
										<AlertCircle className="w-3 h-3" />
										{errors.int_zoom_account_id.message}
									</p>
								)}
								<p className="text-xs text-gray-500 mt-1">
									Selecciona la cuenta de Zoom donde se creara la reunion
								</p>
							</div>
						)}

						{/* Info del lider */}
						<div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
							<div className="flex items-start gap-3">
								<div className="p-2 bg-indigo-500 rounded-lg shrink-0">
									<UserCheck className="w-4 h-4 text-white" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-gray-800 text-sm mb-1">
										Lider de la Reunion
									</h4>
									<p className="text-xs text-gray-600 leading-relaxed">
										El lider se asignara automaticamente al administrador de la unidad residencial
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
									Los copropietarios podran delegar su voto a otras personas autorizadas
								</span>
							</div>
						</label>

						{/* Info de duracion */}
						<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
							<div className="flex items-start gap-2">
								<Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
								<p className="text-xs text-amber-800 leading-relaxed">
									<strong>Duracion:</strong> La reunion tendra una duracion indefinida. El administrador podra cerrar el acceso manualmente cuando finalice.
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
								<span>{isEditing ? 'Actualizando reunion...' : 'Creando reunion...'}</span>
							</>
						) : (
							<>
								{isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
								<span>{isEditing ? 'Actualizar Reunion' : 'Crear Reunion'}</span>
							</>
						)}
					</button>
				</div>
			</form>
			</div>
		</Modal>
	);
};

export default MeetingModal;
