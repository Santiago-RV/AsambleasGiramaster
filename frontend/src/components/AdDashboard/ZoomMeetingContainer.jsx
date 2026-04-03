// ZoomMeetingContainer.jsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Loader2, CheckCircle, AlertTriangle, Lightbulb, BarChart3, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import axiosInstance from '../../services/api/axiosconfig';
import { PollService } from '../../services/api/PollService';
import { MeetingService } from '../../services/api/MeetingService';

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
	const [showPollButton, setShowPollButton] = useState(false); // Se activa cuando hay encuesta
	const [showPollModal, setShowPollModal] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState([]); // Array para soportar múltiples opciones
	const [isSubmittingVote, setIsSubmittingVote] = useState(false);

	// Obtener encuestas activas de la reunión
	const { data: pollsData, isLoading: isLoadingPolls, refetch: refetchPolls } = useQuery({
		queryKey: ['meeting-polls', meetingData?.id],
		queryFn: async () => {
			if (!meetingData?.id) return { data: [] };
			console.log('🔍 [ZoomMeetingContainer] Obteniendo encuestas para reunión:', meetingData.id);
			const result = await PollService.getPollsByMeeting(meetingData.id);
			console.log('📊 [ZoomMeetingContainer] Encuestas obtenidas:', result);
			return result;
		},
		enabled: !!meetingData?.id,
		refetchInterval: 5000, // Refrescar cada 5 segundos
	});

	// Obtener la encuesta activa (estado "Activa" o "active")
	const activePoll = pollsData?.data?.find(poll => {
		const isActive = poll.str_status === 'Activa' || poll.str_status === 'active';
		console.log('🔍 [ZoomMeetingContainer] Evaluando encuesta:', {
			id: poll.id,
			title: poll.str_title,
			status: poll.str_status,
			statusType: typeof poll.str_status,
			isActive
		});
		return isActive;
	});

	// Log completo de la encuesta activa y sus opciones
	useEffect(() => {
		if (activePoll) {
			console.log('📊 [ZoomMeetingContainer] ENCUESTA ACTIVA COMPLETA:', {
				id: activePoll.id,
				title: activePoll.str_title,
				type: activePoll.str_poll_type,
				status: activePoll.str_status,
				options: activePoll.options,
				optionsLength: activePoll.options?.length,
				fullPollData: activePoll
			});
		}
	}, [activePoll]);

	// Mostrar botón cuando hay encuesta activa
	useEffect(() => {
		const polls = pollsData?.data || [];
		console.log('🎯 [ZoomMeetingContainer] Evaluando mostrar botón:', {
			totalPolls: polls.length,
			polls: polls.map(p => ({ id: p.id, title: p.str_title, status: p.str_status })),
			activePoll: activePoll ? { id: activePoll.id, title: activePoll.str_title } : null,
			showPollButton: !!activePoll
		});
		setShowPollButton(!!activePoll);
	}, [activePoll, pollsData]);

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

			console.log('🔵 Obteniendo configuracion de Zoom...');
			setLoadingMessage('Configurando conexion...');

			// Obtener SDK Key del backend (usando cuenta Zoom correcta)
			const zoomAccountId = meetingData?.int_zoom_account_id;
			const configUrl = zoomAccountId ? `/zoom/config?zoom_account_id=${zoomAccountId}` : '/zoom/config';
			const configResponse = await axiosInstance.get(configUrl);
			const sdkKey = configResponse.data.data.sdk_key;

			console.log('🔵 Generando firma...');
			setLoadingMessage('Autenticando...');

			// Generar firma (role: 1 para anfitriones/administradores)
			const signature = await generateSignature(meetingNumber);

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
						zak: '',
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
				return response.data.data.signature;
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

	const handleViewPoll = () => {
		console.log('📊 Abriendo modal de encuesta activa');
		setSelectedOptions([]);
		setShowPollModal(true);
	};

	const handleClosePollModal = () => {
		console.log('📊 Cerrando modal de encuesta');
		setShowPollModal(false);
		setSelectedOptions([]);
	};

	// Manejar selección de opciones (single o multiple)
	const handleOptionToggle = (optionId) => {
		if (!activePoll) return;

		if (activePoll.str_poll_type === 'single') {
			// Para single choice, solo una opción
			setSelectedOptions([optionId]);
		} else if (activePoll.str_poll_type === 'multiple') {
			// Para multiple choice, agregar/quitar de la lista
			setSelectedOptions(prev => {
				if (prev.includes(optionId)) {
					// Si ya está seleccionada, quitarla
					return prev.filter(id => id !== optionId);
				} else {
					// Si no está, agregarla (verificar límite máximo)
					const maxSelections = activePoll.int_max_selections || 999;
					if (prev.length < maxSelections) {
						return [...prev, optionId];
					}
					return prev; // Ya alcanzó el máximo
				}
			});
		}
	};

	const handleVote = async () => {
		if (!activePoll || selectedOptions.length === 0) return;

		setIsSubmittingVote(true);
		try {
			// Para single choice: enviar solo una opción
			// Para multiple choice: enviar múltiples votos
			if (activePoll.str_poll_type === 'single') {
				const voteData = {
					int_option_id: selectedOptions[0],
					bln_is_abstention: false,
				};
				await PollService.vote(activePoll.id, voteData);
			} else if (activePoll.str_poll_type === 'multiple') {
				// Enviar un voto por cada opción seleccionada
				for (const optionId of selectedOptions) {
					const voteData = {
						int_option_id: optionId,
						bln_is_abstention: false,
					};
					await PollService.vote(activePoll.id, voteData);
				}
			}

			console.log('✅ Voto registrado exitosamente');

			// Refrescar encuestas
			await refetchPolls();

			// Cerrar modal
			handleClosePollModal();

			// Mostrar mensaje de éxito
			Swal.fire({
				icon: 'success',
				title: '¡Voto Registrado!',
				text: 'Tu voto ha sido registrado exitosamente',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				backdrop: false,
			});
		} catch (error) {
			console.error('❌ Error al votar:', error);
			const errorMessage = error.response?.data?.message || 'Error al registrar el voto';

			// Cerrar el modal de votación primero
			handleClosePollModal();

			// Mostrar el error con z-index muy alto para que aparezca sobre Zoom
			Swal.fire({
				icon: 'error',
				title: 'Error al Votar',
				html: `<p style="color: #6b7280; margin: 0; font-size: 1rem;">${errorMessage}</p>`,
				confirmButtonText: 'Entendido',
				confirmButtonColor: '#9333ea',
				background: '#ffffff',
				backdrop: true,
				allowOutsideClick: true,
				allowEscapeKey: true,
				customClass: {
					container: 'swal2-zoom-override',
					popup: 'poll-error-modal',
					title: 'poll-modal-title',
					confirmButton: 'poll-confirm-button'
				},
				didOpen: (modal) => {
					// Asegurar que el modal aparezca sobre todo
					const container = modal.parentElement;
					if (container) {
						container.style.zIndex = '99999';
					}
					modal.style.borderTop = '4px solid #ef4444';
					modal.style.zIndex = '99999';
				}
			});
		} finally {
			setIsSubmittingVote(false);
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

	// Una vez que Zoom está cargado, el SDK maneja toda la UI
	// Agregamos solo un botón flotante para ver encuestas activas usando Portal

	// Log para debugging: verificar estado del botón
	console.log('🔘 [ZoomMeetingContainer] Estado del botón:', {
		showPollButton,
		activePoll: activePoll ? { id: activePoll.id, title: activePoll.str_title, status: activePoll.str_status } : null,
		isLoading,
		pollsDataExists: !!pollsData,
		totalPolls: pollsData?.data?.length || 0
	});

	return (
		<>
			{/* Botón flotante CENTRADO y MÁS GRANDE - renderizado directamente en body usando Portal */}
			{showPollButton && ReactDOM.createPortal(
				<button
					onClick={handleViewPoll}
					className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group"
					style={{ zIndex: 10001 }}
					title="Ver encuesta activa"
				>
					{/* Efecto de resplandor animado - MÁS INTENSO */}
					<div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 rounded-3xl blur-2xl opacity-75 animate-pulse"></div>

					{/* Contenedor del botón - MÁS GRANDE */}
					<div className="relative bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 text-white px-10 py-6 rounded-3xl shadow-2xl hover:shadow-green-500/50 transition-all duration-300 flex items-center gap-5 hover:scale-110 hover:-translate-y-1">
						{/* Icono de encuesta - MÁS GRANDE */}
						<div className="relative">
							<svg
								className="w-16 h-16 animate-bounce"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
								/>
							</svg>
							{/* Badge con número - MÁS GRANDE */}
							<div className="absolute -top-4 -right-4 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-lg font-bold animate-pulse shadow-lg">
								!
							</div>
						</div>

						{/* Texto - MÁS GRANDE */}
						<div className="flex flex-col items-start">
							<span className="font-bold text-2xl leading-tight flex items-center gap-2"><BarChart3 size={24} /> Encuesta Activa</span>
							<span className="text-base text-green-100 leading-tight">Haz clic para votar ahora</span>
						</div>

						{/* Indicador pulsante - MÁS GRANDE */}
						<div className="relative ml-3">
							<div className="w-7 h-7 bg-white rounded-full animate-ping absolute"></div>
							<div className="w-7 h-7 bg-white rounded-full"></div>
						</div>
					</div>
				</button>,
				document.body
			)}

			{/* Modal de encuesta activa renderizado en body usando Portal */}
			{showPollModal && ReactDOM.createPortal(
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.75)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '16px',
						zIndex: 10002
					}}
					onClick={handleClosePollModal}
				>
					<div
						style={{
							backgroundColor: '#ffffff',
							borderRadius: '16px',
							boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
							maxWidth: '672px',
							width: '100%',
							maxHeight: '90vh',
							overflowY: 'auto'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header del modal */}
						<div style={{
							background: 'linear-gradient(to right, #9333ea, #7e22ce)',
							padding: '16px 24px',
							borderTopLeftRadius: '16px',
							borderTopRightRadius: '16px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between'
						}}>
							<h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
								Encuesta Activa
							</h2>
							<button
								onClick={handleClosePollModal}
								style={{
									color: '#ffffff',
									background: 'transparent',
									border: 'none',
									borderRadius: '8px',
									padding: '8px',
									cursor: 'pointer',
									transition: 'all 0.2s'
								}}
								onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
								onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
							>
								<X size={24} />
							</button>
						</div>

						{/* Contenido del modal */}
						<div style={{ padding: '24px' }}>
							{isLoadingPolls ? (
								<div style={{ textAlign: 'center', padding: '48px 0' }}>
									<Loader2 style={{ width: '48px', height: '48px', color: '#9333ea', margin: '0 auto 16px' }} className="animate-spin" />
									<p style={{ color: '#4b5563', margin: 0 }}>Cargando encuesta...</p>
								</div>
							) : activePoll ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
									{/* Título y descripción */}
									<div>
										<h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px', marginTop: 0 }}>
											{activePoll.str_title}
										</h3>
										{activePoll.str_description && (
											<p style={{ color: '#4b5563', margin: 0 }}>
												{activePoll.str_description}
											</p>
										)}
									</div>

									{/* Tipo de encuesta y configuración */}
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
										<span style={{
											padding: '4px 12px',
											backgroundColor: '#f3e8ff',
											color: '#7e22ce',
											borderRadius: '9999px',
											fontSize: '14px',
											fontWeight: '500'
										}}>
											{activePoll.str_poll_type === 'single' ? 'Opción única' :
												activePoll.str_poll_type === 'multiple' ? 'Múltiple opción' :
													activePoll.str_poll_type === 'text' ? 'Texto libre' : 'Numérica'}
										</span>
										{activePoll.bln_is_anonymous && (
											<span style={{
												padding: '4px 12px',
												backgroundColor: '#dbeafe',
												color: '#1e40af',
												borderRadius: '9999px',
												fontSize: '14px',
												fontWeight: '500'
											}}>
												Anónima
											</span>
										)}
										{activePoll.bln_allows_abstention && (
											<span style={{
												padding: '4px 12px',
												backgroundColor: '#f3f4f6',
												color: '#374151',
												borderRadius: '9999px',
												fontSize: '14px',
												fontWeight: '500'
											}}>
												Permite abstención
											</span>
										)}
									</div>

									{/* Opciones de votación */}
									{activePoll.str_poll_type === 'single' || activePoll.str_poll_type === 'multiple' ? (
										<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
											<p style={{ fontWeight: '600', color: '#374151', margin: 0 }}>
												{activePoll.str_poll_type === 'single'
													? 'Selecciona una opción:'
													: `Selecciona hasta ${activePoll.int_max_selections || 'todas las'} opciones:`}
											</p>
											{console.log('🎯 [ZoomMeetingContainer] Renderizando opciones:', {
												options: activePoll.options,
												isArray: Array.isArray(activePoll.options),
												length: activePoll.options?.length,
												selectedOptions,
												pollType: activePoll.str_poll_type
											})}
											{activePoll.options?.map((option) => {
												console.log('🔘 [ZoomMeetingContainer] Opción individual:', option);
												const isSelected = selectedOptions.includes(option.id);
												return (
													<button
														key={option.id}
														onClick={() => handleOptionToggle(option.id)}
														style={{
															width: '100%',
															textAlign: 'left',
															padding: '16px',
															borderRadius: '12px',
															border: `2px solid ${isSelected ? '#9333ea' : '#e5e7eb'}`,
															backgroundColor: isSelected ? '#f3e8ff' : '#ffffff',
															transition: 'all 0.2s',
															cursor: 'pointer',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'space-between'
														}}
														onMouseEnter={(e) => {
															if (!isSelected) {
																e.currentTarget.style.borderColor = '#c084fc';
																e.currentTarget.style.backgroundColor = '#f9fafb';
															}
														}}
														onMouseLeave={(e) => {
															if (!isSelected) {
																e.currentTarget.style.borderColor = '#e5e7eb';
																e.currentTarget.style.backgroundColor = '#ffffff';
															}
														}}
													>
														<span style={{ fontWeight: '500', color: '#1f2937' }}>
															{option.str_option_text}
														</span>
														{isSelected && (
															<CheckCircle style={{ color: '#9333ea' }} size={24} />
														)}
													</button>
												);
											})}
											{activePoll.str_poll_type === 'multiple' && selectedOptions.length > 0 && (
												<p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0', textAlign: 'center' }}>
													{selectedOptions.length} de {activePoll.int_max_selections || activePoll.options?.length} seleccionada(s)
												</p>
											)}
										</div>
									) : (
										<div style={{ textAlign: 'center', padding: '32px 0' }}>
											<p style={{ color: '#4b5563', marginBottom: '16px' }}>
												Este tipo de encuesta ({activePoll.str_poll_type}) aún no está disponible para votación desde la reunión.
											</p>
										</div>
									)}

									{/* Botones de acción */}
									<div style={{
										display: 'flex',
										gap: '12px',
										paddingTop: '16px',
										borderTop: '1px solid #e5e7eb'
									}}>
										<button
											onClick={handleClosePollModal}
											style={{
												flex: 1,
												padding: '12px 24px',
												backgroundColor: '#e5e7eb',
												color: '#374151',
												borderRadius: '12px',
												border: 'none',
												fontWeight: '600',
												cursor: 'pointer',
												transition: 'all 0.2s'
											}}
											onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
											onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
										>
											Cancelar
										</button>
										<button
											onClick={handleVote}
											disabled={selectedOptions.length === 0 || isSubmittingVote}
											style={{
												flex: 1,
												padding: '12px 24px',
												background: selectedOptions.length > 0 && !isSubmittingVote
													? 'linear-gradient(to right, #9333ea, #7e22ce)'
													: '#d1d5db',
												color: selectedOptions.length > 0 && !isSubmittingVote ? '#ffffff' : '#6b7280',
												borderRadius: '12px',
												border: 'none',
												fontWeight: '600',
												cursor: selectedOptions.length > 0 && !isSubmittingVote ? 'pointer' : 'not-allowed',
												transition: 'all 0.2s',
												boxShadow: selectedOptions.length > 0 && !isSubmittingVote ? '0 10px 15px -3px rgba(147, 51, 234, 0.3)' : 'none',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												gap: '8px'
											}}
											onMouseEnter={(e) => {
												if (selectedOptions.length > 0 && !isSubmittingVote) {
													e.currentTarget.style.background = 'linear-gradient(to right, #7e22ce, #6b21a8)';
												}
											}}
											onMouseLeave={(e) => {
												if (selectedOptions.length > 0 && !isSubmittingVote) {
													e.currentTarget.style.background = 'linear-gradient(to right, #9333ea, #7e22ce)';
												}
											}}
										>
											{isSubmittingVote ? (
												<>
													<Loader2 className="animate-spin" size={20} />
													<span>Votando...</span>
												</>
											) : (
												`Votar${selectedOptions.length > 1 ? ` (${selectedOptions.length})` : ''}`
											)}
										</button>
									</div>
								</div>
							) : (
								<div className="text-center py-12">
									<div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
										<svg
											className="w-12 h-12 text-gray-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
											/>
										</svg>
									</div>
									<h3 className="text-lg font-bold text-gray-800 mb-2">
										No hay encuestas activas
									</h3>
									<p className="text-gray-600 mb-6">
										No hay encuestas activas en este momento. El administrador puede crear encuestas desde la pestaña "Encuestas" del dashboard.
									</p>
									<button
										onClick={handleClosePollModal}
										className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
									>
										Cerrar
									</button>
								</div>
							)}
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Nota: El botón de salir de Zoom es nativo del SDK */}
			{/* Cuando el usuario lo presiona, se dispara el evento onMeetingStatus */}
			{/* y registramos la hora de finalización automáticamente */}
		</>
	);
};

export default ZoomMeetingContainer;
