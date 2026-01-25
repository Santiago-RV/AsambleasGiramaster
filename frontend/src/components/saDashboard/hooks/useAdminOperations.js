import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResidentialUnitService } from '../../../services/api/ResidentialUnitService';
import Swal from 'sweetalert2';

export const useAdminOperations = (unitId) => {
	const queryClient = useQueryClient();

	// Mutación para cambiar el administrador
	const changeAdminMutation = useMutation({
		mutationFn: (newAdminUserId) =>
			ResidentialUnitService.changeUnitAdministrator(unitId, newAdminUserId),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['administrator', unitId] });
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });

			Swal.fire({
				icon: 'success',
				title: '¡Administrador Cambiado!',
				text: response.message || 'El administrador ha sido actualizado exitosamente',
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
				text: error.message || 'Error al cambiar el administrador',
			});
		},
	});

	// Mutación para crear administrador manual
	const createManualAdminMutation = useMutation({
		mutationFn: ({ unitId, adminData }) =>
			ResidentialUnitService.createManualAdministrator(unitId, adminData),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['administrator', unitId] });
			queryClient.invalidateQueries({ queryKey: ['residents', unitId] });
			Swal.fire({
				icon: 'success',
				title: '¡Administrador Creado!',
				html: `
				<p>${response.message}</p>
				<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
					<p style="margin: 5px 0;"><strong>Usuario:</strong> ${response.data.username}</p>
					<p style="margin: 5px 0;"><strong>Contraseña Temporal:</strong> ${response.data.temporary_password}</p>
					<p style="margin: 5px 0; color: #6c757d; font-size: 14px;">Se envió un email con las credenciales</p>
				</div>
			`,
				confirmButtonText: 'Entendido',
				confirmButtonColor: '#3498db',
			});
		},
		onError: (error) => {
			Swal.fire({
				icon: 'error',
				title: 'Error al Crear Administrador',
				text:
					error.message || 'Hubo un problema al crear el administrador',
				confirmButtonText: 'Entendido',
				confirmButtonColor: '#e74c3c',
			});
		},
	});

	return {
		changeAdminMutation,
		createManualAdminMutation,
	};
};