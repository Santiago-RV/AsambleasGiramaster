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

	// Mutación para finalizar reunión
	const endMeetingMutation = useMutation({
		mutationFn: (meetingId) => MeetingService.endMeeting(meetingId),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['meetings', unitId] });
			queryClient.invalidateQueries({ queryKey: ['meetings'] });
			Swal.fire({
				icon: 'success',
				title: 'Reunion Finalizada',
				html: `
					<div class="text-left">
						<p class="mb-3">${response.message || 'La reunion ha sido finalizada exitosamente'}</p>
						<div class="bg-gray-50 p-3 rounded-lg">
							<p class="text-sm text-gray-700">
								Estado: <strong>Completada</strong>
							</p>
						</div>
					</div>
				`,
				confirmButtonColor: '#10b981',
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.response?.data?.message || error.message || 'Error al finalizar la reunion',
				confirmButtonColor: '#dc2626',
			});
		},
	});

	return {
		createMeetingMutation,
		endMeetingMutation,
	};
};