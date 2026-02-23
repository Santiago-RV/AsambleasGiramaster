import { useState, useEffect } from "react";
import { X, User, Clock, CheckCircle } from "lucide-react";
import axiosInstance from "../../services/api/axiosconfig";

const PollDetailsModal = ({ poll, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [votesData, setVotesData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && poll?.poll_id) {
      fetchVotes();
    }
  }, [isOpen, poll]);

  const fetchVotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/polls/${poll.poll_id}/votes`);
      setVotesData(response.data.data);
    } catch (err) {
      console.error("Error fetching votes:", err);
      setError("Error al cargar los votos");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !poll) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "Abierta":
      case "En Curso":
        return "bg-green-100 text-green-800";
      case "Cerrada":
        return "bg-gray-100 text-gray-800";
      case "Borrador":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{votesData?.title || poll.title}</h2>
            <p className="text-sm text-gray-500">{votesData?.description || poll.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">{error}</div>
          )}

          {!loading && !error && votesData && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(votesData.status)}`}>
                  {votesData.status}
                </span>
                <span className="text-sm text-gray-500">
                  Tipo: {votesData.poll_type}
                </span>
              </div>

              {/* Options */}
              {votesData.options?.map((option, index) => (
                <div key={option.option_id} className="border rounded-lg overflow-hidden">
                  {/* Option header */}
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-800">
                        {option.option_text}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {option.votes_count} vote{option.votes_count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Votes list */}
                  <div className="p-3">
                    {option.votes && option.votes.length > 0 ? (
                      <div className="space-y-2">
                        {option.votes.map((vote, vIndex) => (
                          <div
                            key={vote.user_id || vIndex}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <User size={16} className="text-green-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {vote.full_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Apto {vote.apartment_number}
                                </div>
                              </div>
                            </div>
                            {vote.voted_at && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock size={12} />
                                {new Date(vote.voted_at).toLocaleTimeString("es-CO", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 text-center py-2">
                        No hay votos para esta opción
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollDetailsModal;
