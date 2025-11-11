import React, { useState } from 'react';
import { Bell, Settings, LogOut } from 'lucide-react';
import SidebarSA from '../components/layout/SidebarSA';
import DashboardTab from '../components/saDashboard/DashboardTab';
import UnidadesResidencialesTab from '../components/saDashboard/UnidadesResidencialesTab';
import ResidentesTab from '../components/saDashboard/ResidentesTab';
import ReunionesTab from '../components/saDashboard/ReunionesTab';
import ReunionActivaTab from '../components/saDashboard/ReunionActivaTab';
import ZoomMeetingView from '../components/saDashboard/ZoomMeetingView';
import UnidadResidencialDetalles from '../components/saDashboard/UnidadResidencialDetalles';

const HomeSA = () => {
	const [activeTab, setActiveTab] = useState('dashboard');
	const [meetingData, setMeetingData] = useState(null);
	const [selectedUnitId, setSelectedUnitId] = useState(null);

	// Función para iniciar una reunión
	const handleStartMeeting = (meeting) => {
		setMeetingData(meeting);
		setActiveTab('zoom-meeting');
	};

	// Función para volver de la reunión
	const handleBackFromMeeting = () => {
		setMeetingData(null);
		setActiveTab('reuniones');
	};

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

	// Renderizar el componente según el tab activo
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
					/>
				);
			case 'residentes':
				return <ResidentesTab />;
			case 'reuniones':
				return <ReunionesTab onStartMeeting={handleStartMeeting} />;
			case 'reunion-activa':
				return <ReunionActivaTab />;
			case 'zoom-meeting':
				return (
					<ZoomMeetingView
						meetingData={meetingData}
						onBack={handleBackFromMeeting}
					/>
				);
			default:
				return <DashboardTab />;
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Sidebar - Ocultar cuando estamos en la reunión de Zoom */}
			{activeTab !== 'zoom-meeting' && (
				<SidebarSA activeTab={activeTab} onTabChange={setActiveTab} />
			)}

			{/* Contenido principal */}
			<div
				className={`${
					activeTab !== 'zoom-meeting' ? 'ml-[280px]' : ''
				} min-h-screen flex flex-col`}
			>
				{/* Header - Ocultar cuando estamos en la reunión de Zoom */}
				{activeTab !== 'zoom-meeting' && (
					<header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
						<div className="px-8 py-4 flex justify-between items-center">
							<div className="flex items-center gap-4">
								<h1 className="text-2xl font-bold text-gray-800">
									Sistema de Asambleas
								</h1>
							</div>

							<div className="flex items-center gap-4">
								{/* Notificaciones */}
								<button className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
									<Bell size={20} />
									<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
								</button>

								{/* Configuración */}
								<button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
									<Settings size={20} />
								</button>

								{/* Separador */}
								<div className="w-px h-8 bg-gray-300"></div>

								{/* Perfil de usuario */}
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold shadow-md">
										SA
									</div>
									<div className="flex flex-col">
										<span className="text-sm font-semibold text-gray-800">
											Super Administrador
										</span>
										<span className="text-xs text-gray-500">
											admin@sistema.com
										</span>
									</div>
								</div>

								{/* Cerrar sesión */}
								<button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
									<LogOut size={20} />
								</button>
							</div>
						</div>
					</header>
				)}

				{/* Contenido */}
				<main
					className={`flex-1 ${
						activeTab !== 'zoom-meeting' ? 'p-8' : 'p-0'
					}`}
				>
					{renderContent()}
				</main>
			</div>
		</div>
	);
};

export default HomeSA;
