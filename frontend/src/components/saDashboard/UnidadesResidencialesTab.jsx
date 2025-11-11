import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResidentialCode } from '../../hooks/useResidentialCode';
import { ResidentialUnitService } from '../../services/api/ResidentialUnitService';
import Swal from 'sweetalert2';
import { Building2, Users, MapPin, Plus } from 'lucide-react';
import Modal from '../common/Modal';

const UnidadesResidencialesTab = ({ onViewDetails }) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		watch,
		reset,
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
				text:
					response.message ||
					'Unidad residencial creada exitosamente',
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
				text: error.message || 'Error al crear la unidad residencial',
				showConfirmButton: true,
				confirmButtonColor: '#3498db',
			});
		},
	});

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
			int_max_concurrent_meetings: parseInt(
				data.int_max_concurrent_meetings
			),
		};

		createResidentialUnitMutation.mutate(unitData);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		reset();
	};

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
				<button
					onClick={() => setIsModalOpen(true)}
					className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold"
				>
					<Plus size={20} />
					Nueva Unidad
				</button>
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
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{unidadesData.map((unidad) => (
						<div
							key={unidad.id}
							onClick={() =>
								onViewDetails && onViewDetails(unidad.id)
							}
							className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white shadow-lg">
									<Building2 size={28} />
								</div>
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
			)}

			{/* Modal de creación */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				title="Crear Nueva Unidad Residencial"
				size="xl"
			>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					{/* Código generado automáticamente */}
					<div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
						<label className="block mb-2 font-semibold text-gray-700">
							Código de Unidad Residencial (Generado
							Automáticamente)
						</label>
						<input
							type="text"
							value={residentialCode}
							readOnly
							className="w-full p-3 border-2 border-blue-300 rounded-lg text-lg font-mono bg-blue-100 text-blue-800 cursor-not-allowed"
							placeholder="Se genera automáticamente al llenar el formulario"
						/>
						<p className="text-sm text-gray-600 mt-2">
							Este código se genera automáticamente basado en el
							nombre, NIT y número de apartamentos
						</p>
					</div>

					<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
						{/* Nombre de la Unidad */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Nombre de la Unidad Residencial *
							</label>
							<input
								type="text"
								{...register('str_name', {
									required: 'El nombre es obligatorio',
									minLength: {
										value: 3,
										message: 'Mínimo 3 caracteres',
									},
								})}
								placeholder="Ej: Torres del Parque"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.str_name && (
								<span className="text-red-500 text-sm">
									{errors.str_name.message}
								</span>
							)}
						</div>

						{/* NIT */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								NIT *
							</label>
							<input
								type="text"
								{...register('str_nit', {
									required: 'El NIT es obligatorio',
									pattern: {
										value: /^[0-9-]+$/,
										message:
											'NIT inválido (solo números y guiones)',
									},
								})}
								placeholder="Ej: 900123456-7"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.str_nit && (
								<span className="text-red-500 text-sm">
									{errors.str_nit.message}
								</span>
							)}
						</div>

						{/* Tipo de Unidad */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Tipo de Unidad *
							</label>
							<select
								{...register('str_unit_type', {
									required: 'El tipo es obligatorio',
								})}
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							>
								<option value="Conjunto Residencial">
									Conjunto Residencial
								</option>
								<option value="Edificio">Edificio</option>
								<option value="Condominio">Condominio</option>
								<option value="Urbanización">
									Urbanización
								</option>
							</select>
							{errors.str_unit_type && (
								<span className="text-red-500 text-sm">
									{errors.str_unit_type.message}
								</span>
							)}
						</div>

						{/* Número de Apartamentos */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Número de Apartamentos *
							</label>
							<input
								type="number"
								{...register('int_total_apartments', {
									required:
										'El número de apartamentos es obligatorio',
									min: {
										value: 1,
										message: 'Mínimo 1 apartamento',
									},
								})}
								placeholder="Ej: 120"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.int_total_apartments && (
								<span className="text-red-500 text-sm">
									{errors.int_total_apartments.message}
								</span>
							)}
						</div>

						{/* Ciudad */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Ciudad *
							</label>
							<input
								type="text"
								{...register('str_city', {
									required: 'La ciudad es obligatoria',
								})}
								placeholder="Ej: Medellín"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.str_city && (
								<span className="text-red-500 text-sm">
									{errors.str_city.message}
								</span>
							)}
						</div>

						{/* Departamento/Estado */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Departamento/Estado *
							</label>
							<input
								type="text"
								{...register('str_state', {
									required: 'El departamento es obligatorio',
								})}
								placeholder="Ej: Antioquia"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.str_state && (
								<span className="text-red-500 text-sm">
									{errors.str_state.message}
								</span>
							)}
						</div>

						{/* Dirección */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Dirección *
							</label>
							<input
								type="text"
								{...register('str_address', {
									required: 'La dirección es obligatoria',
								})}
								placeholder="Ej: Carrera 15 # 25-30"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.str_address && (
								<span className="text-red-500 text-sm">
									{errors.str_address.message}
								</span>
							)}
						</div>

						{/* Máximo de Reuniones Concurrentes */}
						<div>
							<label className="block mb-2 font-semibold text-gray-600">
								Máximo de Reuniones Concurrentes *
							</label>
							<input
								type="number"
								{...register('int_max_concurrent_meetings', {
									required: 'Este campo es obligatorio',
									min: {
										value: 1,
										message: 'Mínimo 1 reunión',
									},
								})}
								placeholder="Ej: 5"
								className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
							/>
							{errors.int_max_concurrent_meetings && (
								<span className="text-red-500 text-sm">
									{errors.int_max_concurrent_meetings.message}
								</span>
							)}
						</div>
					</div>

					<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
						<button
							type="submit"
							disabled={createResidentialUnitMutation.isPending}
							className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${
								createResidentialUnitMutation.isPending
									? 'opacity-50 cursor-not-allowed'
									: ''
							}`}
						>
							{createResidentialUnitMutation.isPending ? (
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
									<Plus size={20} />
									Guardar Unidad Residencial
								</>
							)}
						</button>

						<button
							type="button"
							onClick={handleCloseModal}
							disabled={createResidentialUnitMutation.isPending}
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

export default UnidadesResidencialesTab;
