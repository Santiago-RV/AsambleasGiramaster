import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Settings, Video, Plus, Edit, Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import Swal from 'sweetalert2';

const ConfiguracionTab = ({ onBack }) => {
	// Configuración por defecto con datos ficticios
	const defaultConfig = {
		id: 1,
		zoom_account_id: 'abc123xyz789',
		zoom_client_id: 'client_id_1234567890',
		zoom_client_secret: 'client_secret_abcdefghijklmnop',
	};

	const [zoomConfigs, setZoomConfigs] = useState([defaultConfig]);
	const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
	const [editingZoomConfig, setEditingZoomConfig] = useState(null);
	const [isSaving, setIsSaving] = useState(false);

	// Formulario para configuración de Zoom
	const {
		register,
		handleSubmit,
		reset,
		setValue,
		formState: { errors },
	} = useForm({
		defaultValues: {
			zoom_account_id: '',
			zoom_client_id: '',
			zoom_client_secret: '',
		},
	});

	// Función para guardar configuración de Zoom
	const handleSaveZoomConfig = async (data) => {
		setIsSaving(true);

		try {
			// Simular delay de red
			await new Promise((resolve) => setTimeout(resolve, 500));

			if (editingZoomConfig) {
				// Actualizar configuración existente
				setZoomConfigs((prevConfigs) =>
					prevConfigs.map((config) =>
						config.id === editingZoomConfig.id
							? { ...config, ...data }
							: config
					)
				);

				Swal.fire({
					icon: 'success',
					title: '¡Éxito!',
					text: 'Configuración de Zoom actualizada exitosamente',
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					backdrop: false,
				});
			} else {
				// Crear nueva configuración
				const newConfig = {
					id: Date.now(),
					...data,
				};
				setZoomConfigs((prevConfigs) => [...prevConfigs, newConfig]);

				Swal.fire({
					icon: 'success',
					title: '¡Éxito!',
					text: 'Configuración de Zoom creada exitosamente',
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					backdrop: false,
				});
			}

			reset();
			setIsZoomModalOpen(false);
			setEditingZoomConfig(null);
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al guardar la configuración de Zoom',
			});
		} finally {
			setIsSaving(false);
		}
	};

	// Función para eliminar configuración de Zoom
	const handleDeleteZoomConfig = async (id) => {
		try {
			// Simular delay de red
			await new Promise((resolve) => setTimeout(resolve, 300));

			setZoomConfigs((prevConfigs) =>
				prevConfigs.filter((config) => config.id !== id)
			);

			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: 'Configuración de Zoom eliminada exitosamente',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				backdrop: false,
			});
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al eliminar la configuración de Zoom',
			});
		}
	};

	const onSubmit = (data) => {
		handleSaveZoomConfig(data);
	};

	const handleEditZoomConfig = (config) => {
		setEditingZoomConfig(config);
		setValue('zoom_account_id', config.zoom_account_id || '');
		setValue('zoom_client_id', config.zoom_client_id || '');
		setValue('zoom_client_secret', config.zoom_client_secret || '');
		setIsZoomModalOpen(true);
	};

	const handleDeleteClick = (config) => {
		Swal.fire({
			title: '¿Estás seguro?',
			text: 'Esta acción no se puede revertir',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#e74c3c',
			cancelButtonColor: '#3498db',
			confirmButtonText: 'Sí, eliminar',
			cancelButtonText: 'Cancelar',
		}).then((result) => {
			if (result.isConfirmed) {
				handleDeleteZoomConfig(config.id);
			}
		});
	};

	const handleCloseModal = () => {
		setIsZoomModalOpen(false);
		setEditingZoomConfig(null);
		reset();
	};

	const handleAddZoomConfig = () => {
		setEditingZoomConfig(null);
		reset();
		setIsZoomModalOpen(true);
	};

	return (
		<div className="space-y-6">
			{/* Encabezado */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">

				<div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-4">

					{/* Back */}
					{onBack && (
						<button
							onClick={onBack}
							className="self-start md:self-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<ArrowLeft size={20} className="text-gray-600 md:size-[24px]" />
						</button>
					)}

					{/* Icono + textos */}
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white shadow-lg">
							<Settings size={20} className="md:size-[24px]" />
						</div>

						<div className="min-w-0">
							<h1 className="text-xl md:text-3xl font-bold text-gray-800">
								Configuración
							</h1>
							<p className="text-sm md:text-base text-gray-600 mt-1">
								Gestiona las configuraciones del sistema
							</p>
						</div>
					</div>

				</div>
			</div>



			{/* Sección de Configuración de Zoom */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

				<div className="p-4 md:p-6 border-b border-gray-200">

					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

						{/* Título */}
						<div className="flex items-center gap-3 min-w-0">
							<div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
								<Video size={18} className="md:size-[20px]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg md:text-xl font-bold text-gray-800">
									Configuración de Zoom
								</h2>
								<p className="text-sm text-gray-600">
									Administra las credenciales de Zoom para las reuniones
								</p>
							</div>
						</div>

						{/* Botón */}
						<button
							onClick={handleAddZoomConfig}
							className="
					w-full md:w-auto
					flex items-center justify-center gap-2
					px-4 py-2
					bg-gradient-to-r from-[#3498db] to-[#2980b9]
					text-white
					rounded-lg
					hover:shadow-lg
					transition-all
					font-semibold
					text-sm
				"
						>
							<Plus size={18} />
							Agregar Configuración
						</button>

					</div>
				</div>


			<div className="p-6">
				{!zoomConfigs || zoomConfigs.length === 0 ? (
					<div className="text-center py-12">
						<Video
							className="mx-auto text-gray-400 mb-4"
							size={48}
						/>
						<p className="text-gray-600 mb-4">
							No hay configuraciones de Zoom registradas
						</p>
						<button
							onClick={handleAddZoomConfig}
							className="px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
						>
							Agregar Primera Configuración
						</button>
					</div>
				) : (
					<div className="space-y-4">
	{zoomConfigs.map((config) => (
		<div
			key={config.id}
			className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
		>
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				
				{/* INFO */}
				<div className="flex-1 min-w-0">
					<div className="flex flex-wrap items-center gap-2 mb-2">
						<h3 className="font-semibold text-gray-800">
							Configuración de Zoom
						</h3>
						<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
							{config.zoom_account_id
								? `Account ID: ${config.zoom_account_id.substring(0, 8)}...`
								: 'Sin Account ID'}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
						<div>
							<span className="text-gray-600">Account ID:</span>
							<p className="font-mono text-gray-800 break-all">
								{config.zoom_account_id || 'No configurado'}
							</p>
						</div>

						<div>
							<span className="text-gray-600">Client ID:</span>
							<p className="font-mono text-gray-800 break-all">
								{config.zoom_client_id
									? `${config.zoom_client_id.substring(0, 10)}...`
									: 'No configurado'}
							</p>
						</div>

						<div>
							<span className="text-gray-600">Client Secret:</span>
							<p className="font-mono text-gray-800">
								{config.zoom_client_secret
									? '••••••••••••'
									: 'No configurado'}
							</p>
						</div>
					</div>
				</div>

				{/* ACCIONES */}
				<div className="flex items-center gap-2 self-start md:self-auto">
					<button
						onClick={() => handleEditZoomConfig(config)}
						className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
						title="Editar"
					>
						<Edit size={18} />
					</button>
					<button
						onClick={() => handleDeleteClick(config)}
						className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
						title="Eliminar"
					>
						<Trash2 size={18} />
					</button>
				</div>

			</div>
		</div>
	))}
</div>

				)}
			</div>
		</div>

			{/* Modal para agregar/editar configuración de Zoom */ }
	<Modal
		isOpen={isZoomModalOpen}
		onClose={handleCloseModal}
		title={
			editingZoomConfig
				? 'Editar Configuración de Zoom'
				: 'Agregar Configuración de Zoom'
		}
		size="lg"
	>
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
				<h3 className="font-semibold text-blue-800 mb-2">
					🔐 Credenciales de Zoom
				</h3>
				<p className="text-sm text-blue-700">
					Ingresa las credenciales de tu aplicación Zoom para habilitar
					las reuniones virtuales. Puedes obtener estas credenciales desde
					el portal de desarrolladores de Zoom.
				</p>
			</div>

			<div className="grid gap-6 grid-cols-1">
				{/* Zoom Account ID */}
				<div>
					<label className="block mb-2 font-semibold text-gray-700">
						Zoom Account ID *
					</label>
					<input
						type="text"
						{...register('zoom_account_id', {
							required: 'El Account ID es obligatorio',
							minLength: {
								value: 5,
								message: 'Mínimo 5 caracteres',
							},
						})}
						placeholder="Ej: abc123xyz"
						className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db] font-mono"
					/>
					{errors.zoom_account_id && (
						<span className="text-red-500 text-sm">
							{errors.zoom_account_id.message}
						</span>
					)}
					<p className="text-sm text-gray-500 mt-1">
						Identificador único de tu cuenta de Zoom
					</p>
				</div>

				{/* Zoom Client ID */}
				<div>
					<label className="block mb-2 font-semibold text-gray-700">
						Zoom Client ID *
					</label>
					<input
						type="text"
						{...register('zoom_client_id', {
							required: 'El Client ID es obligatorio',
							minLength: {
								value: 10,
								message: 'Mínimo 10 caracteres',
							},
						})}
						placeholder="Ej: abc123xyz456"
						className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db] font-mono"
					/>
					{errors.zoom_client_id && (
						<span className="text-red-500 text-sm">
							{errors.zoom_client_id.message}
						</span>
					)}
					<p className="text-sm text-gray-500 mt-1">
						ID del cliente de tu aplicación OAuth de Zoom
					</p>
				</div>

				{/* Zoom Client Secret */}
				<div>
					<label className="block mb-2 font-semibold text-gray-700">
						Zoom Client Secret *
					</label>
					<input
						type="password"
						{...register('zoom_client_secret', {
							required: 'El Client Secret es obligatorio',
							minLength: {
								value: 10,
								message: 'Mínimo 10 caracteres',
							},
						})}
						placeholder="Ej: ••••••••••••"
						className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db] font-mono"
					/>
					{errors.zoom_client_secret && (
						<span className="text-red-500 text-sm">
							{errors.zoom_client_secret.message}
						</span>
					)}
					<p className="text-sm text-gray-500 mt-1">
						Secret del cliente de tu aplicación OAuth de Zoom (secreto y
						sensible)
					</p>
				</div>
			</div>

			<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
				<button
					type="submit"
					disabled={isSaving}
					className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${isSaving
						? 'opacity-50 cursor-not-allowed'
						: ''
						}`}
				>
					{isSaving ? (
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
							{editingZoomConfig ? (
								<>
									<Edit size={20} />
									Actualizar Configuración
								</>
							) : (
								<>
									<Plus size={20} />
									Guardar Configuración
								</>
							)}
						</>
					)}
				</button>

				<button
					type="button"
					onClick={handleCloseModal}
					disabled={isSaving}
					className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancelar
				</button>
			</div>
		</form>
	</Modal>
		</div >
	);
};

export default ConfiguracionTab;

