// ZoomEmbed.jsx - VERSIÓN CON BURBUJA INFORMATIVA
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ZoomMtg } from '@zoom/meetingsdk';
import { X, Loader2, CheckCircle, UserCircle, Building2, Hash, AlertTriangle, Eye, BarChart3 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import axiosInstance from '../../services/api/axiosconfig';
import { PollService } from '../../services/api/PollService';
import { UserService } from '../../services/api/UserService';
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
	const [isLoading, setIsLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState('Iniciando reunión...');
	const [error, setError] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(startFullscreen);
	const [showPollButton, setShowPollButton] = useState(false);
	const [showPollModal, setShowPollModal] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState([]);
	const [isSubmittingVote, setIsSubmittingVote] = useState(false);

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
		refetchInterval: isGuest ? false : 5000,
	});

	// Obtener la encuesta activa
	const activePoll = !isGuest ? pollsData?.data?.find(poll => {
		const isActive = poll.str_status === 'Activa' || poll.str_status === 'active';
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
					role: 0, // 0 = participante (copropietario)
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
		console.log('🔄 Cerrando componente de Zoom y volviendo al dashboard');
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

		setSelectedOptions((prev) => {
			const isMultiple = activePoll?.bln_allow_multiple_selection;

			if (!isMultiple) {
				return prev.includes(optionId) ? [] : [optionId];
			} else {
				return prev.includes(optionId)
					? prev.filter(id => id !== optionId)
					: [...prev, optionId];
			}
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
				customClass: {
					popup: 'swal-wide',
					title: 'swal-title',
					confirmButton: 'swal-confirm-btn'
				}
			});
			return;
		}

		if (selectedOptions.length === 0) {
			Swal.fire({
				title: 'Selecciona una opción',
				text: 'Debes seleccionar al menos una opción antes de votar',
				icon: 'warning',
				confirmButtonText: 'Entendido',
				customClass: {
					popup: 'swal-wide',
					title: 'swal-title',
					confirmButton: 'swal-confirm-btn'
				}
			});
			return;
		}

		setIsSubmittingVote(true);

		try {
			const result = await PollService.submitVote(activePoll.id, selectedOptions);

			if (result.success) {
				// ✅ Invalidar TODAS las queries relacionadas con polls
				await Promise.all([
					refetchPolls(), // Refrescar en Zoom
					queryClient.invalidateQueries({ queryKey: ['all-polls'] }), // Refrescar en VotingPage
					queryClient.invalidateQueries({ queryKey: ['meeting-polls'] }) // Cualquier otra query de polls
				]);

				await Swal.fire({
					title: '¡Voto Registrado!',
					html: `
						<div class="text-center">
							<p class="text-lg mb-4">Tu voto ha sido registrado exitosamente</p>
							<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
								<p class="text-sm text-blue-800 font-semibold">
									${activePoll.str_title}
								</p>
							</div>
						</div>
					`,
					icon: 'success',
					confirmButtonText: 'Cerrar',
					customClass: {
						popup: 'swal-wide',
						title: 'swal-title',
						confirmButton: 'swal-confirm-btn'
					}
				});

				handleClosePollModal();
			}
		} catch (error) {
			console.error('❌ Error al enviar voto:', error);
			
			const errorMessage = error.response?.data?.message || 'No se pudo registrar el voto';
			
			Swal.fire({
				title: 'Error al Votar',
				text: errorMessage,
				icon: 'error',
				confirmButtonText: 'Entendido',
				customClass: {
					popup: 'swal-wide',
					title: 'swal-title',
					confirmButton: 'swal-confirm-btn'
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

			console.log('🔵 Obteniendo configuracion de Zoom...');
			setLoadingMessage('Configurando conexion...');

			const zoomAccountId = meetingData?.int_zoom_account_id;
			const configUrl = zoomAccountId ? `/zoom/config?zoom_account_id=${zoomAccountId}` : '/zoom/config';
			const configResponse = await axiosInstance.get(configUrl);
			const sdkKey = configResponse.data.data.sdk_key;

			console.log('🔵 Generando firma...');
			setLoadingMessage('Autenticando...');

			const signature = await generateSignature(meetingNumber);

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
								<span style={{ fontSize: '1rem', color: '#d1fae5', lineHeight: 1.2 }}>
									Haz clic para votar ahora
								</span>
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
						</div>

						<div style={{ marginBottom: '24px' }}>
							{activePoll.options?.map((option) => (
								<div
									key={option.id}
									onClick={() => handleOptionToggle(option.id)}
									style={{
										padding: '16px',
										marginBottom: '12px',
										border: selectedOptions.includes(option.id)
											? '3px solid #3b82f6'
											: '2px solid #e5e7eb',
										borderRadius: '12px',
										cursor: 'pointer',
										backgroundColor: selectedOptions.includes(option.id)
											? '#eff6ff'
											: 'white',
										transition: 'all 0.2s'
									}}
								>
									<div style={{
										display: 'flex',
										alignItems: 'center',
										gap: '12px'
									}}>
										<div style={{
											width: '24px',
											height: '24px',
											borderRadius: activePoll.bln_allow_multiple_selection ? '4px' : '50%',
											border: selectedOptions.includes(option.id)
												? '2px solid #3b82f6'
												: '2px solid #d1d5db',
											backgroundColor: selectedOptions.includes(option.id)
												? '#3b82f6'
												: 'white',
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
							))}
						</div>

						<div style={{
							display: 'flex',
							gap: '12px',
							justifyContent: 'flex-end'
						}}>
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
								disabled={isSubmittingVote || selectedOptions.length === 0}
								style={{
									padding: '12px 32px',
									borderRadius: '8px',
									border: 'none',
									background: selectedOptions.length === 0
										? '#e5e7eb'
										: 'linear-gradient(to right, #3b82f6, #2563eb)',
									color: 'white',
									fontSize: '1rem',
									fontWeight: '600',
									cursor: selectedOptions.length === 0 ? 'not-allowed' : 'pointer',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
							>
								{isSubmittingVote ? (
									<>
										<Loader2 size={20} className="animate-spin" />
										<span>Enviando...</span>
									</>
								) : (
									<>
										<CheckCircle size={20} />
										<span>Confirmar Voto</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}
		</div>
	);
};

export default ZoomEmbed;