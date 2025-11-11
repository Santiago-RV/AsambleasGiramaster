import React from 'react';
import { TrendingUp, Users, Building2, Calendar } from 'lucide-react';

const DashboardTab = () => {
	const stats = [
		{
			title: 'Unidades Residenciales',
			value: '24',
			icon: Building2,
			color: 'from-blue-500 to-blue-600',
			trend: '+12%',
		},
		{
			title: 'Residentes Totales',
			value: '1,248',
			icon: Users,
			color: 'from-green-500 to-green-600',
			trend: '+8%',
		},
		{
			title: 'Reuniones Activas',
			value: '3',
			icon: Calendar,
			color: 'from-purple-500 to-purple-600',
			trend: '+2',
		},
		{
			title: 'Asistencia Promedio',
			value: '78%',
			icon: TrendingUp,
			color: 'from-orange-500 to-orange-600',
			trend: '+5%',
		},
	];

	return (
		<div className="space-y-8">
			{/* Encabezado */}
			<div>
				<h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
				<p className="text-gray-600 mt-2">
					Resumen general del sistema de asambleas
				</p>
			</div>

			{/* Tarjetas de estadísticas */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{stats.map((stat, index) => {
					const Icon = stat.icon;
					return (
						<div
							key={index}
							className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
						>
							<div className="flex items-center justify-between mb-4">
								<div
									className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}
								>
									<Icon size={24} />
								</div>
								<span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
									{stat.trend}
								</span>
							</div>
							<h3 className="text-gray-600 text-sm font-medium mb-1">
								{stat.title}
							</h3>
							<p className="text-3xl font-bold text-gray-800">
								{stat.value}
							</p>
						</div>
					);
				})}
			</div>

			{/* Sección de actividad reciente */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-bold text-gray-800 mb-4">
						Reuniones Recientes
					</h2>
					<div className="space-y-4">
						{[1, 2, 3].map((item) => (
							<div
								key={item}
								className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
							>
								<div>
									<p className="font-semibold text-gray-800">
										Asamblea Ordinaria - Edificio {item}
									</p>
									<p className="text-sm text-gray-500">
										Hace 2 horas
									</p>
								</div>
								<span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
									Completada
								</span>
							</div>
						))}
					</div>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-bold text-gray-800 mb-4">
						Próximas Reuniones
					</h2>
					<div className="space-y-4">
						{[1, 2, 3].map((item) => (
							<div
								key={item}
								className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
							>
								<div>
									<p className="font-semibold text-gray-800">
										Asamblea Extraordinaria - Torre {item}
									</p>
									<p className="text-sm text-gray-500">
										{new Date(
											Date.now() +
												item * 24 * 60 * 60 * 1000
										).toLocaleDateString('es-ES')}
									</p>
								</div>
								<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
									Programada
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardTab;
