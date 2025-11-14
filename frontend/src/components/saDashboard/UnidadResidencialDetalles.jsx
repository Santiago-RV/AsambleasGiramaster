import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
	ArrowLeft,
	MapPin,
	Plus,
	Upload,
	Search,
	MoreVertical,
	Eye,
	Edit,
	Trash2,
	Calendar,
	Clock,
	Users as UsersIcon,
	PlayCircle,
	FileSpreadsheet,
	UserCog,
	Mail,
	Phone,
} from 'lucide-react';
import { ResidentialUnitService } from '../../services/api/ResidentialUnitService';
import { MeetingService } from '../../services/api/MeetingService';
import Modal from '../common/Modal';
import Swal from 'sweetalert2';

const UnidadResidencialDetalles = ({ unitId, onBack, onStartMeeting }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
	const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
	const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
	const [isChangeAdminModalOpen, setIsChangeAdminModalOpen] = useState(false);
	const [selectedResidentMenu, setSelectedResidentMenu] = useState(null);
	const [selectedResident, setSelectedResident] = useState(null);
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
	const menuButtonRefs = useRef({});
	const queryClient = useQueryClient();

	// Datos ficticios del administrador
	const [currentAdmin, setCurrentAdmin] = useState({
		id: 1,
		firstname: 'Carlos',
		lastname: 'Rodríguez',
		email: 'carlos.rodriguez@unidad.com',
		phone: '+57 300 123 4567',
		apartment_number: '101',
		role: 'Administrador',
	});

	// Actualizar posición del menú cuando cambia el scroll o el tamaño de la ventana
	useEffect(() => {
		const updateMenuPosition = () => {
			if (selectedResidentMenu && menuButtonRefs.current[selectedResidentMenu]) {
				const button = menuButtonRefs.current[selectedResidentMenu];
				const rect = button.getBoundingClientRect();
				const menuWidth = 192; // w-48 = 12rem = 192px
				const viewportWidth = window.innerWidth;
				const viewportHeight = window.innerHeight;
				
				// Calcular posición izquierda - alineado al botón
				let left = rect.right - menuWidth;
				// Si el menú se sale por la izquierda, alinearlo al borde izquierdo con margen
				if (left < 8) {
					left = 8;
				}
				// Si el menú se sale por la derecha, alinearlo al borde derecho con margen
				if (rect.right > viewportWidth - 8) {
					left = viewportWidth - menuWidth - 8;
				}
				
				// Calcular posición superior
				let top = rect.bottom + 8;
				const menuHeight = 120; // Aproximadamente la altura del menú
				// Si el menú se sale por abajo, mostrarlo arriba del botón
				if (top + menuHeight > viewportHeight - 8) {
					top = rect.top - menuHeight - 8;
				}
				// Asegurar que no se salga por arriba
				if (top < 8) {
					top = 8;
				}
				
				setMenuPosition({
					top: top,
					left: left,
				});
			}
		};

		if (selectedResidentMenu) {
			updateMenuPosition();
			// Escuchar scroll en todos los contenedores
			const scrollContainers = document.querySelectorAll('[class*="overflow-y-auto"]');
			scrollContainers.forEach(container => {
				container.addEventListener('scroll', updateMenuPosition, true);
			});
			window.addEventListener('scroll', updateMenuPosition, true);
			window.addEventListener('resize', updateMenuPosition);
		}

		return () => {
			const scrollContainers = document.querySelectorAll('[class*="overflow-y-auto"]');
			scrollContainers.forEach(container => {
				container.removeEventListener('scroll', updateMenuPosition, true);
			});
			window.removeEventListener('scroll', updateMenuPosition, true);
			window.removeEventListener('resize', updateMenuPosition);
		};
	}, [selectedResidentMenu]);

	// Obtener datos de la unidad residencial
	const {
		data: unitData,
		isLoading: isLoadingUnit,
		isError: isErrorUnit,
	} = useQuery({
		queryKey: ['residentialUnit', unitId],
		queryFn: () => ResidentialUnitService.getResidentialUnitById(unitId),
		select: (response) => response.data,
		enabled: !!unitId,
	});

	// Obtener residentes
	const {
		data: residentsData,
		isLoading: isLoadingResidents,
		isError: isErrorResidents,
	} = useQuery({
		queryKey: ['residents', unitId],
		queryFn: () =>
			ResidentialUnitService.getResidentsByResidentialUnit(unitId),
		select: (response) => response.data || [],
		enabled: !!unitId,
	});

	// Obtener reuniones de la unidad
	const {
		data: meetingsData,
		isLoading: isLoadingMeetings,
		isError: isErrorMeetings,
	} = useQuery({
		queryKey: ['meetings', unitId],
		queryFn: () => MeetingService.getMeetingsByResidentialUnit(unitId),
		select: (response) => {
			if (response.success && response.data) {
				return response.data.map((reunion) => {
					const fechaObj = new Date(reunion.dat_schedule_date);
					return {
						...reunion,
						id: reunion.id,
						titulo: reunion.str_title,
						fecha:
							reunion.dat_schedule_date?.split('T')[0] ||
							fechaObj.toISOString().split('T')[0],
						hora: fechaObj.toLocaleTimeString('es-ES', {
							hour: '2-digit',
							minute: '2-digit',
						}),
						asistentes: reunion.int_total_confirmed || 0,
						estado: reunion.str_status || 'Programada',
						tipo: reunion.str_meeting_type,
						descripcion: reunion.str_description,
						codigo: reunion.str_meeting_code,
						zoom_url: reunion.str_zoom_join_url,
						duracion: reunion.int_estimated_duration,
					};
				});
			}
			return [];
		},
		enabled: !!unitId,
	});

	// Formulario para crear reunión
	const {
		register: registerMeeting,
		handleSubmit: handleSubmitMeeting,
		reset: resetMeeting,
		formState: { errors: errorsMeeting },
	} = useForm({
		defaultValues: {
			str_title: '',
			str_description: '',
			str_meeting_type: 'Ordinaria',
			dat_schedule_date: '',
			int_estimated_duration: 60,
			bln_allow_delegates: false,
		},
	});

	// Formulario para editar residente
	const {
		register: registerResident,
		handleSubmit: handleSubmitResident,
		reset: resetResident,
		setValue: setResidentValue,
		formState: { errors: errorsResident },
	} = useForm({
		defaultValues: {
			firstname: '',
			lastname: '',
			username: '',
			email: '',
			phone: '',
			apartment_number: '',
			is_active: true,
		},
	});

	// Mutación para crear reunión
	const createMeetingMutation = useMutation({
		mutationFn: MeetingService.createMeeting,
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['meetings', unitId] });
			resetMeeting();
			setIsMeetingModalOpen(false);
			Swal.fire({
				icon: 'success',
				title: '¡Reunión Creada Exitosamente!',
				text: 'La reunión se creó correctamente y las invitaciones han sido enviadas',
				showConfirmButton: true,
				confirmButtonColor: '#3498db',
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al crear la reunión',
			});
		},
	});

	const onSubmitMeeting = (data) => {
		const scheduleDate = new Date(data.dat_schedule_date).toISOString();
		const meetingData = {
			int_id_residential_unit: parseInt(unitId),
			str_title: data.str_title,
			str_description: data.str_description || '',
			str_meeting_type: data.str_meeting_type,
			dat_schedule_date: scheduleDate,
			int_estimated_duration: parseInt(data.int_estimated_duration),
			bln_allow_delegates: data.bln_allow_delegates,
		};
		createMeetingMutation.mutate(meetingData);
	};

	// Filtrar residentes por búsqueda
	const filteredResidents = residentsData?.filter((resident) => {
		const search = searchTerm.toLowerCase();
		return (
			(resident.firstname?.toLowerCase().includes(search) ||
				resident.lastname?.toLowerCase().includes(search) ||
				resident.username?.toLowerCase().includes(search) ||
				resident.email?.toLowerCase().includes(search) ||
				resident.apartment_number?.toLowerCase().includes(search)) &&
			true
		);
	});

	// Funciones para acciones de residentes
	const handleViewResident = (resident) => {
		setSelectedResidentMenu(null);
		Swal.fire({
			title: 'Detalles del Residente',
			html: `
				<div class="text-left">
					<p><strong>Nombre:</strong> ${resident.firstname} ${resident.lastname}</p>
					<p><strong>Usuario:</strong> ${resident.username}</p>
					<p><strong>Email:</strong> ${resident.email}</p>
					${resident.phone ? `<p><strong>Teléfono:</strong> ${resident.phone}</p>` : ''}
					<p><strong>Apartamento:</strong> ${resident.apartment_number}</p>
					<p><strong>Estado:</strong> ${resident.is_active ? 'Activo' : 'Inactivo'}</p>
				</div>
			`,
			confirmButtonColor: '#3498db',
		});
	};

	const handleEditResident = (resident) => {
		setSelectedResidentMenu(null);
		setSelectedResident(resident);
		// Cargar los datos del residente en el formulario
		setResidentValue('firstname', resident.firstname || '');
		setResidentValue('lastname', resident.lastname || '');
		setResidentValue('username', resident.username || '');
		setResidentValue('email', resident.email || '');
		setResidentValue('phone', resident.phone || '');
		setResidentValue('apartment_number', resident.apartment_number || '');
		setResidentValue('is_active', resident.is_active !== undefined ? resident.is_active : true);
		setIsEditResidentModalOpen(true);
	};

	// Mutación para actualizar residente
	const updateResidentMutation = useMutation({
		mutationFn: async (data) => {
			// TODO: Implementar actualización en el backend
			// Por ahora solo mostramos un mensaje de éxito
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve({ success: true, message: 'Residente actualizado exitosamente' });
				}, 1000);
			});
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			resetResident();
			setIsEditResidentModalOpen(false);
			setSelectedResident(null);
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Residente actualizado exitosamente',
				showConfirmButton: false,
				timer: 2000,
				toast: true,
				position: 'top-end',
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al actualizar el residente',
			});
		},
	});

	const onSubmitResident = (data) => {
		if (!selectedResident) return;
		
		const residentData = {
			id: selectedResident.id,
			firstname: data.firstname,
			lastname: data.lastname,
			username: data.username,
			email: data.email,
			phone: data.phone || '',
			apartment_number: data.apartment_number,
			is_active: data.is_active,
		};

		updateResidentMutation.mutate(residentData);
	};

	const handleDeleteResident = (resident) => {
		setSelectedResidentMenu(null);
		Swal.fire({
			title: '¿Estás seguro?',
			text: `¿Deseas eliminar a ${resident.firstname} ${resident.lastname}?`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#d33',
			cancelButtonColor: '#3085d6',
			confirmButtonText: 'Sí, eliminar',
			cancelButtonText: 'Cancelar',
		}).then((result) => {
			if (result.isConfirmed) {
				// TODO: Implementar eliminación de residente
				Swal.fire(
					'Eliminado',
					'El residente ha sido eliminado',
					'success'
				);
			}
		});
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

	if (isLoadingUnit) {
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
					<p className="text-gray-600">
						Cargando unidad residencial...
					</p>
				</div>
			</div>
		);
	}

	if (isErrorUnit || !unitData) {
		return (
			<div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
				<p className="text-red-600">
					Error al cargar la unidad residencial
				</p>
				<button
					onClick={onBack}
					className="mt-4 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9]"
				>
					Volver
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Encabezado */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="flex items-start justify-between gap-4 mb-4">
					<div className="flex items-center gap-4 flex-1">
						<button
							onClick={onBack}
							className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<ArrowLeft size={24} className="text-gray-600" />
						</button>
						<div className="flex-1">
							<h1 className="text-3xl font-bold text-gray-800">
								{unitData.str_name}
							</h1>
							<div className="flex items-center gap-2 text-gray-600 mt-1">
								<MapPin size={18} />
								<p>
									{unitData.str_address}, {unitData.str_city},{' '}
									{unitData.str_state}
								</p>
							</div>
						</div>
					</div>
					
					{/* Información del Administrador */}
					<div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold shadow-md">
								{currentAdmin.firstname.charAt(0)}
								{currentAdmin.lastname.charAt(0)}
							</div>
							<div>
								<div className="flex items-center gap-2">
									<p className="font-semibold text-gray-800">
										{currentAdmin.firstname} {currentAdmin.lastname}
									</p>
									<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
										{currentAdmin.role}
									</span>
								</div>
								<div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
									<div className="flex items-center gap-1">
										<Mail size={14} />
										<span>{currentAdmin.email}</span>
									</div>
									{currentAdmin.phone && (
										<div className="flex items-center gap-1">
											<Phone size={14} />
											<span>{currentAdmin.phone}</span>
										</div>
									)}
								</div>
							</div>
						</div>
						<button
							onClick={() => setIsChangeAdminModalOpen(true)}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm whitespace-nowrap"
						>
							<UserCog size={18} />
							Cambiar Administrador
						</button>
					</div>
				</div>

				{/* Botones de acción para residentes */}
				<div className="flex gap-3 pt-4 border-t border-gray-200">
					<button
						onClick={() => setIsResidentModalOpen(true)}
						className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
					>
						<Plus size={18} />
						Agregar Residente
					</button>
					<button
						onClick={() => {
							Swal.fire({
								icon: 'info',
								title: 'Cargar desde Excel',
								text: 'Funcionalidad próximamente',
							});
						}}
						className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
					>
						<FileSpreadsheet size={18} />
						Cargar desde Excel
					</button>
				</div>
			</div>

			{/* Buscador */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
				<div className="relative">
					<Search
						className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
						size={20}
					/>
					<input
						type="text"
						placeholder="Buscar residentes por nombre, usuario, email o apartamento..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Listado de Residentes */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col" style={{ maxHeight: '700px' }}>
					<div className="p-6 border-b border-gray-200 flex-shrink-0">
						<h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
							<UsersIcon size={24} />
							Residentes ({filteredResidents?.length || 0})
						</h2>
					</div>
					<div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
						{isLoadingResidents ? (
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
						) : filteredResidents &&
						  filteredResidents.length > 0 ? (
							<div className="divide-y divide-gray-200">
								{filteredResidents.map((resident) => (
									<div
										key={resident.id}
										className="p-4 hover:bg-gray-50 transition-colors relative"
										onClick={() => {
											if (selectedResidentMenu && selectedResidentMenu !== resident.id) {
												setSelectedResidentMenu(null);
											}
										}}
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<p className="font-semibold text-gray-800">
													{resident.firstname}{' '}
													{resident.lastname}
												</p>
												<p className="text-sm text-gray-600 mt-1">
													Apt.{' '}
													{resident.apartment_number}
												</p>
											</div>
											<div className="relative">
												<button
													ref={(el) => {
														if (el) {
															menuButtonRefs.current[resident.id] = el;
														}
													}}
													onClick={(e) => {
														e.stopPropagation();
														const button = e.currentTarget;
														
														if (selectedResidentMenu === resident.id) {
															setSelectedResidentMenu(null);
														} else {
															const rect = button.getBoundingClientRect();
															const menuWidth = 192;
															const viewportWidth = window.innerWidth;
															const viewportHeight = window.innerHeight;
															
															// Calcular posición izquierda
															let left = rect.right - menuWidth;
															if (left < 8) {
																left = 8;
															}
															if (rect.right > viewportWidth - 8) {
																left = viewportWidth - menuWidth - 8;
															}
															
															// Calcular posición superior
															let top = rect.bottom + 8;
															const menuHeight = 120;
															if (top + menuHeight > viewportHeight - 8) {
																top = rect.top - menuHeight - 8;
															}
															if (top < 8) {
																top = 8;
															}
															
															setMenuPosition({
																top: top,
																left: left,
															});
															setSelectedResidentMenu(resident.id);
														}
													}}
													className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
												>
													<MoreVertical
														size={20}
														className="text-gray-600"
													/>
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-12">
								<UsersIcon
									className="mx-auto text-gray-400 mb-4"
									size={48}
								/>
								<p className="text-gray-600">
									{searchTerm
										? 'No se encontraron residentes con ese criterio'
										: 'No hay residentes registrados'}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Vista de Reuniones */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col" style={{ maxHeight: '700px' }}>
					<div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
						<h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
							<Calendar size={24} />
							Reuniones ({meetingsData?.length || 0})
						</h2>
						<button
							onClick={() => setIsMeetingModalOpen(true)}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
						>
							<Plus size={18} />
							Nueva Reunión
						</button>
					</div>
					<div className="flex-1 overflow-y-auto overflow-x-hidden p-4" style={{ minHeight: 0 }}>
						{isLoadingMeetings ? (
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
						) : meetingsData && meetingsData.length > 0 ? (
							<div className="space-y-4">
								{meetingsData.map((reunion) => (
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
												{new Date(
													reunion.fecha
												).toLocaleDateString('es-ES', {
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
										{(reunion.estado?.toLowerCase() ===
											'en curso' ||
											reunion.estado?.toLowerCase() ===
												'activa' ||
											reunion.estado?.toLowerCase() ===
												'programada') && (
											<button
												onClick={() =>
													onStartMeeting &&
													onStartMeeting(reunion)
												}
												className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
											>
												<PlayCircle size={18} />
												{reunion.estado?.toLowerCase() ===
													'en curso' ||
												reunion.estado?.toLowerCase() ===
													'activa'
													? 'Unirse'
													: 'Acceder a la Reunión'}
											</button>
										)}
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-12">
								<Calendar
									className="mx-auto text-gray-400 mb-4"
									size={48}
								/>
								<p className="text-gray-600">
									No hay reuniones programadas
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modal para crear reunión */}
			<Modal
				isOpen={isMeetingModalOpen}
				onClose={() => {
					setIsMeetingModalOpen(false);
					resetMeeting();
				}}
				title="Crear Nueva Reunión"
				size="lg"
			>
				<form
					onSubmit={handleSubmitMeeting(onSubmitMeeting)}
					className="space-y-6"
				>
					<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
						<h3 className="font-semibold text-blue-800 mb-2">
							📹 Reunión Virtual con Zoom
						</h3>
						<p className="text-sm text-blue-700">
							Se creará automáticamente una reunión en Zoom con un
							enlace único para todos los participantes.
						</p>
					</div>

					<div className="grid gap-6 grid-cols-1">
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Título de la Reunión *
							</label>
							<input
								type="text"
								{...registerMeeting('str_title', {
									required: 'El título es obligatorio',
									minLength: {
										value: 5,
										message: 'Mínimo 5 caracteres',
									},
								})}
								placeholder="Ej: Asamblea Ordinaria Anual 2025"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsMeeting.str_title && (
								<span className="text-red-500 text-sm">
									{errorsMeeting.str_title.message}
								</span>
							)}
						</div>

						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Descripción
							</label>
							<textarea
								{...registerMeeting('str_description')}
								placeholder="Descripción de la reunión, agenda, temas a tratar..."
								rows={3}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block mb-2 font-semibold text-gray-700">
									Tipo de Reunión *
								</label>
								<select
									{...registerMeeting('str_meeting_type', {
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

							<div>
								<label className="block mb-2 font-semibold text-gray-700">
									Duración Estimada (minutos) *
								</label>
								<input
									type="number"
									{...registerMeeting(
										'int_estimated_duration',
										{
											required:
												'La duración es obligatoria',
											min: {
												value: 15,
												message: 'Mínimo 15 minutos',
											},
											max: {
												value: 480,
												message:
													'Máximo 8 horas (480 minutos)',
											},
										}
									)}
									placeholder="60"
									className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
								/>
								{errorsMeeting.int_estimated_duration && (
									<span className="text-red-500 text-sm">
										{
											errorsMeeting.int_estimated_duration
												.message
										}
									</span>
								)}
							</div>
						</div>

						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Fecha y Hora de la Reunión *
							</label>
							<input
								type="datetime-local"
								{...registerMeeting('dat_schedule_date', {
									required:
										'La fecha y hora son obligatorias',
								})}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsMeeting.dat_schedule_date && (
								<span className="text-red-500 text-sm">
									{errorsMeeting.dat_schedule_date.message}
								</span>
							)}
						</div>

						<div>
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									{...registerMeeting('bln_allow_delegates')}
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
									Crear Reunión
								</>
							)}
						</button>

						<button
							type="button"
							onClick={() => {
								setIsMeetingModalOpen(false);
								resetMeeting();
							}}
							disabled={createMeetingMutation.isPending}
							className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancelar
						</button>
					</div>
				</form>
			</Modal>

			{/* Modal para editar residente */}
			<Modal
				isOpen={isEditResidentModalOpen}
				onClose={() => {
					setIsEditResidentModalOpen(false);
					resetResident();
					setSelectedResident(null);
				}}
				title="Editar Copropietario"
				size="lg"
			>
				<form
					onSubmit={handleSubmitResident(onSubmitResident)}
					className="space-y-6"
				>
					<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
						{/* Nombre */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Nombre *
							</label>
							<input
								type="text"
								{...registerResident('firstname', {
									required: 'El nombre es obligatorio',
									minLength: {
										value: 2,
										message: 'Mínimo 2 caracteres',
									},
								})}
								placeholder="Ej: Juan"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsResident.firstname && (
								<span className="text-red-500 text-sm">
									{errorsResident.firstname.message}
								</span>
							)}
						</div>

						{/* Apellido */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Apellido *
							</label>
							<input
								type="text"
								{...registerResident('lastname', {
									required: 'El apellido es obligatorio',
									minLength: {
										value: 2,
										message: 'Mínimo 2 caracteres',
									},
								})}
								placeholder="Ej: Pérez"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsResident.lastname && (
								<span className="text-red-500 text-sm">
									{errorsResident.lastname.message}
								</span>
							)}
						</div>

						{/* Usuario */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Usuario *
							</label>
							<input
								type="text"
								{...registerResident('username', {
									required: 'El usuario es obligatorio',
									minLength: {
										value: 3,
										message: 'Mínimo 3 caracteres',
									},
								})}
								placeholder="Ej: juan.perez"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsResident.username && (
								<span className="text-red-500 text-sm">
									{errorsResident.username.message}
								</span>
							)}
						</div>

						{/* Email */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Email *
							</label>
							<input
								type="email"
								{...registerResident('email', {
									required: 'El email es obligatorio',
									pattern: {
										value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
										message: 'Email inválido',
									},
								})}
								placeholder="Ej: juan@example.com"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsResident.email && (
								<span className="text-red-500 text-sm">
									{errorsResident.email.message}
								</span>
							)}
						</div>

						{/* Teléfono */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Teléfono
							</label>
							<input
								type="text"
								{...registerResident('phone')}
								placeholder="Ej: +57 300 123 4567"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
						</div>

						{/* Apartamento */}
						<div>
							<label className="block mb-2 font-semibold text-gray-700">
								Número de Apartamento *
							</label>
							<input
								type="text"
								{...registerResident('apartment_number', {
									required: 'El número de apartamento es obligatorio',
								})}
								placeholder="Ej: 101"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errorsResident.apartment_number && (
								<span className="text-red-500 text-sm">
									{errorsResident.apartment_number.message}
								</span>
							)}
						</div>
					</div>

					{/* Estado activo */}
					<div>
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								{...registerResident('is_active')}
								className="w-5 h-5 text-[#3498db] border-gray-300 rounded focus:ring-[#3498db]"
							/>
							<span className="font-semibold text-gray-700">
								Activo
							</span>
						</label>
					</div>

					<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
						<button
							type="submit"
							disabled={updateResidentMutation.isPending}
							className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${
								updateResidentMutation.isPending
									? 'opacity-50 cursor-not-allowed'
									: ''
							}`}
						>
							{updateResidentMutation.isPending ? (
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
									Guardando...
								</>
							) : (
								<>
									<Edit size={20} />
									Guardar Cambios
								</>
							)}
						</button>

						<button
							type="button"
							onClick={() => {
								setIsEditResidentModalOpen(false);
								resetResident();
								setSelectedResident(null);
							}}
							disabled={updateResidentMutation.isPending}
							className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancelar
						</button>
					</div>
				</form>
			</Modal>

			{/* Modal para cambiar administrador */}
			<Modal
				isOpen={isChangeAdminModalOpen}
				onClose={() => setIsChangeAdminModalOpen(false)}
				title="Cambiar Administrador de la Unidad"
				size="lg"
			>
				<div className="space-y-6">
					<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
						<h3 className="font-semibold text-blue-800 mb-2">
							👤 Seleccionar Nuevo Administrador
						</h3>
						<p className="text-sm text-blue-700">
							Selecciona un residente de la lista para asignarlo como
							administrador de esta unidad residencial.
						</p>
					</div>

					{/* Administrador actual */}
					<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
						<p className="text-sm font-semibold text-gray-700 mb-2">
							Administrador Actual:
						</p>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
								{currentAdmin.firstname.charAt(0)}
								{currentAdmin.lastname.charAt(0)}
							</div>
							<div>
								<p className="font-semibold text-gray-800">
									{currentAdmin.firstname} {currentAdmin.lastname}
								</p>
								<p className="text-sm text-gray-600">
									{currentAdmin.email} • Apt. {currentAdmin.apartment_number}
								</p>
							</div>
						</div>
					</div>

					{/* Lista de residentes disponibles */}
					<div>
						<label className="block mb-3 font-semibold text-gray-700">
							Seleccionar Nuevo Administrador:
						</label>
						<div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
							{isLoadingResidents ? (
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
							) : filteredResidents && filteredResidents.length > 0 ? (
								<div className="divide-y divide-gray-200">
									{filteredResidents.map((resident) => (
										<button
											key={resident.id}
											onClick={() => {
												setCurrentAdmin({
													id: resident.id,
													firstname: resident.firstname,
													lastname: resident.lastname,
													email: resident.email || '',
													phone: resident.phone || '',
													apartment_number:
														resident.apartment_number || '',
													role: 'Administrador',
												});
												setIsChangeAdminModalOpen(false);
												Swal.fire({
													icon: 'success',
													title: '¡Administrador Cambiado!',
													text: `${resident.firstname} ${resident.lastname} ha sido asignado como nuevo administrador`,
													showConfirmButton: false,
													timer: 2000,
													toast: true,
													position: 'top-end',
												});
											}}
											className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
												currentAdmin.id === resident.id
													? 'bg-blue-50 border-l-4 border-blue-500'
													: ''
											}`}
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
													{resident.firstname?.charAt(0) || ''}
													{resident.lastname?.charAt(0) || ''}
												</div>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<p className="font-semibold text-gray-800">
															{resident.firstname} {resident.lastname}
														</p>
														{currentAdmin.id === resident.id && (
															<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
																Actual
															</span>
														)}
													</div>
													<div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
														{resident.email && (
															<div className="flex items-center gap-1">
																<Mail size={12} />
																<span>{resident.email}</span>
															</div>
														)}
														{resident.apartment_number && (
															<span>Apt. {resident.apartment_number}</span>
														)}
													</div>
												</div>
											</div>
										</button>
									))}
								</div>
							) : (
								<div className="text-center py-12">
									<UsersIcon
										className="mx-auto text-gray-400 mb-4"
										size={48}
									/>
									<p className="text-gray-600">
										No hay residentes disponibles para asignar como
										administrador
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={() => setIsChangeAdminModalOpen(false)}
							className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all"
						>
							Cancelar
						</button>
					</div>
				</div>
			</Modal>

			{/* Menú desplegable con posición fixed para evitar cortes */}
			{selectedResidentMenu && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setSelectedResidentMenu(null)}
					></div>
					<div
						className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
						style={{
							top: `${menuPosition.top}px`,
							left: `${menuPosition.left}px`,
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{filteredResidents
							?.filter((r) => r.id === selectedResidentMenu)
							.map((resident) => (
								<React.Fragment key={resident.id}>
									<button
										onClick={() => {
											handleViewResident(resident);
											setSelectedResidentMenu(null);
										}}
										className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
									>
										<Eye size={16} />
										Ver detalles
									</button>
									<button
										onClick={() => {
											handleEditResident(resident);
										}}
										className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
									>
										<Edit size={16} />
										Editar
									</button>
									<button
										onClick={() => {
											handleDeleteResident(resident);
											setSelectedResidentMenu(null);
										}}
										className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
									>
										<Trash2 size={16} />
										Eliminar
									</button>
								</React.Fragment>
							))}
					</div>
				</>
			)}
		</div>
	);
};

export default UnidadResidencialDetalles;
