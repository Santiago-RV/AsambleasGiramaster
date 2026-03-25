import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Mail, Video } from 'lucide-react';
import Swal from 'sweetalert2';
import logo from '../assets/logo-giramaster.jpeg';
import background from '../assets/background_giramaster.jpeg';
import MeetingParticipationModal from '../components/common/MeetingParticipationModal';
import { publicAxios } from '../services/api/axiosconfig';
import { AuthService } from '../services/api/AuthService';
import SystemConfigService from '../services/api/SystemConfigService';

const Login = () => {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [showMeetingModal, setShowMeetingModal] = useState(false);
	const [activeMeeting, setActiveMeeting] = useState(null);
	const [isRegisteringParticipation, setIsRegisteringParticipation] = useState(false);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [isCheckingConfig, setIsCheckingConfig] = useState(false);

	// Validar si ya hay sesión activa al cargar el componente
	useEffect(() => {
		if (AuthService.isAuthenticated()) {
			const user = JSON.parse(localStorage.getItem('user') || '{}');
			const role = user?.role; // El rol ya es un string directo
			
			if (role === 'Super Administrador') {
				navigate('/super-admin', { replace: true });
			} else if (role === 'Administrador') {
				navigate('/admin', { replace: true });
			} else {
				navigate('/dashboard', { replace: true });
			}
		}
	}, [navigate]);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm({
		defaultValues: {
			username: '',
			password: '',
			rememberMe: false,
		},
	});
	const { login, navigateByRole } = useAuth();

	const onSubmit = async (data) => {
		try {
			const credentials = {
				username: data.username,
				password: data.password,
			};

			await login(credentials);
			
			// Obtener datos del usuario desde localStorage
			const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
			
			// Mostrar mensaje de éxito
			Swal.fire({
				icon: 'success',
				title: 'Inicio de Sesión Exitoso',
				text: 'Bienvenido al sistema',
				timer: 2000,
				showConfirmButton: false,
			});

			// Verificar si hay una reunión activa
			// Los datos vienen en AuthService y se almacenan también en data
			const authData = AuthService.getLastAuthData?.() || null;
			
			if (authData && authData.active_meeting) {
				setLoggedInUser(storedUser);
				setActiveMeeting(authData.active_meeting);
				setShowMeetingModal(true);
			} else {
				// Si no hay modal, verificar configuración y navegar
				handleNavigateWithConfigCheck(storedUser.role);
			}
		} catch (error) {
			console.error('Error al iniciar sesión:', error);

			let errorMessage = 'Error al iniciar sesión';

			if (error.response?.data) {
				errorMessage =
					error.response.data.detail ||
					error.response.data.message ||
					errorMessage;
			} else if (error.message) {
				errorMessage = error.message;
			}

			Swal.fire({
				icon: 'error',
				title: 'Error de Autenticación',
				text: errorMessage,
				confirmButtonText: 'Cerrar',
				confirmButtonColor: '#2563eb',
			});
		}
	};

	// Función para verificar configuración del sistema
	const checkSystemConfig = async () => {
		try {
			const [smtpStatus, zoomStatus] = await Promise.all([
				SystemConfigService.checkSMTPConfigStatus(),
				SystemConfigService.checkZoomConfigStatus(),
			]);

			const smtpData = smtpStatus?.data || {};
			const zoomData = zoomStatus?.data || {};

			return {
				smtpConfigured: smtpStatus?.success && smtpData?.configured,
				smtpMissingFields: smtpData?.missing_fields || [],
				zoomConfigured: zoomStatus?.success && zoomData?.configured,
			};
		} catch (error) {
			console.error('Error al verificar configuración:', error);
			return { smtpConfigured: false, smtpMissingFields: [], zoomConfigured: false };
		}
	};

	// Función para mostrar modal de advertencia de configuración
	const showConfigWarning = (configStatus, navigateFn) => {
		const missingConfigs = [];
		
		if (!configStatus.smtpConfigured) {
			const missingFields = configStatus.smtpMissingFields || [];
			const fieldLabels = {
				'SMTP_HOST': 'Servidor SMTP',
				'SMTP_PORT': 'Puerto SMTP',
				'SMTP_USER': 'Usuario SMTP',
				'SMTP_PASSWORD': 'Contraseña SMTP'
			};
			const fieldsText = missingFields.length > 0 
				? `<span class="text-sm text-gray-500">(${missingFields.map(f => fieldLabels[f] || f).join(', ')})</span>`
				: '';
				
			missingConfigs.push({
				name: 'Correo SMTP',
				icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
				color: 'text-red-500',
				fields: fieldsText
			});
		}
		
		if (!configStatus.zoomConfigured) {
			missingConfigs.push({
				name: 'Cuentas Zoom',
				icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>',
				color: 'text-blue-500',
			});
		}

		const configList = missingConfigs.map(c => 
			`<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
				<span class="${c.color}">${c.icon}</span>
				<div class="flex flex-col">
					<span class="font-medium">${c.name}</span>
					${c.fields || ''}
				</div>
			</div>`
		).join('');

		Swal.fire({
			icon: 'warning',
			title: 'Configuración Incompleta',
			html: `
				<div class="text-left">
					<p class="mb-4 text-gray-600">Para un mejor funcionamiento del sistema, se recomienda configurar los siguientes servicios:</p>
					<div class="space-y-2">${configList}</div>
				</div>
			`,
			showCancelButton: true,
			confirmButtonText: 'Ir a Configuración',
			cancelButtonText: 'Omitir',
			confirmButtonColor: '#2563eb',
			cancelButtonColor: '#6b7280',
			width: '450px',
		}).then((result) => {
			if (result.isConfirmed) {
				navigateFn('config');
			} else {
				navigateFn('normal');
			}
		});
	};

	// Función para navegar según el rol con verificación de configuración
	const handleNavigateWithConfigCheck = async (role) => {
		if (role === 'Administrador' || role === 'Super Administrador') {
			setIsCheckingConfig(true);
			
			const configStatus = await checkSystemConfig();
			
			setIsCheckingConfig(false);
			
			if (!configStatus.smtpConfigured || !configStatus.zoomConfigured) {
				showConfigWarning(configStatus, (action) => {
					if (action === 'config') {
						if (role === 'Super Administrador') {
							window.location.href = '/super-admin?tab=config';
						} else {
							window.location.href = '/admin?tab=config';
						}
					} else {
						navigateByRole(role);
					}
				});
			} else {
				navigateByRole(role);
			}
		} else {
			navigateByRole(role);
		}
	};

	const handleConfirmParticipation = async () => {
		if (!activeMeeting || !loggedInUser) return;
		
		setIsRegisteringParticipation(true);
		try {
			const token = localStorage.getItem('access_token');
			await publicAxios.post(
				`/auth/register-participation?meeting_id=${activeMeeting.id}`,
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			
			Swal.fire({
				icon: 'success',
				title: 'Participación Registrada',
				text: activeMeeting.already_participated 
					? 'Su reconexión ha sido registrada correctamente'
					: 'Su participación ha sido registrada correctamente',
				confirmButtonColor: '#2563eb',
			});
			
			setShowMeetingModal(false);
			// Navegar después de registrar participación verificando configuración
			handleNavigateWithConfigCheck(loggedInUser.role);
		} catch (error) {
			console.error('Error al registrar participación:', error);
			
			let errorMessage = 'No se pudo registrar la participación. Intente más tarde.';
			
			if (error.response?.status === 429) {
				errorMessage = 'Demasiadas peticiones. Espere un momento e intente de nuevo.';
			} else if (error.response?.data?.detail) {
				errorMessage = error.response.data.detail;
			}
			
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: errorMessage,
				confirmButtonColor: '#2563eb',
			});
		} finally {
			setIsRegisteringParticipation(false);
		}
	};

	const handleDeclineParticipation = () => {
		setShowMeetingModal(false);
		setActiveMeeting(null);
		// Navegar cuando el usuario decline el modal verificando configuración
		if (loggedInUser) {
			handleNavigateWithConfigCheck(loggedInUser.role);
		}
	};

	return (
		<div className="min-h-screen flex">
			{/* Overlay de carga mientras verifica configuración */}
			{isCheckingConfig && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
					<div className="bg-white rounded-xl p-8 flex flex-col items-center shadow-2xl">
						<div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
						<p className="text-gray-700 font-medium">Verificando configuración del sistema...</p>
						<p className="text-gray-500 text-sm mt-1">Por favor espere</p>
					</div>
				</div>
			)}

			{/* Sección izquierda - Branding */}
			<div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center items-center text-white relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${background})` }}>
				
			</div>

			{/* Sección derecha - Login */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
				<div className="w-full max-w-md">
					{/* Logo sobre el formulario */}
					<div className="mb-8 flex justify-center">
						<div className="inline-flex items-center justify-center w-full h-40">
							<img
								src={logo}
								alt="Logo GIRAMASTER"
								className="w-full h-full object-contain"
							/>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
						<div className="mb-8">
							<h2 className="text-3xl font-bold text-gray-800 mb-2">
								Bienvenido
							</h2>
							<p className="text-gray-600">
								Ingresa tus credenciales para continuar
							</p>
						</div>

						<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
							{/* Campo username */}
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Usuario
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<User className="h-5 w-5 text-gray-400" />
									</div>
									<input
										id="username"
										type="text"
										{...register('username', {
											required:
												'El usuario es obligatorio',
										})}
										className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white ${
											errors.username
												? 'border-red-500'
												: 'border-gray-300'
										}`}
										placeholder="usuario.ingreso"
									/>
								</div>
								{errors.username && (
									<div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
										<AlertCircle className="h-4 w-4" />
										<span>{errors.username.message}</span>
									</div>
								)}
							</div>

							{/* Campo Contraseña */}
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Contraseña
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Lock className="h-5 w-5 text-gray-400" />
									</div>
									<input
										id="password"
										type={showPassword ? 'text' : 'password'}
										{...register('password', {
											required:
												'La contraseña es obligatoria',
											minLength: {
												value: 6,
												message:
													'La contraseña debe tener al menos 6 caracteres',
											},
										})}
										className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white ${
											errors.password
												? 'border-red-500'
												: 'border-gray-300'
										}`}
										placeholder="••••••••"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
										tabIndex={-1}
									>
										{showPassword ? (
											<EyeOff className="h-5 w-5" />
										) : (
											<Eye className="h-5 w-5" />
										)}
									</button>
								</div>
								{errors.password && (
									<div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
										<AlertCircle className="h-4 w-4" />
										<span>{errors.password.message}</span>
									</div>
								)}
							</div>

							{/* Recordarme y Olvidaste contraseña */}
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<input
										id="rememberMe"
										type="checkbox"
										{...register('rememberMe')}
										className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
									/>
									<label
										htmlFor="rememberMe"
										className="ml-2 block text-sm text-gray-700 cursor-pointer"
									>
										Recordarme
									</label>
								</div>
							</div>

							{/* Botón Submit */}
							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								{isSubmitting ? (
									<>
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
										<span>Iniciando sesión...</span>
									</>
								) : (
									<>
										<span>Iniciar sesión</span>
										<ArrowRight className="h-5 w-5" />
									</>
								)}
							</button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600">
								¿No tienes una cuenta?{' '}
								<button
									type="button"
									className="font-medium text-blue-600 hover:text-blue-700 transition"
								>
									Contacta al administrador
								</button>
							</p>
						</div>
					</div>

					<p className="text-center text-sm text-gray-500 mt-6">
						© 2025 Sistema de Asambleas. Todos los derechos
						reservados.
					</p>
				</div>
			</div>

			<MeetingParticipationModal
				show={showMeetingModal}
				meeting={activeMeeting}
				onConfirm={handleConfirmParticipation}
				onDecline={handleDeclineParticipation}
				isLoading={isRegisteringParticipation}
			/>
		</div>
	);
};

export default Login;
