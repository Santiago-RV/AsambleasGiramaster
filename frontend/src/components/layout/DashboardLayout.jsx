import React from 'react';
import Sidebar from './Sidebar';

/**
 * Layout reutilizable para dashboards con Sidebar y Header
 * @param {string} title - Título de la aplicación en el sidebar
 * @param {string} subtitle - Subtítulo en el sidebar
 * @param {Array} menuItems - Items del menú del sidebar
 * @param {string} activeTab - Tab actualmente activo
 * @param {function} onTabChange - Función para cambiar de tab
 * @param {React.ReactNode} children - Contenido principal
 * @param {React.ReactNode} header - Contenido del header (opcional)
 * @param {string} gradientFrom - Color inicial del gradiente del sidebar
 * @param {string} gradientTo - Color final del gradiente del sidebar
 * @param {string} accentColor - Color de acento
 * @param {React.ReactNode} sidebarFooter - Footer personalizado del sidebar
 * @param {string} className - Clases adicionales para el contenedor principal
 */
const DashboardLayout = ({
	title,
	subtitle,
	menuItems,
	activeTab,
	onTabChange,
	children,
	header,
	gradientFrom,
	gradientTo,
	accentColor,
	sidebarFooter,
	className = '',
}) => {
	return (
		<div className="flex min-h-screen bg-gray-50">
			<Sidebar
				title={title}
				subtitle={subtitle}
				menuItems={menuItems}
				activeTab={activeTab}
				onTabChange={onTabChange}
				gradientFrom={gradientFrom}
				gradientTo={gradientTo}
				accentColor={accentColor}
				footer={sidebarFooter}
			/>

			<main className={`flex-1 ml-[280px] ${className}`}>
				{/* Header opcional */}
				{header && (
					<header className="bg-white shadow-sm border-b border-gray-200">
						{header}
					</header>
				)}

				{/* Contenido principal */}
				<div className="p-6">
					{children}
				</div>
			</main>
		</div>
	);
};

export default DashboardLayout;
