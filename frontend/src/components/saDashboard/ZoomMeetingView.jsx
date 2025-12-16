import React, { useEffect, useRef, useState } from 'react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
import { ArrowLeft, Vote } from 'lucide-react';
import Swal from 'sweetalert2';
import axiosInstance from '../../services/api/axiosconfig';
import VotingModal from './VotingModal';

/**
 * Componente de Zoom usando SDK Embedded para SuperAdministradores
 * Permite unirse a reuniones como anfitrión (role: 1)
 */
const ZoomMeetingView = ({ meetingData, onBack }) => {
	const meetingSDKElement = useRef(null);
	const clientRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [meetingEnded, setMeetingEnded] = useState(false);
	const [showVotingModal, setShowVotingModal] = useState(false);

	useEffect(() => {
		if (!meetingData) {
			setError('No hay datos de reunión disponibles');
			setIsLoading(false);
			return;
		}

		if (!meetingSDKElement.current) {
			setError('Error al cargar el contenedor de Zoom');
			setIsLoading(false);
			return;
		}

		const timer = setTimeout(() => {
			initializeZoom();
		}, 100);

		return () => {
			clearTimeout(timer);
			if (clientRef.current) {
				try {
					clientRef.current.leaveMeeting();
				} catch (err) {
					console.error('Error leaving meeting:', err);
				}
			}
		};
	}, [meetingData]);

	const initializeZoom = async () => {
		try {
			setIsLoading(true);

			if (!meetingSDKElement.current) {
				throw new Error('El contenedor de Zoom no está disponible');
			}

			console.log('🔵 Inicializando Zoom SDK Embedded (SuperAdmin)...');
			const client = ZoomMtgEmbedded.createClient();
			clientRef.current = client;

			await client.init({
				zoomAppRoot: meetingSDKElement.current,
				language: 'es-ES',
				patchJsMedia: true,
				leaveOnPageUnload: true,
			});

			console.log('✅ Zoom SDK inicializado');
			await joinMeeting(client);
			setIsLoading(false);
		} catch (err) {
			console.error('❌ Error al inicializar:', err);
			setError(err.message || 'Error al inicializar la reunión');
			setIsLoading(false);

			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se pudo inicializar la reunión de Zoom.',
				confirmButtonColor: '#3498db',
			});
		}
	};

	const joinMeeting = async (client) => {
		try {
			// Extraer meeting number de la URL
			const meetingNumber = extractMeetingNumber(
				meetingData.str_zoom_join_url || meetingData.int_zoom_meeting_id
			);

			const password =
				meetingData.str_zoom_password ||
				extractPassword(meetingData.str_zoom_join_url);

			if (!meetingNumber) {
				throw new Error('No se pudo extraer el número de reunión de la URL');
			}

			console.log('🔵 Obteniendo configuración de Zoom...');

			// Obtener SDK Key del backend
			const configResponse = await axiosInstance.get('/zoom/config');
			const sdkKey = configResponse.data.data.sdk_key;

			console.log('🔵 Generando firma...');

			// Generar firma (role: 1 para anfitriones/superadmin)
			const signature = await generateSignature(meetingNumber);

			console.log('🔵 Uniéndose a la reunión como anfitrión...');

			// Obtener nombre del usuario
			const userName = localStorage.getItem('user')
				? JSON.parse(localStorage.getItem('user')).name
				: meetingData.userName || 'SuperAdmin';

			await client.join({
				meetingNumber: meetingNumber,
				password: password || '',
				userName: userName,
				signature: signature,
				sdkKey: sdkKey,
				tk: '',
			});

			console.log('✅ Conectado a la reunión como anfitrión');

			// Escuchar evento de finalización de reunión
			client.on('meeting-ended', () => {
				console.log('📢 Reunión finalizada');
				setMeetingEnded(true);
			});

			client.on('user-leave', (payload) => {
				// Si el anfitrión termina la reunión para todos
				if (payload.reason === 'ended by host') {
					setMeetingEnded(true);
				}
			});
		} catch (error) {
			console.error('❌ Error al unirse:', error);
			throw error;
		}
	};

	const extractMeetingNumber = (value) => {
		if (!value) return '';

		// Si es un número directo
		if (typeof value === 'number') return value.toString();

		// Si es string numérico
		if (/^\d+$/.test(value)) return value;

		// Si es URL, extraer número
		const match = value.match(/\/j\/(\d+)/);
		return match ? match[1] : '';
	};

	const extractPassword = (url) => {
		if (!url) return '';
		const match = url.match(/pwd=([^&]+)/);
		return match ? match[1] : '';
	};

	const generateSignature = async (meetingNumber) => {
		try {
			const response = await axiosInstance.post(
				'/zoom/generate-signature',
				{
					meeting_number: meetingNumber,
					role: 1, // 1 = anfitrión (superadmin)
				}
			);

			if (response.data.success) {
				return response.data.data.signature;
			} else {
				throw new Error('No se pudo generar el signature');
			}
		} catch (error) {
			console.error('❌ Error generando firma:', error);
			Swal.fire({
				icon: 'error',
				title: 'Error de Autenticación',
				text: 'No se pudo generar el token de autenticación para Zoom.',
				confirmButtonColor: '#3498db',
			});
			throw error;
		}
	};

	const handleLeaveMeeting = async () => {
		const result = await Swal.fire({
			title: '¿Salir de la reunión?',
			text: '¿Estás seguro de que deseas abandonar la reunión?',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#e74c3c',
			cancelButtonColor: '#3498db',
			confirmButtonText: 'Sí, salir',
			cancelButtonText: 'Cancelar',
		});

		if (result.isConfirmed) {
			try {
				if (clientRef.current) {
					await clientRef.current.endMeeting();
				}
				onBack();
			} catch (err) {
				console.error('Error ending meeting:', err);
				onBack();
			}
		}
	};

	// Error
	if (error) {
		return (
			<div className="flex items-center justify-center h-screen bg-gray-900">
				<div className="text-center max-w-md">
					<div className="text-red-500 text-6xl mb-6">⚠️</div>
					<h2 className="text-white text-2xl font-bold mb-4">
						Error al cargar la reunión
					</h2>
					<p className="text-gray-400 mb-8">{error}</p>
					<div className="flex gap-4 justify-center">
						<button
							onClick={onBack}
							className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
						>
							Volver
						</button>
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-3 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] transition-colors font-semibold"
						>
							Reintentar
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative w-screen h-screen bg-black overflow-hidden">
			{/* Contenedor del SDK de Zoom - Pantalla completa */}
			<div
				ref={meetingSDKElement}
				id="meetingSDKElement"
				className="w-full h-full absolute inset-0"
			/>

			{/* Loading overlay para Zoom */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm z-[100]">
					<div className="text-center">
						<div className="w-24 h-24 border-8 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
						<h2 className="text-white text-2xl font-bold mt-8 mb-2">
							Iniciando reunión...
						</h2>
						<p className="text-gray-400">
							{meetingData?.str_title || 'Cargando'}
						</p>
					</div>
				</div>
			)}

			{/* Overlay de reunión terminada */}
			{meetingEnded && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm z-[100]">
					<div className="text-center max-w-md p-8">
						<div className="mb-6">
							<div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="48"
									height="48"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-blue-500"
								>
									<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
								</svg>
							</div>
						</div>
						<h2 className="text-white text-3xl font-bold mb-4">
							Reunión Finalizada
						</h2>
						<p className="text-gray-400 mb-2">
							{meetingData?.str_title ||
								'La reunión ha terminado'}
						</p>
						<p className="text-gray-500 text-sm mb-8">
							El anfitrión ha finalizado la reunión para todos los
							participantes
						</p>
						<button
							onClick={onBack}
							className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold shadow-lg"
						>
							Volver al Panel
						</button>
					</div>
				</div>
			)}

			{/* Botones flotantes */}
			{!isLoading && !meetingEnded && (
				<>
					{/* Botón de salir */}
					<button
						onClick={handleLeaveMeeting}
						className="absolute top-6 left-6 z-[70] p-3 bg-red-600/90 hover:bg-red-700 backdrop-blur-md rounded-full transition-all shadow-lg group"
						title="Salir de la reunión"
					>
						<ArrowLeft
							size={24}
							className="text-white group-hover:scale-110 transition-transform"
						/>
					</button>

					{/* Botón de votaciones */}
					<button
						onClick={() => setShowVotingModal(true)}
						className="absolute top-6 right-6 z-[70] p-4 bg-blue-600/90 hover:bg-blue-700 backdrop-blur-md rounded-full transition-all shadow-lg group"
						title="Ver votaciones"
					>
						<Vote
							size={28}
							className="text-white group-hover:scale-110 transition-transform"
						/>
					</button>
				</>
			)}

			{/* Modal de Votaciones */}
			<VotingModal
				isOpen={showVotingModal}
				onClose={() => setShowVotingModal(false)}
				meetingData={meetingData}
			/>
		</div>
	);
};

export default ZoomMeetingView;
