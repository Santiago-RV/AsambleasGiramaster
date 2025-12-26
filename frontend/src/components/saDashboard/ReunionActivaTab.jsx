import React, { useState, useEffect } from 'react';
import { PlayCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import ActiveMeetingCard from './components/ActiveMeetingCard';
import ActiveMeetingDetailsModal from './components/ActiveMeetingDetailsModal';
import {
	getActiveMeetings,
	getActiveMeetingDetails,
} from '../../services/api/ActiveMeetingService';

const ReunionActivaTab = () => {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeMeetings, setActiveMeetings] = useState([]);
	const [selectedMeetingId, setSelectedMeetingId] = useState(null);
	const [meetingDetails, setMeetingDetails] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [loadingDetails, setLoadingDetails] = useState(false);

	// Cargar reuniones activas al montar el componente
	useEffect(() => {
		loadActiveMeetings();

		// Auto-refresh cada 30 segundos
		const interval = setInterval(() => {
			loadActiveMeetings(true); // true = silencioso
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	// Cargar detalles cuando se selecciona una reunión
	useEffect(() => {
		if (selectedMeetingId) {
			loadMeetingDetails(selectedMeetingId);
		}
	}, [selectedMeetingId]);

	const loadActiveMeetings = async (silent = false) => {
		try {
			if (!silent) {
				setLoading(true);
			} else {
				setRefreshing(true);
			}

			const response = await getActiveMeetings();

			if (response.success) {
				setActiveMeetings(response.data.active_meetings || []);
			} else {
				throw new Error(
					response.message || 'Error al cargar reuniones activas'
				);
			}
		} catch (error) {
			console.error('Error al cargar reuniones activas:', error);
			if (!silent) {
				Swal.fire({
					icon: 'error',
					title: 'Error',
					text:
						error.response?.data?.message ||
						'No se pudieron cargar las reuniones activas',
				});
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const loadMeetingDetails = async (meetingId) => {
		try {
			setLoadingDetails(true);
			const response = await getActiveMeetingDetails(meetingId);

			if (response.success) {
				setMeetingDetails(response.data);
				setModalOpen(true);
			} else {
				throw new Error(
					response.message || 'Error al cargar detalles de la reunión'
				);
			}
		} catch (error) {
			console.error('Error al cargar detalles:', error);
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text:
					error.response?.data?.message ||
					'No se pudieron cargar los detalles de la reunión',
			});
		} finally {
			setLoadingDetails(false);
		}
	};

	const handleMeetingCardClick = (meetingId) => {
		setSelectedMeetingId(meetingId);
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setSelectedMeetingId(null);
		setMeetingDetails(null);
		// Refrescar la lista al cerrar el modal
		loadActiveMeetings(true);
	};

	const handleManualRefresh = () => {
		loadActiveMeetings();
	};

	// Mostrar loader mientras carga
	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
					<p className="text-gray-600">
						Cargando reuniones activas...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Encabezado */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
						<PlayCircle className="text-green-600" size={32} />
						Reuniones Activas
					</h1>
					<p className="text-gray-600 mt-2">
						Monitorea las reuniones en curso en tiempo real
					</p>
				</div>

				<div className="flex items-center gap-3">
					{refreshing && (
						<span className="text-sm text-gray-500 flex items-center gap-2">
							<RefreshCw className="animate-spin" size={16} />
							Actualizando...
						</span>
					)}
					<button
						onClick={handleManualRefresh}
						disabled={loading || refreshing}
						className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RefreshCw size={18} />
						Actualizar
					</button>
				</div>
			</div>

			{/* Contador de reuniones */}
			<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
							<PlayCircle size={32} className="animate-pulse" />
						</div>
						<div>
							<p className="text-green-100 text-sm">
								Reuniones en curso
							</p>
							<p className="text-4xl font-bold">
								{activeMeetings.length}
							</p>
						</div>
					</div>
					<div className="text-right">
						<p className="text-green-100 text-sm">
							Total de participantes
						</p>
						<p className="text-3xl font-bold">
							{activeMeetings.reduce(
								(sum, meeting) =>
									sum + meeting.connected_users_count,
								0
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Lista de reuniones activas */}
			{activeMeetings.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{activeMeetings.map((meeting) => (
						<ActiveMeetingCard
							key={meeting.meeting_id}
							meeting={meeting}
							onClick={handleMeetingCardClick}
						/>
					))}
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
					<div className="text-center">
						<AlertCircle
							className="mx-auto text-gray-400 mb-4"
							size={64}
						/>
						<h3 className="text-xl font-bold text-gray-800 mb-2">
							No hay reuniones activas
						</h3>
						<p className="text-gray-600 mb-6">
							En este momento no hay reuniones en curso. Las
							reuniones activas aparecerán aquí automáticamente.
						</p>
						<button
							onClick={handleManualRefresh}
							className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
						>
							<RefreshCw size={18} />
							Verificar nuevamente
						</button>
					</div>
				</div>
			)}

			{/* Modal de detalles */}
			{loadingDetails ? (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-8 text-center">
						<Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
						<p className="text-gray-600">
							Cargando detalles de la reunión...
						</p>
					</div>
				</div>
			) : (
				<ActiveMeetingDetailsModal
					isOpen={modalOpen}
					onClose={handleCloseModal}
					meetingDetails={meetingDetails}
				/>
			)}
		</div>
	);
};

export default ReunionActivaTab;
