import React, { useState, useEffect } from 'react';
import {
	Users,
	Mail,
	Phone,
	Building2,
	Plus,
	Search,
	Loader2,
} from 'lucide-react';
import { ResidentialUnitService } from '../../services/api/ResidentialUnitService';

const ResidentesTab = () => {
	const [residenciales, setResidenciales] = useState([]);
	const [selectedResidencial, setSelectedResidencial] = useState('');
	const [residentes, setResidentes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loadingResidentes, setLoadingResidentes] = useState(false);
	const [error, setError] = useState(null);

	// Cargar unidades residenciales al montar el componente
	useEffect(() => {
		loadResidentialUnits();
	}, []);

	const loadResidentialUnits = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await ResidentialUnitService.getResidentialUnits();
			if (response.success) {
				setResidenciales(response.data);
			}
		} catch (err) {
			setError('Error al cargar las unidades residenciales');
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const loadResidents = async (residentialUnitId) => {
		if (!residentialUnitId) {
			setResidentes([]);
			return;
		}

		try {
			setLoadingResidentes(true);
			setError(null);
			const response =
				await ResidentialUnitService.getResidentsByResidentialUnit(
					residentialUnitId
				);
			if (response.success) {
				setResidentes(response.data);
			}
		} catch (err) {
			setError('Error al cargar los residentes');
			console.error('Error:', err);
			setResidentes([]);
		} finally {
			setLoadingResidentes(false);
		}
	};

	const handleResidencialChange = (e) => {
		const value = e.target.value;
		setSelectedResidencial(value);
		loadResidents(value);
	};

	return (
		<div className="space-y-8">
			{/* Encabezado */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-800">
						Residentes
					</h1>
					<p className="text-gray-600 mt-2">
						Gestión de propietarios y arrendatarios
					</p>
				</div>
				<button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold">
					<Plus size={20} />
					Nuevo Residente
				</button>
			</div>

			{/* Selector de Unidad Residencial */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<label className="block text-sm font-semibold text-gray-700 mb-3">
					<Building2 className="inline mr-2" size={18} />
					Seleccionar Unidad Residencial
				</label>
				<select
					value={selectedResidencial}
					onChange={handleResidencialChange}
					className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent bg-white"
					disabled={loading}
				>
					<option value="">
						-- Seleccione una unidad residencial --
					</option>
					{residenciales.map((residencial) => (
						<option key={residencial.id} value={residencial.id}>
							{residencial.str_name} - {residencial.str_nit}
						</option>
					))}
				</select>
			</div>

			{/* Mensaje de error */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					{error}
				</div>
			)}

			{/* Barra de búsqueda - solo visible cuando hay una unidad seleccionada */}
			{selectedResidencial && (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
					<div className="relative">
						<Search
							className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							placeholder="Buscar por nombre, email o unidad..."
							className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
						/>
					</div>
				</div>
			)}

			{/* Listado de residentes */}
			{selectedResidencial && (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					{loadingResidentes ? (
						<div className="flex items-center justify-center py-12">
							<Loader2
								className="animate-spin text-[#3498db]"
								size={40}
							/>
							<span className="ml-3 text-gray-600">
								Cargando residentes...
							</span>
						</div>
					) : residentes.length === 0 ? (
						<div className="text-center py-12">
							<Users
								className="mx-auto text-gray-400 mb-4"
								size={48}
							/>
							<p className="text-gray-600 text-lg">
								No hay residentes registrados en esta unidad
								residencial
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
											Residente
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
											Usuario
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
											Contacto
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
											Apartamento
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
											Estado
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
											Acciones
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{residentes.map((residente) => (
										<tr
											key={residente.id}
											className="hover:bg-gray-50 transition-colors"
										>
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
														{residente.firstname?.charAt(
															0
														) || ''}
														{residente.lastname?.charAt(
															0
														) || ''}
													</div>
													<div>
														<p className="font-semibold text-gray-800">
															{
																residente.firstname
															}{' '}
															{residente.lastname}
														</p>
													</div>
												</div>
											</td>
											<td className="px-6 py-4">
												<span className="text-sm text-gray-600">
													{residente.username}
												</span>
											</td>
											<td className="px-6 py-4">
												<div className="space-y-1">
													<div className="flex items-center gap-2 text-sm text-gray-600">
														<Mail size={14} />
														{residente.email}
													</div>
													{residente.phone && (
														<div className="flex items-center gap-2 text-sm text-gray-600">
															<Phone size={14} />
															{residente.phone}
														</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center gap-2 text-sm text-gray-700">
													<Building2 size={16} />
													{residente.apartment_number}
												</div>
											</td>
											<td className="px-6 py-4">
												<span
													className={`px-3 py-1 rounded-full text-xs font-semibold ${
														residente.is_active
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													}`}
												>
													{residente.is_active
														? 'Activo'
														: 'Inactivo'}
												</span>
												{residente.is_external_delegate && (
													<span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
														Delegado Externo
													</span>
												)}
											</td>
											<td className="px-6 py-4">
												<button className="text-[#3498db] hover:text-[#2980b9] font-semibold text-sm">
													Ver detalles
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* Mensaje cuando no hay selección */}
			{!selectedResidencial && !loading && (
				<div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-8 rounded-lg text-center">
					<Building2
						className="mx-auto mb-3 text-blue-500"
						size={48}
					/>
					<p className="text-lg font-semibold">
						Por favor, seleccione una unidad residencial para ver
						sus residentes
					</p>
				</div>
			)}
		</div>
	);
};

export default ResidentesTab;
