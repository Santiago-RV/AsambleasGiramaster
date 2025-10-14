import React from "react";

const ReportsSection = () => {
  return (
    <section id="reports" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      {/* 🧾 Generar reporte */}
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Centro de Informes y Reportes
        </h2>

        {/* Filtros */}
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <div>
            <label className="block mb-2 font-semibold text-gray-600">
              Seleccionar Unidad Residencial
            </label>
            <select
              id="report-client"
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
            >
              <option>Todas las unidades</option>
              <option>Torres del Parque</option>
              <option>Conjunto Palmeras</option>
              <option>Edificio Central</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-gray-600">
              Rango de Fechas
            </label>
            <input
              type="date"
              id="report-start-date"
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-gray-600">
              Hasta
            </label>
            <input
              type="date"
              id="report-end-date"
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-gray-600">
              Tipo de Reporte
            </label>
            <select
              id="report-type"
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
            >
              <option>Todos los reportes</option>
              <option>Asistencia</option>
              <option>Votaciones</option>
              <option>Poderes</option>
              <option>Estadísticas Generales</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap gap-4 mt-8">
          <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Generar Reporte
          </button>
          <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Vista Previa
          </button>
          <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Exportar PDF
          </button>
          <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Exportar Excel
          </button>
        </div>
      </div>

      {/* 📋 Tabla de reportes */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200 flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-[#2c3e50]">
            Historial de Reportes Generados
          </h3>
          <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
            Organizar por Fecha
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Unidad Residencial",
                "Fecha Asamblea",
                "Tipo Reporte",
                "Generado",
                "Estado",
                "Acciones",
              ].map((head) => (
                <th
                  key={head}
                  className="p-4 text-left font-semibold text-[#2c3e50] border-b border-gray-200"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {[
              {
                unidad: "Torres del Parque",
                fecha: "2025-01-15",
                tipo: "Completo (Asistencia + Votaciones)",
                generado: "2025-01-15 18:30",
              },
              {
                unidad: "Edificio Central",
                fecha: "2025-01-10",
                tipo: "Votaciones",
                generado: "2025-01-10 19:15",
              },
            ].map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-4">{r.unidad}</td>
                <td className="p-4">{r.fecha}</td>
                <td className="p-4">{r.tipo}</td>
                <td className="p-4">{r.generado}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                    Disponible
                  </span>
                </td>
                <td className="p-4 flex flex-wrap gap-2">
                  <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Ver
                  </button>
                  <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    PDF
                  </button>
                  <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Excel
                  </button>
                  <button className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 👁️ Vista previa */}
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Vista Previa del Reporte
        </h2>

        <div className="bg-gray-50 p-8 rounded-lg min-h-[300px] text-center text-gray-500">
          Selecciona los parámetros y haz clic en{" "}
          <span className="font-semibold text-[#3498db]">"Vista Previa"</span>{" "}
          para ver el reporte
        </div>
      </div>
    </section>
  );
};

export default ReportsSection;
