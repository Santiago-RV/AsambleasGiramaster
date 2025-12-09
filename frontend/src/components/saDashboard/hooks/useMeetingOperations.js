import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MeetingService } from '../../../services/api/MeetingService';
import Swal from 'sweetalert2';

export const useMeetingOperations = (unitId) => {
	const queryClient = useQueryClient();

	// Mutación para crear reunión
	const createMeetingMutation = useMutation({
		mutationFn: MeetingService.createMeeting,
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['meetings', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Reunión Creada Exitosamente!',
				text:
					'La reunión se creó correctamente y las invitaciones han sido enviadas',
				showConfirmButton: true,
				confirmButtonColor: '#3498db',
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.message || 'Error al crear la reunión',
			});
		},
	});

	return {
		createMeetingMutation,
	};
};