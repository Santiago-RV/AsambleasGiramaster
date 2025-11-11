import React, { useState } from 'react';
import {
	LayoutDashboard,
	Building2,
	Calendar,
	FileText,
	ChevronDown,
	ChevronRight,
} from 'lucide-react';

const SidebarSA = ({ activeTab, onTabChange }) => {
	const [reunionesExpanded, setReunionesExpanded] = useState(false);

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
			id: 'informes',
			label: 'Informes',
			icon: FileText,
		},
	];

	const handleClick = (itemId) => {
		onTabChange(itemId);
	};

	const isParentActive = (item) => {
		if (item.hasSubmenu) {
			return item.submenu.some((sub) => activeTab === sub.id);
		}
		return false;
	};

	return (
		<aside className="fixed left-0 top-0 w-[280px] h-screen bg-gradient-to-br from-[#2c3e50] to-[#34495e] text-white shadow-2xl z-50 overflow-y-auto">
			{/* Logo y título */}
			<div className="px-6 py-8 border-b border-white/10">
				<div className="flex items-center gap-3 mb-2">
					<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center shadow-lg">
						<LayoutDashboard size={24} />
					</div>
					<h2 className="text-xl font-bold">Giramaster</h2>
				</div>
				<p className="text-sm text-gray-400 ml-[52px]">
					Super Administrador
				</p>
			</div>

			{/* Menú de navegación */}
			<nav className="py-4">
				{menuItems.map((item) => {
					const Icon = item.icon;
					const active =
						activeTab === item.id || isParentActive(item);

					return (
						<div key={item.id}>
							{/* Item principal */}
							<button
								onClick={() => {
									if (item.hasSubmenu) {
										setReunionesExpanded(
											!reunionesExpanded
										);
										// Si es el primer click, ir directamente a la reunión activa
										if (!reunionesExpanded && item.submenu && item.submenu.length > 0) {
											handleClick(item.submenu[0].id);
										}
									} else {
										handleClick(item.id);
									}
								}}
								className={`w-full flex items-center justify-between px-6 py-4 text-gray-300 border-l-4 transition-all duration-300 cursor-pointer hover:bg-white/10 hover:text-white hover:border-[#3498db] ${
									active
										? 'bg-white/10 text-white border-[#3498db]'
										: 'border-transparent'
								}`}
							>
								<div className="flex items-center gap-3">
									<Icon size={20} />
									<span className="font-medium">
										{item.label}
									</span>
								</div>
								{item.hasSubmenu && (
									<div className="transition-transform duration-200">
										{reunionesExpanded ? (
											<ChevronDown size={18} />
										) : (
											<ChevronRight size={18} />
										)}
									</div>
								)}
							</button>

							{/* Submenú */}
							{item.hasSubmenu && reunionesExpanded && (
								<div className="bg-black/20 z-50 relative">
									{item.submenu.map((subItem) => {
										const SubIcon = subItem.icon;
										const subActive =
											activeTab === subItem.id;

										return (
											<button
												key={subItem.id}
												onClick={() =>
													handleClick(subItem.id)
												}
												className={`w-full flex items-center gap-3 pl-16 pr-6 py-3 text-gray-400 transition-all duration-200 cursor-pointer hover:bg-white/5 hover:text-white ${
													subActive
														? 'bg-white/5 text-white border-l-4 border-[#3498db]'
														: ''
												}`}
											>
												<SubIcon size={18} />
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
			<div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10 bg-black/20">
				<div className="text-xs text-gray-400 text-center">
					<p>© 2025 Giramaster</p>
					<p className="mt-1">v1.0.0</p>
				</div>
			</div>
		</aside>
	);
};

export default SidebarSA;
