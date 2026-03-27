import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MeetingService } from '../../../services/api/MeetingService';
import { ResidentService } from '../../../services/api/ResidentService';
import Swal from 'sweetalert2';
import { showMeetingInvitationProgressModal } from '../../common/BulkDeleteConfirmModal';
import { useProgressNotification } from '../../../contexts/ProgressNotificationContext';

export const useMeetingOperations = (unitId) => {
	const queryClient = useQueryClient();
	const { startProgress, updateProgress, finishProgress } = useProgressNotification();

	// Mutación para crear reunión
	const createMeetingMutation = useMutation({
		mutationFn: MeetingService.createMeeting,
		onSuccess: async (response) => {
			queryClient.invalidateQueries({ queryKey: ['meetings', unitId] });
			
			const taskId = response.data?.invitation_task_id;
			const meetingTitle = response.data?.str_title || 'Reunión';
			const totalInvited = response.data?.int_total_invitated || 0;
			
			if (taskId) {
				showMeetingInvitationProgressModal({
					meetingTitle: meetingTitle,
					total: totalInvited,
					pollProgressFn: () => ResidentService.getEmailTaskStatus(taskId),
					startProgress,
					updateProgress,
					finishProgress
				});
			} else {
				Swal.fire({
					icon: 'success',
					title: '¡Reunión Creada Exitosamente!',
					text: 'La reunión se creó correctamente',
					showConfirmButton: true,
					confirmButtonColor: '#3498db',
				});
			}
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.response?.data?.message || error.message || 'Error al crear la reunión',
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