import React, { useEffect, useRef, useState } from 'react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
import { X, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import axiosInstance from '../../services/api/axiosconfig';

/**
 * Componente de Zoom usando SDK Embedded (igual que superadmin)
 * Adaptado para copropietarios con sidebar visible
 */
const ZoomMeetingContainer = ({ 
	meetingData, 
	onClose,
	startFullscreen = false 
}) => {
	const meetingSDKElement = useRef(null);
	const clientRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(startFullscreen);

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

			console.log('🔵 Inicializando Zoom SDK Embedded...');
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
				throw new Error('No se pudo extraer el número de reunión');
			}

			console.log('🔵 Obteniendo configuración de Zoom...');

			// Obtener SDK Key del backend
			const configResponse = await axiosInstance.get('/zoom/config');
			const sdkKey = configResponse.data.data.sdk_key;

			console.log('🔵 Generando firma...');

			// Generar firma (role: 0 para participantes)
			const signature = await generateSignature(meetingNumber);

			console.log('🔵 Uniéndose a la reunión...');

			// Obtener nombre del usuario
			const userName = localStorage.getItem('user') 
				? JSON.parse(localStorage.getItem('user')).name 
				: 'Usuario';

			await client.join({
				meetingNumber: meetingNumber,
				password: password || '',
				userName: userName,
				signature: signature,
				sdkKey: sdkKey,
				tk: '',
			});

			console.log('✅ Conectado a la reunión');

			// Escuchar evento de finalización
			client.on('meeting-ended', () => {
				console.log('📢 Reunión finalizada');
				onClose();
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
					role: 0, // 0 = participante (copropietario)
				}
			);

			if (response.data.success) {
				return response.data.data.signature;
			} else {
				throw new Error('No se pudo generar el signature');
			}
		} catch (error) {
			console.error('❌ Error generando firma:', error);
			throw error;
		}
	};

	const toggleFullscreen = () => {
		setIsFullscreen(!isFullscreen);
	};

	// Error
	if (error) {
		return (
			<div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto my-8">
				<div className="text-center">
					<div className="text-red-500 text-5xl mb-4">⚠️</div>
					<h3 className="text-xl font-bold text-gray-800 mb-2">
						Error al cargar la reunión
					</h3>
					<p className="text-gray-600 mb-6">{error}</p>
					<button
						onClick={onClose}
						className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Cerrar
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={`
			${isFullscreen 
				? 'fixed inset-0 z-50' 
				: 'relative w-full'
			}
		`}>
			{/* Contenedor con tamaño ajustable */}
			<div className={`
				${isFullscreen
					? 'w-full h-full'
					: 'w-full rounded-lg shadow-2xl overflow-hidden'
				}
				bg-gray-900
			`}
			style={{
				height: isFullscreen ? '100vh' : 'calc(100vh - 200px)',
				minHeight: '600px'
			}}
			>
				{/* Header con controles - Solo en modo NO fullscreen */}
				{!isFullscreen && !isLoading && (
					<div className="absolute top-4 right-4 z-10 flex gap-2">
						<button
							onClick={toggleFullscreen}
							className="bg-gray-700/80 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-gray-600 shadow-lg transition-colors"
							title="Pantalla completa"
						>
							<Maximize2 className="w-5 h-5" />
						</button>
						<button
							onClick={onClose}
							className="bg-red-600/80 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-red-700 shadow-lg transition-colors"
							title="Salir de la reunión"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				)}

				{/* Botón para salir del fullscreen */}
				{isFullscreen && !isLoading && (
					<div className="absolute top-4 right-4 z-10">
						<button
							onClick={toggleFullscreen}
							className="bg-gray-700/80 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-gray-600 shadow-lg transition-colors"
							title="Salir de pantalla completa"
						>
							<Minimize2 className="w-5 h-5" />
						</button>
					</div>
				)}

				{/* Loading overlay */}
				{isLoading && (
					<div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50">
						<div className="text-center max-w-md mx-4">
							<Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
							<p className="text-white text-xl font-semibold mb-2">
								Iniciando reunión...
							</p>
							<p className="text-gray-400 text-sm">
								{meetingData?.str_title || 'Cargando'}
							</p>
						</div>
					</div>
				)}

				{/* Contenedor del SDK de Zoom */}
				<div
					ref={meetingSDKElement}
					id="meetingSDKElement"
					className="w-full h-full relative"
					style={{ zIndex: 1 }}
				/>
			</div>

			{/* Info adicional cuando NO está en fullscreen */}
			{!isFullscreen && (
				<div className="mt-4 text-sm text-gray-600">
					<p>💡 <strong>Tip:</strong> Usa el botón 
						<Maximize2 className="inline w-4 h-4 mx-1" />
						para ver en pantalla completa
					</p>
				</div>
			)}
		</div>
	);
};

export default ZoomMeetingContainer;