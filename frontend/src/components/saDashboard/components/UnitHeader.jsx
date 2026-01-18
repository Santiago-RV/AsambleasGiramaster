import React, { useState } from 'react';
import {
	ArrowLeft,
	MapPin,
	Plus,
	UserCog,
	Mail,
	Phone,
	AlertCircle,
	FileSpreadsheet,
	UserPlus
} from 'lucide-react';

const UnitHeader = ({
	unitData,
	currentAdmin,
	isLoadingAdministrator,
	onBack,
	onOpenResidentModal,
	onOpenExcelModal,
	onOpenChangeAdminModal,
	onOpenGuestModal
}) => {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<div className="flex items-start justify-between gap-4 mb-4">
				<div className="flex items-center gap-4 flex-1">
					<button
						onClick={onBack}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ArrowLeft size={24} className="text-gray-600" />
					</button>
					<div className="flex-1">
						<h1 className="text-3xl font-bold text-gray-800">
							{unitData.str_name}
						</h1>
						<div className="flex items-center gap-2 text-gray-600 mt-1">
							<MapPin size={18} />
							<p>
								{unitData.str_address}, {unitData.str_city},{' '}
								{unitData.str_state}
							</p>
						</div>
					</div>
				</div>

				{/* Información del Administrador */}
				<div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
					{isLoadingAdministrator ? (
						<div className="flex items-center gap-3">
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
							<span className="text-gray-600">
								Cargando administrador...
							</span>
						</div>
					) : currentAdmin ? (
						<>
							<div className="flex items-center gap-3">
								<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold shadow-md">
									{currentAdmin.firstname?.charAt(0) || ''}
									{currentAdmin.lastname?.charAt(0) || ''}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<p className="font-semibold text-gray-800">
											{currentAdmin.firstname} {currentAdmin.lastname}
										</p>
										<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
											{currentAdmin.role}
										</span>
									</div>
									<div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
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
							<button
								onClick={onOpenChangeAdminModal}
								className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm whitespace-nowrap"
							>
								<UserCog size={18} />
								Cambiar Administrador
							</button>
						</>
					) : (
						<>
							<div className="flex items-center gap-3">
								<AlertCircle className="text-orange-500" size={32} />
								<div>
									<p className="font-semibold text-gray-800">
										No hay administrador asignado
									</p>
									<p className="text-sm text-gray-600">
										Selecciona un residente como administrador
									</p>
								</div>
							</div>
							<button
								onClick={onOpenChangeAdminModal}
								className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm whitespace-nowrap"
							>
								<UserCog size={18} />
								Asignar Administrador
							</button>
						</>
					)}
				</div>
			</div>

			{/* ======================================== */}
			{/* Botones de acción para residentes       */}
			{/* CORREGIDO: Eliminado botón duplicado    */}
			{/* ======================================== */}
			<div className="flex gap-3 pt-4 border-t border-gray-200">
				{/* Botón: Agregar Residente */}
				<button
					onClick={onOpenResidentModal}
					className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<UserPlus size={18} />
					Agregar Residente
				</button>
				
				{/* Botón: Agregar Invitado - NUEVO */}
				<button
					onClick={onOpenGuestModal}
					className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<UserPlus size={18} />
					Agregar Invitado
				</button>
				
				{/* Botón: Cargar desde Excel */}
				<button
					onClick={onOpenExcelModal}
					className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
				>
					<FileSpreadsheet size={18} />
					Cargar desde Excel
				</button>
			</div>
		</div>
	);
};

export default UnitHeader;