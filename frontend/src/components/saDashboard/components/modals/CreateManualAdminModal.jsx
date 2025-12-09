import React from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../common/Modal';
import { UserPlus } from 'lucide-react';

const CreateManualAdminModal = ({
	isOpen,
	onClose,
	onSubmit,
	isSubmitting,
}) => {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({
		defaultValues: {
			str_firstname: '',
			str_lastname: '',
			str_email: '',
			str_phone: '',
		},
	});

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleFormSubmit = (data) => {
		onSubmit(data, () => {
			reset();
		});
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title="Crear Administrador Manual"
			size="lg"
		>
			<form onSubmit={handleSubmit(handleFormSubmit)}>
				<div className="space-y-6">
					<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
						<h3 className="font-semibold text-blue-800 mb-2">
							👤 Nuevo Administrador
						</h3>
						<p className="text-sm text-blue-700">
							Crea un usuario con rol de administrador que NO está asociado a
							ningún apartamento. Este usuario tendrá acceso completo para
							gestionar la unidad residencial.
						</p>
					</div>

					{/* Nombres */}
					<div>
						<label className="block mb-2 font-semibold text-gray-700">
							Nombres *
						</label>
						<input
							type="text"
							{...register('str_firstname', {
								required: 'Los nombres son obligatorios',
								minLength: {
									value: 2,
									message: 'Mínimo 2 caracteres',
								},
							})}
							placeholder="Ej: Juan Carlos"
							className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
						/>
						{errors.str_firstname && (
							<span className="text-red-500 text-sm">
								{errors.str_firstname.message}
							</span>
						)}
					</div>

					{/* Apellidos */}
					<div>
						<label className="block mb-2 font-semibold text-gray-700">
							Apellidos *
						</label>
						<input
							type="text"
							{...register('str_lastname', {
								required: 'Los apellidos son obligatorios',
								minLength: {
									value: 2,
									message: 'Mínimo 2 caracteres',
								},
							})}
							placeholder="Ej: Pérez García"
							className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
						/>
						{errors.str_lastname && (
							<span className="text-red-500 text-sm">
								{errors.str_lastname.message}
							</span>
						)}
					</div>

					{/* Email */}
					<div>
						<label className="block mb-2 font-semibold text-gray-700">
							Email *
						</label>
						<input
							type="email"
							{...register('str_email', {
								required: 'El email es obligatorio',
								pattern: {
									value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
									message: 'Email inválido',
								},
							})}
							placeholder="Ej: admin@correo.com"
							className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
						/>
						{errors.str_email && (
							<span className="text-red-500 text-sm">
								{errors.str_email.message}
							</span>
						)}
					</div>

					{/* Teléfono (opcional) */}
					<div>
						<label className="block mb-2 font-semibold text-gray-700">
							Teléfono (Opcional)
						</label>
						<input
							type="tel"
							{...register('str_phone')}
							placeholder="Ej: +57 300 123 4567"
							className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
						/>
					</div>

					<div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
						<p className="text-sm text-yellow-800">
							<strong>📧 Nota:</strong> Se generará un usuario y contraseña
							temporal automáticamente. El administrador recibirá un email con
							sus credenciales de acceso.
						</p>
					</div>

					{/* Botones */}
					<div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className={`flex items-center gap-2 bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${
								isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
							}`}
						>
							{isSubmitting ? (
								<>
									<svg
										className="animate-spin h-5 w-5"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Creando...
								</>
							) : (
								<>
									<UserPlus size={20} />
									Crear Administrador
								</>
							)}
						</button>
					</div>
				</div>
			</form>
		</Modal>
	);
};

export default CreateManualAdminModal;