import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFound = () => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#2c3e50] to-[#34495e] flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				<div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
					{/* Icono de error */}
					<div className="mb-6">
						<div className="mx-auto w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
							<AlertCircle size={48} className="text-red-500" />
						</div>
					</div>

					{/* Número 404 */}
					<h1 className="text-8xl font-bold text-gray-800 mb-4">
						404
					</h1>

					{/* Mensaje */}
					<h2 className="text-2xl font-bold text-gray-800 mb-2">
						Página No Encontrada
					</h2>
					<p className="text-gray-600 mb-8">
						La página que buscas no existe o ha sido movida.
					</p>

					{/* Botones */}
					<div className="space-y-3">
						<button
							onClick={() => navigate('/')}
							className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white rounded-lg hover:shadow-lg transition-all font-semibold"
						>
							<Home size={20} />
							Volver al Inicio
						</button>
						<button
							onClick={() => navigate(-1)}
							className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
						>
							Volver Atrás
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotFound;
