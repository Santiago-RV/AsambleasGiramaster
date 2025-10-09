import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Home, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

const Login = () => {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm({
		defaultValues: {
			email: '',
			password: '',
			rememberMe: false,
		},
	});
	const { login } = useAuth();

	const onSubmit = async (data) => {
		try {
			// Mapear 'usuario' a 'username' que es lo que espera el backend
			const credentials = {
				username: data.email,
				password: data.password,
			};

			await login(credentials);
		} catch (error) {
			console.error('Error al iniciar sesión:', error);
		}
	};

	return (
		<div className="min-h-screen flex">
			{/* Sección izquierda - Branding */}
			<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-12 flex-col justify-center items-center text-white relative overflow-hidden">
				<div className="absolute inset-0 bg-blue-800 opacity-20">
					<div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
					<div
						className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
						style={{ animationDelay: '1s' }}
					></div>
				</div>

				<div className="relative z-10 text-center max-w-md">
					<div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl">
						<Home className="w-12 h-12 text-white" />
					</div>

					<h1 className="text-4xl font-bold mb-4 leading-tight">
						Sistema de Gestión de Asambleas
					</h1>

					<p className="text-blue-100 text-lg leading-relaxed">
						Administra reuniones, votaciones y decisiones de tu
						unidad residencial de forma digital, transparente y
						eficiente
					</p>

					<div className="mt-12 grid grid-cols-3 gap-4 text-center">
						<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
							<div className="text-2xl font-bold">100%</div>
							<div className="text-sm text-blue-100">Digital</div>
						</div>
						<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
							<div className="text-2xl font-bold">24/7</div>
							<div className="text-sm text-blue-100">Acceso</div>
						</div>
						<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
							<div className="text-2xl font-bold">Seguro</div>
							<div className="text-sm text-blue-100">
								Confiable
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Sección derecha - Login */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
				<div className="w-full max-w-md">
					<div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
						{/* Header mobile */}
						<div className="lg:hidden mb-8 text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4">
								<Home className="w-8 h-8 text-white" />
							</div>
							<h2 className="text-xl font-bold text-gray-800">
								Sistema de Asambleas
							</h2>
						</div>

						<div className="mb-8">
							<h2 className="text-3xl font-bold text-gray-800 mb-2">
								Bienvenido
							</h2>
							<p className="text-gray-600">
								Ingresa tus credenciales para continuar
							</p>
						</div>

						<div className="space-y-6">
							{/* Campo Email */}
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Correo electrónico
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Mail className="h-5 w-5 text-gray-400" />
									</div>
									<input
										id="email"
										type="email"
										{...register('email', {
											required:
												'El correo electrónico es obligatorio',
											pattern: {
												value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
												message:
													'Correo electrónico inválido',
											},
										})}
										className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white ${
											errors.email
												? 'border-red-500'
												: 'border-gray-300'
										}`}
										placeholder="tu@email.com"
									/>
								</div>
								{errors.email && (
									<div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
										<AlertCircle className="h-4 w-4" />
										<span>{errors.email.message}</span>
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
										type="password"
										{...register('password', {
											required:
												'La contraseña es obligatoria',
											minLength: {
												value: 6,
												message:
													'La contraseña debe tener al menos 6 caracteres',
											},
										})}
										className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white ${
											errors.password
												? 'border-red-500'
												: 'border-gray-300'
										}`}
										placeholder="••••••••"
									/>
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
								onClick={handleSubmit(onSubmit)}
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
						</div>

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
