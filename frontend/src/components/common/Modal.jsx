import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
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

	// Tamaños del modal
	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl',
		xl: 'max-w-5xl',
		'2xl': 'max-w-3xl',
		full: 'max-w-7xl',
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Overlay */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
			></div>

			{/* Modal Container */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div
					className={`relative bg-white rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col`}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-200">
						<h2 className="text-2xl font-bold text-gray-800">
							{title}
						</h2>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<X size={24} className="text-gray-600" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-6">{children}</div>
				</div>
			</div>
		</div>
	);
};

export default Modal;
