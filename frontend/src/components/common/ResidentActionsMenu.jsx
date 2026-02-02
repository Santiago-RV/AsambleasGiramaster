import React from 'react';
import { Eye, Edit, Trash2, QrCode } from 'lucide-react';
import Swal from 'sweetalert2';

const ResidentActionsMenu = ({
	resident,
	position,
	onView,
	onEdit,
	onDelete,
	onGenerateQR,
	onClose,
}) => {
	const handleView = () => {
		onClose();
		Swal.fire({
			title: 'Detalles del Residente',
			html: `
				<div class="text-left">
					<p><strong>Nombre:</strong> ${resident.firstname} ${resident.lastname}</p>
					<p><strong>Usuario:</strong> ${resident.username}</p>
					<p><strong>Email:</strong> ${resident.email}</p>
					${resident.phone ? `<p><strong>Teléfono:</strong> ${resident.phone}</p>` : ''}
					<p><strong>Apartamento:</strong> ${resident.apartment_number}</p>
					<p><strong>Estado:</strong> ${resident.bln_allow_entry ? 'Activo' : 'Inactivo'}</p>
				</div>
			`,
			confirmButtonColor: '#3498db',
		});
	};

	const handleEdit = () => {
		onClose();
		onEdit(resident);
	};

	const handleDelete = () => {
		onClose();
		onDelete(
			resident.id,
			`${resident.firstname} ${resident.lastname}`,
			resident.apartment_number === 'ADMIN'
		);
	};

	const handleGenerateQR = () => {
		onClose();
		onGenerateQR(resident);
	};

	return (
		<>
			{/* Overlay para cerrar el menú */}
			<div
				className="fixed inset-0 z-40"
				onClick={onClose}
			></div>

			{/* Menú flotante */}
			<div
				className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
				style={{
					top: `${position.top}px`,
					left: `${position.left}px`,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={handleView}
					className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
				>
					<Eye size={16} />
					Ver detalles
				</button>
				<button
					onClick={handleEdit}
					className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
				>
					<Edit size={16} />
					Editar
				</button>
				<button
					onClick={handleGenerateQR}
					className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
				>
					<QrCode size={16} />
					Generar QR
				</button>
				<button
					onClick={handleDelete}
					className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
				>
					<Trash2 size={16} />
					Eliminar
				</button>
			</div>
		</>
	);
};

export default ResidentActionsMenu;
