import React from 'react';
import Modal from '../../../common/Modal';
import { Video, MapPin } from 'lucide-react';

const MeetingTypeSelector = ({ isOpen, onClose, onSelect }) => {
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Tipo de Reunion" size="md">
			<div className="space-y-4">
				<p className="text-sm text-gray-600 text-center">
					Selecciona la modalidad de la reunion que deseas crear
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{/* Opcion Virtual */}
					<button
						type="button"
						onClick={() => onSelect('virtual')}
						className="group relative flex flex-col items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
					>
						<div className="p-4 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
							<Video className="w-10 h-10 text-blue-600" />
						</div>
						<div className="text-center">
							<h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700">
								Virtual
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

				<div className="flex justify-center pt-2">
					<button
						type="button"
						onClick={onClose}
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
