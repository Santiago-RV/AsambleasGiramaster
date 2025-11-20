import { useEffect, useState } from "react";

export default function LivePage() {
  const [attendees, setAttendees] = useState(38);
  const [votes, setVotes] = useState({ favor: 28, contra: 8, abst: 2 });

  useEffect(() => {
    const id = setInterval(() => {
      setAttendees((prev) => Math.min(45, prev + (Math.random() > 0.7 ? 1 : 0)));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const closeVoting = () => {
    if (confirm("Cerrar votación actual?")) alert("Votación cerrada");
  };

  return (
    <section>
      <div className="flex gap-4 mb-4">
        <div className="bg-white p-4 rounded shadow flex-1">
          <h4 className="font-semibold mb-2">Control de Quórum</h4>
          <div><strong>Asistentes: {attendees}/45 ({Math.round((attendees/45)*100)}%)</strong></div>
          <div className="bg-gray-200 h-2 rounded mt-3 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${(attendees/45)*100}%` }} />
          </div>
          <p className="mt-2 text-sm text-gray-500">Quórum alcanzado </p>
        </div>

        <div className="bg-white p-4 rounded shadow w-80">
          <h4 className="font-semibold mb-2">Votación Actual</h4>
          <p className="text-sm"><strong>Tema:</strong> Aprobación del presupuesto 2026</p>
          <div className="mt-3 text-sm">
            <div>A favor: {votes.favor} votos</div>
            <div>En contra: {votes.contra} votos</div>
            <div>Abstenciones: {votes.abst} votos</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={closeVoting} className="px-3 py-1 bg-red-600 text-white rounded">Cerrar Votación</button>
            <button onClick={() => alert("Ver resultados")} className="px-3 py-1 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded">Ver Resultados</button>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">Crear Nueva Encuesta/Votación</h3>
      <div className="bg-white p-4 rounded shadow mb-4">
        <label className="block text-sm font-medium mb-1">Pregunta o Tema a Votar</label>
        <input className="border p-2 rounded w-full" placeholder="Ej: ¿Aprueba el aumento de cuotas?" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Votación</label>
            <select className="border p-2 rounded w-full">
              <option>Sí/No</option>
              <option>A favor/En contra/Abstención</option>
              <option>Múltiple opción</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
            <input type="number" defaultValue={5} min={1} max={30} className="border p-2 rounded w-full" />
          </div>
        </div>
        <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded" onClick={() => alert("Votación publicada")}>Publicar Votación</button>
      </div>

      <h3 className="text-lg font-semibold mb-2">Participantes Conectados</h3>
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Apartamento</th>
              <th className="p-3">Coeficiente</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Última Actividad</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <td className="p-3">María González</td>
              <td className="p-3">101</td>
              <td className="p-3">2.5%</td>
              <td className="p-3"><span className="px-3 py-1 rounded bg-green-100 text-green-700 text-sm">Conectado</span></td>
              <td className="p-3">Hace 30 seg</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-3">Carlos Rodríguez</td>
              <td className="p-3">202</td>
              <td className="p-3">3.1%</td>
              <td className="p-3"><span className="px-3 py-1 rounded bg-green-100 text-green-700 text-sm">Conectado</span></td>
              <td className="p-3">Hace 1 min</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-3">Ana Martínez</td>
              <td className="p-3">303</td>
              <td className="p-3">1.8%</td>
              <td className="p-3"><span className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm">Desconectado</span></td>
              <td className="p-3">Hace 5 min</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
