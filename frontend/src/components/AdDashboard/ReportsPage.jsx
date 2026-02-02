export default function ReportsPage() {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Reportes</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Reporte de Participación</h4>
          <p className="text-sm text-gray-600">Genera reportes detallados de asistencia y participación.</p>
          <button className="mt-3 px-3 py-1 bg-gradient-to-br from-[#059669] to-[#10b981] text-white rounded" onClick={() => alert("Generando reporte")}>Ver Reporte</button>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Reporte de Votaciones</h4>
          <p className="text-sm text-gray-600">Resumen de todas las votaciones y decisiones.</p>
          <button className="mt-3 px-3 py-1 bg-gradient-to-br from-[#059669] to-[#10b981] text-white rounded" onClick={() => alert("Generando reporte")}>Ver Reporte</button>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Análisis de Quórum</h4>
          <p className="text-sm text-gray-600">Estadísticas históricas de cumplimiento de quórum.</p>
          <button className="mt-3 px-3 py-1 bg-gradient-to-br from-[#059669] to-[#10b981] text-white rounded" onClick={() => alert("Generando reporte")}>Ver Reporte</button>
        </div>
      </div>
    </section>
  );
}
