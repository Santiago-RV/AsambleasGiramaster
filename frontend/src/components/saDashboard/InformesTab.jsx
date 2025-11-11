import React from 'react';
import { FileText, Download, Calendar, TrendingUp, Users, Building2 } from 'lucide-react';

const InformesTab = () => {
	const reports = [
		{
			id: 1,
			title: 'Reporte de Asambleas',
			description: 'Resumen de todas las asambleas realizadas',
			icon: Calendar,
			color: 'from-blue-500 to-blue-600',
		},
		{
			id: 2,
			title: 'Reporte de Asistencia',
			description: 'Estadísticas de asistencia a las reuniones',
			icon: Users,
			color: 'from-green-500 to-green-600',
		},
		{
			id: 3,
			title: 'Reporte de Unidades',
			description: 'Información detallada de unidades residenciales',
			icon: Building2,
			color: 'from-purple-500 to-purple-600',
		},
		{
			id: 4,
			title: 'Reporte de Votaciones',
			description: 'Resultados y estadísticas de votaciones',
			icon: TrendingUp,
			color: 'from-orange-500 to-orange-600',
		},
	];

	const handleGenerateReport = (reportId) => {
		// TODO: Implementar generación de reportes
		console.log('Generando reporte:', reportId);
	};

	return (
		<div className="space-y-8">
			{/* Encabezado */}
			<div>
				<h1 className="text-3xl font-bold text-gray-800">Informes</h1>
				<p className="text-gray-600 mt-2">
					Genera y descarga reportes del sistema
				</p>
			</div>

			{/* Grid de reportes */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
				{reports.map((report) => {
					const Icon = report.icon;
					return (
						<div
							key={report.id}
							className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between mb-4">
								<div
									className={`w-14 h-14 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center text-white shadow-lg`}
								>
									<Icon size={28} />
								</div>
								<button
									onClick={() => handleGenerateReport(report.id)}
									className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
								>
									<Download size={20} className="text-gray-600" />
								</button>
							</div>

							<h3 className="text-xl font-bold text-gray-800 mb-2">
								{report.title}
							</h3>
							<p className="text-gray-600 text-sm mb-4">
								{report.description}
							</p>

							<button
								onClick={() => handleGenerateReport(report.id)}
								className="w-full px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
							>
								Generar Reporte
							</button>
						</div>
					);
				})}
			</div>

			{/* Sección de reportes recientes */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
					<FileText size={24} />
					Reportes Recientes
				</h2>
				<div className="space-y-3">
					{[1, 2, 3].map((item) => (
						<div
							key={item}
							className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
						>
							<div>
								<p className="font-semibold text-gray-800">
									Reporte de Asambleas - {new Date().toLocaleDateString('es-ES')}
								</p>
								<p className="text-sm text-gray-500">
									Generado hace {item} hora{item > 1 ? 's' : ''}
								</p>
							</div>
							<button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm flex items-center gap-2">
								<Download size={16} />
								Descargar
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default InformesTab;

