import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Building2, Calendar, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import {
	getDashboardStatistics,
	formatRelativeTime,
	formatDate,
	formatNumber,
	getStatusBadgeColor,
} from '../../services/api/DashboardService';

const DashboardTab = () => {
	const [loading, setLoading] = useState(true);
	const [dashboardData, setDashboardData] = useState(null);

	// Cargar datos del dashboard
	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
			setLoading(true);
			const response = await getDashboardStatistics();

			if (response.success) {
				setDashboardData(response.data);
			} else {
				throw new Error(
					response.message || 'Error al cargar estadísticas'
				);
			}
		} catch (error) {
			console.error('Error al cargar dashboard:', error);
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text:
					error.response?.data?.message ||
					'No se pudieron cargar las estadísticas del dashboard',
			});
		} finally {
			setLoading(false);
		}
	};

	// Configuración de las tarjetas de estadísticas
	const getStatsCards = () => {
		if (!dashboardData) return [];

		const { stats } = dashboardData;

		return [
			{
				title: 'Unidades Residenciales',
				value: formatNumber(stats.total_residential_units),
				icon: Building2,
				color: 'from-blue-500 to-blue-600',
			},
			{
				title: 'Residentes Totales',
				value: formatNumber(stats.total_residents),
				icon: Users,
				color: 'from-green-500 to-green-600',
			},
			{
				title: 'Reuniones Activas',
				value: stats.active_meetings.toString(),
				icon: Calendar,
				color: 'from-purple-500 to-purple-600',
			},
			{
				title: 'Asistencia Promedio',
				value: `${stats.average_attendance.toFixed(1)}%`,
				icon: TrendingUp,
				color: 'from-orange-500 to-orange-600',
			},
		];
	};

	// Mostrar loader mientras carga
	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
					<p className="text-gray-600">Cargando estadísticas...</p>
				</div>
			</div>
		);
	}

	// Mostrar mensaje si no hay datos
	if (!dashboardData) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<p className="text-gray-600 mb-4">
						No se pudieron cargar las estadísticas
					</p>
					<button
						onClick={loadDashboardData}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Reintentar
					</button>
				</div>
			</div>
		);
	}

	const statsCards = getStatsCards();

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
				{statsCards.map((stat, index) => {
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
				{/* Reuniones Recientes */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-bold text-gray-800 mb-4">
						Reuniones Recientes
					</h2>
					<div className="space-y-4">
						{dashboardData.recent_meetings.length > 0 ? (
							dashboardData.recent_meetings.map((meeting) => (
								<div
									key={meeting.id}
									className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
								>
									<div className="flex-1">
										<p className="font-semibold text-gray-800">
											{meeting.title}
										</p>
										<p className="text-xs text-gray-500">
											{meeting.residential_unit_name}
										</p>
										<p className="text-sm text-gray-500 mt-1">
											{formatRelativeTime(
												meeting.completed_at
											)}{' '}
											• {meeting.total_participants}{' '}
											participantes (
											{meeting.attendance_percentage.toFixed(
												1
											)}
											%)
										</p>
									</div>
									<span
										className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(meeting.status)}`}
									>
										{meeting.status}
									</span>
								</div>
							))
						) : (
							<p className="text-gray-500 text-center py-8">
								No hay reuniones completadas recientemente
							</p>
						)}
					</div>
				</div>

				{/* Próximas Reuniones */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-bold text-gray-800 mb-4">
						Próximas Reuniones
					</h2>
					<div className="space-y-4">
						{dashboardData.upcoming_meetings.length > 0 ? (
							dashboardData.upcoming_meetings.map((meeting) => (
								<div
									key={meeting.id}
									className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
								>
									<div className="flex-1">
										<p className="font-semibold text-gray-800">
											{meeting.title}
										</p>
										<p className="text-xs text-gray-500">
											{meeting.residential_unit_name}
										</p>
										<p className="text-sm text-gray-500 mt-1">
											{formatDate(
												meeting.scheduled_date
											)}{' '}
											• {meeting.total_invited} invitados
										</p>
									</div>
									<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
										{meeting.meeting_type}
									</span>
								</div>
							))
						) : (
							<p className="text-gray-500 text-center py-8">
								No hay reuniones programadas próximamente
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardTab;
