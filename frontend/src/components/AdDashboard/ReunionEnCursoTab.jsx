import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../../services/api/axiosconfig";
import { Users, Wifi, WifiOff, PieChart, LogOut, BarChart3, RefreshCw, Eye, Loader2, Bell, CheckCircle2, UserMinus, X, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import PollDetailsModal from "./PollDetailsModal";
import LlamadoModal from "./LlamadoModal";
import { registrarLlamado, getLlamado } from "../../services/api/ActiveMeetingService";

const ReunionEnCursoTab = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [llamadoModalOpen, setLlamadoModalOpen] = useState(false);
  const [selectedLlamado, setSelectedLlamado] = useState(null);
  const [selectedLlamadoSnapshot, setSelectedLlamadoSnapshot] = useState(null);
  const [loadingLlamado, setLoadingLlamado] = useState(null);
  const [absentPage, setAbsentPage] = useState(0);
  const ABSENT_PAGE_SIZE = 6;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["meetingInProgress", refreshKey],
    queryFn: async () => {
      const response = await axiosInstance.get("/administrator/meeting-in-progress");
      return response.data;
    },
    refetchInterval: 30000,
  });

  const handleRegistrarLlamado = async (numero) => {
    if (!data?.data?.meeting_id) return;

    const nombreLlamado = ["Primer", "Segundo", "Tercer"][numero - 1];
    const yaRegistrado = data?.data?.llamados_status?.[String(numero)]?.registered;

    const confirmText = yaRegistrado
      ? `El ${nombreLlamado} llamado ya fue registrado. ¿Deseas sobreescribirlo?`
      : `¿Registrar el ${nombreLlamado} Llamado ahora? Se registrará la asistencia con el listado actual.`;

    const result = await Swal.fire({
      title: `${nombreLlamado} Llamado`,
      text: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, registrar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      setLoadingLlamado(numero);
      await registrarLlamado(data.data.meeting_id, numero);
      Swal.fire({
        icon: "success",
        title: `${nombreLlamado} llamado registrado`,
        text: "La toma de asistencia de asistencia fue guardado exitosamente.",
        timer: 2000,
        showConfirmButton: false,
      });
      setRefreshKey((k) => k + 1);
    } catch {
      Swal.fire("Error", "No se pudo registrar el llamado.", "error");
    } finally {
      setLoadingLlamado(null);
    }
  };

  const handleVerLlamado = async (numero) => {
    if (!data?.data?.meeting_id) return;
    try {
      setLoadingLlamado(numero);
      const response = await getLlamado(data.data.meeting_id, numero);
      if (response.success) {
        setSelectedLlamado(numero);
        setSelectedLlamadoSnapshot(response.data.snapshot);
        setLlamadoModalOpen(true);
      }
    } catch {
      Swal.fire("Error", "No se pudo obtener los datos del llamado.", "error");
    } finally {
      setLoadingLlamado(null);
    }
  };

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

  const handleMarkAbsent = async (userId, userName) => {
    if (!data?.data?.meeting_id) return;
    try {
      await axiosInstance.post(`/administrator/meeting/${data.data.meeting_id}/mark-absent/${userId}`);
      setAbsentPage(0);
      setRefreshKey((k) => k + 1);
    } catch {
      Swal.fire("Error", `No se pudo marcar como ausente a ${userName}.`, "error");
    }
  };

  const handleUnmarkAbsent = async (userId) => {
    if (!data?.data?.meeting_id) return;
    try {
      await axiosInstance.post(`/administrator/meeting/${data.data.meeting_id}/unmark-absent/${userId}`);
      setRefreshKey((k) => k + 1);
    } catch {
      Swal.fire("Error", "No se pudo quitar la marca de ausente.", "error");
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

  const registeredUsers = meeting?.connected_users ?? [];
  const absentUsers = meeting?.absent_users ?? [];

  // Agrupar ausentes: el delegado (receptor de poderes) es el encabezado;
  // sus delegantes aparecen como sub-items dentro de la misma card.
  const absentGroups = (() => {
    const absentIds = new Set(absentUsers.map(u => u.user_id));
    // Delegantes: tienen delegated_to_user_id apuntando a otro ausente
    const delegatorIds = new Set(
      absentUsers
        .filter(u => u.delegated_to_user_id && absentIds.has(u.delegated_to_user_id))
        .map(u => u.user_id)
    );
    const heads = absentUsers.filter(u => !delegatorIds.has(u.user_id));
    return heads.map(head => ({
      head,
      delegators: absentUsers.filter(u => u.delegated_to_user_id === head.user_id),
    }));
  })();

  const absentPageCount = Math.ceil(absentGroups.length / ABSENT_PAGE_SIZE);
  const absentPageItems = absentGroups.slice(absentPage * ABSENT_PAGE_SIZE, (absentPage + 1) * ABSENT_PAGE_SIZE);

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

  const total = meeting.total_invited > 0 ? meeting.total_invited : 1;
  const registeredBase = registeredUsers.length > 0 ? registeredUsers.length : 1;

  // % para el donut (proporcional al total para que los segmentos sumen 100%)
  const registeredPercentage = Math.round((registeredUsers.length / total) * 100);
  const absentPercentage = Math.round((absentUsers.length / total) * 100);
  const disconnectedPercentage = 100 - registeredPercentage - absentPercentage;
  const connectedPercentage = registeredPercentage;

  // % para la leyenda con denominadores correctos
  const registeredPct = Math.round((registeredUsers.length / total) * 100);
  const absentPct = parseFloat(((absentUsers.length / registeredBase) * 100).toFixed(1));
  const disconnectedPct = Math.round((meeting.disconnected_count / total) * 100);

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] md:h-[calc(100vh-104px)] overflow-hidden gap-3">
      {/* Header */}
      <div className="bg-blue-600 rounded-lg px-5 py-3 text-white shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{meeting.title}</h2>
            <p className="text-blue-100 text-sm">{meeting.description}</p>
            <div className="flex gap-4 mt-2 text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Users size={18} />
                Copropietarios conectados: {meeting.connected_count} de {meeting.total_invited}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 size={18} />
                Quórum: {meeting.connected_quorum} / {meeting.total_quorum} ({meeting.quorum_percentage}%)
              </span>
              <span className={`px-2 py-0.5 rounded text-xs self-center ${meeting.quorum_reached ? 'bg-green-500' : 'bg-red-500'}`}>
                {meeting.quorum_reached ? "Quórum alcanzado" : "Sin quórum"}
              </span>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-500 rounded hover:bg-blue-400 shrink-0"
            title="Actualizar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Listas + gráfico — ocupa el espacio disponible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Registrados */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col min-h-0">
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2 shrink-0">
            <Wifi size={18} className="text-green-500" />
            Registrados ({registeredUsers.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {registeredUsers.length > 0 ? (
              registeredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                      {user.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.full_name}</div>
                      <div className="text-xs text-gray-500">
                        Apto {user.apartment_number} • Q: {user.voting_weight}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMarkAbsent(user.user_id, user.full_name)}
                      className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                      title="Marcar ausente"
                    >
                      <UserMinus size={15} />
                    </button>
                    <button
                      onClick={() => handleCloseSession(user.user_id, user.full_name)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Cerrar sesión"
                    >
                      <LogOut size={15} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-6 text-sm">No hay usuarios registrados</div>
            )}
          </div>
        </div>

        {/* Gráfico central */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col min-h-0 overflow-y-auto">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2 shrink-0">
            <PieChart size={18} />
            Asistencia
          </h3>

          {/* Donut */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="18" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="18"
                  strokeDasharray={`${registeredPercentage * 2.51} 251`}
                  strokeLinecap="butt"
                />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="18"
                  strokeDasharray={`${absentPercentage * 2.51} 251`}
                  strokeDashoffset={`-${registeredPercentage * 2.51}`}
                  strokeLinecap="butt"
                />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="18"
                  strokeDasharray={`${disconnectedPercentage * 2.51} 251`}
                  strokeDashoffset={`-${(registeredPercentage + absentPercentage) * 2.51}`}
                  strokeLinecap="butt"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold leading-none">{registeredPercentage}%</span>
                <span className="text-[10px] text-gray-400 mt-0.5">en sala</span>
              </div>
            </div>

            {/* Leyenda */}
            <div className="mt-3 w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0"></div>
                  <span className="text-gray-600">Registrados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{registeredUsers.length} <span className="text-gray-400 font-normal">/ {meeting.total_invited}</span></span>
                  <span className="text-green-600 font-bold w-11 text-right">{registeredPct}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-orange-400 shrink-0"></div>
                  <span className="text-gray-600">Ausentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{absentUsers.length} <span className="text-gray-400 font-normal">/ {registeredUsers.length}</span></span>
                  <span className="text-orange-500 font-bold w-11 text-right">{absentPct}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0"></div>
                  <span className="text-gray-600">No registrados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{meeting.disconnected_count} <span className="text-gray-400 font-normal">/ {meeting.total_invited}</span></span>
                  <span className="text-red-500 font-bold w-11 text-right">{disconnectedPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicador quórum */}
          <div className="mt-4 pt-3 border-t border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">Quórum alcanzado</span>
              <span className={`text-xs font-bold ${meeting.quorum_reached ? 'text-green-600' : 'text-red-500'}`}>
                {meeting.quorum_percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${meeting.quorum_reached ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(meeting.quorum_percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>{meeting.connected_quorum} coeficiente conectado</span>
              <span>total {meeting.total_quorum}</span>
            </div>
          </div>
        </div>

        {/* No Registrados */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col min-h-0">
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2 shrink-0">
            <WifiOff size={18} className="text-red-500" />
            No Registrados ({meeting.disconnected_count})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {meeting.disconnected_users?.length > 0 ? (
              meeting.disconnected_users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg"
                >
                  <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
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
              <div className="text-gray-500 text-center py-6 text-sm">No hay usuarios desconectados</div>
            )}
          </div>
        </div>
      </div>

      {/* Ausentes */}
      <div className="bg-white rounded-lg shadow p-4 shrink-0">
        <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
          <UserMinus size={18} className="text-orange-500" />
          Ausentes ({absentUsers.length})
        </h3>
        {absentGroups.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {absentPageItems.map(({ head, delegators }) => (
                <div
                  key={head.user_id}
                  className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden"
                >
                  {/* Encabezado: el delegado (quien recibió los poderes) */}
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 bg-orange-300 rounded-full flex items-center justify-center text-orange-800 font-bold text-xs shrink-0">
                        {head.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate text-orange-900">{head.full_name}</div>
                        <div className="text-xs text-gray-500">Apto {head.apartment_number}</div>
                        <div className="text-xs text-orange-600 font-medium">Q: {head.voting_weight ?? '—'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnmarkAbsent(head.user_id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded shrink-0"
                      title="Quitar de ausentes (incluye delegantes)"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Sub-lista: delegantes que cedieron su poder a este usuario */}
                  {delegators.length > 0 && (
                    <div className="border-t border-orange-200 bg-orange-100/50 px-2 py-1.5 space-y-1">
                      <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-1">
                        Cedió poder a este usuario
                      </p>
                      {delegators.map(d => (
                        <div key={d.user_id} className="flex items-center gap-1.5">
                          <div className="w-4 h-4 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-semibold text-[9px] shrink-0">
                            {d.full_name?.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium truncate text-gray-700">{d.full_name}</div>
                            <div className="text-[10px] text-gray-400">Apto {d.apartment_number} · Q: {d.voting_weight ?? '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {absentPageCount > 1 && (
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setAbsentPage(p => p - 1)}
                  disabled={absentPage === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-500">{absentPage + 1} / {absentPageCount}</span>
                <button
                  onClick={() => setAbsentPage(p => p + 1)}
                  disabled={absentPage === absentPageCount - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400">Sin ausentes marcados</p>
        )}
      </div>

      {/* Llamados de Asistencia */}
      <div className="bg-white rounded-lg shadow p-4 shrink-0">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Bell size={18} className="text-indigo-600" />
          Llamados de Asistencia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((num) => {
            const nombreLlamado = ["Primer", "Segundo", "Tercer"][num - 1];
            const status = data?.data?.llamados_status?.[String(num)];
            const registrado = status?.registered;

            return (
              <div
                key={num}
                className={`rounded-xl border-2 p-3 ${
                  registrado ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {registrado ? (
                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                  ) : (
                    <Bell size={16} className="text-gray-400 shrink-0" />
                  )}
                  <span className="font-semibold text-sm">{nombreLlamado} Llamado</span>
                </div>
                {!registrado && (
                  <p className="text-xs text-gray-400 mb-2">Sin registrar</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRegistrarLlamado(num)}
                    disabled={loadingLlamado === num}
                    className="flex-1 py-1.5 px-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingLlamado === num ? (
                      <Loader2 size={13} className="animate-spin mx-auto" />
                    ) : registrado ? (
                      "Re-registrar"
                    ) : (
                      "Registrar"
                    )}
                  </button>
                  {registrado && (
                    <button
                      onClick={() => handleVerLlamado(num)}
                      disabled={loadingLlamado === num}
                      className="flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye size={13} />
                      Ver
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Llamado Modal */}
      <LlamadoModal
        isOpen={llamadoModalOpen}
        onClose={() => { setLlamadoModalOpen(false); setSelectedLlamadoSnapshot(null); }}
        llamadoNumero={selectedLlamado}
        snapshot={selectedLlamadoSnapshot}
      />

      {/* Polls
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

      {/* Poll Details Modal */
      /* <PollDetailsModal
        poll={selectedPoll}
        isOpen={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
      />  */}
    </div>
  );
};

export default ReunionEnCursoTab;
