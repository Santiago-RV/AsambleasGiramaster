import React, { useState } from 'react';
import { Bell, Settings, LogOut, LayoutDashboard, Building2, Calendar, FileText, HandCoins } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardTab from '../components/saDashboard/DashboardTab';
import UnidadesResidencialesTab from '../components/saDashboard/UnidadesResidencialesTab';
import ReunionActivaTab from '../components/saDashboard/ReunionActivaTab';
import InformesTab from '../components/saDashboard/InformesTab';
import ConfiguracionTab from '../components/saDashboard/ConfiguracionTab';
import PowersManagementPage from '../components/saDashboard/PowersManagementPage';
import ZoomMeetingContainer from '../components/AdDashboard/ZoomMeetingContainer';
import UnidadResidencialDetalles from '../components/saDashboard/UnidadResidencialDetalles';
import GuestModal from '../components/saDashboard/components/modals/GuestModal';
import { useAuth } from '../hooks/useAuth';
import { useAuthContext } from '../providers/AuthProvider';
import { useGuestOperations } from '../components/saDashboard/hooks/useGuestOperations';
import { useQuery } from '@tanstack/react-query';
import { GuestService } from '../services/api/GuestService';

const HomeSA = () => {
	// ==========================================
	// ESTADOS GENERALES
	// ==========================================
	const [activeTab, setActiveTab] = useState('dashboard');
	const [meetingData, setMeetingData] = useState(null);
	const [selectedUnitId, setSelectedUnitId] = useState(null);
	const [previousTab, setPreviousTab] = useState('dashboard');
	const [guestModalOpen, setGuestModalOpen] = useState(false);
	
	// ==========================================
	// HOOKS
	// ==========================================
	const { logout } = useAuth();
	const { user } = useAuthContext();
	
	// Hook de operaciones de invitados - USA selectedUnitId CORRECTAMENTE
	const { createGuestMutation } = useGuestOperations(selectedUnitId);

	// Query para obtener invitados de la unidad seleccionada
	const { data: guestsData, refetch: refetchGuests } = useQuery({
		queryKey: ['guests', selectedUnitId],
		queryFn: () => GuestService.getGuestsByUnit(selectedUnitId),
		enabled: !!selectedUnitId, // Solo ejecutar si hay una unidad seleccionada
		retry: 1,
	});

	// ==========================================
	// CONFIGURACIÓN DEL MENÚ
	// ==========================================
	const menuItems = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			icon: LayoutDashboard,
		},
		{
			id: 'unidades',
			label: 'Unidades Residenciales',
			icon: Building2,
		},
		{
			id: 'reuniones',
			label: 'Reuniones Activas',
			icon: Calendar,
		},
		{
			id: 'powers',
			label: 'Poderes',
			icon: HandCoins,
		},
		{
			id: 'informes',
			label: 'Informes',
			icon: FileText,
		},
	];

	// ==========================================
	// FUNCIONES DE NAVEGACIÓN
	// ==========================================
	
	// Función para navegar a detalles de unidad residencial
	const handleViewUnitDetails = (unitId) => {
		setSelectedUnitId(unitId);
		setActiveTab('unidad-detalles');
	};

	// Función para volver a la lista de unidades
	const handleBackToUnits = () => {
		setSelectedUnitId(null);
		setActiveTab('unidades');
	};

	// Función para navegar a configuración
	const handleOpenSettings = () => {
		setPreviousTab(activeTab);
		setActiveTab('configuracion');
	};

	// Función para volver desde configuración
	const handleBackFromSettings = () => {
		setActiveTab(previousTab);
	};

	// ==========================================
	// FUNCIONES DE REUNIONES
	// ==========================================
	
	// Función para iniciar una reunión
	const handleStartMeeting = (meeting) => {
		setMeetingData(meeting);
		setActiveTab('zoom-meeting');
	};

	// Función para cerrar la reunión
	const handleCloseZoomMeeting = () => {
		setMeetingData(null);
		setActiveTab('reuniones');
	};

	// ==========================================
	// FUNCIONES DE INVITADOS
	// ==========================================
	
	const handleOpenGuestModal = () => {
		if (!selectedUnitId) {
			// Si no hay unidad seleccionada, mostrar advertencia
			console.warn('No hay unidad residencial seleccionada');
			return;
		}
		setGuestModalOpen(true);
	};

	const handleCloseGuestModal = () => {
		setGuestModalOpen(false);
	};

	const handleCreateGuest = (guestData, resetForm) => {
		createGuestMutation.mutate(guestData, {
			onSuccess: () => {
				handleCloseGuestModal();
				if (resetForm) resetForm();
				refetchGuests(); // Refrescar lista de invitados
			},
		});
	};

	// ==========================================
	// RENDERIZADO DE CONTENIDO
	// ==========================================
	
	const renderContent = () => {
		switch (activeTab) {
			case 'dashboard':
				return <DashboardTab />;
			case 'unidades':
				return (
					<UnidadesResidencialesTab
						onViewDetails={handleViewUnitDetails}
					/>
				);
			case 'unidad-detalles':
				return (
					<UnidadResidencialDetalles
						unitId={selectedUnitId}
						onBack={handleBackToUnits}
						onStartMeeting={handleStartMeeting}
						// Pasar la función para abrir el modal de invitados
						onOpenGuestModal={handleOpenGuestModal}
					/>
				);
			case 'reuniones':
				return <ReunionActivaTab />;
			case 'powers':
				return <PowersManagementPage />;
			case 'informes':
				return <InformesTab />;
			case 'configuracion':
				return <ConfiguracionTab onBack={handleBackFromSettings} />;
			case 'zoom-meeting':
				return (
					<ZoomMeetingContainer
						meetingData={meetingData}
						onClose={handleCloseZoomMeeting}
						startFullscreen={true}
					/>
				);
			default:
				return <DashboardTab />;
		}
	};

	// ==========================================
	// HEADER PERSONALIZADO
	// ==========================================
	
	const headerContent = (
		<div className="px-8 py-4 flex justify-between items-center">
			<div className="flex items-center gap-4">
				<h1 className="text-2xl font-bold text-gray-800">
					Sistema de Asambleas
				</h1>
			</div>

			<div className="flex items-center gap-4">
				{/* Configuración */}
				<button
					onClick={handleOpenSettings}
					className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
					title="Configuración"
				>
					<Settings size={20} />
				</button>

				{/* Separador */}
				<div className="w-px h-8 bg-gray-300"></div>

				{/* Perfil de usuario */}
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold shadow-md">
						{user?.name
							? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
							: user?.role?.charAt(0).toUpperCase() || 'U'
						}
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-gray-800">
							{user?.name || user?.role || 'Usuario'}
						</span>
						<span className="text-xs text-gray-500">
							{user?.email || ''}
						</span>
					</div>
				</div>

				{/* Cerrar sesión */}
				<button
					onClick={logout}
					className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
					title="Cerrar sesión"
				>
					<LogOut size={20} />
				</button>
			</div>
		</div>
	);

	// ==========================================
	// RENDERIZADO PRINCIPAL
	// ==========================================
	
	// Si estamos en zoom-meeting o configuración, mostrar sin layout
	if (activeTab === 'zoom-meeting' || activeTab === 'configuracion') {
		return (
			<div className="min-h-screen bg-gray-50">
				<main className={activeTab === 'zoom-meeting' ? 'p-0' : 'p-8'}>
					{renderContent()}
				</main>
			</div>
		);
	}

	// Usar el layout normal para las demás páginas
	return (
		<>
			<DashboardLayout
				title="Giramaster"
				subtitle="Super Administrador"
				menuItems={menuItems}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				gradientFrom="#2c3e50"
				gradientTo="#34495e"
				accentColor="#3498db"
				header={headerContent}
			>
				{renderContent()}
			</DashboardLayout>

			{/* Modal para agregar invitado */}
			<GuestModal
				isOpen={guestModalOpen}
				onClose={handleCloseGuestModal}
				onSubmit={handleCreateGuest}
				isSubmitting={createGuestMutation.isPending}
			/>
		</>
	);
};

export default HomeSA;