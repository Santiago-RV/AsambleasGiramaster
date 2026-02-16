import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CameraOff, CheckCircle, XCircle, AlertCircle, UserCheck, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { MeetingService } from '../../services/api/MeetingService';

/**
 * QRScannerModal - Modal para escanear QR de copropietarios y registrar asistencia presencial
 * 
 * El administrador abre este modal, usa la camara del dispositivo para escanear
 * el QR del copropietario, y el sistema registra automaticamente su asistencia
 * en la reunion presencial activa.
 * 
 * Soporta escaneo continuo (no cierra tras el primer escaneo).
 */
const QRScannerModal = ({ isOpen, onClose }) => {
	const [isScanning, setIsScanning] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [scanResult, setScanResult] = useState(null); // { type: 'success'|'error'|'warning', data }
	const [registeredUsers, setRegisteredUsers] = useState([]); // historial de registros en esta sesion
	const html5QrCodeRef = useRef(null);
	const scannerContainerId = 'qr-scanner-reader';
	const lastScannedRef = useRef(''); // evitar escaneos duplicados rapidos
	const lastScannedTimeRef = useRef(0);

	/**
	 * Extrae el token JWT de la URL de auto-login contenida en el QR
	 * Las URLs tienen el formato: https://dominio.com/auto-login/{token}
	 */
	const extractTokenFromQR = useCallback((qrData) => {
		try {
			// Si el QR contiene una URL de auto-login
			const autoLoginPattern = /\/auto-login\/(.+)$/;
			const match = qrData.match(autoLoginPattern);

			if (match && match[1]) {
				return match[1];
			}

			// Si el QR contiene directamente el token (sin URL)
			// Intentar usarlo como token directamente si parece un JWT
			if (qrData.includes('.') && qrData.split('.').length === 3) {
				return qrData;
			}

			return null;
		} catch {
			return null;
		}
	}, []);

	/**
	 * Procesa el contenido del QR escaneado
	 */
	const handleQRScan = useCallback(async (decodedText) => {
		// Evitar procesamiento duplicado del mismo QR en rapida sucesion (3 segundos)
		const now = Date.now();
		if (decodedText === lastScannedRef.current && (now - lastScannedTimeRef.current) < 3000) {
			return;
		}
		lastScannedRef.current = decodedText;
		lastScannedTimeRef.current = now;

		// Evitar procesamiento si ya hay uno en curso
		if (isProcessing) return;

		setIsProcessing(true);
		setScanResult(null);

		try {
			// Extraer token del QR
			const token = extractTokenFromQR(decodedText);

			if (!token) {
				setScanResult({
					type: 'error',
					message: 'El codigo QR escaneado no es valido. Debe ser un QR generado por el sistema.',
					data: null
				});
				setIsProcessing(false);
				return;
			}

			// Llamar al backend para registrar asistencia
			const response = await MeetingService.scanQRAttendance(token);

			if (response.success && response.data) {
				const { success, already_registered, message, user_info, meeting_info } = response.data;

				if (success && !already_registered) {
					// Registro exitoso
					setScanResult({
						type: 'success',
						message: message,
						data: { user_info, meeting_info }
					});

					// Agregar al historial de esta sesion
					if (user_info) {
						setRegisteredUsers(prev => [{
							name: user_info.name,
							apartment: user_info.apartment_number,
							time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
							status: 'registered'
						}, ...prev]);
					}
				} else if (success && already_registered) {
					// Ya estaba registrado
					setScanResult({
						type: 'warning',
						message: message || 'Este copropietario ya fue registrado previamente.',
						data: { user_info, meeting_info }
					});
				} else {
					// Error del backend
					setScanResult({
						type: 'error',
						message: message || 'No se pudo registrar la asistencia.',
						data: { user_info, meeting_info }
					});
				}
			} else {
				setScanResult({
					type: 'error',
					message: response.message || 'Error al procesar el codigo QR.',
					data: null
				});
			}
		} catch (error) {
			console.error('Error al registrar asistencia por QR:', error);

			let errorMessage = 'Error al procesar el codigo QR.';
			if (error.response?.data?.detail) {
				errorMessage = error.response.data.detail;
			} else if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			}

			setScanResult({
				type: 'error',
				message: errorMessage,
				data: null
			});
		} finally {
			setIsProcessing(false);
		}
	}, [isProcessing, extractTokenFromQR]);

	/**
	 * Inicia el escaneo de QR usando la camara
	 */
	const startScanning = useCallback(async () => {
		try {
			if (html5QrCodeRef.current) {
				try { await html5QrCodeRef.current.stop(); } catch { /* ignorar */ }
				html5QrCodeRef.current.clear();
				html5QrCodeRef.current = null;
			}

			// Esperar a que el DOM tenga el contenedor
			await new Promise(resolve => setTimeout(resolve, 100));

			const container = document.getElementById(scannerContainerId);
			if (!container) return;

			const html5QrCode = new Html5Qrcode(scannerContainerId);
			html5QrCodeRef.current = html5QrCode;

			await html5QrCode.start(
				{ facingMode: 'environment' }, // Camara trasera preferida
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0,
				},
				(decodedText) => {
					handleQRScan(decodedText);
				},
				() => {
					// QR scan error silencioso (se llama constantemente mientras no detecta)
				}
			);

			setIsScanning(true);
		} catch (error) {
			console.error('Error al iniciar scanner:', error);

			let errorMsg = 'No se pudo acceder a la camara.';
			if (error.toString().includes('NotAllowedError')) {
				errorMsg = 'Permiso de camara denegado. Permite el acceso a la camara en tu navegador.';
			} else if (error.toString().includes('NotFoundError')) {
				errorMsg = 'No se encontro ninguna camara en este dispositivo.';
			} else if (error.toString().includes('NotReadableError')) {
				errorMsg = 'La camara esta siendo usada por otra aplicacion.';
			}

			Swal.fire({
				icon: 'error',
				title: 'Error de Camara',
				text: errorMsg,
				confirmButtonColor: '#e74c3c'
			});
		}
	}, [handleQRScan]);

	/**
	 * Detiene el escaneo
	 */
	const stopScanning = useCallback(async () => {
		try {
			if (html5QrCodeRef.current) {
				const state = html5QrCodeRef.current.getState();
				if (state === 2) { // SCANNING state
					await html5QrCodeRef.current.stop();
				}
				html5QrCodeRef.current.clear();
				html5QrCodeRef.current = null;
			}
		} catch (error) {
			console.error('Error al detener scanner:', error);
		}
		setIsScanning(false);
	}, []);

	// Iniciar escaneo al abrir el modal
	useEffect(() => {
		if (isOpen) {
			// Dar tiempo al DOM para renderizar el contenedor
			const timer = setTimeout(() => {
				startScanning();
			}, 300);
			return () => clearTimeout(timer);
		} else {
			stopScanning();
			setScanResult(null);
			lastScannedRef.current = '';
			lastScannedTimeRef.current = 0;
		}
	}, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

	// Cleanup al desmontar
	useEffect(() => {
		return () => {
			stopScanning();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	/**
	 * Cerrar el modal
	 */
	const handleClose = async () => {
		await stopScanning();
		setScanResult(null);
		setRegisteredUsers([]);
		lastScannedRef.current = '';
		lastScannedTimeRef.current = 0;
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-emerald-50 rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-emerald-100 rounded-lg">
							<Camera size={22} className="text-emerald-700" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-gray-800">Registro de Asistencia QR</h2>
							<p className="text-xs text-gray-500">Escanea el QR del copropietario</p>
						</div>
					</div>
					<button
						onClick={handleClose}
						className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<X size={20} className="text-gray-600" />
					</button>
				</div>

				{/* Scanner Area */}
				<div className="p-4">
					<div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4">
						<div id={scannerContainerId} className="w-full" style={{ minHeight: '280px' }} />

						{/* Indicador de procesamiento sobre el scanner */}
						{isProcessing && (
							<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
								<div className="bg-white rounded-lg p-4 flex items-center gap-3">
									<Loader2 size={24} className="text-emerald-600 animate-spin" />
									<span className="text-sm font-medium text-gray-700">Registrando asistencia...</span>
								</div>
							</div>
						)}
					</div>

					{/* Controles de camara */}
					<div className="flex justify-center mb-4">
						{isScanning ? (
							<button
								onClick={stopScanning}
								className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
							>
								<CameraOff size={16} />
								Detener camara
							</button>
						) : (
							<button
								onClick={startScanning}
								className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium"
							>
								<Camera size={16} />
								Iniciar camara
							</button>
						)}
					</div>

					{/* Resultado del ultimo escaneo */}
					{scanResult && (
						<div className={`rounded-xl p-4 mb-4 border ${
							scanResult.type === 'success'
								? 'bg-emerald-50 border-emerald-200'
								: scanResult.type === 'warning'
									? 'bg-amber-50 border-amber-200'
									: 'bg-red-50 border-red-200'
						}`}>
							<div className="flex items-start gap-3">
								{scanResult.type === 'success' && (
									<CheckCircle size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
								)}
								{scanResult.type === 'warning' && (
									<AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
								)}
								{scanResult.type === 'error' && (
									<XCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
								)}

								<div className="flex-1 min-w-0">
									<p className={`text-sm font-semibold ${
										scanResult.type === 'success'
											? 'text-emerald-800'
											: scanResult.type === 'warning'
												? 'text-amber-800'
												: 'text-red-800'
									}`}>
										{scanResult.type === 'success' && 'Asistencia Registrada'}
										{scanResult.type === 'warning' && 'Ya Registrado'}
										{scanResult.type === 'error' && 'Error'}
									</p>

									<p className={`text-sm mt-1 ${
										scanResult.type === 'success'
											? 'text-emerald-700'
											: scanResult.type === 'warning'
												? 'text-amber-700'
												: 'text-red-700'
									}`}>
										{scanResult.message}
									</p>

									{/* Info del copropietario */}
									{scanResult.data?.user_info && (
										<div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
											<div className="flex items-center gap-2 mb-2">
												<UserCheck size={16} className="text-gray-500" />
												<span className="text-sm font-medium text-gray-700">
													{scanResult.data.user_info.name}
												</span>
											</div>
											{scanResult.data.user_info.apartment_number && (
												<p className="text-xs text-gray-500 ml-6">
													Apartamento: <strong>{scanResult.data.user_info.apartment_number}</strong>
												</p>
											)}
											{scanResult.data.meeting_info && (
												<p className="text-xs text-gray-500 ml-6 mt-1">
													Reunion: <strong>{scanResult.data.meeting_info.title}</strong>
												</p>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Historial de registros de esta sesion */}
					{registeredUsers.length > 0 && (
						<div className="border border-gray-200 rounded-xl overflow-hidden">
							<div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold text-gray-700">
										Registrados en esta sesion
									</h3>
									<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
										{registeredUsers.length}
									</span>
								</div>
							</div>
							<div className="max-h-40 overflow-y-auto">
								{registeredUsers.map((user, index) => (
									<div
										key={index}
										className={`flex items-center justify-between px-4 py-2.5 ${
											index !== registeredUsers.length - 1 ? 'border-b border-gray-100' : ''
										}`}
									>
										<div className="flex items-center gap-2">
											<CheckCircle size={14} className="text-emerald-500" />
											<div>
												<p className="text-sm font-medium text-gray-700">{user.name}</p>
												<p className="text-xs text-gray-500">Apto. {user.apartment}</p>
											</div>
										</div>
										<span className="text-xs text-gray-400">{user.time}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Instrucciones */}
					{!scanResult && !isProcessing && (
						<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
							<p className="text-xs text-blue-800">
								<strong>Instrucciones:</strong> Apunta la camara hacia el codigo QR del copropietario.
								El sistema registrara automaticamente su asistencia en la reunion presencial activa.
								Puedes escanear multiples QR sin cerrar esta ventana.
							</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
					<button
						onClick={handleClose}
						className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default QRScannerModal;
