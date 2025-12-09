import { useQuery } from '@tanstack/react-query';
import { ResidentialUnitService } from '../../../services/api/ResidentialUnitService';
import { MeetingService } from '../../../services/api/MeetingService';

export const useResidentialUnitData = (unitId) => {
	// Obtener datos de la unidad residencial
	const {
		data: unitData,
		isLoading: isLoadingUnit,
		isError: isErrorUnit,
	} = useQuery({
		queryKey: ['residentialUnit', unitId],
		queryFn: () => ResidentialUnitService.getResidentialUnitById(unitId),
		select: (response) => response.data,
		enabled: !!unitId,
	});

	// Obtener residentes
	const {
		data: residentsData,
		isLoading: isLoadingResidents,
		isError: isErrorResidents,
	} = useQuery({
		queryKey: ['residents', unitId],
		queryFn: () => ResidentialUnitService.getResidentsByResidentialUnit(unitId),
		select: (response) => response.data || [],
		enabled: !!unitId,
	});

	// Obtener reuniones de la unidad
	const {
		data: meetingsData,
		isLoading: isLoadingMeetings,
		isError: isErrorMeetings,
	} = useQuery({
		queryKey: ['meetings', unitId],
		queryFn: () => MeetingService.getMeetingsByResidentialUnit(unitId),
		select: (response) => {
			if (response.success && response.data) {
				const ahora = new Date();
				const inicioDelDia = new Date(
					ahora.getFullYear(),
					ahora.getMonth(),
					ahora.getDate(),
					0,
					0,
					0
				);

				// Filtrar solo reuniones del día actual o futuras
				const reunionesFiltradas = response.data.filter((reunion) => {
					const fechaReunion = new Date(reunion.dat_schedule_date);
					return fechaReunion >= inicioDelDia;
				});

				return reunionesFiltradas.map((reunion) => {
					const fechaObj = new Date(reunion.dat_schedule_date);
					return {
						...reunion,
						id: reunion.id,
						titulo: reunion.str_title,
						fecha:
							reunion.dat_schedule_date?.split('T')[0] ||
							fechaObj.toISOString().split('T')[0],
						hora: fechaObj.toLocaleTimeString('es-ES', {
							hour: '2-digit',
							minute: '2-digit',
						}),
						asistentes: reunion.int_total_confirmed || 0,
						estado: reunion.str_status || 'Programada',
						fechaCompleta: fechaObj,
						tipo: reunion.str_meeting_type,
						descripcion: reunion.str_description,
						codigo: reunion.str_meeting_code,
						zoom_url: reunion.str_zoom_join_url,
						duracion: reunion.int_estimated_duration,
					};
				});
			}
			return [];
		},
		enabled: !!unitId,
	});

	// Obtener el administrador actual de la unidad
	const {
		data: administratorData,
		isLoading: isLoadingAdministrator,
	} = useQuery({
		queryKey: ['administrator', unitId],
		queryFn: () => ResidentialUnitService.getUnitAdministrator(unitId),
		select: (response) => response.data,
		enabled: !!unitId,
	});

	return {
		unitData,
		isLoadingUnit,
		isErrorUnit,
		residentsData,
		isLoadingResidents,
		isErrorResidents,
		meetingsData,
		isLoadingMeetings,
		isErrorMeetings,
		administratorData,
		isLoadingAdministrator,
	};
};