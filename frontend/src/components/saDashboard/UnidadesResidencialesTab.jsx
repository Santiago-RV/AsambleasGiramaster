import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResidentialCode } from '../../hooks/useResidentialCode';
import { ResidentialUnitService } from '../../services/api/ResidentialUnitService';
import Swal from 'sweetalert2';
import { Building2, FileText, MapPin, Hash, Home, Users, Map, Plus, Phone, User, Briefcase, MoreVertical, Edit2, Trash2, LayoutGrid, List } from 'lucide-react';
import Modal from '../common/Modal';

const UnidadesResidencialesTab = ({ onViewDetails }) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [editingUnit, setEditingUnit] = useState(null);
	const [openDropdownId, setOpenDropdownId] = useState(null);
	const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		watch,
		reset,
		setValue,
		formState: { errors },
	} = useForm({
		defaultValues: {
			str_name: '',
			str_nit: '',
			int_total_apartments: '',
			str_unit_type: 'Conjunto Residencial',
			str_address: '',
			str_city: '',
			str_state: '',
			int_max_concurrent_meetings: 5,
			bln_is_active: true,
		},
	});

	// Watch los campos necesarios para generar el código
	const watchName = watch('str_name');
	const watchNit = watch('str_nit');
	const watchApartments = watch('int_total_apartments');

	// Generar código automáticamente
	const residentialCode = useResidentialCode(
		watchName,
		watchNit,
		watchApartments
	);

	// Query para obtener las unidades residenciales del backend
	const {
		data: unidadesData,
		isLoading: isLoadingUnits,
		isError: isErrorUnits,
		error: errorUnits,
	} = useQuery({
		queryKey: ['residentialUnits'],
		queryFn: ResidentialUnitService.getResidentialUnits,
		select: (response) => response.data || [],
	});

	// Query para obtener usuarios disponibles (sin unidad residencial)
	const {
		data: availableUsersData,
		isLoading: isLoadingUsers,
		isError: isErrorUsers,
	} = useQuery({
		queryKey: ['availableUsers'],
		queryFn: ResidentialUnitService.getAvailableUsers,
		select: (response) => response.data || [],
	});

	// Usar los datos del backend o un array vacío si está cargando
	const administrativeStaff = availableUsersData || [];

	// Mutación para crear unidad residencial
	const createResidentialUnitMutation = useMutation({
		mutationFn: ResidentialUnitService.createResidentialUnit,
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residentialUnits'] });
			reset();
			setIsModalOpen(false);
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Unidad residencial creada exitosamente',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				backdrop: false,
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al crear la unidad residencial',
				showConfirmButton: true,
				confirmButtonColor: '#3498db',
			});
		},
	});

	const handleAdminSelect = (e) => {
    const selectedId = e.target.value;

    if (!selectedId) {
      // Limpiar campos si no hay selección
      setValue('admin_str_firstname', '');
      setValue('admin_str_lastname', '');
      setValue('admin_str_email', '');
      setValue('admin_str_phone', '');
      return;
    }

    // Buscar el administrador seleccionado (convertir id a número para comparar)
    const selectedAdmin = administrativeStaff.find(admin => admin.id === parseInt(selectedId));

    if (selectedAdmin) {
      // Los campos del backend son: firstname, lastname, email, phone
      setValue('admin_str_firstname', selectedAdmin.firstname || '');
      setValue('admin_str_lastname', selectedAdmin.lastname || '');
      setValue('admin_str_email', selectedAdmin.email || '');
      setValue('admin_str_phone', selectedAdmin.phone || '');
    }
  };

	// Estado de envío del formulario
	const isSubmitting = createResidentialUnitMutation.isPending;

	const onSubmit = (data) => {
		const unitData = {
			str_residential_code: residentialCode,
			str_name: data.str_name,
			str_nit: data.str_nit,
			str_unit_type: data.str_unit_type,
			int_total_apartments: parseInt(data.int_total_apartments),
			str_address: data.str_address,
			str_city: data.str_city,
			str_state: data.str_state,
			bln_is_active: data.bln_is_active,
			// int_max_concurrent_meetings: parseInt(
			// 	data.int_max_concurrent_meetings
			// ),

			// Información de la empresa administradora
			str_management_company: data.str_management_company || null,
			str_contact_person: data.str_contact_person || null,
			str_contact_phone: data.str_contact_phone || null,

			administrator: {
        str_firstname: data.admin_str_firstname,
        str_lastname: data.admin_str_lastname,
        str_email: data.admin_str_email,
        str_phone: data.admin_str_phone
      }
		};

		createResidentialUnitMutation.mutate(unitData);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setIsEditMode(false);
		setEditingUnit(null);
		reset();
	};

	const handleEdit = (unidad, e) => {
		e.stopPropagation();
		setEditingUnit(unidad);
		setIsEditMode(true);

		// Prellenar el formulario con los datos de la unidad
		reset({
			str_name: unidad.str_name,
			str_nit: unidad.str_nit,
			int_total_apartments: unidad.int_total_apartments,
			str_unit_type: unidad.str_unit_type,
			str_address: unidad.str_address,
			str_city: unidad.str_city,
			str_state: unidad.str_state,
			str_management_company: unidad.str_management_company || '',
			str_contact_person: unidad.str_contact_person || '',
			str_contact_phone: unidad.str_contact_phone || '',
			bln_is_active: unidad.bln_is_active,
		});

		setIsModalOpen(true);
		setOpenDropdownId(null);
	};

	const handleDelete = (unidad, e) => {
		e.stopPropagation();
		setOpenDropdownId(null);

		Swal.fire({
			title: '¿Estás seguro?',
			html: `¿Deseas eliminar la unidad residencial <strong>${unidad.str_name}</strong>?<br/><br/><small class="text-red-600">Esta acción eliminará todas las reuniones, encuestas y datos asociados.</small>`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#ef4444',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, eliminar',
			cancelButtonText: 'Cancelar',
			reverseButtons: true,
		}).then((result) => {
			if (result.isConfirmed) {
				// TODO: Implementar la llamada al servicio de eliminación
				Swal.fire({
					icon: 'success',
					title: 'Eliminada',
					text: 'La unidad residencial ha sido eliminada exitosamente.',
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					backdrop: false,
				});
			}
		});
	};

	const toggleDropdown = (id, e) => {
		e.stopPropagation();
		setOpenDropdownId(openDropdownId === id ? null : id);
	};

	// Cerrar dropdown al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = () => {
			if (openDropdownId) {
				setOpenDropdownId(null);
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	}, [openDropdownId]);

	return (
		<div className="space-y-8">
			{/* Encabezado */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-800">
						Unidades Residenciales
					</h1>
					<p className="text-gray-600 mt-2">
						Gestión de edificios y conjuntos residenciales
					</p>
				</div>
				<div className="flex items-center gap-3">
					{/* Toggle de vista */}
					{unidadesData && unidadesData.length > 0 && (
						<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
							<button
								onClick={() => setViewMode('grid')}
								className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
									viewMode === 'grid'
										? 'bg-white text-blue-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-800'
								}`}
							>
								<LayoutGrid size={18} />
								<span className="text-sm font-medium">Tarjetas</span>
							</button>
							<button
								onClick={() => setViewMode('list')}
								className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
									viewMode === 'list'
										? 'bg-white text-blue-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-800'
								}`}
							>
								<List size={18} />
								<span className="text-sm font-medium">Lista</span>
							</button>
						</div>
					)}
					<button
						onClick={() => setIsModalOpen(true)}
						className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold"
					>
						<Plus size={20} />
						Nueva Unidad
					</button>
				</div>
			</div>

			{/* Listado de unidades */}
			{isErrorUnits ? (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6 inline-block">
						<svg
							className="mx-auto h-12 w-12 text-red-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3 className="mt-2 text-lg font-medium text-red-900">
							Error al cargar las unidades residenciales
						</h3>
						<p className="mt-1 text-sm text-red-700">
							{errorUnits?.message ||
								'Ocurrió un error inesperado'}
						</p>
					</div>
				</div>
			) : isLoadingUnits ? (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
					<svg
						className="animate-spin h-12 w-12 text-blue-500 mx-auto"
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
					<p className="mt-4 text-gray-600">
						Cargando unidades residenciales...
					</p>
				</div>
			) : !unidadesData || unidadesData.length === 0 ? (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
					<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 inline-block">
						<Building2
							className="mx-auto h-12 w-12 text-gray-400"
							strokeWidth={1.5}
						/>
						<h3 className="mt-2 text-lg font-medium text-gray-900">
							No hay unidades residenciales
						</h3>
						<p className="mt-1 text-sm text-gray-600">
							Comienza creando una nueva unidad residencial.
						</p>
					</div>
				</div>
			) : viewMode === 'grid' ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{unidadesData.map((unidad) => (
						<div
							key={unidad.id}
							onClick={() =>
								onViewDetails && onViewDetails(unidad.id)
							}
							className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer relative"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white shadow-lg">
									<Building2 size={28} />
								</div>
								<div className="flex items-center gap-2">
									<span
										className={`px-3 py-1 rounded-full text-xs font-semibold ${
											unidad.bln_is_active
												? 'bg-green-100 text-green-700'
												: 'bg-red-100 text-red-700'
										}`}
									>
										{unidad.bln_is_active
											? 'Activa'
											: 'Inactiva'}
									</span>
									{/* Menú desplegable */}
									<div className="relative">
										<button
											onClick={(e) => toggleDropdown(unidad.id, e)}
											className="p-1 rounded-md hover:bg-gray-100 transition-colors"
										>
											<MoreVertical size={18} className="text-gray-600" />
										</button>
										{openDropdownId === unidad.id && (
											<div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
												<button
													onClick={(e) => handleEdit(unidad, e)}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
												>
													<Edit2 size={16} />
													Editar
												</button>
												<button
													onClick={(e) => handleDelete(unidad, e)}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
												>
													<Trash2 size={16} />
													Eliminar
												</button>
											</div>
										)}
									</div>
								</div>
							</div>

							<h3 className="text-xl font-bold text-gray-800 mb-2">
								{unidad.str_name}
							</h3>

							<div className="space-y-2 mb-4">
								<div className="flex items-center gap-2 text-gray-600 text-sm">
									<MapPin size={16} />
									<p>
										{unidad.str_address || 'Sin dirección'}
									</p>
								</div>
								<div className="flex items-center gap-2 text-gray-600 text-sm">
									<span className="font-semibold">
										Ciudad:
									</span>
									<p>
										{unidad.str_city}, {unidad.str_state}
									</p>
								</div>
								<div className="flex items-center gap-2 text-gray-600 text-sm">
									<span className="font-semibold">Tipo:</span>
									<p>{unidad.str_unit_type || 'N/A'}</p>
								</div>
							</div>

							<div className="flex items-center justify-between pt-4 border-t border-gray-100">
								<div className="flex items-center gap-2">
									<Users
										size={16}
										className="text-gray-500"
									/>
									<span className="text-sm text-gray-600">
										{unidad.int_total_apartments} unidades
									</span>
								</div>
								<div className="text-xs font-mono text-gray-500">
									{unidad.str_residential_code}
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<table className="w-full">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Unidad Residencial
								</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Ubicación
								</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Tipo
								</th>
								<th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Unidades
								</th>
								<th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Estado
								</th>
								<th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{unidadesData.map((unidad) => (
								<tr
									key={unidad.id}
									onClick={() => onViewDetails && onViewDetails(unidad.id)}
									className="hover:bg-gray-50 transition-colors cursor-pointer"
								>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white flex-shrink-0">
												<Building2 size={20} />
											</div>
											<div>
												<div className="font-semibold text-gray-800">
													{unidad.str_name}
												</div>
												<div className="text-xs font-mono text-gray-500">
													{unidad.str_residential_code}
												</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="text-sm text-gray-800">
											{unidad.str_city}, {unidad.str_state}
										</div>
										<div className="text-xs text-gray-500">
											{unidad.str_address || 'Sin dirección'}
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="text-sm text-gray-700">
											{unidad.str_unit_type || 'N/A'}
										</div>
									</td>
									<td className="px-6 py-4 text-center">
										<div className="flex items-center justify-center gap-2">
											<Users size={16} className="text-gray-500" />
											<span className="text-sm font-medium text-gray-700">
												{unidad.int_total_apartments}
											</span>
										</div>
									</td>
									<td className="px-6 py-4 text-center">
										<span
											className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
												unidad.bln_is_active
													? 'bg-green-100 text-green-700'
													: 'bg-red-100 text-red-700'
											}`}
										>
											{unidad.bln_is_active ? 'Activa' : 'Inactiva'}
										</span>
									</td>
									<td className="px-6 py-4 text-center">
										<div className="relative inline-block">
											<button
												onClick={(e) => toggleDropdown(unidad.id, e)}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors"
											>
												<MoreVertical size={18} className="text-gray-600" />
											</button>
											{openDropdownId === unidad.id && (
												<div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
													<button
														onClick={(e) => handleEdit(unidad, e)}
														className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
													>
														<Edit2 size={16} />
														Editar
													</button>
													<button
														onClick={(e) => handleDelete(unidad, e)}
														className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
													>
														<Trash2 size={16} />
														Eliminar
													</button>
												</div>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal de creación/edición */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				title={isEditMode ? "Editar Unidad Residencial" : "Crear Nueva Unidad Residencial"}
				size="xl"
			>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* SECCIÓN: Código Automático */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <label className="text-sm font-semibold text-gray-700">
                Código de Unidad Residencial
              </label>
              <span className="ml-auto px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                Auto-generado
              </span>
            </div>
            <input
              type="text"
              value={residentialCode}
              readOnly
              className="w-full p-4 bg-white border-2 border-blue-200 rounded-xl text-lg font-mono text-blue-700 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              placeholder="Se genera automáticamente"
            />
            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
              Generado automáticamente desde nombre, NIT y apartamentos
            </p>
          </div>
        </div>

        {/* SECCIÓN: Información Básica */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-800">Información Básica</h3>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            
            {/* Nombre */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                Nombre de la Unidad Residencial
              </label>
              <input
                type="text"
                {...register('str_name', {
                  minLength: {
                    value: 3,
                    message: 'El nombre debe tener al menos 3 caracteres'
                  }
                })}
                placeholder="Ej: Torres del Parque"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.str_name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                }`}
              />
              {errors.str_name && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.str_name.message}
                </p>
              )}
            </div>

            {/* NIT */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <FileText className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                NIT
              </label>
              <input
                type="text"
                {...register('str_nit', {
                  pattern: {
                    value: /^[0-9-]+$/,
                    message: 'NIT inválido (solo números y guiones)'
                  }
                })}
                placeholder="Ej: 900123456-7"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.str_nit 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                }`}
              />
              {errors.str_nit && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.str_nit.message}
                </p>
              )}
            </div>

            {/* Tipo de Unidad */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Home className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                Tipo de Unidad
              </label>
              <select 
                {...register('str_unit_type')}
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all hover:border-gray-300 cursor-pointer"
              >
                <option value="">Selecciona un tipo</option>
                <option value="Conjunto Residencial">Conjunto Residencial</option>
                <option value="Edificio">Edificio</option>
                <option value="Condominio">Condominio</option>
                <option value="Urbanización">Urbanización</option>
              </select>
            </div>

            {/* Número de Apartamentos */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                Número de Apartamentos
              </label>
              <input
                type="number"
                {...register('int_total_apartments', {
                  min: {
                    value: 1,
                    message: 'Debe haber al menos 1 apartamento'
                  },
                  valueAsNumber: true
                })}
                placeholder="Ej: 120"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.int_total_apartments 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                }`}
              />
              {errors.int_total_apartments && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.int_total_apartments.message}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* SECCIÓN: Ubicación */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-gray-800">Ubicación</h3>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            
            {/* Ciudad */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                Ciudad
              </label>
              <input
                type="text"
                {...register('str_city')}
                placeholder="Ej: Medellín"
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all hover:border-gray-300"
              />
            </div>

            {/* Departamento */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Map className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                Departamento/Estado
              </label>
              <input
                type="text"
                {...register('str_state')}
                placeholder="Ej: Antioquia"
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all hover:border-gray-300"
              />
            </div>

            {/* Dirección - Ocupa todo el ancho */}
            <div className="group md:col-span-2">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Map className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                Dirección Completa
              </label>
              <input
                type="text"
                {...register('str_address')}
                placeholder="Ej: Carrera 15 # 25-30"
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all hover:border-gray-300"
              />
            </div>

          </div>
        </div>

        {/* SECCIÓN: Empresa Administradora */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
            <Briefcase className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-gray-800">Empresa Administradora</h3>
            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Opcional</span>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">

            {/* Nombre de la Empresa */}
            <div className="group md:col-span-2">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Briefcase className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                Nombre de la Empresa
              </label>
              <input
                type="text"
                {...register('str_management_company')}
                placeholder="Ej: Administración Integral S.A.S."
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all hover:border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Nombre de la empresa que administra la unidad residencial
              </p>
            </div>

            {/* Persona de Contacto */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                Persona de Contacto
              </label>
              <input
                type="text"
                {...register('str_contact_person')}
                placeholder="Ej: María Rodríguez"
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all hover:border-gray-300"
              />
            </div>

            {/* Teléfono de Contacto */}
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                {...register('str_contact_phone', {
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Teléfono inválido (10 dígitos sin espacios)'
                  }
                })}
                placeholder="Ej: 3102456987"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.str_contact_phone
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100'
                }`}
              />
              {errors.str_contact_phone && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.str_contact_phone.message}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* SECCIÓN: Configuración */}
        {/* <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-800">Configuración</h3>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                Máximo de Reuniones Concurrentes
              </label>
              <input
                type="number"
                {...register('int_max_concurrent_meetings', {
                  min: {
                    value: 1,
                    message: 'Debe permitir al menos 1 reunión'
                  },
                  valueAsNumber: true
                })}
                placeholder="Ej: 5"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.int_max_concurrent_meetings 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Número de reuniones que pueden ocurrir al mismo tiempo
              </p>
              {errors.int_max_concurrent_meetings && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.int_max_concurrent_meetings.message}
                </p>
              )}
            </div>

          </div>
        </div> */}

				{/* SECCIÓN: Administrador de la Unidad */}
        {/* <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
            <UserCog className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-gray-800">Administrador de la Unidad</h3>
          </div>

          
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <UserCog className="w-4 h-4 text-amber-600" />
              Seleccionar Personal Administrativo Existente
            </label>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-4 bg-white rounded-xl border-2 border-amber-200">
                <svg className="animate-spin h-5 w-5 text-amber-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600">Cargando usuarios disponibles...</span>
              </div>
            ) : isErrorUsers ? (
              <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                <p className="text-sm text-red-700">Error al cargar usuarios disponibles</p>
              </div>
            ) : administrativeStaff.length > 0 ? (
              <>
                <select
                  onChange={handleAdminSelect}
                  className="w-full p-3.5 bg-white border-2 border-amber-200 rounded-xl text-base focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all hover:border-amber-300 cursor-pointer"
                >
                  <option value="">Selecciona un administrador o registra uno nuevo</option>
                  {administrativeStaff.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name} - {admin.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-amber-600 rounded-full"></span>
                  {administrativeStaff.length} usuario{administrativeStaff.length !== 1 ? 's' : ''} disponible{administrativeStaff.length !== 1 ? 's' : ''} sin unidad residencial
                </p>
              </>
            ) : (
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                <p className="text-sm text-blue-700">No hay usuarios disponibles. Todos los usuarios ya tienen una unidad residencial asignada.</p>
              </div>
            )}

            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
              <span className="w-1 h-1 bg-amber-600 rounded-full"></span>
              O puedes llenar manualmente los campos para registrar uno nuevo
            </p>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            
            
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                Nombres
              </label>
              <input
                type="text"
                {...register('admin_str_firstname', {
                  minLength: {
                    value: 2,
                    message: 'Los nombres deben tener al menos 2 caracteres'
                  }
                })}
                placeholder="Ej: Juan Carlos"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.admin_str_firstname 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
                }`}
              />
              {errors.admin_str_firstname && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.admin_str_firstname.message}
                </p>
              )}
            </div>

            
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                Apellidos
              </label>
              <input
                type="text"
                {...register('admin_str_lastname', {
                  minLength: {
                    value: 2,
                    message: 'Los apellidos deben tener al menos 2 caracteres'
                  }
                })}
                placeholder="Ej: Pérez González"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.admin_str_lastname 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
                }`}
              />
              {errors.admin_str_lastname && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.admin_str_lastname.message}
                </p>
              )}
            </div>

            
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                Correo Electrónico
              </label>
              <input
                type="email"
                {...register('admin_str_email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo electrónico inválido'
                  }
                })}
                placeholder="Ej: admin@ejemplo.com"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.admin_str_email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
                }`}
              />
              {errors.admin_str_email && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.admin_str_email.message}
                </p>
              )}
            </div>

            
            <div className="group">
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                Teléfono
              </label>
              <input
                type="tel"
                {...register('admin_str_phone', {
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Teléfono inválido (10 dígitos sin espacios)'
                  }
                })}
                placeholder="Ej: 3102456987"
                className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl text-base focus:outline-none focus:bg-white transition-all hover:border-gray-300 ${
                  errors.admin_str_phone 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
                }`}
              />
              {errors.admin_str_phone && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.admin_str_phone.message}
                </p>
              )}
            </div>

          </div>
        </div> */}

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
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                {isEditMode ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {isEditMode ? 'Actualizar Unidad Residencial' : 'Guardar Unidad Residencial'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="bg-gray-100 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>

      </form>
			</Modal>
		</div>
	);
};

export default UnidadesResidencialesTab;
