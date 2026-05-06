import React, { useState } from 'react';
import Modal from '../../../common/Modal';
import { Video, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import SystemConfigService from '../../../../services/api/SystemConfigService';

const MeetingTypeSelector = ({ isOpen, onClose, onSelect }) => {
	const [checkingZoom, setCheckingZoom] = useState(false);
	const [zoomError, setZoomError] = useState(null);

	const handleVirtualClick = async () => {
		setZoomError(null);
		setCheckingZoom(true);
		try {
			const response = await SystemConfigService.getZoomAccounts();
			const configured = (response?.data?.accounts || []).filter(a => a.is_configured);
			if (configured.length === 0) {
				setZoomError('No hay cuentas Zoom configuradas. Ve a Configuracion del Sistema para agregar credenciales antes de crear reuniones virtuales.');
			} else {
				onSelect('virtual');
			}
		} catch {
			setZoomError('No se pudo verificar la configuracion de Zoom. Intenta de nuevo.');
		} finally {
			setCheckingZoom(false);
		}
	};

	const handleClose = () => {
		setZoomError(null);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Tipo de Reunion" size="md">
			<div className="space-y-4">
				<p className="text-sm text-gray-600 text-center">
					Selecciona la modalidad de la reunion que deseas crear
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{/* Opcion Virtual */}
					<button
						type="button"
						onClick={handleVirtualClick}
						disabled={checkingZoom}
						className="group relative flex flex-col items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
					>
						<div className="p-4 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
							{checkingZoom
								? <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
								: <Video className="w-10 h-10 text-blue-600" />
							}
						</div>
						<div className="text-center">
							<h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700">
								{checkingZoom ? 'Verificando...' : 'Virtual'}
							</h3>
							<p className="text-xs text-gray-500 mt-1 leading-relaxed">
								Se creara una reunion en Zoom automaticamente con enlace de acceso para todos los participantes
							</p>
						</div>
						<div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
					</button>

					{/* Opcion Presencial */}
					<button
						type="button"
						onClick={() => onSelect('presencial')}
						className="group relative flex flex-col items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
					>
						<div className="p-4 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
							<MapPin className="w-10 h-10 text-emerald-600" />
						</div>
						<div className="text-center">
							<h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-700">
								Presencial
							</h3>
							<p className="text-xs text-gray-500 mt-1 leading-relaxed">
								Reunion en un lugar fisico. Se registrara en el sistema y se enviaran las invitaciones por correo
							</p>
						</div>
						<div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
					</button>
				</div>

				{zoomError && (
					<div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
						<AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
						<span>{zoomError}</span>
					</div>
				)}

				<div className="flex justify-center pt-2">
					<button
						type="button"
						onClick={handleClose}
						className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
					>
						Cancelar
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default MeetingTypeSelector;
