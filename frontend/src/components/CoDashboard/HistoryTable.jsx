export default function HistoryTable({ data }) {
  return (
    <div className="overflow-x-auto mt-6">
      <table className="w-full bg-white rounded-xl shadow border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-4">Fecha</th>
            <th className="p-4">Asamblea</th>
            <th className="p-4">Participación</th>
            <th className="p-4">Votaciones</th>
            <th className="p-4">Poderes</th>
            <th className="p-4">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="p-4">{row.date}</td>
              <td className="p-4">{row.name}</td>
              <td className="p-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    row.status === "En curso"
                      ? "bg-green-100 text-green-700"
                      : row.status === "Parcial"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {row.status}
                </span>
              </td>
              <td className="p-4">{row.votes}</td>
              <td className="p-4">{row.powers}</td>
              <td className="p-4">
                <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
                  Ver Acta
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
