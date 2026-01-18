export default function AssembliesTable({ assemblies = [], onEdit, onStart }) {
  return (
    <div className="bg-white rounded shadow overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3">Fecha y Hora</th>
            <th className="p-3">Título</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Participantes</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {assemblies.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="p-3">{a.datetime}</td>
              <td className="p-3">{a.title}</td>
              <td className="p-3">{a.type}</td>
              <td className="p-3">{a.participants}</td>
              <td className="p-3">{a.state === "Programada" ? <span className="px-3 py-1 text-sm rounded bg-green-100 text-green-700">{a.state}</span> : <span className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700">{a.state}</span>}</td>
              <td className="p-3 flex gap-2">
                <button onClick={() => onEdit(a)} className="px-3 py-1 bg-gradient-to-br from-[#059669] to-[#10b981] text-white rounded">Editar</button>
                <button onClick={() => onStart(a)} className="px-3 py-1 bg-green-600 text-white rounded">Iniciar</button>
                <button className="px-3 py-1 bg-gray-300 rounded">Ver Agenda</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
