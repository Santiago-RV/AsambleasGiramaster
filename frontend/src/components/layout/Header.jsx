import React from 'react';

/**
 * Componente Header reutilizable para dashboards
 * @param {string} title - Título principal del header
 * @param {React.ReactNode} actions - Acciones/botones del header
 * @param {string} className - Clases adicionales
 */
const Header = ({ title, actions, className = '' }) => {
	return (
		<div className={`flex items-center justify-between min-w-0 ${className}`}>
			<h1
				className="
					min-w-0
					text-2xl
					font-semibold
					text-gray-800
					truncate
				"
				title={title}
			>
				{title}
			</h1>

			{/* Acciones SOLO desktop */}
			{actions && (
				<div className="hidden md:flex flex-shrink-0 gap-3">
					{actions}
				</div>
			)}
		</div>
	);
};

export default Header;
