import axiosInstance from './axiosconfig';

/**
 * Servicio para gestionar las estadísticas del dashboard de SuperAdmin
 */

/**
 * Obtiene todas las estadísticas del dashboard
 * @returns {Promise} - Promesa con las estadísticas del dashboard
 */
export const getDashboardStatistics = async () => {
	try {
		const response = await axiosInstance.get(
			'/super-admin/dashboard/statistics'
		);
		return response.data;
	} catch (error) {
		console.error('Error al obtener estadísticas del dashboard:', error);
		throw error;
	}
};

/**
 * Formatea el porcentaje de asistencia
 * @param {number} percentage - Porcentaje a formatear
 * @returns {string} - Porcentaje formateado
 */
export const formatAttendancePercentage = (percentage) => {
	return `${percentage.toFixed(1)}%`;
};

/**
 * Formatea la fecha relativa (ej: "Hace 2 horas")
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export const formatRelativeTime = (dateString) => {
	if (!dateString) return 'Fecha no disponible';

	const date = new Date(dateString);
	const now = new Date();
	const diffInMs = now - date;
	const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
	const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (diffInMinutes < 1) return 'Hace un momento';
	if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
	if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
	if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;

	return date.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
};

/**
 * Formatea la fecha absoluta
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export const formatDate = (dateString) => {
	if (!dateString) return 'Fecha no disponible';

	const date = new Date(dateString);
	return date.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
};

/**
 * Obtiene el color del badge según el estado
 * @param {string} status - Estado de la reunión
 * @returns {object} - Clases CSS para el badge
 */
export const getStatusBadgeColor = (status) => {
	const statusColors = {
		'Completada': 'bg-green-100 text-green-700',
		'En Curso': 'bg-blue-100 text-blue-700',
		'Programada': 'bg-yellow-100 text-yellow-700',
		'Cancelada': 'bg-red-100 text-red-700'
	};

	return statusColors[status] || 'bg-gray-100 text-gray-700';
};

/**
 * Formatea números grandes con separador de miles
 * @param {number} num - Número a formatear
 * @returns {string} - Número formateado
 */
export const formatNumber = (num) => {
	return num.toLocaleString('es-ES');
};
