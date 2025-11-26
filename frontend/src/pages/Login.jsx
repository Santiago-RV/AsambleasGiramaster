import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';
import logo from '../assets/logo_giramaster.jpeg';
import background from '../assets/background_giramaster.jpeg';

const Login = () => {
	const [showPassword, setShowPassword] = useState(false);

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
	const { login } = useAuth();

	const onSubmit = async (data) => {
		try {
			// Mapear 'usuario' a 'username' que es lo que espera el backend
			const credentials = {
				username: data.username,
				password: data.password,
			};

			await login(credentials);
		} catch (error) {
			console.error('Error al iniciar sesión:', error);

			// Obtener mensaje de error de manera segura
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

	return (
		<div className="min-h-screen flex">
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

								<button
									type="button"
									className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
								>
									¿Olvidaste tu contraseña?
								</button>
							</div>

							{/* Botón Submit */}
							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
		</div>
	);
};

export default Login;
