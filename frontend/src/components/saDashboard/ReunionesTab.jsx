import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MeetingService } from '../../services/api/MeetingService';
import { ResidentialUnitService } from '../../services/api/ResidentialUnitService';
import Swal from 'sweetalert2';
import { Calendar, Clock, Users, MapPin, Plus, PlayCircle, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';

const ReunionesTab = ({ onStartMeeting }) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' o 'past'
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors },
	} = useForm({
		defaultValues: {
			int_id_residential_unit: '',
			str_title: '',
			str_description: '',
			str_meeting_type: 'Ordinaria',
			dat_schedule_date: '',
			int_estimated_duration: 60,
			bln_allow_delegates: false,
		},
	});

	// Query para obtener las unidades residenciales
	const { data: unidadesData } = useQuery({
		queryKey: ['residentialUnits'],
		queryFn: ResidentialUnitService.getResidentialUnits,
		select: (response) => response.data || [],
	});

	// Query para obtener las reuniones
	const {
		data: reunionesData,
		isLoading: isLoadingReuniones,
		isError: isErrorReuniones,
	} = useQuery({
		queryKey: ['meetings'],
		queryFn: MeetingService.getMeetings,
		select: (response) => response.data || [],
	});

	// Mutación para crear reunión
	const createMeetingMutation = useMutation({
		mutationFn: MeetingService.createMeeting,
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['meetings'] });
			reset();
			setIsModalOpen(false);

			// Mostrar mensaje de éxito
			// El backend envía las invitaciones automáticamente
			Swal.fire({
				icon: 'success',
				title: '¡Reunión Creada Exitosamente!',
				html: `
					<div class="text-center">
						<p class="mb-3 text-lg">La reunión se creó correctamente</p>
						<p class="mb-3">📧 Las invitaciones han sido enviadas automáticamente a todos los usuarios de la unidad residencial</p>
						<p class="text-sm text-gray-600 mt-3">Revisa los logs del servidor para ver las estadísticas de envío</p>
					</div>
				`,
				showConfirmButton: true,
				confirmButtonColor: '#3498db',
				confirmButtonText: 'Entendido',
				timer: 5000,
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al crear la reunión',
				showConfirmButton: true,
				confirmButtonColor: '#3498db',
			});
		},
	});

	const onSubmit = (data) => {
		// Convertir la fecha y hora a formato ISO
		const scheduleDate = new Date(data.dat_schedule_date).toISOString();

		const meetingData = {
			int_id_residential_unit: parseInt(data.int_id_residential_unit),
			str_title: data.str_title,
			str_description: data.str_description || '',
			str_meeting_type: data.str_meeting_type,
			dat_schedule_date: scheduleDate,
			int_estimated_duration: parseInt(data.int_estimated_duration),
			bln_allow_delegates: data.bln_allow_delegates,
		};

		createMeetingMutation.mutate(meetingData);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		reset();
	};

	// Mapear datos del backend al formato del componente
	const reuniones =
		reunionesData?.map((reunion) => {
			const fechaObj = new Date(reunion.dat_schedule_date);
			return {
				...reunion, // Mantener todos los datos originales para Zoom
				id: reunion.id,
				titulo: reunion.str_title,
				fecha:
					reunion.dat_schedule_date?.split('T')[0] ||
					fechaObj.toISOString().split('T')[0],
				fechaCompleta: fechaObj, // Para comparaciones
				hora: fechaObj.toLocaleTimeString('es-ES', {
					hour: '2-digit',
					minute: '2-digit',
				}),
				unidad: reunion.residential_unit?.str_name || 'N/A',
				asistentes: reunion.int_total_confirmed || 0,
				estado: reunion.str_status || 'Programada',
				tipo: reunion.str_meeting_type,
				descripcion: reunion.str_description,
				codigo: reunion.str_meeting_code,
				zoom_url: reunion.str_zoom_join_url,
				duracion: reunion.int_estimated_duration,
			};
		}) || [];

	// Filtrar y ordenar reuniones por pestaña
	const { upcomingMeetings, pastMeetings } = useMemo(() => {
		const now = new Date();
		const upcoming = [];
		const past = [];

		reuniones.forEach(meeting => {
			const meetingDate = new Date(meeting.fechaCompleta);

			// Si está en curso o es una reunión futura
			if (meetingDate >= now || meeting.estado?.toLowerCase() === 'en curso' || meeting.estado?.toLowerCase() === 'activa') {
				upcoming.push(meeting);
			} else {
				past.push(meeting);
			}
		});

		// Ordenar próximas reuniones: más cercanas primero
		upcoming.sort((a, b) => new Date(a.fechaCompleta) - new Date(b.fechaCompleta));

		// Ordenar reuniones pasadas: más recientes primero
		past.sort((a, b) => new Date(b.fechaCompleta) - new Date(a.fechaCompleta));

		return { upcomingMeetings: upcoming, pastMeetings: past };
	}, [reuniones]);

	// Reuniones a mostrar según la pestaña activa
	const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

	// Función para iniciar una reunión
	const handleStartMeeting = (reunion) => {
		if (onStartMeeting) {
			onStartMeeting(reunion);
		}
	};

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

	// Mostrar estado de carga
	if (isLoadingReuniones) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<svg
						className="animate-spin h-12 w-12 text-[#3498db] mx-auto mb-4"
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
					<p className="text-gray-600 font-semibold">
						Cargando reuniones...
					</p>
				</div>
			</div>
		);
	}

	// Mostrar error
	if (isErrorReuniones) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<div className="text-red-500 text-6xl mb-4">⚠️</div>
					<p className="text-gray-600 font-semibold">
						Error al cargar las reuniones
					</p>
					<button
						onClick={() =>
							queryClient.invalidateQueries({
								queryKey: ['meetings'],
							})
						}
						className="mt-4 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9]"
					>
						Reintentar
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Encabezado */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-800">
						Reuniones
					</h1>
					<p className="text-gray-600 mt-2">
						{upcomingMeetings.length} próxima{upcomingMeetings.length !== 1 ? 's' : ''} · {pastMeetings.length} pasada{pastMeetings.length !== 1 ? 's' : ''}
					</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
						<PlayCircle size={20} />
						Iniciar Reunión
					</button>
					<button
						onClick={() => {
							console.log('Botón Nueva Reunión clickeado');
							setIsModalOpen(true);
						}}
						className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold"
					>
						<Plus size={20} />
						Nueva Reunión
					</button>
				</div>
			</div>

			{/* Pestañas */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="border-b border-gray-200 bg-gray-50">
					<div className="flex">
						<button
							onClick={() => setActiveTab('upcoming')}
							className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${
								activeTab === 'upcoming'
									? 'text-blue-600 bg-white'
									: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
							}`}
						>
							<div className="flex items-center justify-center gap-2">
								<ChevronRight size={16} />
								<span>Próximas</span>
								{upcomingMeetings.length > 0 && (
									<span className={`px-2 py-0.5 rounded-full text-xs ${
										activeTab === 'upcoming'
											? 'bg-blue-100 text-blue-700'
											: 'bg-gray-200 text-gray-600'
									}`}>
										{upcomingMeetings.length}
									</span>
								)}
							</div>
							{activeTab === 'upcoming' && (
								<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
							)}
						</button>
						<button
							onClick={() => setActiveTab('past')}
							className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${
								activeTab === 'past'
									? 'text-blue-600 bg-white'
									: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
							}`}
						>
							<div className="flex items-center justify-center gap-2">
								<Clock size={16} />
								<span>Historial</span>
								{pastMeetings.length > 0 && (
									<span className={`px-2 py-0.5 rounded-full text-xs ${
										activeTab === 'past'
											? 'bg-blue-100 text-blue-700'
											: 'bg-gray-200 text-gray-600'
									}`}>
										{pastMeetings.length}
									</span>
								)}
							</div>
							{activeTab === 'past' && (
								<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Tarjeta de reunión activa - Solo mostrar si hay una reunión en curso y en pestaña de próximas */}
			{activeTab === 'upcoming' && upcomingMeetings.some(
				(r) =>
					r.estado?.toLowerCase() === 'en curso' ||
					r.estado?.toLowerCase() === 'activa'
			) && (
				<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
					{upcomingMeetings
						.filter(
							(r) =>
								r.estado?.toLowerCase() === 'en curso' ||
								r.estado?.toLowerCase() === 'activa'
						)
						.slice(0, 1)
						.map((reunion) => (
							<div key={`active-${reunion.id}`}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
											<PlayCircle size={32} />
										</div>
										<div>
											<h3 className="text-2xl font-bold mb-1">
												{reunion.titulo}
											</h3>
											<p className="text-green-100">
												{reunion.unidad} - En curso
											</p>
										</div>
									</div>
									<button
										onClick={() =>
											handleStartMeeting(reunion)
										}
										className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold"
									>
										Unirse Ahora
									</button>
								</div>
								<div className="grid grid-cols-3 gap-4 mt-6">
									<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
										<p className="text-green-100 text-sm mb-1">
											Asistentes
										</p>
										<p className="text-2xl font-bold">
											{reunion.asistentes}
										</p>
									</div>
									<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
										<p className="text-green-100 text-sm mb-1">
											Duración Est.
										</p>
										<p className="text-2xl font-bold">
											{reunion.duracion} min
										</p>
									</div>
									<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
										<p className="text-green-100 text-sm mb-1">
											Tipo
										</p>
										<p className="text-2xl font-bold">
											{reunion.tipo}
										</p>
									</div>
								</div>
							</div>
						))}
				</div>
			)}

			{/* Listado de reuniones */}
			<div className="grid grid-cols-1 gap-6">
				{displayMeetings.length === 0 ? (
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
						<Calendar
							size={64}
							className="mx-auto text-gray-300 mb-4"
						/>
						<h3 className="text-xl font-bold text-gray-600 mb-2">
							{activeTab === 'upcoming'
								? 'No hay reuniones programadas'
								: 'No hay reuniones en el historial'}
						</h3>
						<p className="text-gray-500 mb-6">
							{activeTab === 'upcoming'
								? 'Comienza creando una nueva reunión de Zoom'
								: 'Las reuniones finalizadas o pasadas aparecerán aquí'}
						</p>
						{activeTab === 'upcoming' && (
							<button
								onClick={() => setIsModalOpen(true)}
								className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold"
							>
								<Plus size={20} />
								Nueva Reunión
							</button>
						)}
					</div>
				) : (
					displayMeetings.map((reunion) => (
						<div
							key={reunion.id}
							className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white shadow-lg">
										<Calendar size={24} />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-xl font-bold text-gray-800">
												{reunion.titulo}
											</h3>
											<span
												className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(
													reunion.estado
												)}`}
											>
												{reunion.estado}
											</span>
										</div>

										<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
											<div className="flex items-center gap-2 text-gray-600">
												<Calendar size={16} />
												<span className="text-sm">
													{new Date(
														reunion.fecha
													).toLocaleDateString(
														'es-ES',
														{
															day: '2-digit',
															month: 'long',
															year: 'numeric',
														}
													)}
												</span>
											</div>
											<div className="flex items-center gap-2 text-gray-600">
												<Clock size={16} />
												<span className="text-sm">
													{reunion.hora}
												</span>
											</div>
											<div className="flex items-center gap-2 text-gray-600">
												<MapPin size={16} />
												<span className="text-sm">
													{reunion.unidad}
												</span>
											</div>
											<div className="flex items-center gap-2 text-gray-600">
												<Users size={16} />
												<span className="text-sm">
													{reunion.asistentes}{' '}
													asistentes
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Botones según pestaña */}
								{activeTab === 'upcoming' ? (
									<div className="flex gap-2">
										{(reunion.estado?.toLowerCase() ===
											'en curso' ||
											reunion.estado?.toLowerCase() ===
												'activa' ||
											reunion.estado?.toLowerCase() ===
												'programada') && (
											<button
												onClick={() =>
													handleStartMeeting(reunion)
												}
												className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
											>
												{reunion.estado?.toLowerCase() ===
													'en curso' ||
												reunion.estado?.toLowerCase() ===
													'activa'
													? 'Unirse'
													: 'Iniciar'}
											</button>
										)}
										<button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
											Ver detalles
										</button>
									</div>
								) : (
									<div className="flex gap-2 items-center text-sm text-gray-600">
										{reunion.estado?.toLowerCase() === 'cancelada' ? (
											<span className="flex items-center gap-1 text-red-600">
												<XCircle size={16} />
												Reunión cancelada
											</span>
										) : reunion.estado?.toLowerCase() === 'completada' || reunion.estado?.toLowerCase() === 'finalizada' ? (
											<span className="flex items-center gap-1 text-green-600">
												<CheckCircle size={16} />
												Reunión finalizada
											</span>
										) : (
											<span className="flex items-center gap-1 text-gray-500">
												<AlertCircle size={16} />
												Reunión pasada
											</span>
										)}
										<button className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
											Ver detalles
										</button>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>

			{/* Modal de creación */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				title="Crear Nueva Reunión de Zoom"
				size="lg"
			>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					{/* Información general */}
					<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
						<h3 className="font-semibold text-blue-800 mb-2">
							📹 Reunión Virtual con Zoom
						</h3>
						<p className="text-sm text-blue-700">
							Se creará automáticamente una reunión en Zoom con un
							enlace único para todos los participantes.
						</p>
					</div>

					<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
						{/* Unidad Residencial */}
						<div className="md:col-span-2">
							<label className="block mb-2 font-semibold text-gray-700">
								Unidad Residencial *
							</label>
							<select
								{...register('int_id_residential_unit', {
									required:
										'Debe seleccionar una unidad residencial',
								})}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							>
								<option value="">
									Seleccione una unidad...
								</option>
								{unidadesData?.map((unidad) => (
									<option key={unidad.id} value={unidad.id}>
										{unidad.str_name} - {unidad.str_city}
									</option>
								))}
							</select>
							{errors.int_id_residential_unit && (
								<span className="text-red-500 text-sm">
									{errors.int_id_residential_unit.message}
								</span>
							)}
						</div>

						{/* Título */}
						<div className="md:col-span-2">
							<label className="block mb-2 font-semibold text-gray-700">
								Título de la Reunión *
							</label>
							<input
								type="text"
								{...register('str_title', {
									required: 'El título es obligatorio',
									minLength: {
										value: 5,
										message: 'Mínimo 5 caracteres',
									},
								})}
								placeholder="Ej: Asamblea Ordinaria Anual 2025"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.str_title && (
								<span className="text-red-500 text-sm">
									{errors.str_title.message}
								</span>
							)}
						</div>

						{/* Descripción */}
						<div className="md:col-span-2">
							<label className="block mb-2 font-semibold text-gray-700">
								Descripción
							</label>
							<textarea
								{...register('str_description')}
								placeholder="Descripción de la reunión, agenda, temas a tratar..."
								rows={3}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
						</div>

						{/* Tipo de Reunión */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Tipo de Reunión *
							</label>
							<select
								{...register('str_meeting_type', {
									required: 'El tipo es obligatorio',
								})}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							>
								<option value="Ordinaria">
									Asamblea Ordinaria
								</option>
								<option value="Extraordinaria">
									Asamblea Extraordinaria
								</option>
								<option value="Comite">
									Reunión de Comité
								</option>
								<option value="Informativa">
									Reunión Informativa
								</option>
							</select>
						</div>

						{/* Duración Estimada */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Duración Estimada (minutos) *
							</label>
							<input
								type="number"
								{...register('int_estimated_duration', {
									required: 'La duración es obligatoria',
									min: {
										value: 15,
										message: 'Mínimo 15 minutos',
									},
									max: {
										value: 480,
										message: 'Máximo 8 horas (480 minutos)',
									},
								})}
								placeholder="60"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.int_estimated_duration && (
								<span className="text-red-500 text-sm">
									{errors.int_estimated_duration.message}
								</span>
							)}
						</div>

						{/* Fecha y Hora */}
						<div className="md:col-span-2">
							<label className="block mb-2 font-semibold text-gray-700">
								Fecha y Hora de la Reunión *
							</label>
							<input
								type="datetime-local"
								{...register('dat_schedule_date', {
									required:
										'La fecha y hora son obligatorias',
								})}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.dat_schedule_date && (
								<span className="text-red-500 text-sm">
									{errors.dat_schedule_date.message}
								</span>
							)}
						</div>

						{/* Permitir Delegados */}
						<div className="md:col-span-2">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									{...register('bln_allow_delegates')}
									className="w-5 h-5 text-[#3498db] border-gray-300 rounded focus:ring-[#3498db]"
								/>
								<span className="font-semibold text-gray-700">
									Permitir delegados
								</span>
								<span className="text-sm text-gray-500">
									(Los propietarios pueden delegar su voto)
								</span>
							</label>
						</div>
					</div>

					<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
						<button
							type="submit"
							disabled={createMeetingMutation.isPending}
							className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${
								createMeetingMutation.isPending
									? 'opacity-50 cursor-not-allowed'
									: ''
							}`}
						>
							{createMeetingMutation.isPending ? (
								<>
									<svg
										className="animate-spin h-5 w-5"
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
									Creando reunión...
								</>
							) : (
								<>
									<Plus size={20} />
									Crear Reunión de Zoom
								</>
							)}
						</button>

						<button
							type="button"
							onClick={handleCloseModal}
							disabled={createMeetingMutation.isPending}
							className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancelar
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
};

export default ReunionesTab;
