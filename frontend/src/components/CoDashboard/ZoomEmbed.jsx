// ZoomEmbed.jsx - VERSIÓN CON BURBUJA INFORMATIVA
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Loader2, CheckCircle, UserCircle, Building2, Hash, AlertTriangle, Eye, BarChart3, LogOut, RefreshCw, EyeOff, Hand } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../services/api/axiosconfig';
import { PollService } from '../../services/api/PollService';
import { UserService } from '../../services/api/UserService';
import { useMeetingPollsSSE } from '../../hooks/useMeetingPollsSSE';
import { AuthService } from '../../services/api/AuthService';
import '../../styles/swal-custom.css';

/**
 * Componente de Zoom usando SDK Web (pantalla completa) para Copropietarios
 * Permite unirse a reuniones como participante (role: 0) CON funcionalidad de votación
 * Incluye burbuja informativa superior con datos del usuario
*/
const ZoomEmbed = ({
	meetingData,
	onClose,
	startFullscreen = false
}) => {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState('Iniciando reunión...');
	const [error, setError] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(startFullscreen);
	const [showPollButton, setShowPollButton] = useState(false);
	const [showPollModal, setShowPollModal] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState([]);
	const [textResponse, setTextResponse] = useState('');
	const [numericResponse, setNumericResponse] = useState('');
	const [isSubmittingVote, setIsSubmittingVote] = useState(false);
	const [currentTime, setCurrentTime] = useState(new Date());

	// ✅ Hook para invalidar queries
	const queryClient = useQueryClient();

	// ✅ OBTENER ROL DEL USUARIO
	const { data: userData } = useQuery({
		queryKey: ['user'],
		queryFn: () => {
			const user = localStorage.getItem('user');
			return user ? JSON.parse(user) : null;
		},
		staleTime: Infinity,
	});
	
	const userRole = userData?.role || "Usuario";
	const isGuest = userRole === "Invitado";

	// ✅ OBTENER DATOS COMPLETOS DEL USUARIO (nombre, unidad, coeficiente)
	const { data: userCompleteData } = useQuery({
		queryKey: ['copropietario-data'],
		queryFn: async () => {
			const response = await UserService.getCurrentUserData();
			return response.data;
		},
		retry: 1,
		refetchOnWindowFocus: false
	});

	// Extraer información del usuario
	const userName = userCompleteData?.firstname && userCompleteData?.lastname
		? `${userCompleteData.firstname} ${userCompleteData.lastname}`.trim()
		: userData?.name || 'Usuario';
	const unitName = userCompleteData?.residential_unit?.str_name || 'Cargando...';
	const userCoefficient = userCompleteData?.coefficient;

	// Obtener encuestas activas de la reunión
	const { data: pollsData, isLoading: isLoadingPolls, refetch: refetchPolls } = useQuery({
		queryKey: ['meeting-polls', meetingData?.id],
		queryFn: async () => {
			if (!meetingData?.id) return { data: [] };
			console.log('🔍 [ZoomEmbed] Obteniendo encuestas para reunión:', meetingData.id);
			const result = await PollService.getPollsByMeeting(meetingData.id);
			console.log('📊 [ZoomEmbed] Encuestas obtenidas:', result);
			return result;
		},
		enabled: !!meetingData?.id && !isGuest,
		refetchInterval: false,
	});

	useMeetingPollsSSE({
		meetingId: meetingData?.id,
		enabled: !!meetingData?.id && !isGuest,
		onEvent: () => refetchPolls(),
	});

	// Obtener la encuesta activa
	const activePoll = !isGuest ? pollsData?.data?.find(poll => {
		const isActive = poll.str_status === 'active';
		const hasNotVoted = !poll.has_voted; // ✅ Verificar que NO haya votado
		console.log('🔍 [ZoomEmbed] Evaluando encuesta:', {
			id: poll.id,
			title: poll.str_title,
			status: poll.str_status,
			has_voted: poll.has_voted,
			isActive,
			hasNotVoted
		});
		return isActive && hasNotVoted; // ✅ Solo mostrar si está activa Y no ha votado
	}) : null;

	// Reloj interno para el countdown
	useEffect(() => {
		const t = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	// Programar cierre del modal y refetch exactamente cuando venza la encuesta activa
	useEffect(() => {
		if (!activePoll?.dat_ended_at) return;
		const msLeft = new Date(activePoll.dat_ended_at).getTime() - Date.now();
		if (msLeft <= 0) {
			if (showPollModal) setShowPollModal(false);
			refetchPolls();
			return;
		}
		const timer = setTimeout(() => {
			if (showPollModal) setShowPollModal(false);
			refetchPolls();
		}, msLeft + 300);
		return () => clearTimeout(timer);
	}, [activePoll?.dat_ended_at]);

	// Mostrar botón cuando hay encuesta activa
	useEffect(() => {
		if (isGuest) {
			setShowPollButton(false);
			console.log('🚫 [ZoomEmbed] Usuario invitado: Botón de encuestas deshabilitado');
			return;
		}
		setShowPollButton(!!activePoll);
	}, [activePoll, pollsData, isGuest]);

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

	const extractMeetingNumber = (url) => {
		if (!url) return '';
		if (/^\d+$/.test(url)) return url;
		const match = url.match(/\/j\/(\d+)/);
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
					zoom_account_id: meetingData?.int_zoom_account_id || null,
				}
			);

			if (response.data.success) {
				// Devolver signature Y sdk_key del mismo endpoint para garantizar que coincidan
				return {
					signature: response.data.data.signature,
					sdkKey: response.data.data.sdk_key,
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
		console.log('🔄 Cerrando componente de Zoom y volviendo al dashboard');
		onClose();
	};

	const getPollTimeRemaining = (poll) => {
		if (!poll?.dat_ended_at) return null;
		const end = new Date(poll.dat_ended_at);
		const diff = end - currentTime;
		if (diff <= 0) return { expired: true, total: 0, left: 0, minutes: 0, seconds: 0 };
		const start = poll.dat_started_at ? new Date(poll.dat_started_at) : null;
		const total = start ? end - start : diff;
		return {
			expired: false,
			total,
			left: diff,
			minutes: Math.floor(diff / 60000),
			seconds: Math.floor((diff % 60000) / 1000),
		};
	};

	const handleViewPoll = () => {
		if (isGuest) {
			console.log('🚫 [ZoomEmbed] Invitado intentó abrir encuesta - Acción bloqueada');
			return;
		}
		console.log('📊 Abriendo modal de encuesta activa');
		setSelectedOptions([]);
		setTextResponse('');
		setNumericResponse('');
		setShowPollModal(true);
	};

	const handleClosePollModal = () => {
		console.log('📊 Cerrando modal de encuesta');
		setShowPollModal(false);
		setSelectedOptions([]);
		setTextResponse('');
		setNumericResponse('');
	};

	const handleManualRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refetchPolls();
		} finally {
			setTimeout(() => setIsRefreshing(false), 600);
		}
	};

	const handleLogout = () => {
		Swal.fire({
			title: '¿Cerrar Sesión?',
			text: 'Saldrás de la reunión y del aplicativo.',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#dc2626',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, salir',
			cancelButtonText: 'Cancelar',
			reverseButtons: true,
			customClass: {
				popup: 'swal-wide',
				title: 'swal-title',
				confirmButton: 'swal-confirm-btn'
			}
		}).then((result) => {
			if (result.isConfirmed) {
				AuthService.logout();
				queryClient.clear();
				navigate('/login');
			}
		});
	};

	const handleOptionToggle = (optionId) => {
		if (isGuest) {
			console.log('🚫 [ZoomEmbed] Invitado intentó votar - Acción bloqueada');
			return;
		}

		setSelectedOptions((prev) => {
			if (activePoll?.str_poll_type !== 'multiple') {
				return prev.includes(optionId) ? [] : [optionId];
			}
			if (prev.includes(optionId)) {
				return prev.filter(id => id !== optionId);
			}
			const maxSelections = activePoll?.int_max_selections || activePoll?.options?.length || 999;
			if (prev.length >= maxSelections) return prev;
			return [...prev, optionId];
		});
	};

	const handleSubmitVote = async () => {
		if (isGuest) {
			console.log('🚫 [ZoomEmbed] Invitado intentó enviar voto - Acción bloqueada');
			Swal.fire({
				title: 'Acceso Restringido',
				text: 'Los invitados no pueden participar en votaciones',
				icon: 'warning',
				confirmButtonText: 'Entendido',
				customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' }
			});
			return;
		}

		const pollType = activePoll.str_poll_type;

		if (pollType === 'text' && !textResponse.trim()) {
			Swal.fire({
				title: 'Respuesta requerida',
				text: 'Debes ingresar una respuesta de texto',
				icon: 'warning',
				confirmButtonText: 'Entendido',
				customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' }
			});
			return;
		}

		if (pollType === 'numeric' && (numericResponse === '' || isNaN(numericResponse))) {
			Swal.fire({
				title: 'Respuesta requerida',
				text: 'Debes ingresar un valor numérico',
				icon: 'warning',
				confirmButtonText: 'Entendido',
				customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' }
			});
			return;
		}

		if ((pollType === 'single' || pollType === 'multiple') && selectedOptions.length === 0) {
			Swal.fire({
				title: 'Selecciona una opción',
				text: 'Debes seleccionar al menos una opción antes de votar',
				icon: 'warning',
				confirmButtonText: 'Entendido',
				customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' }
			});
			return;
		}

		setIsSubmittingVote(true);

		try {
			if (pollType === 'text') {
				await PollService.vote(activePoll.id, { str_response_text: textResponse.trim(), bln_is_abstention: false });
			} else if (pollType === 'numeric') {
				await PollService.vote(activePoll.id, { dec_response_number: parseFloat(numericResponse), bln_is_abstention: false });
			} else if (pollType === 'single') {
				await PollService.vote(activePoll.id, { int_option_id: selectedOptions[0], bln_is_abstention: false });
			} else {
				for (const optionId of selectedOptions) {
					await PollService.vote(activePoll.id, { int_option_id: optionId, bln_is_abstention: false });
				}
			}

			await Promise.all([
				refetchPolls(),
				queryClient.invalidateQueries({ queryKey: ['all-polls'] }),
				queryClient.invalidateQueries({ queryKey: ['meeting-polls'] })
			]);

			await Swal.fire({
				title: '¡Respuesta Registrada!',
				html: `
					<div class="text-center">
						<p class="text-lg mb-4">Tu respuesta ha sido registrada exitosamente</p>
						<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
							<p class="text-sm text-blue-800 font-semibold">${activePoll.str_title}</p>
						</div>
					</div>
				`,
				icon: 'success',
				confirmButtonText: 'Cerrar',
				customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' }
			});

			handleClosePollModal();
		} catch (error) {
			console.error('❌ Error al enviar voto:', error);
			Swal.fire({
				title: 'Error al Votar',
				text: error.response?.data?.message || 'No se pudo registrar el voto',
				icon: 'error',
				confirmButtonText: 'Entendido',
				customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' }
			});
		} finally {
			setIsSubmittingVote(false);
		}
	};

	const initializeZoom = async (ZoomMtg) => {
		try {
			setIsLoading(true);
			setLoadingMessage('Preparando reunión...');

			const meetingNumber = extractMeetingNumber(
				meetingData.str_zoom_join_url || meetingData.int_zoom_meeting_id
			);

			const password =
				meetingData.str_zoom_password ||
				extractPassword(meetingData.str_zoom_join_url);

			if (!meetingNumber) {
				throw new Error('No se pudo extraer el número de reunión');
			}

			console.log('🔵 Generando firma y obteniendo credenciales...');
			setLoadingMessage('Autenticando...');

			const { signature, sdkKey } = await generateSignature(meetingNumber);

			console.log('🔵 Iniciando Zoom SDK Web...');
			setLoadingMessage('Cargando sala de reunión...');

			const displayName = isGuest ? `${userName} (Invitado)` : userName;

			const userEmail = localStorage.getItem('user')
				? JSON.parse(localStorage.getItem('user')).email || ''
				: '';

			ZoomMtg.i18n.load('es-ES');
			ZoomMtg.i18n.reload('es-ES');

			await ZoomMtg.init({
				leaveUrl: window.location.href,
				disablePreview: false,
				disableInvite: true,
				disableCallOut: true,
				disableRecord: true,
				disableJoinAudio: false,
				audioPanelAlwaysOpen: true,
				showMeetingHeader: true,
				disableVoIP: false,
				meetingInfo: [
					'topic',
					'host',
					'mn',
					'pwd',
					'telPwd',
					'invite',
					'participant',
					'dc'
				],
				success: (success) => {
					console.log('✅ Zoom SDK inicializado correctamente');

					ZoomMtg.join({
						signature: signature,
						sdkKey: sdkKey,
						meetingNumber: meetingNumber,
						userName: displayName,
						userEmail: userEmail,
						passWord: password,
						tk: '',
						success: (joinSuccess) => {
							console.log('✅ Unido a la reunión exitosamente:', joinSuccess);
							
							setTimeout(() => {
								console.log('✅ Quitando pantalla de carga después de 3 segundos');
								setIsLoading(false);
							}, 3000);
						},
						error: (joinError) => {
							console.error('❌ Error al unirse:', joinError);
							setError('No se pudo unir a la reunión: ' + JSON.stringify(joinError));
							setIsLoading(false);
						},
					});
				},
				error: (initError) => {
					console.error('❌ Error al inicializar:', initError);
					setError('Error al inicializar Zoom: ' + JSON.stringify(initError));
					setIsLoading(false);
				},
			});

			ZoomMtg.inMeetingServiceListener('onMeetingStatus', (data) => {
				console.log('📊 Estado de la reunión:', data);

				if (data.meetingStatus === 3) {
					console.log('👋 Reunión finalizada');
					handleMeetingEnd();
				}
			});

		} catch (err) {
			console.error('❌ Error en initializeZoom:', err);
			setError(err.message || 'Error al inicializar la reunión');
			setIsLoading(false);
		}
	};

	// ===== RENDER =====
	return (
		<div className="relative w-full h-screen">
			{/* Estilos para animaciones */}
			<style>
				{`
					@keyframes pulse {
						0%, 100% { opacity: 1; }
						50% { opacity: 0.5; }
					}
					
					@keyframes bounce {
						0%, 100% {
							transform: translateY(-25%);
							animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
						}
						50% {
							transform: translateY(0);
							animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
						}
					}
					
					@keyframes ping {
						75%, 100% {
							transform: scale(2);
							opacity: 0;
						}
					}

					@keyframes spin {
						from { transform: rotate(0deg); }
						to { transform: rotate(360deg); }
					}
				`}
			</style>
			{/* 🆕 BURBUJA INFORMATIVA SUPERIOR */}
			{!isLoading && !error && ReactDOM.createPortal(
				<div
					style={{
						position: 'fixed',
						top: '20px',
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 9999,
						pointerEvents: 'auto'
					}}
				>
					<div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-6 border-2 border-white/20">
						{/* Avatar y Nombre */}
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-lg">
								{userName.charAt(0).toUpperCase() || 'U'}
							</div>
							<div>
								<div className="flex items-center gap-2">
									<UserCircle size={16} className="text-blue-200" />
									<span className="font-bold text-lg">{userName}</span>
								</div>
								<div className="text-xs text-blue-100 flex items-center gap-2">
									{isGuest ? <><Eye size={16} /> Invitado (Solo observador)</> : <><CheckCircle size={16} /> Copropietario</>}
								</div>
							</div>
						</div>

						{/* Separador */}
						<div className="h-12 w-px bg-white/30"></div>

						{/* Unidad Residencial */}
						<div className="flex items-center gap-2">
							<Building2 size={20} className="text-blue-200" />
							<div>
								<p className="text-xs text-blue-100">Unidad Residencial</p>
								<p className="font-bold">{unitName}</p>
							</div>
						</div>

						{/* Separador */}
						{!isGuest && userCoefficient && (
							<>
								<div className="h-12 w-px bg-white/30"></div>

								{/* Coeficiente de Quorum */}
								<div className="flex items-center gap-2">
									<Hash size={20} className="text-blue-200" />
									<div>
										<p className="text-xs text-blue-100">Mi Quorum</p>
										<p className="font-bold text-lg">{userCoefficient}%</p>
									</div>
								</div>
							</>
						)}
					</div>
				</div>,
				document.body
			)}


			{/* Pantalla de carga */}
			{isLoading && !error && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50">
					<div className="text-center space-y-6">
						<Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
						<div className="space-y-2">
							<p className="text-2xl font-semibold text-gray-800">{loadingMessage}</p>
							<p className="text-gray-500">Por favor espera un momento...</p>
						</div>
					</div>
				</div>
			)}

			{/* Pantalla de error */}
			{error && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50 p-8">
					<div className="text-center max-w-2xl space-y-4">
						<AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
						<h2 className="text-2xl font-bold text-gray-800">Error al conectar</h2>
						<p className="text-gray-600">{error}</p>
						<button
							onClick={onClose}
							className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							Volver al Dashboard
						</button>
					</div>
				</div>
			)}

			{/* Botón de encuesta activa - CENTRADO CON COLORES DEL ADMIN */}
			{!isLoading && !error && showPollButton && !isGuest && activePoll && ReactDOM.createPortal(
				<div
					style={{
						position: 'fixed',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						zIndex: 9999,
						pointerEvents: 'auto'
					}}
				>
					<button
						onClick={handleViewPoll}
						style={{
							position: 'relative',
							background: 'transparent',
							border: 'none',
							cursor: 'pointer',
							padding: 0
						}}
					>
						{/* Efecto de resplandor animado */}
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: 'linear-gradient(to right, #10b981, #059669, #10b981)',
								borderRadius: '1.5rem',
								filter: 'blur(1.5rem)',
								opacity: 0.75,
								animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
							}}
						/>

						{/* Contenedor del botón */}
						<div
							style={{
								position: 'relative',
								background: 'linear-gradient(to right, #059669, #10b981, #059669)',
								color: 'white',
								padding: '1.5rem 2.5rem',
								borderRadius: '1.5rem',
								boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
								display: 'flex',
								alignItems: 'center',
								gap: '1.25rem',
								transition: 'all 0.3s'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = 'scale(1.1) translateY(-0.25rem)';
								e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(16, 185, 129, 0.5)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = 'scale(1)';
								e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
							}}
						>
							{/* Icono de encuesta */}
							<div style={{ position: 'relative' }}>
								<svg
									style={{
										width: '4rem',
										height: '4rem',
										animation: 'bounce 1s infinite'
									}}
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
								{/* Badge */}
								<div
									style={{
										position: 'absolute',
										top: '-1rem',
										right: '-1rem',
										width: '2.25rem',
										height: '2.25rem',
										background: '#ef4444',
										borderRadius: '9999px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '1.125rem',
										fontWeight: 'bold',
										animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
										boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
									}}
								>
									!
								</div>
							</div>

							{/* Texto */}
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
								<span style={{ fontWeight: 'bold', fontSize: '1.5rem', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									<BarChart3 size={24} /> Encuesta Activa
								</span>
								{(() => {
									const rem = getPollTimeRemaining(activePoll);
									if (!rem || rem.expired) return (
										<span style={{ fontSize: '1rem', color: '#d1fae5', lineHeight: 1.2 }}>Haz clic para votar ahora</span>
									);
									const timeStr = `${rem.minutes}:${String(rem.seconds).padStart(2, '0')}`;
									const isUrgent = rem.left < 30000;
									return (
										<span style={{ fontSize: '1rem', color: isUrgent ? '#fca5a5' : '#d1fae5', lineHeight: 1.2, fontFamily: 'monospace', fontWeight: isUrgent ? 'bold' : 'normal' }}>
											⏱ {timeStr} restantes
										</span>
									);
								})()}
							</div>

							{/* Indicador pulsante */}
							<div style={{ position: 'relative', marginLeft: '0.75rem' }}>
								<div
									style={{
										width: '1.75rem',
										height: '1.75rem',
										background: 'white',
										borderRadius: '9999px',
										position: 'absolute',
										animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
									}}
								/>
								<div
									style={{
										width: '1.75rem',
										height: '1.75rem',
										background: 'white',
										borderRadius: '9999px'
									}}
								/>
							</div>
						</div>
					</button>
				</div>,
				document.body
			)}

			{/* Modal de encuesta */}
			{!isGuest && showPollModal && activePoll && ReactDOM.createPortal(
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
						zIndex: 10000,
						padding: '20px'
					}}
					onClick={handleClosePollModal}
				>
					<div
						style={{
							backgroundColor: 'white',
							borderRadius: '16px',
							padding: '32px',
							maxWidth: '600px',
							width: '100%',
							maxHeight: '80vh',
							overflow: 'auto',
							position: 'relative'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={handleClosePollModal}
							style={{
								position: 'absolute',
								top: '16px',
								right: '16px',
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: '8px'
							}}
						>
							<X size={24} className="text-gray-500 hover:text-gray-700" />
						</button>

						<div style={{ marginBottom: '24px' }}>
							<h2 style={{
								fontSize: '1.5rem',
								fontWeight: 'bold',
								color: '#1f2937',
								marginBottom: '8px'
							}}>
								{activePoll.str_title}
							</h2>
							{activePoll.str_description && (
								<p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
									{activePoll.str_description}
								</p>
							)}
							{activePoll.bln_is_anonymous && (
								<div style={{
									display: 'flex', alignItems: 'center', gap: '8px',
									marginTop: '12px', padding: '10px 14px',
									background: '#f8fafc', border: '1px solid #cbd5e1',
									borderRadius: '10px'
								}}>
									<EyeOff size={15} style={{ color: '#64748b', flexShrink: 0 }} />
									<p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
										<strong>Voto anónimo:</strong> tu identidad no será revelada al registrar tu respuesta.
									</p>
								</div>
							)}
						</div>

						{activePoll.dat_ended_at && (() => {
							const rem = getPollTimeRemaining(activePoll);
							if (!rem || rem.expired) return null;
							const pct = Math.max(0, Math.min(100, (rem.left / rem.total) * 100));
							const isUrgent = rem.left < 30000;
							const timeStr = `${rem.minutes}:${String(rem.seconds).padStart(2, '0')}`;
							return (
								<div style={{ marginBottom: '20px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
										<span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
											⏱ Tiempo restante
										</span>
										<span style={{
											fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.25rem',
											color: isUrgent ? '#ef4444' : '#1e293b',
											animation: isUrgent ? 'pulse 1s infinite' : 'none',
										}}>
											{timeStr}
										</span>
									</div>
									<div style={{ width: '100%', background: '#e2e8f0', borderRadius: '999px', height: '8px' }}>
										<div style={{
											height: '8px', borderRadius: '999px',
											width: `${pct}%`,
											background: isUrgent ? '#ef4444' : pct > 50 ? '#22c55e' : '#eab308',
											transition: 'width 1s linear',
										}} />
									</div>
								</div>
							);
						})()}

						<div style={{ marginBottom: '24px' }}>
							{activePoll.str_poll_type === 'text' && (
								<textarea
									value={textResponse}
									onChange={(e) => setTextResponse(e.target.value)}
									placeholder="Escribe tu respuesta..."
									rows={4}
									style={{
										width: '100%',
										padding: '12px 16px',
										border: '2px solid #e5e7eb',
										borderRadius: '12px',
										fontSize: '1rem',
										outline: 'none',
										resize: 'none',
										fontFamily: 'inherit',
										boxSizing: 'border-box'
									}}
									onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
									onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
								/>
							)}

							{activePoll.str_poll_type === 'numeric' && (
								<input
									type="number"
									value={numericResponse}
									onChange={(e) => setNumericResponse(e.target.value)}
									placeholder="Ingresa un número"
									style={{
										width: '100%',
										padding: '12px 16px',
										border: '2px solid #e5e7eb',
										borderRadius: '12px',
										fontSize: '1rem',
										outline: 'none',
										boxSizing: 'border-box'
									}}
									onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
									onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
								/>
							)}

							{activePoll.str_poll_type === 'multiple' && activePoll.int_max_selections && (
								<p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>
									Selecciona hasta <strong>{activePoll.int_max_selections}</strong> opción{activePoll.int_max_selections !== 1 ? 'es' : ''} · {selectedOptions.length} de {activePoll.int_max_selections} seleccionada{selectedOptions.length !== 1 ? 's' : ''}
								</p>
							)}
							{(activePoll.str_poll_type === 'single' || activePoll.str_poll_type === 'multiple') && activePoll.options?.map((option) => {
								const atLimit = activePoll.str_poll_type === 'multiple'
									&& activePoll.int_max_selections
									&& selectedOptions.length >= activePoll.int_max_selections
									&& !selectedOptions.includes(option.id);
								return (
								<div
									key={option.id}
									onClick={() => !atLimit && handleOptionToggle(option.id)}
									style={{
										padding: '16px',
										marginBottom: '12px',
										border: selectedOptions.includes(option.id)
											? '3px solid #3b82f6'
											: '2px solid #e5e7eb',
										borderRadius: '12px',
										cursor: atLimit ? 'not-allowed' : 'pointer',
										backgroundColor: selectedOptions.includes(option.id) ? '#eff6ff' : atLimit ? '#f9fafb' : 'white',
										opacity: atLimit ? 0.5 : 1,
										transition: 'all 0.2s'
									}}
								>
									<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
										<div style={{
											width: '24px',
											height: '24px',
											borderRadius: activePoll.str_poll_type === 'multiple' ? '4px' : '50%',
											border: selectedOptions.includes(option.id) ? '2px solid #3b82f6' : '2px solid #d1d5db',
											backgroundColor: selectedOptions.includes(option.id) ? '#3b82f6' : 'white',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0
										}}>
											{selectedOptions.includes(option.id) && (
												<CheckCircle size={16} className="text-white" />
											)}
										</div>
										<span style={{
											fontSize: '1rem',
											color: '#374151',
											fontWeight: selectedOptions.includes(option.id) ? '600' : '400'
										}}>
											{option.str_option_text}
										</span>
									</div>
								</div>
								);
							})}
						</div>

						{(() => {
							const pollType = activePoll.str_poll_type;
							const isDisabled = isSubmittingVote ||
								(pollType === 'text' && !textResponse.trim()) ||
								(pollType === 'numeric' && (numericResponse === '' || isNaN(numericResponse))) ||
								((pollType === 'single' || pollType === 'multiple') && selectedOptions.length === 0);
							return (
								<div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
									{activePoll.bln_allows_abstention && (
										<button
											onClick={async () => {
												setIsSubmittingVote(true);
												try {
													await PollService.vote(activePoll.id, { bln_is_abstention: true });
													await Promise.all([
														refetchPolls(),
														queryClient.invalidateQueries({ queryKey: ['all-polls'] }),
														queryClient.invalidateQueries({ queryKey: ['meeting-polls'] }),
													]);
													await Swal.fire({
														title: 'Abstención registrada',
														text: 'Tu abstención ha sido registrada exitosamente',
														icon: 'success',
														confirmButtonText: 'Cerrar',
														customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' },
													});
													handleClosePollModal();
												} catch (error) {
													Swal.fire({ title: 'Error', text: error.response?.data?.message || 'No se pudo registrar la abstención', icon: 'error', confirmButtonText: 'Entendido', customClass: { popup: 'swal-wide', title: 'swal-title', confirmButton: 'swal-confirm-btn' } });
												} finally {
													setIsSubmittingVote(false);
												}
											}}
											disabled={isSubmittingVote}
											style={{
												display: 'flex', alignItems: 'center', gap: '8px',
												padding: '12px 20px', borderRadius: '8px',
												border: '2px solid #fcd34d', background: '#fffbeb',
												color: '#92400e', fontSize: '0.95rem', fontWeight: '600',
												cursor: isSubmittingVote ? 'not-allowed' : 'pointer',
												opacity: isSubmittingVote ? 0.5 : 1,
											}}
										>
											<Hand size={18} />
											Abstenerme
										</button>
									)}
									<div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
									<button
										onClick={handleClosePollModal}
										style={{
											padding: '12px 24px',
											borderRadius: '8px',
											border: '1px solid #d1d5db',
											backgroundColor: 'white',
											color: '#374151',
											fontSize: '1rem',
											fontWeight: '500',
											cursor: 'pointer'
										}}
									>
										Cancelar
									</button>
									<button
										onClick={handleSubmitVote}
										disabled={isDisabled}
										style={{
											padding: '12px 32px',
											borderRadius: '8px',
											border: 'none',
											background: isDisabled ? '#e5e7eb' : 'linear-gradient(to right, #3b82f6, #2563eb)',
											color: 'white',
											fontSize: '1rem',
											fontWeight: '600',
											cursor: isDisabled ? 'not-allowed' : 'pointer',
											display: 'flex',
											alignItems: 'center',
											gap: '8px'
										}}
									>
										{isSubmittingVote ? (
											<><Loader2 size={20} className="animate-spin" /><span>Enviando...</span></>
										) : (
											<><CheckCircle size={20} /><span>{pollType === 'single' || pollType === 'multiple' ? 'Confirmar Voto' : 'Enviar Respuesta'}</span></>
										)}
									</button>
									</div>
								</div>
							);
						})()}
					</div>
				</div>,
				document.body
			)}
		</div>
	);
};

export default ZoomEmbed;