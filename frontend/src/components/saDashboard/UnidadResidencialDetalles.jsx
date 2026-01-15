import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

// Hooks personalizados
import { useResidentialUnitData } from './hooks/useResidentialUnitData';
import { useResidentOperations } from './hooks/useResidentOperations';
import { useMeetingOperations } from './hooks/useMeetingOperations';
import { useAdminOperations } from './hooks/useAdminOperations';

// Componentes
import UnitHeader from './components/UnitHeader';
import SearchBar from './components/SearchBar';
import ResidentsList from './components/ResidentsList';
import MeetingsList from './components/MeetingsList';

// Modales
import MeetingModal from './components/modals/MeetingModal';
import ResidentModal from './components/modals/ResidentModal';
import ChangeAdminModal from './components/modals/ChangeAdminModal';
import ExcelUploadModal from './components/modals/ExcelUploadModal';
import CreateManualAdminModal from './components/modals/CreateManualAdminModal';

const UnidadResidencialDetalles = ({ unitId, onBack, onStartMeeting }) => {
	const queryClient = useQueryClient();

	// Estados locales
	const [searchTerm, setSearchTerm] = useState('');
	const [currentAdmin, setCurrentAdmin] = useState(null);
	const [selectedResident, setSelectedResident] = useState(null);
	const [residentModalMode, setResidentModalMode] = useState('create');

	// Estados de modales
	const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
	const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
	const [isChangeAdminModalOpen, setIsChangeAdminModalOpen] = useState(false);
	const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
	const [isCreateManualAdminModalOpen, setIsCreateManualAdminModalOpen] = useState(false);

	// Obtener datos usando el hook personalizado
	const {
		unitData,
		isLoadingUnit,
		isErrorUnit,
		residentsData,
		isLoadingResidents,
		isErrorResidents,
		meetingsData,
		isLoadingMeetings,
		isErrorMeetings,
		administratorData,
		isLoadingAdministrator,
	} = useResidentialUnitData(unitId);

	// Operaciones de residentes
	const {
		createResidentMutation,
		updateResidentMutation,
		deleteResidentMutation,
		sendBulkCredentialsMutation,
		handleResendCredentials,
		handleDeleteResident,
		handleToggleAccess,
		handleBulkToggleAccess,
	} = useResidentOperations(unitId);

	// Operaciones de reuniones
	const { createMeetingMutation } = useMeetingOperations(unitId);

	// Operaciones de administrador
	const { changeAdminMutation, createManualAdminMutation } =
		useAdminOperations(unitId);

	// Sincronizar el estado local con los datos del administrador
	useEffect(() => {
		if (administratorData !== undefined) {
			setCurrentAdmin(administratorData);
		}
	}, [administratorData]);

	// Filtrar residentes por búsqueda
	const filteredResidents = residentsData?.filter((resident) => {
		const search = searchTerm.toLowerCase();
		return (
			resident.firstname?.toLowerCase().includes(search) ||
			resident.lastname?.toLowerCase().includes(search) ||
			resident.username?.toLowerCase().includes(search) ||
			resident.email?.toLowerCase().includes(search) ||
			resident.apartment_number?.toLowerCase().includes(search)
		);
	});

	// Handlers para modales
	const handleOpenResidentModal = () => {
		setResidentModalMode('create');
		setSelectedResident(null);
		setIsResidentModalOpen(true);
	};

	const handleEditResident = (resident) => {
		setSelectedResident(resident);
		setResidentModalMode('edit');
		setIsResidentModalOpen(true);
	};

	// Handler para enviar credenciales masivas
	const handleSendBulkCredentials = (selectedResidents, onClearSelection) => {
		if (selectedResidents.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Sin selección',
				text: 'Debes seleccionar al menos un copropietario',
				confirmButtonColor: '#3498db',
			});
			return;
		}

		Swal.fire({
			title: '¿Enviar Credenciales?',
			html: `
			<div class="text-left">
				<p class="mb-3">Se enviarán credenciales por correo electrónico a:</p>
				<div class="bg-blue-50 p-3 rounded-lg">
					<p class="text-lg font-bold text-blue-800">
						${selectedResidents.length} copropietario(s) seleccionado(s)
					</p>
				</div>
				<p class="text-xs text-gray-600 mt-3">
					💡 Cada copropietario recibirá un correo con su contraseña temporal.
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
		}).then((result) => {
			if (result.isConfirmed) {
				sendBulkCredentialsMutation.mutate(selectedResidents, {
					onSuccess: () => {
						if (onClearSelection) {
							onClearSelection();
						}
					},
				});
			}
		});
	};

	// Submit handlers
	const handleSubmitMeeting = (data, resetForm) => {
		const meetingData = {
			int_id_residential_unit: parseInt(unitId),
			str_title: data.str_title,
			str_description: data.str_description || '',
			str_meeting_type: data.str_meeting_type,
			bln_allow_delegates: data.bln_allow_delegates,
			int_estimated_duration: 0,
			int_meeting_leader_id: parseInt(data.int_meeting_leader_id),
			dat_schedule_date: data.dat_schedule_start,
		};

		createMeetingMutation.mutate(meetingData, {
			onSuccess: () => {
				resetForm();
				setIsMeetingModalOpen(false);
			},
		});
	};

	const handleSubmitResident = (data, residentId, resetForm) => {
		if (residentModalMode === 'create') {
			createResidentMutation.mutate(data, {
				onSuccess: () => {
					resetForm();
					setIsResidentModalOpen(false);
				},
			});
		} else {
			// Validar que haya cambios
			if (Object.keys(data).length === 0) {
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

			updateResidentMutation.mutate(
				{ residentId, data },
				{
					onSuccess: () => {
						resetForm();
						setIsResidentModalOpen(false);
						setSelectedResident(null);
					},
				}
			);
		}
	};

	const handleChangeAdmin = (newAdminUserId) => {
		changeAdminMutation.mutate(newAdminUserId, {
			onSuccess: (response) => {
				if (response.data && response.data.new_administrator) {
					setCurrentAdmin(response.data.new_administrator);
				}
				setIsChangeAdminModalOpen(false);
			},
		});
	};

	const handleOpenCreateManualAdmin = () => {
		setIsChangeAdminModalOpen(false);
		setIsCreateManualAdminModalOpen(true);
	};

	const handleSubmitManualAdmin = (data, resetForm) => {
		Swal.fire({
			title: '¿Crear Nuevo Administrador?',
			html: `
			<p>Se creará un usuario administrador con los siguientes datos:</p>
			<div style="text-align: left; margin: 20px 0;">
				<p><strong>Nombre:</strong> ${data.str_firstname} ${data.str_lastname}</p>
				<p><strong>Email:</strong> ${data.str_email}</p>
				${data.str_phone ? `<p><strong>Teléfono:</strong> ${data.str_phone}</p>` : ''}
			</div>
			<p style="color: #6c757d; font-size: 14px;">Se enviará un email con las credenciales de acceso.</p>
		`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: 'Sí, Crear',
			cancelButtonText: 'Cancelar',
			confirmButtonColor: '#3498db',
			cancelButtonColor: '#6c757d',
		}).then((result) => {
			if (result.isConfirmed) {
				createManualAdminMutation.mutate(
					{ unitId: unitId, adminData: data },
					{
						onSuccess: () => {
							resetForm();
							setIsCreateManualAdminModalOpen(false);
							setIsChangeAdminModalOpen(false);
						},
					}
				);
			}
		});
	};

	const handleExcelUploadSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
	};

	// Estados de carga
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
					<p className="text-gray-600">Cargando unidad residencial...</p>
				</div>
			</div>
		);
	}

	if (isErrorUnit || !unitData) {
		return (
			<div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
				<p className="text-red-600">Error al cargar la unidad residencial</p>
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
			<UnitHeader
				unitData={unitData}
				currentAdmin={currentAdmin}
				isLoadingAdministrator={isLoadingAdministrator}
				onBack={onBack}
				onOpenResidentModal={handleOpenResidentModal}
				onOpenExcelModal={() => setIsExcelModalOpen(true)}
				onOpenChangeAdminModal={() => setIsChangeAdminModalOpen(true)}
			/>

			{/* Buscador */}
			<SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

			{/* Grid de listas */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Lista de Residentes */}
				<ResidentsList
					residents={filteredResidents}
					isLoading={isLoadingResidents}
					onResendCredentials={handleResendCredentials}
					onEditResident={handleEditResident}
					onDeleteResident={handleDeleteResident}
					onSendBulkCredentials={handleSendBulkCredentials}
					isSendingBulk={sendBulkCredentialsMutation.isPending}
					onToggleAccess={handleToggleAccess}
					onBulkToggleAccess={handleBulkToggleAccess}
				/>

				{/* Lista de Reuniones */}
				<MeetingsList
					meetings={meetingsData}
					isLoading={isLoadingMeetings}
					onCreateMeeting={() => setIsMeetingModalOpen(true)}
					onStartMeeting={onStartMeeting}
				/>
			</div>

			{/* Modales */}
			<MeetingModal
				isOpen={isMeetingModalOpen}
				onClose={() => setIsMeetingModalOpen(false)}
				onSubmit={handleSubmitMeeting}
				isSubmitting={createMeetingMutation.isPending}
			/>

			<ResidentModal
				isOpen={isResidentModalOpen}
				onClose={() => {
					setIsResidentModalOpen(false);
					setSelectedResident(null);
				}}
				onSubmit={handleSubmitResident}
				mode={residentModalMode}
				resident={selectedResident}
				isSubmitting={
					residentModalMode === 'create'
						? createResidentMutation.isPending
						: updateResidentMutation.isPending
				}
			/>

			<ChangeAdminModal
				isOpen={isChangeAdminModalOpen}
				onClose={() => setIsChangeAdminModalOpen(false)}
				currentAdmin={currentAdmin}
				residents={filteredResidents}
				isLoadingResidents={isLoadingResidents}
				onChangeAdmin={handleChangeAdmin}
				isChanging={changeAdminMutation.isPending}
				onOpenCreateManualAdmin={handleOpenCreateManualAdmin}
			/>

			<CreateManualAdminModal
				isOpen={isCreateManualAdminModalOpen}
				onClose={() => setIsCreateManualAdminModalOpen(false)}
				onSubmit={handleSubmitManualAdmin}
				isSubmitting={createManualAdminMutation.isPending}
			/>

			<ExcelUploadModal
				isOpen={isExcelModalOpen}
				onClose={() => setIsExcelModalOpen(false)}
				unitId={unitId}
				onSuccess={handleExcelUploadSuccess}
			/>
		</div>
	);
};

export default UnidadResidencialDetalles;