import StatCard from "./StatCard";

export default function DashboardPage() {
  const upcoming = [
    { date: "15 Sep 2025", title: "Asamblea Ordinaria Septiembre", participants: "42 registrados", status: "Programada" },
    { date: "22 Sep 2025", title: "Reunión Extraordinaria - Obras", participants: "38 registrados", status: "Programada" },
  ];

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard number="45" label="Usuarios Registrados" />
        <StatCard number="12" label="Asambleas Programadas" />
        <StatCard number="8" label="Asambleas Completadas" />
        <StatCard number="87%" label="Promedio de Quórum" />
      </div>

      <h3 className="text-lg font-semibold mb-3">Próximas Asambleas</h3>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-left">Asamblea</th>
              <th className="p-3 text-left">Participantes</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((u, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3">{u.date}</td>
                <td className="p-3">{u.title}</td>
                <td className="p-3">{u.participants}</td>
                <td className="p-3">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">{u.status}</span>
                </td>
                <td className="p-3 flex gap-2 justify-center">
                  <button className="px-3 py-1 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded">Editar</button>
                  <button className="px-3 py-1 bg-green-600 text-white rounded">Iniciar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
