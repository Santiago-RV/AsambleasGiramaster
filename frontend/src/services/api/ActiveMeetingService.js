import axiosInstance from './axiosconfig';

/**
 * Servicio para gestionar reuniones activas del SuperAdmin
 */

/**
 * Obtiene todas las reuniones activas (En Curso)
 * @returns {Promise} - Promesa con las reuniones activas
 */
export const getActiveMeetings = async () => {
	try {
		const response = await axiosInstance.get('/super-admin/active-meetings');
		return response.data;
	} catch (error) {
		console.error('Error al obtener reuniones activas:', error);
		throw error;
	}
};


/* @param {number} meetingId - ID de la reunión
 * @returns {Promise} - Promesa con los detalles de la reunión
 */
export const getActiveMeetingDetails = async (meetingId) => {
	try {
		const response = await axiosInstance.get(
			`/super-admin/active-meetings/${meetingId}`
		);
		return response.data;
	} catch (error) {
		console.error('Error al obtener detalles de la reunión:', error);
		throw error;
	}
};


/* @param {string} startTimeISO - Fecha/hora de inicio en formato ISO
 * @returns {string} - Duración formateada (ej: "1h 23m")
 */
export const calculateMeetingDuration = (startTimeISO) => {
	if (!startTimeISO) return '0m';

	const startTime = new Date(startTimeISO);
	const now = new Date();
	const durationMs = now - startTime;

	const hours = Math.floor(durationMs / (1000 * 60 * 60));
	const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
};

/**
 * Calcula el porcentaje de asistencia
 * @param {number} connectedUsers - Usuarios conectados
 * @param {number} totalInvited - Total de invitados
 * @returns {number} - Porcentaje de asistencia
 */
export const calculateAttendancePercentage = (
	connectedUsers,
	totalInvited
) => {
	if (totalInvited === 0) return 0;
	return Math.round((connectedUsers / totalInvited) * 100);
};

/**
 * Formatea la fecha y hora de inicio de la reunión
 * @param {string} dateISO - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export const formatMeetingStartTime = (dateISO) => {
	if (!dateISO) return 'No iniciada';

	const date = new Date(dateISO);
	return date.toLocaleString('es-ES', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
	});
};

/**
 * Obtiene el color del badge según el estado del quórum
 * @param {boolean} quorumReached - Si se alcanzó el quórum
 * @returns {string} - Clases CSS para el badge
 */
export const getQuorumBadgeColor = (quorumReached) => {
	return quorumReached
		? 'bg-green-100 text-green-700'
		: 'bg-yellow-100 text-yellow-700';
};

/**
 * Obtiene el color del badge según el estado de la encuesta
 * @param {string} status - Estado de la encuesta
 * @returns {string} - Clases CSS para el badge
 */
export const getPollStatusColor = (status) => {
	const statusColors = {
		Abierta: 'bg-green-100 text-green-700',
		'En Curso': 'bg-blue-100 text-blue-700',
		Cerrada: 'bg-gray-100 text-gray-700',
		Borrador: 'bg-yellow-100 text-yellow-700',
	};

	return statusColors[status] || 'bg-gray-100 text-gray-700';
};

/**
 * Formatea el tipo de asistencia
 * @param {string} attendanceType - Tipo de asistencia
 * @returns {string} - Tipo formateado
 */
export const formatAttendanceType = (attendanceType) => {
	const types = {
		Titular: 'Titular',
		Delegado: 'Delegado',
		Apoderado: 'Apoderado',
		Representante: 'Representante',
	};

	return types[attendanceType] || attendanceType || 'Titular';
};

/**
 * Obtiene las iniciales de un nombre completo
 * @param {string} fullName - Nombre completo
 * @returns {string} - Iniciales (máximo 2 caracteres)
 */
export const getInitials = (fullName) => {
	if (!fullName) return '??';

	const names = fullName.trim().split(' ');
	if (names.length === 1) {
		return names[0].substring(0, 2).toUpperCase();
	}

	return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};
