import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResidentService } from '../../../services/api/ResidentService';
import CoownerService from '../../../services/api/coownerService';
import Swal from 'sweetalert2';
import { showBulkDeleteWithLoading, showBulkSendProgressModal } from '../../common/BulkDeleteConfirmModal';
import { useProgressNotification } from '../../../contexts/ProgressNotificationContext';
import { Mail } from 'lucide-react';

export const useResidentOperations = (unitId) => {
	const queryClient = useQueryClient();
	const { startProgress, updateProgress, finishProgress } = useProgressNotification();

	// Mutación para crear residente
	const createResidentMutation = useMutation({
		mutationFn: async (data) => {
			return await ResidentService.createResident(unitId, data);
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Copropietario creado exitosamente',
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
					'Error al crear el copropietario',
			});
		},
	});

	// Mutación para actualizar residente
	const updateResidentMutation = useMutation({
		mutationFn: async ({ residentId, data }) => {
			return await ResidentService.updateResident(unitId, residentId, data);
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Éxito!',
				text: response.message || 'Copropietario actualizado exitosamente',
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
					'Error al actualizar el copropietario',
			});
		},
	});

	// Mutación para eliminar residente
	const deleteResidentMutation = useMutation({
		mutationFn: ({ userId, unitId }) =>
			ResidentService.deleteResident(unitId, userId),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			queryClient.invalidateQueries({ queryKey: ['administrator', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Eliminado!',
				text: response.message || 'El usuario ha sido eliminado exitosamente',
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
					'No se pudo eliminar el usuario',
				confirmButtonColor: '#ef4444',
			});
		},
	});

	// Mutación para toggle access individual
	const toggleAccessMutation = useMutation({
		mutationFn: async ({ userId, enabled }) => {
			return await ResidentService.toggleUserAccess(unitId, userId, enabled);
		},
		onSuccess: (response, variables) => {
			const action = variables.enabled ? 'habilitado' : 'deshabilitado';
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });

			Swal.fire({
				icon: 'success',
				title: '¡Acceso Modificado!',
				text: `Acceso ${action} exitosamente`,
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
					error.response?.data?.message || 'No se pudo modificar el acceso',
				confirmButtonColor: '#ef4444',
			});
		},
	});

	// Mutación para toggle access masivo
	const toggleAccessBulkMutation = useMutation({
		mutationFn: async ({ userIds, enabled }) => {
			return await ResidentService.toggleUsersAccessBulk(unitId, userIds, enabled);
		},
		onSuccess: (response) => {
			const { successful, failed, already_in_state, total_processed } =
				response.data;
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });

			Swal.fire({
				icon: successful === total_processed ? 'success' : 'warning',
				title: 'Acceso Modificado',
				html: `
        <div class="text-left">
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-700"><strong>Exitosos:</strong> ${successful}</p>
            ${
							already_in_state > 0
								? `<p class="text-sm text-gray-700"><strong>Sin cambios:</strong> ${already_in_state}</p>`
								: ''
						}
            ${failed > 0 ? `<p class="text-sm text-red-700"><strong>Fallidos:</strong> ${failed}</p>` : ''}
          </div>
        </div>
      `,
				confirmButtonColor: '#27ae60',
				width: '500px',
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: error.response?.data?.message || 'Error al modificar acceso',
				confirmButtonColor: '#e74c3c',
			});
		},
	});

	// Mutación para el envío masivo de credenciales
	const sendBulkCredentialsMutation = useMutation({
		mutationFn: async (residentIds) => {
			const ids = Array.isArray(residentIds) ? residentIds : [residentIds];
			
			const statusCheck = await ResidentService.checkCeleryStatus();
			if (!statusCheck.data?.celery_available) {
				throw new Error(statusCheck.data?.message || 'El servicio de correos no está disponible en este momento. Por favor, contacte a soporte técnico.');
			}
			
			const response = await ResidentService.sendBulkCredentials(unitId, ids);
			const taskId = response.data?.task_id;
			const total = response.data?.total || ids.length;

			if (taskId) {
				await showBulkSendProgressModal({
					total: total,
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

				const finalStatus = await ResidentService.getEmailTaskStatus(taskId);
				return {
					...response,
					finalStatus: finalStatus.data
				};
			}

			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', unitId] });
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error al Enviar Credenciales',
				text:
					error.response?.data?.message ||
					error.message ||
					'Error al enviar credenciales masivamente',
				confirmButtonColor: '#e74c3c',
			});
		},
	});

	// Handler para reenviar credenciales individuales
	const handleResendCredentials = async (resident) => {
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
			setTimeout(() => reject(new Error('Timeout de verificación')), 3000)
		);

		try {
			const statusCheck = await Promise.race([
				ResidentService.checkCeleryStatus(),
				timeoutPromise
			]);

			if (!statusCheck.data?.celery_available) {
				Swal.close();
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
					confirmButtonColor: '#e74c3c',
				});
				return;
			}
		} catch (error) {
			// Si falla por timeout o error, continuar con el envío
			Swal.close();
		}

		// Continuar con el flujo normal de confirmación
		const result = await Swal.fire({
			title: '¿Reenviar credenciales?',
			html: `
        <div class="text-left">
          <p class="mb-3">Se enviará un enlace de acceso directo por correo a:</p>
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="font-semibold text-blue-800">${resident.firstname} ${resident.lastname}</p>
            <p class="text-sm text-blue-700 mt-1">
              <strong>Email:</strong> ${resident.email}
            </p>
            <p class="text-sm text-blue-700">
              <strong>Usuario:</strong> ${resident.username}
            </p>
          </div>
          <p class="text-xs text-gray-600 mt-3">
            💡 Podrá acceder directamente al sistema sin escribir contraseña. El enlace tiene vigencia de 24 horas.
          </p>
        </div>
      `,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3498db',
			cancelButtonColor: '#95a5a6',
			confirmButtonText: 'Sí, enviar',
			cancelButtonText: 'Cancelar',
			width: '500px',
			showLoaderOnConfirm: true,
			preConfirm: async () => {
				try {
					const response = await ResidentService.resendCredentials(
						unitId,
						resident.id
					);
					return response;
				} catch (error) {
					Swal.showValidationMessage(
						error.response?.data?.message ||
							error.message ||
							'Error al enviar credenciales'
					);
				}
			},
			allowOutsideClick: () => !Swal.isLoading(),
		});

		if (result.isConfirmed && result.value?.success) {
			Swal.fire({
				icon: 'success',
				title: '¡Enlace Enviado!',
				html: `
          <div class="text-left">
            <p class="mb-2">El enlace de acceso ha sido enviado exitosamente a:</p>
            <div class="bg-green-50 p-3 rounded-lg">
              <p class="text-sm text-green-700">
                <strong>Email:</strong> ${resident.email}
              </p>
              <p class="text-sm text-green-700 mt-1">
                <strong>Usuario:</strong> ${resident.username}
              </p>
            </div>
            <p class="text-xs text-gray-600 mt-3">
              💡 Recibirá un enlace para acceder directamente al sistema sin contraseña. Vigencia de 24 horas.
            </p>
          </div>
        `,
				confirmButtonColor: '#27ae60',
				width: '500px',
			});
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
		}
	};

	// Handler para eliminar residente
	const handleDeleteResident = async (residentId, residentName) => {
		const result = await Swal.fire({
			title: 'Eliminar Copropietario',
			text: `¿Estás seguro de eliminar a ${residentName}?`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#ef4444',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, eliminar',
			cancelButtonText: 'Cancelar',
		});

		if (result.isConfirmed) {
			deleteResidentMutation.mutate({ userId: residentId, unitId });
		}
	};

	// Handler para toggle access individual
	const handleToggleAccess = async (resident) => {
		const newStatus = !resident.bln_allow_entry;
		const action = newStatus ? 'habilitar' : 'deshabilitar';

		const result = await Swal.fire({
			title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} acceso?`,
			html: `<p>${resident.firstname} ${resident.lastname} ${newStatus ? 'PODRÁ' : 'NO PODRÁ'} acceder al sistema.</p>`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: newStatus ? '#27ae60' : '#e74c3c',
			confirmButtonText: `Sí, ${action}`,
			cancelButtonText: 'Cancelar',
		});

		if (result.isConfirmed) {
			toggleAccessMutation.mutate({ userId: resident.id, enabled: newStatus });
		}
	};

	// Handler para toggle access masivo
	const handleBulkToggleAccess = async (selectedResidents, enabled) => {
		if (selectedResidents.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Sin selección',
				text: 'Debes seleccionar al menos un usuario',
				confirmButtonColor: '#3498db',
			});
			return;
		}

		const action = enabled ? 'habilitar' : 'deshabilitar';
		const result = await Swal.fire({
			title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} acceso?`,
			text: `Se ${action}á el acceso de ${selectedResidents.length} usuario(s)`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: enabled ? '#27ae60' : '#e74c3c',
			confirmButtonText: `Sí, ${action}`,
			cancelButtonText: 'Cancelar',
		});

		if (result.isConfirmed) {
			toggleAccessBulkMutation.mutate({
				userIds: selectedResidents,
				enabled,
			});
		}
	};

	// Mutación para eliminar residentes de forma masiva
	const deleteBulkMutation = useMutation({
		mutationFn: async (userIds) => {
			Swal.fire({
				title: 'Eliminando copropietarios...',
				html: `Procesando <strong>${userIds.length}</strong> usuario(s), por favor espera.`,
				allowOutsideClick: false,
				allowEscapeKey: false,
				didOpen: () => Swal.showLoading(),
			});
			return await CoownerService.deleteCoownersBulk(userIds);
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			const { successful, failed } = response.data || {};
			Swal.fire({
				icon: failed > 0 ? 'warning' : 'success',
				title: failed > 0 ? 'Eliminación parcial' : '¡Eliminados!',
				html: `
					<div class="text-left">
						<p class="text-green-700"><strong>Eliminados:</strong> ${successful}</p>
						${failed > 0 ? `<p class="text-red-700"><strong>Fallidos:</strong> ${failed}</p>` : ''}
					</div>
				`,
				confirmButtonColor: '#3498db',
			});
		},
		onError: (error) => {
			const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
			Swal.fire({
				icon: isTimeout ? 'warning' : 'error',
				title: isTimeout ? 'Tiempo agotado' : 'Error al eliminar',
				text: isTimeout
					? 'El proceso tardó más de lo esperado, pero puede haberse completado. Verifica la lista.'
					: (error.response?.data?.message || error.message),
				confirmButtonColor: '#3498db',
			});
		},
	});

	// Handler para eliminar residentes de forma masiva
	const handleBulkDelete = async (selectedIds, unitName = '') => {
		if (selectedIds.length === 0) return;

		await showBulkDeleteWithLoading({
			count: selectedIds.length,
			unitName: unitName,
			deletePromise: () => CoownerService.deleteCoownersBulk(selectedIds, unitId),
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			},
		});
	};

	return {
		createResidentMutation,
		updateResidentMutation,
		deleteResidentMutation,
		deleteBulkMutation,
		sendBulkCredentialsMutation,
		toggleAccessMutation,
		toggleAccessBulkMutation,
		handleResendCredentials,
		handleDeleteResident,
		handleToggleAccess,
		handleBulkToggleAccess,
		handleBulkDelete,
	};
};