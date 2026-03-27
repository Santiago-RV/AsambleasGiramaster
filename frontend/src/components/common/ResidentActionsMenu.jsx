import React from 'react';
import { Eye, Edit, Trash2, QrCode } from 'lucide-react';
import { showSingleDeleteConfirmModal } from './BulkDeleteConfirmModal';

const ResidentActionsMenu = ({
	resident,
	position,
	onEdit,
	onDelete,
	onGenerateQR,
	onClose,
	onShowDetails,
	residentialUnitName,
}) => {
	const handleView = (e) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		onClose();
		if (onShowDetails) {
			onShowDetails(resident);
		}
	};

	const handleEdit = () => {
		onClose();
		onEdit(resident);
	};

	const handleDelete = async () => {
		onClose();
		
		const name = `${resident.firstname} ${resident.lastname}`;
		const apartment = resident.apartment_number || 'N/A';
		
		await showSingleDeleteConfirmModal({
			name,
			apartment,
			unitName: residentialUnitName,
			onConfirm: async () => {
				await onDelete(
					resident.id,
					name,
					resident.apartment_number === 'ADMIN'
				);
			}
		});
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
