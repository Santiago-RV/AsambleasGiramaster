import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const VotingModal = ({ isOpen, onClose, meetingData }) => {
	// Cerrar modal con tecla ESC
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			// Prevenir scroll del body cuando el modal está abierto
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[60] overflow-y-auto">
			{/* Overlay */}
			<div
				className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
				onClick={onClose}
			></div>

			{/* Modal Container */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div
					className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-700"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
						<div>
							<h2 className="text-2xl font-bold text-white">
								Votaciones
							</h2>
							<p className="text-blue-100 text-sm mt-1">
								{meetingData?.str_title || 'Reunión'}
							</p>
						</div>
						<button
							onClick={onClose}
							className="p-2 hover:bg-white/10 rounded-lg transition-colors"
						>
							<X size={24} className="text-white" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-6">
						{/* Votación activa */}
						<div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 mb-4 border border-blue-500/30 shadow-lg">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-white font-bold text-lg">
									Votación en curso
								</h3>
								<span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full animate-pulse shadow-lg">
									Activa
								</span>
							</div>

							<p className="text-gray-200 mb-5 text-base leading-relaxed">
								¿Aprueba el presupuesto anual 2025?
							</p>

							{/* Opciones de votación */}
							<div className="space-y-3">
								<button className="w-full p-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
									✓ A Favor
								</button>
								<button className="w-full p-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
									✗ En Contra
								</button>
								<button className="w-full p-4 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-xl transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
									− Abstención
								</button>
							</div>

							{/* Resultados parciales */}
							<div className="mt-5 pt-5 border-t border-gray-700">
								<p className="text-gray-300 text-sm font-semibold mb-3">
									Resultados parciales:
								</p>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 bg-green-500 rounded-full"></div>
											<span className="text-green-400 font-medium">
												A Favor
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="flex-1 w-20 bg-gray-700 rounded-full h-2 mr-2">
												<div
													className="bg-green-500 h-2 rounded-full"
													style={{ width: '65%' }}
												></div>
											</div>
											<span className="text-white font-bold min-w-[60px] text-right">
												15 (65%)
											</span>
										</div>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 bg-red-500 rounded-full"></div>
											<span className="text-red-400 font-medium">
												En Contra
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="flex-1 w-20 bg-gray-700 rounded-full h-2 mr-2">
												<div
													className="bg-red-500 h-2 rounded-full"
													style={{ width: '22%' }}
												></div>
											</div>
											<span className="text-white font-bold min-w-[60px] text-right">
												5 (22%)
											</span>
										</div>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
											<span className="text-yellow-400 font-medium">
												Abstención
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="flex-1 w-20 bg-gray-700 rounded-full h-2 mr-2">
												<div
													className="bg-yellow-500 h-2 rounded-full"
													style={{ width: '13%' }}
												></div>
											</div>
											<span className="text-white font-bold min-w-[60px] text-right">
												3 (13%)
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Votaciones anteriores */}
						<div className="mb-4">
							<h3 className="text-gray-300 text-sm font-bold mb-3 uppercase tracking-wider">
								Votaciones Anteriores
							</h3>

							<div className="bg-gray-900/60 rounded-xl p-4 mb-3 border border-gray-700/50 shadow-md">
								<div className="flex items-center justify-between mb-3">
									<h4 className="text-white font-semibold text-sm">
										Aprobación de actas
									</h4>
									<span className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-full">
										Finalizada
									</span>
								</div>
								<div className="space-y-2 text-sm">
									<div className="flex items-center justify-between">
										<span className="text-green-400 flex items-center gap-2">
											<div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
											A Favor
										</span>
										<span className="text-white font-semibold">
											20 (87%)
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-red-400 flex items-center gap-2">
											<div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
											En Contra
										</span>
										<span className="text-white font-semibold">
											2 (9%)
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-yellow-400 flex items-center gap-2">
											<div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
											Abstención
										</span>
										<span className="text-white font-semibold">
											1 (4%)
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Footer - Info de participación */}
						<div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 rounded-xl p-4 border border-blue-500/30 shadow-md">
							<div className="flex items-center justify-between">
								<span className="text-gray-300 font-medium">
									Participación total:
								</span>
								<span className="text-white font-bold text-lg">
									23/25 (92%)
								</span>
							</div>
							<div className="mt-2 w-full bg-gray-700 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
									style={{ width: '92%' }}
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default VotingModal;
