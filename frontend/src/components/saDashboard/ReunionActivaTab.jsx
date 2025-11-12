import React from 'react';
import {
	PlayCircle,
	Users,
	Clock,
	CheckCircle,
	AlertCircle,
	Vote,
} from 'lucide-react';

const ReunionActivaTab = () => {
	return (
		<div className="space-y-8">
			{/* Encabezado */}
			<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-8 text-white">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm animate-pulse">
							<PlayCircle size={32} />
						</div>
						<div>
							<h1 className="text-3xl font-bold mb-1">
								Asamblea Extraordinaria
							</h1>
							<p className="text-green-100">
								Las Palmas - En curso
							</p>
						</div>
					</div>
					<button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold">
						Finalizar Reunión
					</button>
				</div>

				<div className="grid grid-cols-4 gap-4">
					<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
						<div className="flex items-center gap-2 text-green-100 text-sm mb-2">
							<Users size={16} />
							<span>Asistentes</span>
						</div>
						<p className="text-3xl font-bold">78</p>
					</div>
					<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
						<div className="flex items-center gap-2 text-green-100 text-sm mb-2">
							<Clock size={16} />
							<span>Duración</span>
						</div>
						<p className="text-3xl font-bold">1h 23m</p>
					</div>
					<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
						<div className="flex items-center gap-2 text-green-100 text-sm mb-2">
							<CheckCircle size={16} />
							<span>Quórum</span>
						</div>
						<p className="text-3xl font-bold">85%</p>
					</div>
					<div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
						<div className="flex items-center gap-2 text-green-100 text-sm mb-2">
							<Vote size={16} />
							<span>Votaciones</span>
						</div>
						<p className="text-3xl font-bold">3</p>
					</div>
				</div>
			</div>

			{/* Contenido principal */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Columna izquierda - Agenda y votaciones */}
				<div className="lg:col-span-2 space-y-6">
					{/* Agenda actual */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-800 mb-4">
							Agenda Actual
						</h2>
						<div className="space-y-3">
							{[
								{
									id: 1,
									texto: 'Apertura y verificación de quórum',
									completado: true,
								},
								{
									id: 2,
									texto: 'Aprobación de presupuesto 2025',
									completado: true,
								},
								{
									id: 3,
									texto: 'Votación de obras comunes',
									completado: false,
									activo: true,
								},
								{
									id: 4,
									texto: 'Varios y cierre',
									completado: false,
								},
							].map((item) => (
								<div
									key={item.id}
									className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
										item.activo
											? 'border-green-500 bg-green-50'
											: item.completado
											? 'border-gray-200 bg-gray-50'
											: 'border-gray-200'
									}`}
								>
									{item.completado ? (
										<CheckCircle
											size={20}
											className="text-green-500"
										/>
									) : (
										<AlertCircle
											size={20}
											className={
												item.activo
													? 'text-green-500'
													: 'text-gray-400'
											}
										/>
									)}
									<span
										className={`font-medium ${
											item.activo
												? 'text-green-700'
												: item.completado
												? 'text-gray-500'
												: 'text-gray-700'
										}`}
									>
										{item.texto}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Votación activa */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold text-gray-800">
								Votación en Curso
							</h2>
							<span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
								Abierta
							</span>
						</div>
						<p className="text-gray-700 mb-6">
							¿Aprobar el presupuesto de $150,000,000 para la
							renovación de áreas comunes?
						</p>

						<div className="space-y-3 mb-6">
							<div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
								<div className="flex items-center gap-2">
									<CheckCircle
										size={20}
										className="text-green-600"
									/>
									<span className="font-semibold text-gray-800">
										A Favor
									</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
										<div
											className="h-full bg-green-500"
											style={{ width: '68%' }}
										></div>
									</div>
									<span className="font-bold text-gray-800">
										53 (68%)
									</span>
								</div>
							</div>

							<div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
								<div className="flex items-center gap-2">
									<AlertCircle
										size={20}
										className="text-red-600"
									/>
									<span className="font-semibold text-gray-800">
										En Contra
									</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
										<div
											className="h-full bg-red-500"
											style={{ width: '32%' }}
										></div>
									</div>
									<span className="font-bold text-gray-800">
										25 (32%)
									</span>
								</div>
							</div>
						</div>

						<button className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold">
							Cerrar Votación
						</button>
					</div>
				</div>

				{/* Columna derecha - Participantes */}
				<div className="space-y-6">
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-800 mb-4">
							Participantes
						</h2>
						<div className="space-y-3 max-h-[600px] overflow-y-auto">
							{Array.from({ length: 10 }, (_, i) => ({
								id: i + 1,
								nombre: `Participante ${i + 1}`,
								conectado: i < 8,
								voto: i < 5 ? 'favor' : i < 8 ? 'contra' : null,
							})).map((participante) => (
								<div
									key={participante.id}
									className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
								>
									<div className="flex items-center gap-3">
										<div
											className={`w-10 h-10 rounded-full ${
												participante.conectado
													? 'bg-gradient-to-br from-[#3498db] to-[#2980b9]'
													: 'bg-gray-300'
											} flex items-center justify-center text-white font-bold text-sm`}
										>
											P{participante.id}
										</div>
										<div>
											<p className="font-semibold text-gray-800 text-sm">
												{participante.nombre}
											</p>
											<p className="text-xs text-gray-500">
												{participante.conectado
													? 'En línea'
													: 'Desconectado'}
											</p>
										</div>
									</div>
									{participante.voto && (
										<div
											className={`w-2 h-2 rounded-full ${
												participante.voto === 'favor'
													? 'bg-green-500'
													: 'bg-red-500'
											}`}
										></div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ReunionActivaTab;
