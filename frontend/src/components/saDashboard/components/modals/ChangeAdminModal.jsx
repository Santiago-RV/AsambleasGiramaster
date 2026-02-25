import React from 'react';
import Modal from '../../../common/Modal';
import { UsersIcon as UsersIcon, Mail, Phone, UserPlus, User } from 'lucide-react';

const ChangeAdminModal = ({
	isOpen,
	onClose,
	currentAdmin,
	residents,
	isLoadingResidents,
	onChangeAdmin,
	isChanging,
	onOpenCreateManualAdmin,
}) => {
	const handleChangeAdmin = (residentId) => {
		onChangeAdmin(residentId);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Cambiar Administrador de la Unidad"
			size="lg"
		>
			<div className="space-y-6">
				<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
					<h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
						<User size={18} /> Seleccionar Nuevo Administrador
					</h3>
					<p className="text-sm text-blue-700">
						Selecciona un residente de la lista para asignarlo como
						administrador de esta unidad residencial.
					</p>
				</div>

				{/* Botón para crear administrador manual */}
				<div className="mb-4">
					<button
						type="button"
						onClick={onOpenCreateManualAdmin}
						className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold px-4 py-3 rounded-lg hover:shadow-lg transition-all"
					>
						<UserPlus size={20} />
						Crear Administrador Manual (No Copropietario)
					</button>
					<p className="text-sm text-gray-600 mt-2 text-center">
						O selecciona un residente existente como administrador:
					</p>
				</div>

				{/* Administrador actual */}
				{currentAdmin && (
					<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
						<p className="text-sm font-semibold text-gray-700 mb-2">
							Administrador Actual:
						</p>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
								{currentAdmin.firstname?.charAt(0) || ''}
								{currentAdmin.lastname?.charAt(0) || ''}
							</div>
							<div>
								<p className="font-semibold text-gray-800">
									{currentAdmin.firstname} {currentAdmin.lastname}
								</p>
								<p className="text-sm text-gray-600">
									{currentAdmin.email} • Apt. {currentAdmin.apartment_number}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Lista de residentes disponibles */}
				<div>
					<label className="block mb-3 font-semibold text-gray-700">
						Seleccionar Nuevo Administrador:
					</label>
					<div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
						{isLoadingResidents ? (
							<div className="flex items-center justify-center py-12">
								<svg
									className="animate-spin h-8 w-8 text-[#3498db]"
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
							</div>
						) : residents && residents.length > 0 ? (
							<div className="divide-y divide-gray-200">
								{residents.map((resident) => (
									<button
										key={resident.id}
										onClick={() => handleChangeAdmin(resident.id)}
										disabled={
											isChanging ||
											(currentAdmin && currentAdmin.id === resident.id)
										}
										className={`w-full p-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
											currentAdmin && currentAdmin.id === resident.id
												? 'bg-blue-50 border-l-4 border-blue-500'
												: ''
										}`}
									>
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
												{resident.firstname?.charAt(0) || ''}
												{resident.lastname?.charAt(0) || ''}
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<p className="font-semibold text-gray-800">
														{resident.firstname} {resident.lastname}
													</p>
													{currentAdmin &&
														currentAdmin.id === resident.id && (
															<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
																Actual
															</span>
														)}
												</div>
												<div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
													{resident.email && (
														<div className="flex items-center gap-1">
															<Mail size={12} />
															<span>{resident.email}</span>
														</div>
													)}
													{resident.apartment_number && (
														<span>Apt. {resident.apartment_number}</span>
													)}
												</div>
											</div>
										</div>
									</button>
								))}
							</div>
						) : (
							<div className="text-center py-12">
								<UsersIcon className="mx-auto text-gray-400 mb-4" size={48} />
								<p className="text-gray-600">
									No hay residentes disponibles para asignar como administrador
								</p>
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
					<button
						type="button"
						onClick={onClose}
						className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all"
					>
						Cancelar
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default ChangeAdminModal;