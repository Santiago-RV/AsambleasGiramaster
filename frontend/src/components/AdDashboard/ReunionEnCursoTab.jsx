import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../../services/api/axiosconfig";
import { Users, Wifi, WifiOff, PieChart, LogOut, BarChart3, RefreshCw, Eye, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import PollDetailsModal from "./PollDetailsModal";

const ReunionEnCursoTab = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPoll, setSelectedPoll] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["meetingInProgress", refreshKey],
    queryFn: async () => {
      const response = await axiosInstance.get("/administrator/meeting-in-progress");
      return response.data;
    },
    refetchInterval: 30000,
  });

  const handleCloseSession = async (userId, userName) => {
    if (!data?.data?.meeting_id) return;

    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: `¿Estás seguro de cerrar la sesión de ${userName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await axiosInstance.post(
          `/administrator/meeting/${data.data.meeting_id}/close-user-session/${userId}`
        );
        Swal.fire("Sesión cerrada", "La sesión del usuario ha sido cerrada.", "success");
        setRefreshKey((k) => k + 1);
      } catch {
        Swal.fire("Error", "No se pudo cerrar la sesión.", "error");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600">Error al cargar la reunión: {error.message}</div>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const meeting = data?.data;

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 text-lg">No hay reuniones en curso actualmente</div>
        <button
          onClick={() => refetch()}
          className="mt-4 flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>
    );
  }

  const connectedPercentage = meeting.total_invited > 0 
    ? Math.round((meeting.connected_count / meeting.total_invited) * 100) 
    : 0;
  const disconnectedPercentage = 100 - connectedPercentage;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-blue-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{meeting.title}</h2>
            <p className="text-blue-100 mt-1">{meeting.description}</p>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1">
                <Users size={16} />
                Invitados: {meeting.total_invited}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 size={16} />
                Quórum: {meeting.connected_quorum} / {meeting.total_quorum} ({meeting.quorum_percentage}%)
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${meeting.quorum_reached ? 'bg-green-500' : 'bg-red-500'}`}>
                {meeting.quorum_reached ? "Quórum alcanzado" : "Sin quórum"}
              </span>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-500 rounded hover:bg-blue-400"
            title="Actualizar"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Main Content - 3 columns same height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Connected Users */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col h-96">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 shrink-0">
            <Wifi size={20} className="text-green-500" />
            Conectados ({meeting.connected_count})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {meeting.connected_users?.length > 0 ? (
              meeting.connected_users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                      {user.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.full_name}</div>
                      <div className="text-xs text-gray-500">
                        Apto {user.apartment_number} • Q: {user.voting_weight}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCloseSession(user.user_id, user.full_name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Cerrar sesión"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">No hay usuarios conectados</div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center h-96">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 shrink-0">
            <PieChart size={20} />
            Estado
          </h3>
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#22c55e"
                strokeWidth="20"
                strokeDasharray={`${connectedPercentage * 2.51} 251`}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#ef4444"
                strokeWidth="20"
                strokeDasharray={`${disconnectedPercentage * 2.51} 251`}
                strokeDashoffset={`-${connectedPercentage * 2.51}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{connectedPercentage}%</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Conectados ({meeting.connected_count})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">Desconectados ({meeting.disconnected_count})</span>
            </div>
          </div>
        </div>

        {/* Disconnected Users */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col h-96">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 shrink-0">
            <WifiOff size={20} className="text-red-500" />
            Desconectados ({meeting.disconnected_count})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {meeting.disconnected_users?.length > 0 ? (
              meeting.disconnected_users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                    {user.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{user.full_name}</div>
                    <div className="text-xs text-gray-500">
                      Apto {user.apartment_number} • Q: {user.voting_weight}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">No hay usuarios desconectados</div>
            )}
          </div>
        </div>
      </div>

      {/* Polls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Encuestas
        </h3>
        <div className="space-y-2">
          {meeting.polls?.length > 0 ? (
            meeting.polls.map((poll) => (
              <div
                key={poll.poll_id}
                onClick={() => setSelectedPoll(poll)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div>
                  <div className="font-medium">{poll.title}</div>
                  <div className="text-sm text-gray-500">
                    {poll.description}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    poll.status === "Abierta" || poll.status === "En Curso" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {poll.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {poll.total_votes} votos
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoll(poll);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Ver detalles"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center py-4">No hay encuestas en esta reunión</div>
          )}
        </div>
      </div>

      {/* Poll Details Modal */}
      <PollDetailsModal
        poll={selectedPoll}
        isOpen={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
      />
    </div>
  );
};

export default ReunionEnCursoTab;
