import React, { useState } from 'react';
import Modal from '../../../common/Modal';
import { FileSpreadsheet, Upload, Download, X } from 'lucide-react';
import { ResidentialUnitService } from '../../../../services/api/ResidentialUnitService';
import Swal from 'sweetalert2';

const ExcelUploadModal = ({ isOpen, onClose, unitId, onSuccess }) => {
	const [selectedFile, setSelectedFile] = useState(null);
	const [isUploading, setIsUploading] = useState(false);

	const handleFileSelect = (e) => {
		const file = e.target.files[0];
		if (file) {
			// Validar que sea un archivo Excel
			const validExtensions = [
				'.xlsx',
				'.xls',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.ms-excel',
			];
			const fileExtension = file.name
				.substring(file.name.lastIndexOf('.'))
				.toLowerCase();
			const isValidType =
				validExtensions.includes(fileExtension) ||
				validExtensions.includes(file.type);

			if (!isValidType) {
				Swal.fire({
					icon: 'error',
					title: 'Archivo inválido',
					text: 'Por favor selecciona un archivo Excel (.xlsx o .xls)',
					confirmButtonColor: '#3498db',
				});
				e.target.value = '';
				return;
			}

			setSelectedFile(file);
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		const fileInput = document.getElementById('excel-file-input');
		if (fileInput) {
			fileInput.value = '';
		}
	};

	const handleUploadExcel = async () => {
		if (!selectedFile) {
			Swal.fire({
				icon: 'warning',
				title: 'Archivo requerido',
				text: 'Por favor selecciona un archivo Excel',
				confirmButtonColor: '#3498db',
			});
			return;
		}

		setIsUploading(true);

		try {
			const response = await ResidentialUnitService.uploadResidentsExcel(unitId, selectedFile);

			const { total_rows, successful, failed, users_created, errors } =
				response.data;

			setSelectedFile(null);
			setIsUploading(false);

			let htmlContent = `
			<div class="text-left space-y-3">
				<div class="bg-blue-50 p-3 rounded-lg">
					<p class="font-semibold text-blue-800">📊 Resumen del Proceso</p>
					<p class="text-sm text-blue-700">Total de filas procesadas: <strong>${total_rows}</strong></p>
					<p class="text-sm text-green-700">Copropietarios creados exitosamente: <strong>${successful}</strong></p>
					<p class="text-sm text-green-700">Nuevos usuarios creados: <strong>${users_created}</strong></p>
					${
						failed > 0
							? `<p class="text-sm text-red-700">Filas con errores: <strong>${failed}</strong></p>`
							: ''
					}
				</div>
		`;

			if (errors && errors.length > 0) {
				htmlContent += `
				<div class="bg-red-50 p-3 rounded-lg max-h-48 overflow-y-auto">
					<p class="font-semibold text-red-800 mb-2">❌ Errores Encontrados:</p>
					<ul class="text-sm text-red-700 space-y-1">
			`;

				errors.forEach((error) => {
					htmlContent += `<li>Fila ${error.row} (${error.email}): ${error.error}</li>`;
				});

				htmlContent += `
					</ul>
				</div>
			`;
			}

			htmlContent += `
				<div class="text-xs text-gray-600 mt-2">
					<p>💡 Los copropietarios creados ya pueden iniciar sesión con su email y la contraseña configurada.</p>
				</div>
			</div>
		`;

			Swal.fire({
				icon: successful > 0 ? 'success' : 'error',
				title: successful > 0 ? '¡Carga completada!' : 'Error en la carga',
				html: htmlContent,
				confirmButtonColor: '#3498db',
				width: '600px',
			});

			onSuccess();
			onClose();
		} catch (error) {
			console.error('Error uploading Excel:', error);
			setIsUploading(false);

			Swal.fire({
				icon: 'error',
				title: 'Error al cargar archivo',
				html: `
				<div class="text-left">
					<p class="mb-2">${error.message}</p>
					<div class="bg-gray-50 p-3 rounded text-sm">
						<p class="font-semibold mb-1">Verifica que:</p>
						<ul class="list-disc list-inside space-y-1">
							<li>El archivo sea formato Excel (.xlsx o .xls)</li>
							<li>Contenga las columnas requeridas: firstname, lastname, email, apartment_number</li>
							<li>Los emails sean válidos y únicos</li>
							<li>Tengas permisos de Super Admin</li>
						</ul>
					</div>
				</div>
			`,
				confirmButtonColor: '#3498db',
				width: '600px',
			});
		}
	};

	const handleDownloadTemplate = () => {
		try {
			ResidentialUnitService.downloadResidentsExcelTemplate();;

			Swal.fire({
				icon: 'success',
				title: 'Plantilla descargada',
				text: 'La plantilla de Excel ha sido descargada. Complétala con los datos de los copropietarios.',
				timer: 3000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error('Error downloading template:', error);

			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se pudo descargar la plantilla',
				confirmButtonColor: '#3498db',
			});
		}
	};

	const handleClose = () => {
		if (!isUploading) {
			setSelectedFile(null);
			const fileInput = document.getElementById('excel-file-input');
			if (fileInput) {
				fileInput.value = '';
			}
			onClose();
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title="Cargar Copropietarios desde Excel"
			size="lg"
		>
			<div className="space-y-6">
				{/* Botón para descargar plantilla */}
				<div className="bg-green-50 p-4 rounded-lg border border-green-200">
					<h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
						<FileSpreadsheet size={20} />
						Descargar Plantilla
					</h3>
					<p className="text-sm text-green-700 mb-3">
						Descarga la plantilla de Excel para facilitar la carga de
						copropietarios con sus pesos de votación.
					</p>
					<button
						type="button"
						onClick={handleDownloadTemplate}
						className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
					>
						<Download size={18} />
						Descargar Plantilla Excel
					</button>
				</div>

				{/* Información sobre voting_weight */}
				<div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
					<h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
						⚖️ Sobre el Peso de Votación
					</h3>
					<div className="text-sm text-purple-700 space-y-2">
						<p>
							El <strong>voting_weight</strong> (peso de votación) representa el
							coeficiente de copropiedad de cada propietario.
						</p>
						<div className="bg-purple-100 p-3 rounded">
							<p className="font-semibold mb-1">Ejemplos:</p>
							<ul className="list-disc list-inside space-y-1 ml-2">
								<li>
									<code className="bg-white px-2 py-0.5 rounded">0.25</code> =
									25% (apartamento grande)
								</li>
								<li>
									<code className="bg-white px-2 py-0.5 rounded">0.15</code> =
									15% (apartamento mediano)
								</li>
								<li>
									<code className="bg-white px-2 py-0.5 rounded">0.10</code> =
									10% (apartamento pequeño)
								</li>
							</ul>
						</div>
						<p className="text-xs text-purple-600 mt-2">
							💡 <strong>Importante:</strong> Este peso se usa para ponderar los
							votos en las encuestas. La suma de todos los pesos debería ser 1.0
							(100%).
						</p>
					</div>
				</div>

				{/* Información sobre formato */}
				<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
					<h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
						<FileSpreadsheet size={20} />
						Formato del Archivo Excel
					</h3>
					<p className="text-sm text-blue-700 mb-2">
						El archivo Excel debe contener las siguientes columnas:
					</p>
					<div className="space-y-3">
						<div>
							<p className="text-sm font-semibold text-blue-800 mb-1">
								📋 Columnas REQUERIDAS:
							</p>
							<ul className="text-sm text-blue-700 list-disc list-inside space-y-1 ml-2">
								<li>
									<strong>email</strong> - Email del copropietario (único, será
									su usuario de login)
								</li>
								<li>
									<strong>firstname</strong> - Nombre del copropietario
								</li>
								<li>
									<strong>lastname</strong> - Apellido del copropietario
								</li>
								<li>
									<strong>apartment_number</strong> - Número de apartamento
								</li>
								<li>
									<strong>voting_weight</strong> - Peso de votación (ej: 0.25,
									0.30, 0.15)
								</li>
							</ul>
						</div>
						<div>
							<p className="text-sm font-semibold text-blue-800 mb-1">
								📝 Columnas OPCIONALES:
							</p>
							<ul className="text-sm text-blue-700 list-disc list-inside space-y-1 ml-2">
								<li>
									<strong>phone</strong> - Teléfono del copropietario (puede
									estar vacío)
								</li>
								<li>
									<strong>password</strong> - Contraseña inicial (default:
									Temporal123!)
								</li>
							</ul>
						</div>
					</div>
					<div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
						<p className="text-xs text-yellow-800">
							⚠️ <strong>Formato de ejemplo:</strong>
						</p>
						<div className="mt-2 bg-white p-2 rounded text-xs font-mono overflow-x-auto">
							<table className="min-w-full">
								<thead>
									<tr className="text-left">
										<th className="px-2">email</th>
										<th className="px-2">firstname</th>
										<th className="px-2">lastname</th>
										<th className="px-2">apartment_number</th>
										<th className="px-2">voting_weight</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td className="px-2">juan@email.com</td>
										<td className="px-2">Juan</td>
										<td className="px-2">Pérez</td>
										<td className="px-2">101</td>
										<td className="px-2 font-bold text-purple-600">0.25</td>
									</tr>
									<tr>
										<td className="px-2">maria@email.com</td>
										<td className="px-2">María</td>
										<td className="px-2">González</td>
										<td className="px-2">102</td>
										<td className="px-2 font-bold text-purple-600">0.30</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Selector de archivo */}
				<div>
					<label className="block mb-3 font-semibold text-gray-700">
						Seleccionar Archivo Excel *
					</label>
					<div className="relative">
						<input
							id="excel-file-input"
							type="file"
							accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
							onChange={handleFileSelect}
							disabled={isUploading}
							className="hidden"
						/>
						<label
							htmlFor="excel-file-input"
							className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
								isUploading
									? 'border-gray-300 bg-gray-50 cursor-not-allowed'
									: selectedFile
									? 'border-green-300 bg-green-50'
									: 'border-gray-300 bg-gray-50 hover:border-[#3498db] hover:bg-blue-50'
							}`}
						>
							{selectedFile ? (
								<>
									<FileSpreadsheet className="text-green-500 mb-2" size={40} />
									<p className="text-sm font-semibold text-green-700">
										{selectedFile.name}
									</p>
									<p className="text-xs text-green-600 mt-1">
										{(selectedFile.size / 1024).toFixed(2)} KB
									</p>
								</>
							) : (
								<>
									<Upload className="text-gray-400 mb-2" size={40} />
									<p className="text-sm text-gray-600">
										<span className="font-semibold text-[#3498db]">
											Haz clic para seleccionar
										</span>{' '}
										o arrastra el archivo aquí
									</p>
									<p className="text-xs text-gray-500 mt-1">
										Formatos aceptados: .xlsx, .xls
									</p>
								</>
							)}
						</label>
					</div>

					{selectedFile && (
						<button
							type="button"
							onClick={handleRemoveFile}
							disabled={isUploading}
							className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
						>
							<X size={16} />
							Remover archivo
						</button>
					)}
				</div>

				{/* Botones de acción */}
				<div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
					<button
						type="button"
						onClick={handleClose}
						disabled={isUploading}
						className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancelar
					</button>
					<button
						type="button"
						onClick={handleUploadExcel}
						disabled={!selectedFile || isUploading}
						className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{isUploading ? (
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
								<span>Procesando...</span>
							</>
						) : (
							<>
								<Upload size={18} />
								<span>Cargar Copropietarios</span>
							</>
						)}
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default ExcelUploadModal;