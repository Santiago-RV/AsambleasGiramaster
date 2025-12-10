import React from 'react';
import { Video, FileText, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SidebarCO({ section, setSection }) {
	const navigate = useNavigate();

	const handleLogout = () => {
		// Limpiar token del localStorage
		localStorage.removeItem('access_token');
		// Redirigir al login
		navigate('/login');
	};

	const menuItems = [
		{
			id: 'meetings',
			label: 'Reuniones',
			icon: Video,
			badge: null,
		},
		{
			id: 'voting',
			label: 'Encuestas',
			icon: FileText,
			badge: 'Próximamente',
			badgeColor: 'bg-yellow-400 text-yellow-900',
		},
		{
			id: 'profile',
			label: 'Mi Perfil',
			icon: User,
			badge: null,
		},
	];

	return (
		<aside className="fixed left-0 top-0 h-screen w-[280px] bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl z-50">
			<div className="flex flex-col h-full">
				{/* Header */}
				<div className="p-6 border-b border-blue-500">
					<h1 className="text-2xl font-bold text-white mb-1">
						🏢 GIRAMASTER
					</h1>
					<p className="text-blue-100 text-sm">Dashboard Copropietario</p>
				</div>

				{/* Menu */}
				<nav className="flex-1 p-4 space-y-2 overflow-y-auto">
					{menuItems.map((item) => {
						const Icon = item.icon;
						const isActive = section === item.id;

						return (
							<button
								key={item.id}
								onClick={() => setSection(item.id)}
								className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
									isActive
										? 'bg-white text-blue-700 shadow-lg'
										: 'text-white hover:bg-white/10'
								}`}
							>
								<Icon size={20} />
								<span className="flex-1 text-left">{item.label}</span>
								{item.badge && (
									<span
										className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
											item.badgeColor || 'bg-red-500 text-white'
										}`}
									>
										{item.badge}
									</span>
								)}
							</button>
						);
					})}
				</nav>

				{/* Footer */}
				<div className="p-4 border-t border-blue-500">
					<button
						onClick={handleLogout}
						className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-white hover:bg-red-500 transition-all"
					>
						<LogOut size={20} />
						<span>Cerrar Sesión</span>
					</button>
				</div>
			</div>
		</aside>
	);
}