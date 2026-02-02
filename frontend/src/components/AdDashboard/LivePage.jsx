import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import LiveMeetingCard from "./LiveMeetingCard";
import MeetingPollsView from "./MeetingPollsView";
import { PollService } from "../../services/api/PollService";
import { UserService } from "../../services/api/UserService";

export default function LivePage() {
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Obtener la unidad residencial del administrador
  const { data: residentialUnitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['admin-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
  });

  const residentialUnitId = residentialUnitData?.data?.residential_unit_id;

  console.log('🏠 [LivePage] Residential Unit ID:', residentialUnitId);
  console.log('🏠 [LivePage] Residential Unit Data:', residentialUnitData);

  // Obtener reuniones en vivo
  const {
    data: liveMeetingsData,
    isLoading: isLoadingMeetings,
    isError: isErrorMeetings,
  } = useQuery({
    queryKey: ['live-meetings', residentialUnitId],
    queryFn: async () => {
      console.log('🔄 [LivePage] Ejecutando query de reuniones...');
      if (!residentialUnitId) {
        console.warn('⚠️ [LivePage] No hay residentialUnitId, retornando array vacío');
        return { success: false, data: [] };
      }
      return await PollService.getLiveMeetings(residentialUnitId);
    },
    enabled: !!residentialUnitId,
    refetchInterval: 30000,
  });

  // Vista de encuestas de reunión seleccionada
  if (selectedMeeting) {
    return (
      <MeetingPollsView
        meeting={selectedMeeting}
        onBack={() => setSelectedMeeting(null)}
      />
    );
  }

  const liveMeetings = liveMeetingsData?.data || [];

  return (
    <section className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Gestión de Encuestas</h2>
        <p className="text-green-100">
          Selecciona una reunión en vivo para crear encuestas y votaciones
        </p>
      </div>

      {(isLoadingMeetings || isLoadingUnit) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-green-600" size={48} />
        </div>
      )}

      {isErrorMeetings && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Error al cargar reuniones</h3>
            <p className="text-red-600 text-sm">
              No se pudieron cargar las reuniones en vivo. Por favor, intenta nuevamente.
            </p>
          </div>
        </div>
      )}

      {!isLoadingMeetings && !isLoadingUnit && !isErrorMeetings && (
        <>
          {liveMeetings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="mb-4 text-gray-400">
                <svg
                  className="mx-auto h-24 w-24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No hay reuniones en vivo
              </h3>
              <p className="text-gray-600">
                No hay reuniones activas en este momento. Las reuniones aparecerán aquí cuando
                estén en curso o programadas para la hora actual.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  Reuniones en Vivo ({liveMeetings.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveMeetings.map((meeting) => (
                  <LiveMeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => setSelectedMeeting(meeting)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
