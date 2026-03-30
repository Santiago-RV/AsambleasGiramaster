import { X, Wifi, WifiOff, BarChart3, Clock, Users } from "lucide-react";

/**
 * Modal que muestra los detalles de un llamado de asistencia.
 * Recibe el snapshot del llamado y lo visualiza.
 */
const LlamadoModal = ({ isOpen, onClose, llamadoNumero, snapshot }) => {
  if (!isOpen || !snapshot) return null;

  const presentCount = snapshot.present?.length || 0;
  const absentCount = snapshot.absent?.length || 0;
  const totalCount = presentCount + absentCount;

  const timestamp = snapshot.timestamp
    ? new Date(snapshot.timestamp).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  const nombreLlamado = ["Primer", "Segundo", "Tercer"][llamadoNumero - 1] || `${llamadoNumero}°`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold">{nombreLlamado} Llamado</h2>
            <p className="text-indigo-200 text-sm flex items-center gap-1 mt-0.5">
              <Clock size={13} />
              Registrado: {timestamp}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b shrink-0">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Wifi size={16} />
              <span className="text-xs font-medium">Presentes</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{presentCount}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <WifiOff size={16} />
              <span className="text-xs font-medium">Ausentes</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{absentCount}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-indigo-600 mb-1">
              <BarChart3 size={16} />
              <span className="text-xs font-medium">% Quórum</span>
            </div>
            <p className="text-2xl font-bold text-indigo-700">
              {snapshot.quorum_percentage ?? 0}%
            </p>
            <p className="text-xs text-indigo-500 mt-0.5">
              {snapshot.connected_quorum?.toFixed(4)} / {snapshot.total_quorum?.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Body: dos columnas */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Presentes */}
            <div>
              <h3 className="font-semibold text-green-700 flex items-center gap-2 mb-3">
                <Wifi size={16} />
                Presentes ({presentCount})
              </h3>
              <div className="space-y-2">
                {snapshot.present?.length > 0 ? (
                  snapshot.present.map((u) => (
                    <div
                      key={u.user_id}
                      className="flex items-center gap-3 p-2.5 bg-green-50 rounded-lg border border-green-100"
                    >
                      <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                        {u.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Apto {u.apartment_number} · Q: {Number(u.quorum_base).toFixed(4)}
                          {u.attendance_type === "Delegado" && (
                            <span className="ml-1 text-indigo-600">(Delegado)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">Sin presentes</p>
                )}
              </div>
            </div>

            {/* Ausentes */}
            <div>
              <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
                <WifiOff size={16} />
                Ausentes ({absentCount})
              </h3>
              <div className="space-y-2">
                {snapshot.absent?.length > 0 ? (
                  snapshot.absent.map((u) => (
                    <div
                      key={u.user_id}
                      className="flex items-center gap-3 p-2.5 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center text-red-700 font-semibold text-sm shrink-0">
                        {u.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Apto {u.apartment_number} · Q: {Number(u.quorum_base).toFixed(4)}
                          {u.has_delegated && (
                            <span className="ml-1 text-orange-500">(cedió poder)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">Sin ausentes</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LlamadoModal;
