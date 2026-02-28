// frontend/src/components/saDashboard/components/UnitHeader.jsx
import React, { useState } from 'react';
import {
	ArrowLeft,
	MapPin,
	UserCog,
	Mail,
	Phone,
	AlertCircle,
	FileSpreadsheet,
	UserPlus,
	Headphones,
} from 'lucide-react';
import SupportModal from './modals/SupportModal';

const UnitHeader = ({
	unitData,
	currentAdmin,
	isLoadingAdministrator,
	onBack,
	onOpenResidentModal,
	onOpenExcelModal,
	onOpenChangeAdminModal,
	onOpenGuestModal,
}) => {
	const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">

			{/* ═══════════════ HEADER SUPERIOR ═══════════════ */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">

				{/* Info de la unidad */}
				<div className="flex items-start gap-4 flex-1 min-w-0">
					<button
						onClick={onBack}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
					>
						<ArrowLeft size={20} className="text-gray-600 md:size-6" />
					</button>

					<div className="min-w-0">
						<h1 className="text-xl md:text-3xl font-bold text-gray-800 truncate">
							{unitData.str_name}
						</h1>
						<div className="flex items-start gap-2 text-gray-600 mt-1 text-sm md:text-base">
							<MapPin size={16} className="mt-0.5 shrink-0" />
							<p className="wrap-break-word">
								{unitData.str_address}, {unitData.str_city},{' '}
								{unitData.str_state}
							</p>
						</div>
					</div>
				</div>

				{/* ═══════════════ SECCIÓN ADMINISTRADOR ═══════════════ */}
				<div className="flex flex-col gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200 w-full md:w-auto">

					{isLoadingAdministrator ? (
						<div className="flex items-center gap-3">
							<svg className="animate-spin h-6 w-6 text-[#3498db]" viewBox="0 0 24 24" />
							<span className="text-gray-600 text-sm">Cargando administrador...</span>
						</div>
					) : currentAdmin ? (
						<div className="flex flex-col gap-3">

							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-linear-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold shadow-md shrink-0">
									{currentAdmin.firstname?.charAt(0) || ''}
									{currentAdmin.lastname?.charAt(0) || ''}
								</div>

								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="font-semibold text-gray-800 truncate">
											{currentAdmin.firstname} {currentAdmin.lastname}
										</p>
										<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
											{currentAdmin.role}
										</span>
									</div>

									{/* Email / teléfono solo desktop */}
									<div className="hidden md:flex items-center gap-3 mt-1 text-sm text-gray-600">
										<div className="flex items-center gap-1">
											<Mail size={14} />
											<span>{currentAdmin.email}</span>
										</div>
										{currentAdmin.phone && (
											<div className="flex items-center gap-1">
												<Phone size={14} />
												<span>{currentAdmin.phone}</span>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* ── Botones Cambiar Admin + Soporte ── */}
							<div className="flex flex-wrap gap-2">
								<button
									onClick={onOpenChangeAdminModal}
									className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
								>
									<UserCog size={16} />
									Cambiar Administrador
								</button>

								{/* ── BOTÓN SOPORTE TÉCNICO ── */}
								<button
									onClick={() => setIsSupportModalOpen(true)}
									className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
									title="Configurar contacto de soporte técnico"
								>
									<Headphones size={16} />
									Soporte Técnico
								</button>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<div className="flex items-start gap-3">
								<AlertCircle className="text-orange-500 shrink-0" size={24} />
								<div>
									<p className="font-semibold text-gray-800">No hay administrador asignado</p>
									<p className="text-sm text-gray-600">Selecciona un residente como administrador</p>
								</div>
							</div>

							{/* ── Botones Asignar Admin + Soporte ── */}
							<div className="flex flex-wrap gap-2">
								<button
									onClick={onOpenChangeAdminModal}
									className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
								>
									<UserCog size={16} />
									Asignar Administrador
								</button>

								{/* ── BOTÓN SOPORTE TÉCNICO ── */}
								<button
									onClick={() => setIsSupportModalOpen(true)}
									className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
									title="Configurar contacto de soporte técnico"
								>
									<Headphones size={16} />
									Soporte Técnico
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ═══════════════ BOTONES INFERIORES ═══════════════ */}
			<div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-200">
				<button
					onClick={onOpenResidentModal}
					className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<UserPlus size={18} />
					Agregar Residente
				</button>

				<button
					onClick={onOpenGuestModal}
					className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<UserPlus size={18} />
					Agregar Invitado
				</button>

				<button
					onClick={onOpenExcelModal}
					className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<FileSpreadsheet size={18} />
					Cargar desde Excel
				</button>
			</div>

			{/* ═══════════════ MODAL SOPORTE TÉCNICO ═══════════════ */}
			<SupportModal
				isOpen={isSupportModalOpen}
				onClose={() => setIsSupportModalOpen(false)}
				unitId={unitData?.id}
				unitName={unitData?.str_name}
			/>
		</div>
	);
};

export default UnitHeader;