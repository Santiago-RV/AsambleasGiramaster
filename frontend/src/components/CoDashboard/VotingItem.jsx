import { useEffect, useState } from "react";

export default function VotingItem({
  id,
  question,
  meta,
  details,
  options,
  duration,
  active,
  completed,
  onVoteConfirmed,
}) {
  const [time, setTime] = useState(duration);
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!active || completed || hasVoted) return;

    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, completed, hasVoted]);

  const formatTime = () => {
    if (time <= 0) return "⏰ Tiempo agotado";

    const min = Math.floor(time / 60);
    const sec = (time % 60).toString().padStart(2, "0");
    return `⏱️ ${min}:${sec}`;
  };

  const handleConfirm = () => {
    if (!selected) return;

    setHasVoted(true);
    onVoteConfirmed(id, selected);
  };

  return (
    <div
      className={`border-2 rounded-xl p-5 transition mb-5 ${
        completed
          ? "border-green-500 bg-green-50"
          : active
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-lg">{question}</p>
          <p className="text-gray-600 text-sm">{meta}</p>
        </div>

        <div
          className={`px-3 py-1 text-sm rounded-full font-semibold ${
            completed
              ? "bg-green-200 text-green-800"
              : time <= 0
              ? "bg-red-200 text-red-800"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {completed ? "Finalizada" : formatTime()}
        </div>
      </div>

      {details && (
        <div className="bg-yellow-50 border border-yellow-300 p-3 rounded mb-4 text-sm">
          <strong>Detalles:</strong> {details}
        </div>
      )}

      {!completed && (
        <div className="flex flex-wrap gap-2 mb-4">
          {options.map((opt) => (
            <button
              key={opt.value}
              disabled={time <= 0 || hasVoted}
              onClick={() => setSelected(opt.value)}
              className={`flex-1 min-w-[120px] border-2 rounded-lg p-2 font-semibold transition ${
                selected === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-300 hover:border-blue-600"
              } ${
                hasVoted || time <= 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {!completed && (
        <button
          disabled={!selected || time <= 0 || hasVoted}
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700"
        >
          {hasVoted ? "Voto Registrado" : "Confirmar mi Voto"}
        </button>
      )}

      {completed && (
        <div className="mt-4 text-green-700 text-sm">
          <strong>Resultado:</strong> Votación completada.
        </div>
      )}
    </div>
  );
}
