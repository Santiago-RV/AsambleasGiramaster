import { useQuery } from '@tanstack/react-query';
import { ResidentialUnitService } from '../../../services/api/ResidentialUnitService';
import { MeetingService } from '../../../services/api/MeetingService';
import { formatDateLong, formatTime } from '../../../utils/dateUtils';

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

				// Filtrar reuniones: incluir En Curso/Activa siempre, o del día actual/futuras
				const reunionesFiltradas = response.data.filter((reunion) => {
					const fechaReunion = new Date(reunion.dat_schedule_date);
					const esEnCurso = reunion.str_status?.toLowerCase() === 'en curso' || 
					                  reunion.str_status?.toLowerCase() === 'activa';
					return esEnCurso || fechaReunion >= inicioDelDia;
				});

				return reunionesFiltradas.map((reunion) => {
					let fechaObj;
					if (reunion.dat_schedule_date instanceof Date) {
						fechaObj = reunion.dat_schedule_date;
					} else if (typeof reunion.dat_schedule_date === 'string') {
						fechaObj = new Date(reunion.dat_schedule_date);
					} else {
						fechaObj = new Date();
					}
					
					return {
						...reunion,
						id: reunion.id,
						titulo: reunion.str_title,
						fecha: formatDateLong(fechaObj),
						fechaCompleta: fechaObj,
						hora: formatTime(fechaObj),
						asistentes: reunion.int_total_invitated || 0,
						estado: reunion.str_status || 'Programada',
						tipo: reunion.str_meeting_type,
						descripcion: reunion.str_description,
						codigo: reunion.str_meeting_code,
						zoom_url: reunion.str_zoom_join_url,
						duracion: reunion.int_estimated_duration,
						// Campos adicionales para edición
						str_meeting_type: reunion.str_meeting_type,
						str_description: reunion.str_description,
						bln_allow_delegates: reunion.bln_allow_delegates,
						int_zoom_account_id: reunion.int_zoom_account_id,
						str_modality: reunion.str_modality,
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