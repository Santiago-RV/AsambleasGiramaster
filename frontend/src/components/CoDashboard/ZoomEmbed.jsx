// ZoomEmbed.jsx - VERSIÓN CORREGIDA COMPLETA
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ZoomMtg } from '@zoom/meetingsdk';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import axiosInstance from '../../services/api/axiosconfig';
import { PollService } from '../../services/api/PollService';
import { MeetingService } from '../../services/api/MeetingService';
import '../../styles/swal-custom.css';

/**
 * Componente de Zoom usando SDK Web (pantalla completa) para Copropietarios
 * Permite unirse a reuniones como participante (role: 0) CON funcionalidad de votación
*/
const ZoomEmbed = ({
	meetingData,
	onClose,
	startFullscreen = false
}) => {
	const [isLoading, setIsLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState('Iniciando reunión...');
	const [error, setError] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(startFullscreen);
	const [showPollButton, setShowPollButton] = useState(false);
	const [showPollModal, setShowPollModal] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState([]);
	const [isSubmittingVote, setIsSubmittingVote] = useState(false);

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
		refetchInterval: isGuest ? false : 5000,
	});

	// Obtener la encuesta activa
	const activePoll = !isGuest ? pollsData?.data?.find(poll => {
		const isActive = poll.str_status === 'Activa' || poll.str_status === 'active';
		return isActive;
	}) : null;

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

		ZoomMtg.preLoadWasm();
		ZoomMtg.prepareWebSDK();

		const zmmtgRoot = document.getElementById('zmmtg-root');
		if (zmmtgRoot) {
			zmmtgRoot.style.display = 'block';
		}

		const timer = setTimeout(() => {
			initializeZoom();
		}, 100);

		return () => {
			clearTimeout(timer);
			console.log('🧹 Limpiando componente de Zoom...');
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
					role: 0,
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
		console.log('🔄 Cerrando componente de Zoom y volviendo al dashboard');

		// Registrar hora de salida (si no es invitado)
		if (!isGuest && meetingData?.id) {
			try {
				console.log('📝 Registrando salida del usuario...');
				await MeetingService.registerLeave(meetingData.id);
				console.log('✅ Salida registrada');
			} catch (leaveError) {
				// No bloquear el cierre si falla
				console.error('⚠️ Error al registrar salida (no crítico):', leaveError);
			}
		}

		onClose();
	};

	const handleViewPoll = () => {
		if (isGuest) {
			console.log('🚫 [ZoomEmbed] Invitado intentó abrir encuesta - Acción bloqueada');
			return;
		}
		console.log('📊 Abriendo modal de encuesta activa');
		setSelectedOptions([]);
		setShowPollModal(true);
	};

	const handleClosePollModal = () => {
		console.log('📊 Cerrando modal de encuesta');
		setShowPollModal(false);
		setSelectedOptions([]);
	};

	const handleOptionToggle = (optionId) => {
		if (isGuest) {
			console.log('🚫 [ZoomEmbed] Invitado intentó votar - Acción bloqueada');
			return;
		}

		if (!activePoll) return;

		if (activePoll.str_poll_type === 'single') {
			setSelectedOptions([optionId]);
		} else if (activePoll.str_poll_type === 'multiple') {
			setSelectedOptions(prev => {
				if (prev.includes(optionId)) {
					return prev.filter(id => id !== optionId);
				} else {
					const maxSelections = activePoll.int_max_selections || activePoll.options?.length || 1;
					if (prev.length >= maxSelections) {
						Swal.fire({
							icon: 'warning',
							title: 'Límite alcanzado',
							text: `Solo puedes seleccionar hasta ${maxSelections} opciones`,
							confirmButtonColor: '#9333ea',
							customClass: {
								popup: 'swal-custom-zindex'
							}
						});
						return prev;
					}
					return [...prev, optionId];
				}
			});
		}
	};

	const handleSubmitVote = async () => {
		if (isGuest) {
			await Swal.fire({
				icon: 'error',
				title: 'Acción no permitida',
				text: 'Los invitados no pueden votar en las encuestas',
				confirmButtonColor: '#ef4444',
				customClass: {
					popup: 'swal-custom-zindex'
				}
			});
			return;
		}

		if (!activePoll || selectedOptions.length === 0) {
			await Swal.fire({
				icon: 'warning',
				title: 'Selección requerida',
				text: 'Por favor selecciona al menos una opción antes de votar',
				confirmButtonColor: '#9333ea',
				customClass: {
					popup: 'swal-custom-zindex'
				}
			});
			return;
		}

		if (activePoll.str_poll_type === 'multiple') {
			const maxSelections = activePoll.int_max_selections || activePoll.options?.length;
			if (selectedOptions.length > maxSelections) {
				await Swal.fire({
					icon: 'warning',
					title: 'Demasiadas opciones',
					text: `Solo puedes seleccionar hasta ${maxSelections} opciones`,
					confirmButtonColor: '#9333ea',
					customClass: {
						popup: 'swal-custom-zindex'
					}
				});
				return;
			}
		}

		setIsSubmittingVote(true);

		try {
			console.log('📝 Enviando voto:', {
				pollId: activePoll.id,
				selectedOptions,
				pollType: activePoll.str_poll_type
			});

			const response = await PollService.submitVote(activePoll.id, selectedOptions);
			console.log('✅ Voto registrado:', response);

			handleClosePollModal();

			await Swal.fire({
				icon: 'success',
				title: '¡Voto registrado!',
				text: 'Tu voto ha sido registrado correctamente',
				timer: 2000,
				showConfirmButton: false,
				customClass: {
					popup: 'swal-custom-zindex'
				},
				didOpen: () => {
					const modal = document.querySelector('.swal2-container');
					if (modal) {
						modal.style.zIndex = '99999';
					}
					const popup = document.querySelector('.swal2-popup');
					if (popup) {
						popup.style.zIndex = '99999';
						popup.style.borderTop = '4px solid #10b981';
					}
				}
			});

			refetchPolls();

		} catch (error) {
			console.error('❌ Error al enviar voto:', error);

			await Swal.fire({
				icon: 'error',
				title: 'Error al votar',
				text: error.response?.data?.message || 'Hubo un error al registrar tu voto. Intenta nuevamente.',
				confirmButtonColor: '#ef4444',
				customClass: {
					popup: 'swal-custom-zindex'
				},
				didOpen: () => {
					const modal = document.querySelector('.swal2-container');
					if (modal) {
						modal.style.zIndex = '99999';
					}
					const popup = document.querySelector('.swal2-popup');
					if (popup) {
						popup.style.zIndex = '99999';
						popup.style.borderTop = '4px solid #ef4444';
					}
				}
			});
		} finally {
			setIsSubmittingVote(false);
		}
	};

	const initializeZoom = async () => {
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

			console.log('🔵 Obteniendo configuración de Zoom...');
			setLoadingMessage('Configurando conexión...');

			const configResponse = await axiosInstance.get('/zoom/config');
			const sdkKey = configResponse.data.data.sdk_key;

			console.log('🔵 Generando firma...');
			setLoadingMessage('Autenticando...');

			const signature = await generateSignature(meetingNumber);

			console.log('🔵 Iniciando Zoom SDK Web...');
			setLoadingMessage('Cargando sala de reunión...');

			const userName = localStorage.getItem('user')
				? JSON.parse(localStorage.getItem('user')).name || 'Usuario'
				: 'Usuario';

			const userEmail = localStorage.getItem('user')
				? JSON.parse(localStorage.getItem('user')).email || ''
				: '';

			const displayName = isGuest ? `${userName} (Invitado)` : userName;

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
						success: async (joinSuccess) => {
							console.log('✅ Unido a la reunión exitosamente:', joinSuccess);

							// Registrar asistencia del usuario (si no es invitado)
							if (!isGuest && meetingData?.id) {
								try {
									console.log('📝 Registrando asistencia del usuario...');
									const attendanceResult = await MeetingService.registerAttendance(meetingData.id);
									console.log('✅ Asistencia registrada:', attendanceResult);
								} catch (attendanceError) {
									// No bloquear el flujo si falla el registro de asistencia
									console.error('⚠️ Error al registrar asistencia (no crítico):', attendanceError);
								}
							}

							// ✅ SOLUCIÓN SIMPLE: Esperar 3 segundos y quitar el loading
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

	// Error
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-900">
				<div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
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
			</div>
		);
	}

	// Loading overlay
	if (isLoading) {
		return (
			<div 
				className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900" 
				style={{ 
					position: 'fixed', 
					top: 0, 
					left: 0, 
					width: '100%', 
					height: '100%', 
					zIndex: 99999
				}}
			>
				<div className="text-center max-w-md mx-4">
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

					<Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-6" />

					<p className="text-white text-2xl font-bold mb-3 animate-pulse">
						{loadingMessage}
					</p>

					<p className="text-gray-300 text-base mb-6">
						{meetingData?.str_title || 'Cargando reunión'}
					</p>

					<div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
						<div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse rounded-full" style={{ width: '70%' }}></div>
					</div>

					<p className="text-gray-400 text-xs mt-4">
						Por favor espera mientras cargamos la sala de reunión
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			{/* ✅ BOTÓN CENTRADO EN EL MEDIO (CENTRO-CENTRO) */}
			{!isGuest && showPollButton && !isLoading && ReactDOM.createPortal(
				<button
					onClick={handleViewPoll}
					className="fixed group"
					style={{
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						zIndex: 99999
					}}
					title="Ver encuesta activa"
				>
					{/* Efecto de resplandor */}
					<div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-3xl blur-2xl opacity-75 animate-pulse"></div>

					{/* Botón principal - EXTRA GRANDE */}
					<div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white px-16 py-8 rounded-3xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center gap-5 hover:scale-105 hover:-translate-y-2">
						{/* Icono grande */}
						<div className="relative">
							<svg
								className="w-14 h-14 animate-bounce"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2.5}
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
								/>
							</svg>
							{/* Badge de alerta */}
							<div className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-base font-bold animate-pulse shadow-lg">
								!
							</div>
						</div>

						{/* Texto grande */}
						<div className="flex flex-col items-start">
							<span className="font-black text-3xl leading-tight">📊 ENCUESTA ACTIVA</span>
							<span className="text-lg text-purple-100 leading-tight mt-1 font-semibold">Click aquí para votar ahora</span>
						</div>

						{/* Indicador animado */}
						<div className="relative ml-3">
							<div className="w-6 h-6 bg-white rounded-full animate-ping absolute"></div>
							<div className="w-6 h-6 bg-white rounded-full"></div>
						</div>
					</div>
				</button>,
				document.body
			)}

			{/* Modal de encuesta */}
			{!isGuest && showPollModal && ReactDOM.createPortal(
				<div
					className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
					style={{ zIndex: 100000 }}
					onClick={handleClosePollModal}
				>
					<div
						className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-slideUp"
						style={{ zIndex: 100001 }}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-3xl flex items-center justify-between shadow-lg z-10">
							<div className="flex items-center gap-3">
								<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
									<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
								</div>
								<h2 className="text-2xl font-bold">Encuesta Activa</h2>
							</div>
							<button
								onClick={handleClosePollModal}
								className="p-2 hover:bg-white/20 rounded-xl transition-colors"
							>
								<X size={24} />
							</button>
						</div>

						{/* Contenido */}
						<div className="p-8">
							{activePoll && (activePoll.str_poll_type === 'single' || activePoll.str_poll_type === 'multiple') ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
									<div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '2px solid #f3f4f6' }}>
										<h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
											{activePoll.str_title}
										</h3>
										{activePoll.str_description && (
											<p style={{ fontSize: '0.95rem', color: '#6b7280', lineHeight: '1.5' }}>
												{activePoll.str_description}
											</p>
										)}
									</div>

									<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
										<p style={{ fontWeight: '600', color: '#374151', margin: 0 }}>
											{activePoll.str_poll_type === 'single'
												? 'Selecciona una opción:'
												: `Selecciona hasta ${activePoll.int_max_selections || 'todas las'} opciones:`}
										</p>
										{activePoll.options?.map((option) => {
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

									<div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '2px solid #f3f4f6' }}>
										<button
											onClick={handleClosePollModal}
											style={{
												flex: '1',
												padding: '14px 24px',
												borderRadius: '12px',
												border: '2px solid #e5e7eb',
												backgroundColor: '#ffffff',
												color: '#4b5563',
												fontWeight: '600',
												cursor: 'pointer',
												transition: 'all 0.2s'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.backgroundColor = '#f9fafb';
												e.currentTarget.style.borderColor = '#d1d5db';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.backgroundColor = '#ffffff';
												e.currentTarget.style.borderColor = '#e5e7eb';
											}}
										>
											Cancelar
										</button>
										<button
											onClick={handleSubmitVote}
											disabled={selectedOptions.length === 0 || isSubmittingVote}
											style={{
												flex: '2',
												padding: '14px 24px',
												borderRadius: '12px',
												border: 'none',
												backgroundColor: selectedOptions.length === 0 || isSubmittingVote ? '#d1d5db' : '#9333ea',
												color: '#ffffff',
												fontWeight: '600',
												cursor: selectedOptions.length === 0 || isSubmittingVote ? 'not-allowed' : 'pointer',
												transition: 'all 0.2s',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												gap: '8px',
												opacity: selectedOptions.length === 0 || isSubmittingVote ? 0.6 : 1
											}}
											onMouseEnter={(e) => {
												if (selectedOptions.length > 0 && !isSubmittingVote) {
													e.currentTarget.style.backgroundColor = '#7e22ce';
													e.currentTarget.style.transform = 'translateY(-1px)';
													e.currentTarget.style.boxShadow = '0 8px 20px rgba(147, 51, 234, 0.3)';
												}
											}}
											onMouseLeave={(e) => {
												if (selectedOptions.length > 0 && !isSubmittingVote) {
													e.currentTarget.style.backgroundColor = '#9333ea';
													e.currentTarget.style.transform = 'translateY(0)';
													e.currentTarget.style.boxShadow = 'none';
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
										<svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
										</svg>
									</div>
									<h3 className="text-lg font-bold text-gray-800 mb-2">No hay encuestas activas</h3>
									<p className="text-gray-600 mb-6">No hay encuestas activas en este momento.</p>
									<button onClick={handleClosePollModal} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold">
										Cerrar
									</button>
								</div>
							)}
						</div>
					</div>
				</div>,
				document.body
			)}
		</>
	);
};

export default ZoomEmbed;