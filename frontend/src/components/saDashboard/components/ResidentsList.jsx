import React, { useState, useRef, useEffect } from 'react';
import { UsersIcon, MoreVertical, Mail, Send, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import Swal from "sweetalert2";
import ResidentActionsMenu from './ResidentActionsMenu';

const ResidentsList = ({
	residents,
	isLoading,
	onResendCredentials,
	onEditResident,
	onDeleteResident,
	onSendBulkCredentials,
	isSendingBulk,
	onToggleAccess,
	onBulkToggleAccess
}) => {
	const [selectedResidents, setSelectedResidents] = useState([]);
	const [selectAll, setSelectAll] = useState(false);
	const [selectedResidentMenu, setSelectedResidentMenu] = useState(null);
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
	const menuButtonRefs = useRef({});

	// Actualizar posición del menú cuando cambia el scroll o el tamaño de la ventana
	useEffect(() => {
		const updateMenuPosition = () => {
			if (
				selectedResidentMenu &&
				menuButtonRefs.current[selectedResidentMenu]
			) {
				const button = menuButtonRefs.current[selectedResidentMenu];
				const rect = button.getBoundingClientRect();
				const menuWidth = 192; // w-48 = 12rem = 192px
				const viewportWidth = window.innerWidth;
				const viewportHeight = window.innerHeight;

				let left = rect.right - menuWidth;
				if (left < 8) {
					left = 8;
				}
				if (rect.right > viewportWidth - 8) {
					left = viewportWidth - menuWidth - 8;
				}

				let top = rect.bottom + 8;
				const menuHeight = 120;
				if (top + menuHeight > viewportHeight - 8) {
					top = rect.top - menuHeight - 8;
				}
				if (top < 8) {
					top = 8;
				}

				setMenuPosition({
					top: top,
					left: left,
				});
			}
		};

		if (selectedResidentMenu) {
			updateMenuPosition();
			const scrollContainers = document.querySelectorAll(
				'[class*="overflow-y-auto"]'
			);
			scrollContainers.forEach((container) => {
				container.addEventListener('scroll', updateMenuPosition, true);
			});
			window.addEventListener('scroll', updateMenuPosition, true);
			window.addEventListener('resize', updateMenuPosition);
		}

		return () => {
			const scrollContainers = document.querySelectorAll(
				'[class*="overflow-y-auto"]'
			);
			scrollContainers.forEach((container) => {
				container.removeEventListener('scroll', updateMenuPosition, true);
			});
			window.removeEventListener('scroll', updateMenuPosition, true);
			window.removeEventListener('resize', updateMenuPosition);
		};
	}, [selectedResidentMenu]);

	const handleSelectAll = () => {
		if (selectAll) {
			setSelectedResidents([]);
		} else {
			setSelectedResidents(residents.map((r) => r.id));
		}
		setSelectAll(!selectAll);
	};

	const handleSelectResident = (residentId) => {
		setSelectedResidents((prev) => {
			const updated = prev.includes(residentId)
				? prev.filter((id) => id !== residentId)
				: [...prev, residentId];

			setSelectAll(updated.length === residents.length);
			return updated;
		});
	};

	const handleSendBulkCredentials = () => {
		onSendBulkCredentials(selectedResidents, () => {
			// Callback para limpiar selección después del envío exitoso
			setSelectedResidents([]);
			setSelectAll(false);
		});
	};

	const handleMenuOpen = (residentId, event) => {
		event.stopPropagation();
		const button = event.currentTarget;

		if (selectedResidentMenu === residentId) {
			setSelectedResidentMenu(null);
		} else {
			const rect = button.getBoundingClientRect();
			const menuWidth = 192;
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			let left = rect.right - menuWidth;
			if (left < 8) {
				left = 8;
			}
			if (rect.right > viewportWidth - 8) {
				left = viewportWidth - menuWidth - 8;
			}

			let top = rect.bottom + 8;
			const menuHeight = 120;
			if (top + menuHeight > viewportHeight - 8) {
				top = rect.top - menuHeight - 8;
			}
			if (top < 8) {
				top = 8;
			}

			setMenuPosition({
				top: top,
				left: left,
			});
			setSelectedResidentMenu(residentId);
		}
	};

	return (
		<div
			className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col"
			style={{ maxHeight: '700px' }}
		>
			<div className="p-6 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
						<UsersIcon size={24} />
						Residentes ({residents?.length || 0})
					</h2>

					{/* Botones de acción masiva */}
					{selectedResidents.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-gray-700">
								({selectedResidents.length} seleccionados)
							</span>

							{/* Botón de envío masivo de credenciales */}
							<button
								onClick={handleSendBulkCredentials}
								disabled={isSendingBulk}
								className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm disabled:opacity-50"
							>
								{isSendingBulk ? (
									<>
										<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										<span className="hidden sm:inline">Enviando...</span>
									</>
								) : (
									<>
										<Send size={16} />
										<span className="hidden sm:inline">Enviar Credenciales</span>
									</>
								)}
							</button>

							{/* Botón para habilitar acceso masivo */}
							<button
								onClick={() => onBulkToggleAccess(selectedResidents, true)}
								className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
								title="Habilitar acceso"
							>
								<Shield size={16} />
								<span className="hidden sm:inline">Habilitar</span>
							</button>

							{/* Botón para deshabilitar acceso masivo */}
							<button
								onClick={() => onBulkToggleAccess(selectedResidents, false)}
								className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
								title="Deshabilitar acceso"
							>
								<ShieldOff size={16} />
								<span className="hidden sm:inline">Deshabilitar</span>
							</button>
						</div>
					)}
				</div>
			</div>

			<div
				className="flex-1 overflow-y-auto overflow-x-hidden"
				style={{ minHeight: 0 }}
			>
				{isLoading ? (
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
					<>
						{/* Checkbox para seleccionar todos */}
						<div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={selectAll}
									onChange={handleSelectAll}
									className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
								/>
								<span className="text-sm font-semibold text-gray-700">
									Seleccionar todos ({residents.length})
								</span>
							</label>
						</div>

						{/* Lista de residentes */}
						<div className="divide-y divide-gray-200">
							{residents.map((resident) => (
								<div
									key={resident.id}
									className="p-4 hover:bg-gray-50 transition-colors relative"
								>
									<div className="flex items-center gap-3">
										{/* Checkbox individual */}
										<input
											type="checkbox"
											checked={selectedResidents.includes(resident.id)}
											onChange={() => handleSelectResident(resident.id)}
											onClick={(e) => e.stopPropagation()}
											className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
										/>

										{/* Información del residente */}
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-800 truncate">
												{resident.firstname} {resident.lastname}
											</p>
											<p className="text-sm text-gray-600 mt-1">
												Apt. {resident.apartment_number}
											</p>
										</div>

										{/* Botones de acción */}
										<div className="flex items-center gap-2 flex-shrink-0">

											{/* Botón para enviar WhatsApp */}
											<button
											onClick={(e) => {
												e.stopPropagation();

												if (!resident?.phone) {
												Swal.fire({
													icon: 'error',
													title: 'Sin número de WhatsApp',
													text: 'Este usuario no posee un número de WhatsApp registrado.',
													confirmButtonText: 'Cerrar',
													confirmButtonColor: '#25D366',
												});
												return;
												}

												const phone = resident.phone.replace(/\D/g, "");
												window.open(`https://wa.me/${phone}`, "_blank");
											}}
											className="p-2 hover:bg-green-100 rounded-lg transition-colors"
											title="Enviar WhatsApp"
											>
											<img src="/Wpp.png" alt="WhatsApp" className="w-5 h-5" />
											</button>

											{/* Botón para enviar credenciales individual */}
											<button
												onClick={(e) => {
													e.stopPropagation();
													onResendCredentials(resident);
												}}
												className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
												title="Enviar credenciales por correo"
											>
												<Mail size={20} className="text-blue-600 group-hover:text-blue-700" />
											</button>

											{/* Botón de toggle access - NUEVO */}
											<button
												onClick={(e) => {
													e.stopPropagation();
													onToggleAccess(resident);
												}}
												className={`p-2 rounded-lg transition-colors group ${resident.bln_allow_entry ? 'hover:bg-red-100' : 'hover:bg-green-100'
													}`}
												title={resident.bln_allow_entry ? 'Deshabilitar acceso' : 'Habilitar acceso'}
											>
												{resident.bln_allow_entry ? (
													<UserX size={20} className="text-red-600 group-hover:text-red-700" />
												) : (
													<UserCheck size={20} className="text-green-600 group-hover:text-green-700" />
												)}
											</button>

											{/* Botón del menú de 3 puntos */}
											<button
												ref={(el) => {
													if (el) {
														menuButtonRefs.current[resident.id] = el;
													}
												}}
												onClick={(e) => handleMenuOpen(resident.id, e)}
												className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
											>
												<MoreVertical size={20} className="text-gray-600" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</>
				) : (
					<div className="text-center py-12">
						<UsersIcon className="mx-auto text-gray-400 mb-4" size={48} />
						<p className="text-gray-600">No hay residentes registrados</p>
					</div>
				)}
			</div>

			{/* Menú de acciones */}
			{selectedResidentMenu && (
				<ResidentActionsMenu
					resident={residents.find((r) => r.id === selectedResidentMenu)}
					position={menuPosition}
					onView={() => { }}
					onEdit={onEditResident}
					onDelete={onDeleteResident}
					onClose={() => setSelectedResidentMenu(null)}
				/>
			)}
		</div>
	);
};

export default ResidentsList;