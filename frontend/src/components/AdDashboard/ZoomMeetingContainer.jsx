// ZoomMeetingContainer.jsx
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, AlertTriangle, Lightbulb, BarChart3, RefreshCw, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import axiosInstance from '../../services/api/axiosconfig';
import { MeetingService } from '../../services/api/MeetingService';
import ZoomPollsPanel from './ZoomPollsPanel';

// NO precargar aquí para evitar que los estilos se carguen globalmente
// ZoomMtg.preLoadWasm();
// ZoomMtg.prepareWebSDK();

/**
 * Componente de Zoom usando SDK Web (pantalla completa) para Administradores
 * Permite unirse a reuniones como anfitrión (role: 1)
 */
const ZoomMeetingContainer = ({
	meetingData,
	onClose,
	startFullscreen = false
}) => {
	const [isLoading, setIsLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState('Iniciando reunión...');
	const [error, setError] = useState(null);
	const [showPollPanel, setShowPollPanel] = useState(false);

	useEffect(() => {
		if (!meetingData) {
			setError('No hay datos de reunión disponibles');
			setIsLoading(false);
			return;
		}

		let mounted = true;

		const initZoomSDK = async () => {
			try {
				const { ZoomMtg } = await import('@zoom/meetingsdk');
				if (!mounted) return;

				ZoomMtg.preLoadWasm();
				ZoomMtg.prepareWebSDK();

				const zmmtgRoot = document.getElementById('zmmtg-root');
				if (zmmtgRoot) {
					zmmtgRoot.style.display = 'block';
				}

				setTimeout(() => {
					if (mounted) initializeZoom(ZoomMtg);
				}, 100);
			} catch (err) {
				if (!mounted) return;
				console.error('Error cargando Zoom SDK:', err);
				setError('No se pudo cargar el componente de Zoom');
				setIsLoading(false);
			}
		};

		initZoomSDK();

		return () => {
			mounted = false;
			const zmmtgRoot = document.getElementById('zmmtg-root');
			if (zmmtgRoot) {
				zmmtgRoot.style.display = 'none';
				zmmtgRoot.innerHTML = '';
			}
		};
	}, [meetingData]);

	const initializeZoom = async (ZoomMtg) => {
		try {
			setIsLoading(true);
			setLoadingMessage('Preparando reunión...');

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

			console.log('🔵 Generando firma...');
			setLoadingMessage('Autenticando...');

			// Generar firma (role: 1 para anfitriones/administradores)
			// sdkKey y signature vienen del mismo endpoint para garantizar que coincidan
			// zak: token del anfitrión necesario para INICIAR la reunión como host
			const { signature, sdkKey, zak } = await generateSignature(meetingNumber);

			if (!zak) {
				console.warn('⚠️ No se recibió ZAK del anfitrión. El administrador podría quedar en sala de espera.');
			}

			console.log('🔵 Iniciando Zoom SDK Web...');
			setLoadingMessage('Cargando sala de reunión...');

			// Obtener nombre del usuario
			const userName = localStorage.getItem('user')
				? JSON.parse(localStorage.getItem('user')).name
				: 'Administrador';

			// Configurar idioma español antes de inicializar
			console.log('🌐 Configurando idioma español...');
			ZoomMtg.i18n.load('es-ES');
			ZoomMtg.i18n.reload('es-ES');

			// Inicializar Zoom Meeting SDK con configuraciones mejoradas
			ZoomMtg.init({
				leaveUrl: window.location.origin + '/admin', // Redirigir al dashboard del admin
				patchJsMedia: true,
				leaveOnPageUnload: false, // No cerrar automáticamente al cambiar de página
				disableCORP: true, // Deshabilitar Cross-Origin-Resource-Policy
				audioPanelAlwaysOpen: true,
				showPureSharingContent: false,
				isSupportAV: true,
				success: (success) => {
					console.log('✅ Zoom SDK inicializado', success);
					setLoadingMessage('Conectando a la reunión...');
					// NO quitar el loading aquí, esperar a que se una a la reunión

					// Unirse a la reunión
					ZoomMtg.join({
						signature: signature,
						sdkKey: sdkKey,
						meetingNumber: meetingNumber,
						passWord: password || '',
						userName: userName,
						userEmail: '',
						tk: '',
						zak: zak || '',
						success: async (success) => {
							console.log('✅ Conectado a la reunión como anfitrión', success);
							setLoadingMessage('Cargando interfaz de Zoom...');

							// Registrar asistencia del administrador
							if (meetingData?.id) {
								try {
									console.log('📝 Registrando asistencia del administrador...');
									const attendanceResult = await MeetingService.registerAttendance(meetingData.id);
									console.log('✅ Asistencia registrada:', attendanceResult);
								} catch (attendanceError) {
									// No bloquear el flujo si falla el registro de asistencia
									console.error('⚠️ Error al registrar asistencia (no crítico):', attendanceError);
								}
							}

							// Configurar listeners para detectar cuando se sale de la reunión
							console.log('🎧 Configurando listeners de eventos de Zoom...');

							// Listener cuando un usuario sale
							ZoomMtg.inMeetingServiceListener('onUserLeave', (data) => {
								console.log('👋 Usuario saliendo de la reunión:', data);
							});

							// Listener del estado de la reunión
							ZoomMtg.inMeetingServiceListener('onMeetingStatus', (data) => {
								console.log('📢 Estado de reunión cambió:', data);
								// meetingStatus: 1 = connecting, 2 = connected, 3 = disconnected/ended
								if (data.meetingStatus === 3) {
									console.log('🔴 Reunión finalizada - disparando handleMeetingEnd');
									handleMeetingEnd();
								}
							});

							// Listener adicional para cuando el host deja la reunión
							ZoomMtg.inMeetingServiceListener('onHostAskToUnMute', (data) => {
								console.log('🎤 onHostAskToUnMute:', data);
							});

							console.log('✅ Listeners configurados correctamente');

							// Esperar a que la interfaz de Zoom esté completamente cargada
							// Observar cambios en el DOM de Zoom para detectar la sala de espera
							let zoomLoadAttempts = 0;
							const maxAttempts = 150; // 15 segundos (150 * 100ms)

							const checkZoomLoaded = setInterval(() => {
								zoomLoadAttempts++;
								const zmmtgRoot = document.getElementById('zmmtg-root');

								console.log(`🔍 Intento ${zoomLoadAttempts}: Buscando interfaz de Zoom...`);

								// Verificar que Zoom haya renderizado contenido
								if (zmmtgRoot && zmmtgRoot.children.length > 0) {
									// Buscar elementos específicos de la sala de espera o interfaz de Zoom
									const waitingRoom = zmmtgRoot.querySelector('[class*="waiting"]') ||
										zmmtgRoot.querySelector('[class*="join"]') ||
										zmmtgRoot.querySelector('[class*="preview"]');

									const meetingContent = zmmtgRoot.querySelector('[class*="meeting-client"]') ||
										zmmtgRoot.querySelector('[class*="main-layout"]') ||
										zmmtgRoot.querySelector('[class*="meeting-app"]');

									const anyZoomContent = zmmtgRoot.querySelector('[class*="zm-"]') ||
										zmmtgRoot.querySelector('iframe') ||
										zmmtgRoot.querySelector('video');

									console.log('🔍 Elementos encontrados:', {
										waitingRoom: !!waitingRoom,
										meetingContent: !!meetingContent,
										anyZoomContent: !!anyZoomContent,
										totalChildren: zmmtgRoot.children.length
									});

									// Si encontramos sala de espera, contenido de reunión, o cualquier interfaz de Zoom
									if (waitingRoom || meetingContent || (anyZoomContent && zmmtgRoot.children.length > 2)) {
										console.log('✅ Interfaz de Zoom detectada, esperando renderizado completo...');
										clearInterval(checkZoomLoaded);
										// Delay adicional para asegurar que todo está renderizado
										setTimeout(() => {
											console.log('✅ Quitando pantalla de carga');
											setIsLoading(false);
										}, 1500);
									}
								}

								// Timeout si llegamos al máximo de intentos
								if (zoomLoadAttempts >= maxAttempts) {
									console.log('⏱️ Timeout alcanzado: Quitando pantalla de carga');
									clearInterval(checkZoomLoaded);
									setIsLoading(false);
								}
							}, 100);
						},
						error: (error) => {
							console.error('❌ Error al unirse a la reunión:', error);

							// Manejar errores específicos
							let errorMessage = 'Error al unirse a la reunión';
							if (error && error.errorCode === 3000) {
								errorMessage = 'Error de conexión (3000): Verifica tu conexión a internet y los permisos del navegador. Intenta recargar la página.';
							} else if (error && error.reason) {
								errorMessage = `Error: ${error.reason}`;
							}

							setError(errorMessage);
							setIsLoading(false);

							// Limpiar Zoom al fallar
							const zmmtgRoot = document.getElementById('zmmtg-root');
							if (zmmtgRoot) {
								zmmtgRoot.style.display = 'none';
								zmmtgRoot.innerHTML = '';
							}
						},
					});
				},
				error: (error) => {
					console.error('❌ Error al inicializar:', error);
					setError(error.message || 'Error al inicializar la reunión');
					setIsLoading(false);
				},
			});

		} catch (err) {
			console.error('❌ Error al inicializar:', err);
			setError(err.message || 'Error al inicializar la reunión');
			setIsLoading(false);
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
					role: 1, // 1 = anfitrion (administrador)
					zoom_account_id: meetingData?.int_zoom_account_id || null,
				}
			);

			if (response.data.success) {
				return {
					signature: response.data.data.signature,
					sdkKey: response.data.data.sdk_key,
					zak: response.data.data.zak,
				};
			} else {
				throw new Error('No se pudo generar el signature');
			}
		} catch (error) {
			console.error('❌ Error generando firma:', error);
			throw error;
		}
	};

	const handleMeetingEnd = async () => {
		// Primero cerrar el componente y volver al dashboard
		console.log('🔄 Cerrando componente de Zoom y volviendo al dashboard');
		onClose();

		// Registrar hora de salida del administrador
		try {
			console.log('📝 Registrando salida del administrador...');
			await MeetingService.registerLeave(meetingData.id);
			console.log('✅ Salida registrada');
		} catch (leaveError) {
			console.error('⚠️ Error al registrar salida (no crítico):', leaveError);
		}

		// Luego registrar la hora de finalización en segundo plano
		// Esto evita que cualquier error (incluyendo 401) afecte la navegación
		try {
			console.log('📝 Registrando hora de finalización de la reunión en segundo plano...', {
				meetingId: meetingData.id,
				endpoint: `/meetings/${meetingData.id}/end`
			});

			const response = await axiosInstance.post(`/meetings/${meetingData.id}/end`);
			console.log('✅ Hora de finalización registrada correctamente:', response.data);
		} catch (error) {
			// Silenciosamente capturar el error sin afectar la navegación
			// No redirigir a login si hay error 401
			console.error('❌ Error al registrar hora de finalización (no crítico):', {
				error: error.message,
				response: error.response?.data,
				meetingId: meetingData.id
			});
		}
	};

	// Error
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-900">
				<div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto">
					<div className="text-center">
						<AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
						<h3 className="text-xl font-bold text-gray-800 mb-2">
							Error al cargar la reunión
						</h3>
						<p className="text-gray-600 mb-6">{error}</p>

						{/* Soluciones sugeridas */}
						{error.includes('3000') && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
								<h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Lightbulb size={18} /> Soluciones sugeridas:</h4>
								<ul className="text-sm text-blue-800 space-y-2">
									<li className="flex items-center gap-2"><CheckCircle size={14} /> Verifica que tienes conexión a internet estable</li>
									<li className="flex items-center gap-2"><CheckCircle size={14} /> Permite el acceso a cámara y micrófono en tu navegador</li>
									<li className="flex items-center gap-2"><CheckCircle size={14} /> Desactiva extensiones de navegador que puedan bloquear Zoom</li>
									<li className="flex items-center gap-2"><CheckCircle size={14} /> Intenta usar otro navegador (Chrome recomendado)</li>
									<li className="flex items-center gap-2"><CheckCircle size={14} /> Verifica que no haya firewalls bloqueando Zoom</li>
								</ul>
							</div>
						)}

						<div className="flex gap-3 justify-center">
							<button
								onClick={() => window.location.reload()}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
							>
								<RefreshCw size={18} /> Reintentar
							</button>
							<button
								onClick={onClose}
								className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
							>
								Volver al Dashboard
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Loading overlay - Solo se muestra mientras se inicializa
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10000 }}>
				<div className="text-center max-w-md mx-4">
					{/* Logo o icono de Zoom */}
					<div className="mb-6">
						<div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center shadow-2xl">
							<svg
								className="w-12 h-12 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						</div>
					</div>

					{/* Spinner animado */}
					<Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-6" />

					{/* Mensaje de estado dinámico */}
					<p className="text-white text-2xl font-bold mb-3 animate-pulse">
						{loadingMessage}
					</p>

					{/* Nombre de la reunión */}
					<p className="text-gray-300 text-base mb-6">
						{meetingData?.str_title || 'Cargando reunión'}
					</p>

					{/* Barra de progreso animada */}
					<div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
						<div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse rounded-full" style={{ width: '70%' }}></div>
					</div>

					{/* Texto de ayuda */}
					<p className="text-gray-400 text-xs mt-4">
						Por favor espera mientras cargamos la sala de reunión
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			{/* Botón toggle flotante — siempre visible en esquina inferior izquierda */}
			{ReactDOM.createPortal(
				<button
					onClick={() => setShowPollPanel(prev => !prev)}
					title="Gestión de Encuestas"
					style={{
						position: 'fixed',
						bottom: '138px',
						left: '24px',
						zIndex: 10002,
						display: 'flex',
						alignItems: 'center',
						gap: '9px',
						padding: '13px 22px',
						background: showPollPanel
							? 'linear-gradient(to right, #5b21b6, #4c1d95)'
							: 'linear-gradient(to right, #7c3aed, #6d28d9)',
						color: 'white',
						border: 'none',
						borderRadius: '15px',
						fontWeight: '700',
						fontSize: '15px',
						cursor: 'pointer',
						boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
						transition: 'all 0.2s',
					}}
				>
					<BarChart3 size={22} />
					{showPollPanel ? 'Cerrar panel' : 'Encuestas'}
				</button>,
				document.body
			)}

			{/* Panel lateral de gestión */}
			<ZoomPollsPanel
				meetingData={meetingData}
				isOpen={showPollPanel}
				onClose={() => setShowPollPanel(false)}
			/>
		</>
	);
};

export default ZoomMeetingContainer;
