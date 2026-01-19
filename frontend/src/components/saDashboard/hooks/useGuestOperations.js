import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GuestService } from '../../../services/api/GuestService';
import Swal from 'sweetalert2';

/**
 * Hook personalizado para operaciones CRUD de invitados
 * @param {number} unitId - ID de la unidad residencial
 */
export const useGuestOperations = (unitId) => {
	const queryClient = useQueryClient();

	// Mutación para crear invitado
	const createGuestMutation = useMutation({
		mutationFn: async (data) => {
			return await GuestService.createGuest(unitId, data);
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['guests', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Invitado creado exitosamente',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				backdrop: false,
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text:
					error.response?.data?.message ||
					error.message ||
					'Error al crear el invitado',
			});
		},
	});

	// Mutación para eliminar invitado
	const deleteGuestMutation = useMutation({
		mutationFn: ({ guestId }) =>
			GuestService.deleteGuest(unitId, guestId),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['guests', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Eliminado!',
				text: response.message || 'Invitado eliminado exitosamente',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				backdrop: false,
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error al Eliminar',
				text:
					error.response?.data?.message ||
					error.message ||
					'No se pudo eliminar el invitado',
				confirmButtonColor: '#ef4444',
			});
		},
	});

	return {
		createGuestMutation,
		deleteGuestMutation,
	};
};
