import React from 'react';

/**
 * Componente Header reutilizable para dashboards
 * @param {string} title - Título principal del header
 * @param {React.ReactNode} actions - Acciones/botones del header
 * @param {string} className - Clases adicionales
 */
const Header = ({ title, actions, className = '' }) => {
	return (
		<div className={`mb-6 flex justify-between items-center ${className}`}>
			<h1 className="text-2xl font-semibold text-gray-800">
				{title}
			</h1>

			{actions && (
				<div className="flex gap-3">
					{actions}
				</div>
			)}
		</div>
	);
};

export default Header;
