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
		mutationFn: async (data) => {
			// Mostrar loader mientras se verifica el servicio de correo
			Swal.fire({
				title: 'Verificando servicio de correo...',
				allowOutsideClick: false,
				showConfirmButton: false,
				didOpen: () => {
					Swal.showLoading();
				}
			});

			// Timeout de 3 segundos
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Timeout')), 3000)
			);

			try {
				const statusCheck = await Promise.race([
					ResidentService.checkCeleryStatus(),
					timeoutPromise
				]);

				Swal.close();

				if (!statusCheck.data?.celery_available) {
					Swal.fire({
						icon: 'error',
						title: 'Servicio no disponible',
						html: `
							<div class="text-left">
								<p class="mb-2">${statusCheck.data?.message || 'El servicio de correos no está disponible en este momento.'}</p>
								<p class="text-sm text-gray-600 mb-2">Por favor, contacte a soporte técnico.</p>
								<p class="text-xs text-gray-500">Los mensajes permanecerán en espera y se enviarán una vez corregido el problema.</p>
							</div>
						`,
						confirmButtonText: 'Aceptar',
						confirmButtonColor: '#e74c3c'
					});
					throw new Error('Celery no disponible');
				}
			} catch {
				// Si falla por timeout o error, continuar con el envío
				Swal.close();
			}

			return await MeetingService.createMeeting(data);
		},
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
					finishProgress,
					timeoutMs: 120000,
					onTimeout: () => {
						Swal.fire({
							icon: 'warning',
							title: 'Tiempo de espera agotado',
							text: 'El servicio de correos tardó más de lo esperado. Por favor, contacte a soporte técnico.',
							confirmButtonText: 'Aceptar'
						});
					}
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