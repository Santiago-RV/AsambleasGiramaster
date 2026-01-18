import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResidentService } from '../../../services/api/ResidentService';
import Swal from 'sweetalert2';

export const useResidentOperations = (unitId) => {
	const queryClient = useQueryClient();

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
				showConfirmButton: false,
				timer: 2000,
				toast: true,
				position: 'top-end',
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
				showConfirmButton: false,
				timer: 2000,
				toast: true,
				position: 'top-end',
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
				text:
					response.message || 'El usuario ha sido eliminado exitosamente',
				showConfirmButton: false,
				timer: 2000,
				toast: true,
				position: 'top-end',
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
				html: `<p class="text-sm">Acceso ${action} exitosamente</p>`,
				timer: 2000,
				showConfirmButton: false,
				toast: true,
				position: 'top-end',
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
			return await ResidentService.sendBulkCredentials(unitId, residentIds);
		},
		onSuccess: (response) => {
			const { successful, failed, total_processed } = response.data;

			Swal.fire({
				icon: successful === total_processed ? 'success' : 'warning',
				title:
					successful === total_processed
						? '¡Credenciales Enviadas!'
						: 'Envío Parcial',
				html: `
          <div class="text-left">
            <div class="bg-blue-50 p-3 rounded-lg mb-3">
              <p class="text-sm text-blue-700">
                <strong>Total procesados:</strong> ${total_processed}
              </p>
              <p class="text-sm text-green-700">
                <strong>Exitosos:</strong> ${successful}
              </p>
              ${failed > 0 ? `<p class="text-sm text-red-700"><strong>Fallidos:</strong> ${failed}</p>` : ''}
            </div>
            ${
							response.data.errors && response.data.errors.length > 0
								? `
                <div class="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                  <p class="font-semibold text-red-800 mb-2">Errores:</p>
                  <ul class="text-sm text-red-700 space-y-1">
                    ${response.data.errors.map((err) => `<li>ID ${err.resident_id}: ${err.error}</li>`).join('')}
                  </ul>
                </div>
              `
								: ''
						}
          </div>
        `,
				confirmButtonColor: '#27ae60',
				width: '500px',
			});
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
		const result = await Swal.fire({
			title: '¿Enviar credenciales?',
			html: `
        <div class="text-left">
          <p class="mb-3">Se generará una nueva contraseña temporal y se enviará por correo a:</p>
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
            💡 La contraseña actual será reemplazada por una nueva contraseña temporal.
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
				title: '¡Credenciales Enviadas!',
				html: `
          <div class="text-left">
            <p class="mb-2">Las credenciales han sido enviadas exitosamente a:</p>
            <div class="bg-green-50 p-3 rounded-lg">
              <p class="text-sm text-green-700">
                <strong>Email:</strong> ${resident.email}
              </p>
              <p class="text-sm text-green-700 mt-1">
                <strong>Usuario:</strong> ${resident.username}
              </p>
            </div>
            <p class="text-xs text-gray-600 mt-3">
              📧 El copropietario recibirá un correo con su nueva contraseña temporal.
            </p>
          </div>
        `,
				confirmButtonColor: '#27ae60',
				width: '500px',
			});
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

	return {
		createResidentMutation,
		updateResidentMutation,
		deleteResidentMutation,
		sendBulkCredentialsMutation,
		toggleAccessMutation,
		toggleAccessBulkMutation,
		handleResendCredentials,
		handleDeleteResident,
		handleToggleAccess,
		handleBulkToggleAccess,
	};
};