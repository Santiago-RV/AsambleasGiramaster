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
	X,
	Video,
	FileText,
	UserCheck,
	AlertCircle,
	Download
} from 'lucide-react';
import { ResidentialUnitService } from '../../services/api/ResidentialUnitService';
import { MeetingService } from '../../services/api/MeetingService';
import Modal from '../common/Modal';
import Swal from 'sweetalert2';
import { uploadResidentsExcel, downloadResidentsExcelTemplate } from '../../services/residentialUnitService';
import { ResidentService } from '../../services/api/ResidentService';


const UnidadResidencialDetalles = ({ unitId, onBack, onStartMeeting }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
	const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
	const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
	const [isChangeAdminModalOpen, setIsChangeAdminModalOpen] = useState(false);
	const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [selectedResidentMenu, setSelectedResidentMenu] = useState(null);
	const [selectedResident, setSelectedResident] = useState(null);
	const [residentModalMode, setResidentModalMode] = useState('create');
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
	const menuButtonRefs = useRef({});
	const queryClient = useQueryClient();

	// Estado para el administrador actual
	const [currentAdmin, setCurrentAdmin] = useState(null);

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

	// Obtener el administrador actual de la unidad
	const {
		data: administratorData,
		isLoading: isLoadingAdministrator,
	} = useQuery({
		queryKey: ['administrator', unitId],
		queryFn: () => ResidentialUnitService.getUnitAdministrator(unitId),
		select: (response) => response.data,
		enabled: !!unitId,
	});

	// Sincronizar el estado local con los datos del administrador
	useEffect(() => {
		if (administratorData !== undefined) {
			setCurrentAdmin(administratorData);
		}
	}, [administratorData]);

	// Formulario para crear reunión
	const {
		register: registerMeeting,
		handleSubmit: handleSubmitMeeting,
		reset: resetMeeting,
		formState: { errors: errorsMeeting },
		watch,
	} = useForm({
		defaultValues: {
			str_title: '',
			str_description: '',
			str_meeting_type: 'Ordinaria',
			dat_schedule_start: '',
			dat_schedule_end: '',
			bln_allow_delegates: false,
		},
	});

	const watchStart = watch('dat_schedule_start');
	const watchEnd = watch('dat_schedule_end');

	const calculateDuration = () => {
		if (!watchStart || !watchEnd) return 'No calculado';

		const start = new Date(watchStart);
		const end = new Date(watchEnd);
		const diffMs = end - start;

		if (diffMs <= 0) return 'Fecha final debe ser posterior';

		const diffMinutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}min`;
		}
		return `${minutes} minutos`;
	};

	const estimatedDuration = calculateDuration();

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
			password: '',
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

	// Estado de envío del formulario de reunión
	const isSubmitting = createMeetingMutation.isPending;

	const onSubmitMeeting = (data) => {
		const start = new Date(data.dat_schedule_start);
		const end = new Date(data.dat_schedule_end);
		const durationMinutes = Math.floor((end - start) / 60000);

		const meetingData = {
			int_id_residential_unit: parseInt(unitId),
			str_title: data.str_title,
			str_description: data.str_description || '',
			str_meeting_type: data.str_meeting_type,
			bln_allow_delegates: data.bln_allow_delegates,
			int_estimated_duration: durationMinutes,
			dat_schedule_date: data.dat_schedule_start,
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

	const handleCreateResident = () => {
		setResidentModalMode('create');
		resetResident();
		// Establecer valores por defecto para crear
		setResidentValue('is_active', true);
		setResidentValue('password', '');
		setIsResidentModalOpen(true);
	};

	// Para editar (modificar la función existente)
	const handleEditResident = (resident) => {
		setSelectedResidentMenu(null);
		setSelectedResident(resident);
		setResidentModalMode('edit');
		// Cargar los datos del residente en el formulario
		setResidentValue('firstname', resident.firstname || '');
		setResidentValue('lastname', resident.lastname || '');
		setResidentValue('username', resident.username || '');
		setResidentValue('email', resident.email || '');
		setResidentValue('phone', resident.phone || '');
		setResidentValue('apartment_number', resident.apartment_number || '');
		setResidentValue('voting_weight', resident.voting_weight || '');
		setResidentValue('is_active', resident.is_active !== undefined ? resident.is_active : true);
		setResidentValue('password', ''); // Vacío para edición
		setIsResidentModalOpen(true);
	};

	// Mutación para actualizar residente
	const updateResidentMutation = useMutation({
		mutationFn: async (data) => {
			return await ResidentService.updateResident(
				unitId,
				selectedResident.id,
				data
			);
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			resetResident();
			setIsResidentModalOpen(false);
			setSelectedResident(null);
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Copropietario actualizado exitosamente',
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
				text: error.response?.data?.message || error.message || 'Error al actualizar el copropietario',
			});
		},
	});

	// Mutación para crear residente
	const createResidentMutation = useMutation({
		mutationFn: async (data) => {
			return await ResidentService.createResident(unitId, data);
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			resetResident();
			setIsResidentModalOpen(false);
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Copropietario creado exitosamente',
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
				text: error.response?.data?.message || error.message || 'Error al crear el copropietario',
			});
		},
	});

	// Mutación para cambiar el administrador
	const changeAdminMutation = useMutation({
		mutationFn: (newAdminUserId) =>
			ResidentialUnitService.changeUnitAdministrator(unitId, newAdminUserId),
		onSuccess: (response) => {
			// Invalidar las queries para refrescar los datos
			queryClient.invalidateQueries({ queryKey: ['administrator', unitId] });
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });

			// Actualizar el estado local
			if (response.data && response.data.new_administrator) {
				setCurrentAdmin(response.data.new_administrator);
			}

			setIsChangeAdminModalOpen(false);

			Swal.fire({
				icon: 'success',
				title: '¡Administrador Cambiado!',
				text: response.message || 'El administrador ha sido actualizado exitosamente',
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
				text: error.message || 'Error al cambiar el administrador',
			});
		},
	});

	const onSubmitResident = (data) => {
		if (residentModalMode === 'create') {
			// Modo crear
			const residentData = {
				firstname: data.firstname,
				lastname: data.lastname,
				username: data.username,
				email: data.email,
				phone: data.phone || null,
				apartment_number: data.apartment_number,
				is_active: data.is_active,
				password: data.password || 'Temporal123!',
				voting_weight: data.voting_weight || 0.0,
			};
			createResidentMutation.mutate(residentData);
		} else {
			// Modo editar
			if (!selectedResident) return;

			const residentData = {};

			if (data.firstname !== selectedResident.firstname) {
				residentData.firstname = data.firstname;
			}
			if (data.lastname !== selectedResident.lastname) {
				residentData.lastname = data.lastname;
			}
			if (data.email !== selectedResident.email) {
				residentData.email = data.email;
			}
			if (data.phone !== selectedResident.phone) {
				residentData.phone = data.phone || null;
			}
			if (data.apartment_number !== selectedResident.apartment_number) {
				residentData.apartment_number = data.apartment_number;
			}
			if (data.is_active !== selectedResident.is_active) {
				residentData.is_active = data.is_active;
			}
			if (data.voting_weight !== selectedResident.voting_weight) {
				residentData.voting_weight = data.voting_weight || 0.0;
			}
			if (data.password && data.password.trim() !== '') {
				residentData.password = data.password;
			}

			if (Object.keys(residentData).length === 0) {
				Swal.fire({
					icon: 'info',
					title: 'Sin cambios',
					text: 'No se detectaron cambios para guardar',
					toast: true,
					position: 'top-end',
					timer: 2000,
					showConfirmButton: false,
				});
				return;
			}

			updateResidentMutation.mutate(residentData);
		}
	};

	const onSubmitCreateResident = (data) => {
		const residentData = {
			firstname: data.firstname,
			lastname: data.lastname,
			username: data.username || undefined, // Opcional, se generará automáticamente
			email: data.email,
			phone: data.phone || null,
			apartment_number: data.apartment_number,
			is_active: data.is_active,
			password: data.password || 'Temporal123!',
			voting_weight: data.voting_weight || 0.0,  // Agregar este campo
		};

		createResidentMutation.mutate(residentData);
	};

	const handleDeleteResident = (resident) => {
		setSelectedResidentMenu(null);
		Swal.fire({
			title: '¿Estás seguro?',
			html: `
				<p>¿Deseas eliminar a <strong>${resident.firstname} ${resident.lastname}</strong>?</p>
				<br>
				<div class="text-left bg-red-50 p-3 rounded">
					<p class="text-sm text-red-700"><strong>⚠️ Advertencia:</strong></p>
					<p class="text-sm text-red-600">Esta acción eliminará completamente:</p>
					<ul class="text-sm text-red-600 list-disc list-inside mt-2">
						<li>Su cuenta de usuario</li>
						<li>Todos sus datos personales</li>
						<li>Su relación con la unidad residencial</li>
					</ul>
					<p class="text-sm text-red-700 mt-2"><strong>Esta acción NO se puede deshacer.</strong></p>
				</div>
			`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#d33',
			cancelButtonColor: '#3085d6',
			confirmButtonText: 'Sí, eliminar',
			cancelButtonText: 'Cancelar',
			width: '600px'
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					await ResidentService.deleteResident(unitId, resident.id);

					// Actualizar la lista de residentes
					queryClient.invalidateQueries({ queryKey: ['residents', unitId] });

					Swal.fire({
						icon: 'success',
						title: 'Eliminado',
						text: `${resident.firstname} ${resident.lastname} ha sido eliminado exitosamente`,
						showConfirmButton: false,
						timer: 2000,
						toast: true,
						position: 'top-end',
					});
				} catch (error) {
					Swal.fire({
						icon: 'error',
						title: 'Error',
						text: error.response?.data?.message || error.message || 'Error al eliminar el copropietario',
					});
				}
			}
		});
	};

	const handleResendCredentials = async (resident) => {
		setSelectedResidentMenu(null);

		Swal.fire({
			title: '¿Enviar credenciales?',
			html: `
				<div class="text-left">
					<p class="mb-3">Se generará una nueva contraseña temporal y se enviará por correo a:</p>
					<div class="bg-blue-50 p-3 rounded-lg">
						<p class="font-semibold text-blue-800">${resident.firstname} ${resident.lastname}</p>
						<p class="text-sm text-blue-700 mt-1">
							<strong>Email:</strong> ${resident.email}
						</p>
						<p class="text-sm text-blue-700">
							<strong>Usuario:</strong> ${resident.username}
						</p>
					</div>
					<p class="text-xs text-gray-600 mt-3">
						💡 La contraseña actual será reemplazada por una nueva contraseña temporal.
					</p>
				</div>
			`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3498db',
			cancelButtonColor: '#95a5a6',
			confirmButtonText: 'Sí, enviar',
			cancelButtonText: 'Cancelar',
			width: '500px',
			showLoaderOnConfirm: true,
			preConfirm: async () => {
				try {
					const response = await ResidentService.resendCredentials(unitId, resident.id);
					return response;
				} catch (error) {
					Swal.showValidationMessage(
						error.response?.data?.message || error.message || 'Error al enviar credenciales'
					);
				}
			},
			allowOutsideClick: () => !Swal.isLoading()
		}).then((result) => {
			if (result.isConfirmed && result.value?.success) {
				Swal.fire({
					icon: 'success',
					title: '¡Credenciales Enviadas!',
					html: `
						<div class="text-left">
							<p class="mb-2">Las credenciales han sido enviadas exitosamente a:</p>
							<div class="bg-green-50 p-3 rounded-lg">
								<p class="text-sm text-green-700">
									<strong>Email:</strong> ${resident.email}
								</p>
								<p class="text-sm text-green-700 mt-1">
									<strong>Usuario:</strong> ${resident.username}
								</p>
							</div>
							<p class="text-xs text-gray-600 mt-3">
								📧 El copropietario recibirá un correo con su nueva contraseña temporal.
							</p>
						</div>
					`,
					confirmButtonColor: '#27ae60',
					width: '500px'
				});
			}
		});
	};

	// Funciones para manejar la carga de Excel
	const handleFileSelect = (e) => {
		const file = e.target.files[0];
		if (file) {
			// Validar que sea un archivo Excel
			const validExtensions = [
				'.xlsx',
				'.xls',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.ms-excel',
			];
			const fileExtension = file.name
				.substring(file.name.lastIndexOf('.'))
				.toLowerCase();
			const isValidType =
				validExtensions.includes(fileExtension) ||
				validExtensions.includes(file.type);

			if (!isValidType) {
				Swal.fire({
					icon: 'error',
					title: 'Archivo inválido',
					text: 'Por favor selecciona un archivo Excel (.xlsx o .xls)',
					confirmButtonColor: '#3498db',
				});
				e.target.value = '';
				return;
			}

			setSelectedFile(file);
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		// Resetear el input de archivo
		const fileInput = document.getElementById('excel-file-input');
		if (fileInput) {
			fileInput.value = '';
		}
	};

	const handleUploadExcel = async () => {
		if (!selectedFile) {
			Swal.fire({
				icon: 'warning',
				title: 'Archivo requerido',
				text: 'Por favor selecciona un archivo Excel',
				confirmButtonColor: '#3498db',
			});
			return;
		}

		setIsUploading(true);

		try {
			// Llamar al servicio para subir el Excel
			const response = await uploadResidentsExcel(unitId, selectedFile);

			// Mostrar resultados
			const { total_rows, successful, failed, users_created, errors } = response.data;

			// Invalidar queries para refrescar los datos
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });

			// Limpiar estado
			setSelectedFile(null);
			setIsExcelModalOpen(false);
			setIsUploading(false);

			// Mostrar resumen detallado
			let htmlContent = `
			<div class="text-left space-y-3">
				<div class="bg-blue-50 p-3 rounded-lg">
					<p class="font-semibold text-blue-800">📊 Resumen del Proceso</p>
					<p class="text-sm text-blue-700">Total de filas procesadas: <strong>${total_rows}</strong></p>
					<p class="text-sm text-green-700">Copropietarios creados exitosamente: <strong>${successful}</strong></p>
					<p class="text-sm text-green-700">Nuevos usuarios creados: <strong>${users_created}</strong></p>
					${failed > 0 ? `<p class="text-sm text-red-700">Filas con errores: <strong>${failed}</strong></p>` : ''}
				</div>
		`;

			// Agregar errores si existen
			if (errors && errors.length > 0) {
				htmlContent += `
				<div class="bg-red-50 p-3 rounded-lg max-h-48 overflow-y-auto">
					<p class="font-semibold text-red-800 mb-2">❌ Errores Encontrados:</p>
					<ul class="text-sm text-red-700 space-y-1">
			`;

				errors.forEach(error => {
					htmlContent += `<li>Fila ${error.row} (${error.email}): ${error.error}</li>`;
				});

				htmlContent += `
					</ul>
				</div>
			`;
			}

			htmlContent += `
				<div class="text-xs text-gray-600 mt-2">
					<p>💡 Los copropietarios creados ya pueden iniciar sesión con su email y la contraseña configurada.</p>
				</div>
			</div>
		`;

			Swal.fire({
				icon: successful > 0 ? 'success' : 'error',
				title: successful > 0 ? '¡Carga completada!' : 'Error en la carga',
				html: htmlContent,
				confirmButtonColor: '#3498db',
				width: '600px'
			});

		} catch (error) {
			console.error('Error uploading Excel:', error);

			setIsUploading(false);

			Swal.fire({
				icon: 'error',
				title: 'Error al cargar archivo',
				html: `
				<div class="text-left">
					<p class="mb-2">${error.message}</p>
					<div class="bg-gray-50 p-3 rounded text-sm">
						<p class="font-semibold mb-1">Verifica que:</p>
						<ul class="list-disc list-inside space-y-1">
							<li>El archivo sea formato Excel (.xlsx o .xls)</li>
							<li>Contenga las columnas requeridas: firstname, lastname, email, apartment_number</li>
							<li>Los emails sean válidos y únicos</li>
							<li>Tengas permisos de Super Admin</li>
						</ul>
					</div>
				</div>
			`,
				confirmButtonColor: '#3498db',
				width: '600px'
			});
		}
	};

	const handleDownloadTemplate = () => {
		try {
			downloadResidentsExcelTemplate();

			Swal.fire({
				icon: 'success',
				title: 'Plantilla descargada',
				text: 'La plantilla de Excel ha sido descargada. Complétala con los datos de los copropietarios.',
				timer: 3000,
				showConfirmButton: false
			});
		} catch (error) {
			console.error('Error downloading template:', error);

			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se pudo descargar la plantilla',
				confirmButtonColor: '#3498db'
			});
		}
	};

	const handleCloseExcelModal = () => {
		if (!isUploading) {
			setSelectedFile(null);
			setIsExcelModalOpen(false);
			// Resetear el input de archivo
			const fileInput = document.getElementById('excel-file-input');
			if (fileInput) {
				fileInput.value = '';
			}
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
						{isLoadingAdministrator ? (
							<div className="flex items-center gap-3">
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
								<span className="text-gray-600">Cargando administrador...</span>
							</div>
						) : currentAdmin ? (
							<>
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold shadow-md">
										{currentAdmin.firstname?.charAt(0) || ''}
										{currentAdmin.lastname?.charAt(0) || ''}
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
							</>
						) : (
							<>
								<div className="flex items-center gap-3">
									<AlertCircle className="text-orange-500" size={32} />
									<div>
										<p className="font-semibold text-gray-800">
											No hay administrador asignado
										</p>
										<p className="text-sm text-gray-600">
											Selecciona un residente como administrador
										</p>
									</div>
								</div>
								<button
									onClick={() => setIsChangeAdminModalOpen(true)}
									className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm whitespace-nowrap"
								>
									<UserCog size={18} />
									Asignar Administrador
								</button>
							</>
						)}
					</div>
				</div>

				{/* Botones de acción para residentes */}
				<div className="flex gap-3 pt-4 border-t border-gray-200">
					<button
						onClick={handleCreateResident}
						className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
					>
						<Plus size={18} />
						Agregar Residente
					</button>
					<button
						onClick={() => setIsExcelModalOpen(true)}
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
												<div className="flex items-center gap-2">
													{/* Botón para enviar credenciales */}
													<button
														onClick={(e) => {
															e.stopPropagation();
															handleResendCredentials(resident);
														}}
														className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
														title="Enviar credenciales por correo"
													>
														<Mail
															size={20}
															className="text-blue-600 group-hover:text-blue-700"
														/>
													</button>

													{/* Botón del menú de 3 puntos (mantener el código existente) */}
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

																let left = rect.right - menuWidth;
																if (left < 8) {
																	left = 8;
																}
																if (rect.right > viewportWidth - 8) {
																	left = viewportWidth - menuWidth - 8;
																}

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
				<form onSubmit={handleSubmitMeeting(onSubmitMeeting)} className="space-y-8">

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
									Se creará automáticamente una reunión en Zoom con un enlace único para todos los participantes.
									Los datos de acceso se enviarán por correo electrónico.
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
									{...registerMeeting('str_title', {
										required: 'El título es obligatorio',
										minLength: {
											value: 5,
											message: 'El título debe tener al menos 5 caracteres'
										},
										maxLength: {
											value: 200,
											message: 'El título no puede exceder 200 caracteres'
										}
									})}
									placeholder="Ej: Asamblea Ordinaria Anual 2025"
									className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${errorsMeeting.str_title
										? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
										: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
										}`}
								/>
								{errorsMeeting.str_title && (
									<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" />
										{errorsMeeting.str_title.message}
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
									{...registerMeeting('str_description', {
										maxLength: {
											value: 1000,
											message: 'La descripción no puede exceder 1000 caracteres'
										}
									})}
									placeholder="Descripción de la reunión, agenda, temas a tratar..."
									rows={4}
									className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 resize-none ${errorsMeeting.str_description
										? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
										: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
										}`}
								/>
								{errorsMeeting.str_description && (
									<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" />
										{errorsMeeting.str_description.message}
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
										{...registerMeeting('str_meeting_type', {
											required: 'El tipo de reunión es obligatorio'
										})}
										className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 cursor-pointer ${errorsMeeting.str_meeting_type
											? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
											: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
											}`}
									>
										<option value="Ordinaria">Asamblea Ordinaria</option>
										<option value="Extraordinaria">Asamblea Extraordinaria</option>
										<option value="Comite">Reunión de Comité</option>
										<option value="Informativa">Reunión Informativa</option>
									</select>
									{errorsMeeting.str_meeting_type && (
										<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
											<AlertCircle className="w-3.5 h-3.5" />
											{errorsMeeting.str_meeting_type.message}
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
										{...registerMeeting('int_meeting_leader_id', {
											required: 'El líder de la reunión es obligatorio',
											min: {
												value: 1,
												message: 'ID inválido'
											},
											valueAsNumber: true
										})}
										placeholder="Ej: 123"
										className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${errorsMeeting.int_meeting_leader_id
											? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
											: 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
											}`}
									/>
									{errorsMeeting.int_meeting_leader_id && (
										<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
											<AlertCircle className="w-3.5 h-3.5" />
											{errorsMeeting.int_meeting_leader_id.message}
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
							<h3 className="text-lg font-bold text-gray-800">Fecha y Hora</h3>
						</div>

						<div className="grid gap-5 grid-cols-1 md:grid-cols-2">

							{/* Fecha y Hora de Inicio */}
							<div className="group">
								<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
									<Calendar className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
									Fecha y Hora de Inicio *
								</label>
								<input
									type="datetime-local"
									{...registerMeeting('dat_schedule_start', {
										required: 'La fecha y hora de inicio son obligatorias',
										validate: (value) => {
											const selectedDate = new Date(value);
											const now = new Date();
											if (selectedDate < now) {
												return 'La fecha no puede ser en el pasado';
											}
											return true;
										}
									})}
									className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${errorsMeeting.dat_schedule_start
										? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
										: 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
										}`}
								/>
								{errorsMeeting.dat_schedule_start && (
									<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" />
										{errorsMeeting.dat_schedule_start.message}
									</p>
								)}
							</div>

							{/* Fecha y Hora de Finalización */}
							<div className="group">
								<label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
									<Clock className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
									Fecha y Hora de Finalización *
								</label>
								<input
									type="datetime-local"
									{...registerMeeting('dat_schedule_end', {
										required: 'La fecha y hora de finalización son obligatorias',
										validate: (value) => {
											if (!watchStart) return true;
											const start = new Date(watchStart);
											const end = new Date(value);
											if (end <= start) {
												return 'Debe ser posterior a la fecha de inicio';
											}
											const diffMinutes = (end - start) / 60000;
											if (diffMinutes < 15) {
												return 'La reunión debe durar al menos 15 minutos';
											}
											if (diffMinutes > 480) {
												return 'La reunión no puede durar más de 8 horas';
											}
											return true;
										}
									})}
									className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${errorsMeeting.dat_schedule_end
										? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
										: 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
										}`}
								/>
								{errorsMeeting.dat_schedule_end && (
									<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" />
										{errorsMeeting.dat_schedule_end.message}
									</p>
								)}
							</div>

						</div>

						{/* Duración Calculada */}
						<div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
							<div className="flex items-center gap-3">
								<Clock className="w-5 h-5 text-emerald-600 shrink-0" />
								<div>
									<p className="text-sm font-medium text-emerald-900">
										Duración Estimada
									</p>
									<p className="text-lg font-bold text-emerald-700">
										{estimatedDuration}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* SECCIÓN: Configuración Adicional */}
					<div className="space-y-5">
						<div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
							<AlertCircle className="w-5 h-5 text-purple-600" />
							<h3 className="text-lg font-bold text-gray-800">Configuración Adicional</h3>
						</div>

						<div className="space-y-4">

							{/* Permitir Delegados */}
							<label className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
								<input
									type="checkbox"
									{...registerMeeting('bln_allow_delegates')}
									className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mt-0.5 cursor-pointer"
								/>
								<div className="flex-1">
									<span className="font-semibold text-gray-800 block">
										Permitir delegados
									</span>
									<span className="text-sm text-gray-600">
										Los propietarios podrán delegar su voto a otras personas autorizadas
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
							className={`flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 ${isSubmitting
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
							onClick={() => {
								setIsMeetingModalOpen(false);
								resetMeeting();
							}}
							disabled={isSubmitting}
							className="bg-gray-100 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancelar
						</button>
					</div>

				</form>
			</Modal>

			{/* Modal unificado para crear/editar residente */}
			<Modal
				isOpen={isResidentModalOpen}
				onClose={() => {
					setIsResidentModalOpen(false);
					resetResident();
					setSelectedResident(null);
				}}
				title={residentModalMode === 'create' ? 'Agregar Nuevo Copropietario' : 'Editar Copropietario'}
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
								disabled={residentModalMode === 'edit'}
							/>
							{errorsResident.username && (
								<span className="text-red-500 text-sm">
									{errorsResident.username.message}
								</span>
							)}
							{residentModalMode === 'edit' && (
								<p className="text-xs text-gray-500 mt-1">
									El usuario no se puede modificar
								</p>
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

					{/* Peso de Votación */}
					<div>
						<label className="block mb-2 font-semibold text-gray-700">
							Peso de Votación (Coeficiente)
						</label>
						<input
							type="number"
							step="0.01"
							min="0"
							max="1"
							{...registerResident('voting_weight')}
							placeholder="Ej: 0.25 (25%)"
							className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
						/>
						<p className="text-sm text-gray-500 mt-1">
							💡 Coeficiente de copropiedad (ej: 0.25 = 25%). Dejar vacío para 0.0
						</p>
					</div>

					{/* Contraseña */}
					<div>
						<label className="block mb-2 font-semibold text-gray-700">
							{residentModalMode === 'create' ? 'Contraseña *' : 'Nueva Contraseña (opcional)'}
						</label>
						<input
							type="password"
							{...registerResident('password',
								residentModalMode === 'create'
									? {
										// Modo CREAR: contraseña obligatoria
										required: 'La contraseña es obligatoria',
										minLength: {
											value: 8,
											message: 'La contraseña debe tener mínimo 8 caracteres',
										},
									}
									: {
										// Modo EDITAR: contraseña opcional, pero si se proporciona debe ser válida
										validate: (value) => {
											// Si está vacío, es válido (opcional en edición)
											if (!value || value.trim() === '') {
												return true;
											}
											// Si tiene valor, validar que tenga al menos 8 caracteres
											if (value.length < 8) {
												return 'La contraseña debe tener mínimo 8 caracteres';
											}
											return true;
										}
									}
							)}
							placeholder={
								residentModalMode === 'create'
									? 'Contraseña inicial del copropietario'
									: 'Dejar en blanco para mantener la actual'
							}
							className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
						/>
						{errorsResident.password && (
							<span className="text-red-500 text-sm">
								{errorsResident.password.message}
							</span>
						)}
						<p className="text-sm text-gray-500 mt-1">
							💡 {residentModalMode === 'create'
								? 'Si no especificas una contraseña, se usará: Temporal123!'
								: 'Solo se actualizará si proporcionas una nueva contraseña'}
						</p>
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
						<p className="text-sm text-gray-500 mt-1 ml-8">
							Los copropietarios activos pueden iniciar sesión en el sistema
						</p>
					</div>

					<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
						<button
							type="submit"
							disabled={
								residentModalMode === 'create'
									? createResidentMutation.isPending
									: updateResidentMutation.isPending
							}
							className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${(residentModalMode === 'create' ? createResidentMutation.isPending : updateResidentMutation.isPending)
								? 'opacity-50 cursor-not-allowed'
								: ''
								}`}
						>
							{(residentModalMode === 'create' ? createResidentMutation.isPending : updateResidentMutation.isPending) ? (
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
									{residentModalMode === 'create' ? 'Creando...' : 'Guardando...'}
								</>
							) : (
								<>
									{residentModalMode === 'create' ? <Plus size={20} /> : <Edit size={20} />}
									{residentModalMode === 'create' ? 'Crear Copropietario' : 'Guardar Cambios'}
								</>
							)}
						</button>

						<button
							type="button"
							onClick={() => {
								setIsResidentModalOpen(false);
								resetResident();
								setSelectedResident(null);
							}}
							disabled={
								residentModalMode === 'create'
									? createResidentMutation.isPending
									: updateResidentMutation.isPending
							}
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
					{currentAdmin && (
						<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
							<p className="text-sm font-semibold text-gray-700 mb-2">
								Administrador Actual:
							</p>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
									{currentAdmin.firstname?.charAt(0) || ''}
									{currentAdmin.lastname?.charAt(0) || ''}
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
					)}

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
											onClick={() => changeAdminMutation.mutate(resident.id)}
											disabled={changeAdminMutation.isPending || (currentAdmin && currentAdmin.id === resident.id)}
											className={`w-full p-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentAdmin && currentAdmin.id === resident.id
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
														{currentAdmin && currentAdmin.id === resident.id && (
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

			{/* Modal para cargar Excel */}
			<Modal
				isOpen={isExcelModalOpen}
				onClose={handleCloseExcelModal}
				title="Cargar Copropietarios desde Excel"
				size="lg"
			>
				<div className="space-y-6">
					{/* Botón para descargar plantilla */}
					<div className="bg-green-50 p-4 rounded-lg border border-green-200">
						<h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
							<FileSpreadsheet size={20} />
							Descargar Plantilla
						</h3>
						<p className="text-sm text-green-700 mb-3">
							Descarga la plantilla de Excel para facilitar la carga de copropietarios con sus pesos de votación.
						</p>
						<button
							type="button"
							onClick={handleDownloadTemplate}
							className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
						>
							<Download size={18} />
							Descargar Plantilla Excel
						</button>
					</div>

					{/* Información sobre voting_weight */}
					<div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
						<h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
							⚖️ Sobre el Peso de Votación
						</h3>
						<div className="text-sm text-purple-700 space-y-2">
							<p>
								El <strong>voting_weight</strong> (peso de votación) representa el coeficiente de copropiedad de cada propietario.
							</p>
							<div className="bg-purple-100 p-3 rounded">
								<p className="font-semibold mb-1">Ejemplos:</p>
								<ul className="list-disc list-inside space-y-1 ml-2">
									<li><code className="bg-white px-2 py-0.5 rounded">0.25</code> = 25% (apartamento grande)</li>
									<li><code className="bg-white px-2 py-0.5 rounded">0.15</code> = 15% (apartamento mediano)</li>
									<li><code className="bg-white px-2 py-0.5 rounded">0.10</code> = 10% (apartamento pequeño)</li>
								</ul>
							</div>
							<p className="text-xs text-purple-600 mt-2">
								💡 <strong>Importante:</strong> Este peso se usa para ponderar los votos en las encuestas.
								La suma de todos los pesos debería ser 1.0 (100%).
							</p>
						</div>
					</div>

					{/* Información sobre formato */}
					<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
						<h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
							<FileSpreadsheet size={20} />
							Formato del Archivo Excel
						</h3>
						<p className="text-sm text-blue-700 mb-2">
							El archivo Excel debe contener las siguientes columnas:
						</p>
						<div className="space-y-3">
							<div>
								<p className="text-sm font-semibold text-blue-800 mb-1">📋 Columnas REQUERIDAS:</p>
								<ul className="text-sm text-blue-700 list-disc list-inside space-y-1 ml-2">
									<li><strong>email</strong> - Email del copropietario (único, será su usuario de login)</li>
									<li><strong>firstname</strong> - Nombre del copropietario</li>
									<li><strong>lastname</strong> - Apellido del copropietario</li>
									<li><strong>apartment_number</strong> - Número de apartamento</li>
									<li><strong>voting_weight</strong> - Peso de votación (ej: 0.25, 0.30, 0.15)</li>
								</ul>
							</div>
							<div>
								<p className="text-sm font-semibold text-blue-800 mb-1">📝 Columnas OPCIONALES:</p>
								<ul className="text-sm text-blue-700 list-disc list-inside space-y-1 ml-2">
									<li><strong>phone</strong> - Teléfono del copropietario (puede estar vacío)</li>
									<li><strong>password</strong> - Contraseña inicial (default: Temporal123!)</li>
								</ul>
							</div>
						</div>
						<div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
							<p className="text-xs text-yellow-800">
								⚠️ <strong>Formato de ejemplo:</strong>
							</p>
							<div className="mt-2 bg-white p-2 rounded text-xs font-mono overflow-x-auto">
								<table className="min-w-full">
									<thead>
										<tr className="text-left">
											<th className="px-2">email</th>
											<th className="px-2">firstname</th>
											<th className="px-2">lastname</th>
											<th className="px-2">apartment_number</th>
											<th className="px-2">voting_weight</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td className="px-2">juan@email.com</td>
											<td className="px-2">Juan</td>
											<td className="px-2">Pérez</td>
											<td className="px-2">101</td>
											<td className="px-2 font-bold text-purple-600">0.25</td>
										</tr>
										<tr>
											<td className="px-2">maria@email.com</td>
											<td className="px-2">María</td>
											<td className="px-2">González</td>
											<td className="px-2">102</td>
											<td className="px-2 font-bold text-purple-600">0.30</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Selector de archivo */}
					<div>
						<label className="block mb-3 font-semibold text-gray-700">
							Seleccionar Archivo Excel *
						</label>
						<div className="relative">
							<input
								id="excel-file-input"
								type="file"
								accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
								onChange={handleFileSelect}
								disabled={isUploading}
								className="hidden"
							/>
							<label
								htmlFor="excel-file-input"
								className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isUploading
									? 'border-gray-300 bg-gray-50 cursor-not-allowed'
									: selectedFile
										? 'border-green-300 bg-green-50'
										: 'border-gray-300 bg-gray-50 hover:border-[#3498db] hover:bg-blue-50'
									}`}
							>
								{selectedFile ? (
									<>
										<FileSpreadsheet className="text-green-500 mb-2" size={40} />
										<p className="text-sm font-semibold text-green-700">
											{selectedFile.name}
										</p>
										<p className="text-xs text-green-600 mt-1">
											{(selectedFile.size / 1024).toFixed(2)} KB
										</p>
									</>
								) : (
									<>
										<Upload className="text-gray-400 mb-2" size={40} />
										<p className="text-sm text-gray-600">
											<span className="font-semibold text-[#3498db]">
												Haz clic para seleccionar
											</span>{' '}
											o arrastra el archivo aquí
										</p>
										<p className="text-xs text-gray-500 mt-1">
											Formatos aceptados: .xlsx, .xls
										</p>
									</>
								)}
							</label>
						</div>

						{selectedFile && (
							<button
								type="button"
								onClick={handleRemoveFile}
								disabled={isUploading}
								className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
							>
								<X size={16} />
								Remover archivo
							</button>
						)}
					</div>

					{/* Botones de acción */}
					<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={handleCloseExcelModal}
							disabled={isUploading}
							className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancelar
						</button>
						<button
							type="button"
							onClick={handleUploadExcel}
							disabled={!selectedFile || isUploading}
							className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isUploading ? (
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
									<span>Procesando...</span>
								</>
							) : (
								<>
									<Upload size={18} />
									<span>Cargar Copropietarios</span>
								</>
							)}
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
