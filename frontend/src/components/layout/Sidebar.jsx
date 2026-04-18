import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';

/**
 * Componente Sidebar genérico y reutilizable
 * @param {string} title - Título principal del sidebar
 * @param {string} subtitle - Subtítulo del sidebar
 * @param {Array} menuItems - Array de items del menú con estructura: {id, label, icon, submenu?, hasSubmenu?}
 * @param {string} activeTab - Tab actualmente activo
 * @param {function} onTabChange - Función callback para cambiar de tab
 * @param {string} gradientFrom - Color inicial del gradiente (default: '#2c3e50')
 * @param {string} gradientTo - Color final del gradiente (default: '#34495e')
 * @param {string} accentColor - Color de acento para items activos (default: '#3498db')
 * @param {React.ReactNode} footer - Contenido personalizado para el footer
 */
const Sidebar = ({
  title = 'Giramaster',
  subtitle = 'Panel de Control',
  menuItems = [],
  activeTab,
  onTabChange,
  gradientFrom = '#2c3e50',
  gradientTo = '#34495e',
  accentColor = '#3498db',
  footer,
  sidebarOpen = false, 
}) => {

	const [expandedItems, setExpandedItems] = useState({});

	const handleClick = (itemId) => {
		onTabChange(itemId);
	};

	const toggleExpanded = (itemId) => {
		setExpandedItems(prev => ({
			...prev,
			[itemId]: !prev[itemId]
		}));
	};

	const isParentActive = (item) => {
		if (item.hasSubmenu && item.submenu) {
			return item.submenu.some((sub) => activeTab === sub.id);
		}
		return false;
	};

	return (
			<aside
				className={`
					fixed inset-y-0 left-0
					w-[280px]
					bg-gradient-to-br text-white shadow-2xl z-50
					transform transition-transform duration-300 ease-in-out
					${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
					md:translate-x-0
					overflow-y-auto
				`}
				style={{
					backgroundImage: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})`
				}}
			>
			<div className="min-h-full flex flex-col">

			{/* Logo y título */}
			<div className="px-6 py-8 border-b border-white/10">
				<div className="flex flex-col items-center text-center">
					<div
						className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-3 shadow-lg"
					>
						<Building2 size={32} />
					</div>
					<h2 className="text-xl font-bold">{title}</h2>
					<p className="text-sm text-gray-400 mt-1">{subtitle}</p>
				</div>
			</div>

			{/* Menú de navegación */}
			<nav className="py-4 flex-1 overflow-y-auto">

				{menuItems.map((item) => {
					const Icon = item.icon;
					const active = activeTab === item.id || isParentActive(item);
					const isExpanded = expandedItems[item.id] || false;

					return (
						<div key={item.id}>
							{/* Item principal */}
							<button
								onClick={() => {
									if (item.hasSubmenu) {
										toggleExpanded(item.id);
										// Si es el primer click, ir directamente al primer submenu
										if (!isExpanded && item.submenu && item.submenu.length > 0) {
											handleClick(item.submenu[0].id);
										}
									} else {
										handleClick(item.id);
									}
								}}
								className={`w-full flex items-center justify-between px-6 py-4 text-gray-300 border-l-4 transition-all duration-300 cursor-pointer hover:bg-white/10 hover:text-white ${
									active
										? 'bg-white/10 text-white'
										: 'border-transparent'
								}`}
								style={{
									borderLeftColor: active ? accentColor : 'transparent'
								}}
							>
								<div className="flex items-center gap-3">
									{Icon && <Icon size={20} />}
									<span className="font-medium">
										{item.label}
									</span>
								</div>
								{item.hasSubmenu && (
									<div className="transition-transform duration-200">
										{isExpanded ? (
											<ChevronDown size={18} />
										) : (
											<ChevronRight size={18} />
										)}
									</div>
								)}
							</button>

							{/* Submenú */}
							{item.hasSubmenu && isExpanded && item.submenu && (
								<div className="bg-black/20 z-50 relative">
									{item.submenu.map((subItem) => {
										const SubIcon = subItem.icon;
										const subActive = activeTab === subItem.id;

										return (
											<button
												key={subItem.id}
												onClick={() => handleClick(subItem.id)}
												className={`w-full flex items-center gap-3 pl-16 pr-6 py-3 text-gray-400 transition-all duration-200 cursor-pointer hover:bg-white/5 hover:text-white ${
													subActive
														? 'bg-white/5 text-white border-l-4'
														: ''
												}`}
												style={{
													borderLeftColor: subActive ? accentColor : 'transparent'
												}}
											>
												{SubIcon && <SubIcon size={18} />}
												<span className="text-sm font-medium">
													{subItem.label}
												</span>
											</button>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</nav>

			{/* Footer del sidebar */}
			{footer ? (
				<div className="p-6 border-t border-white/10 bg-black/20">
					{footer}
				</div>
			) : (
				<div className="p-6 border-t border-white/10 bg-black/20">
					<div className="text-xs text-gray-400 text-center">
						<p>© {new Date().getFullYear()} Giramaster</p>
						<p className="mt-1">v1.0.0</p>
					</div>
				</div>
			)}
			</div>
		</aside>
	);
};

export default Sidebar;
