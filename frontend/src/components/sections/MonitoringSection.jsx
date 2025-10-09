import React from "react";

const MonitoringSection = () => {
  const monitorAssembly = (id) => {
    console.log("Ingresando a asamblea:", id);
  };

  return (
    <section id="monitoring" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* 🔹 Encabezado */}
        <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200 flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-[#2c3e50]">
            Monitoreo de Asambleas
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <select className="p-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#3498db]">
              <option>Todas las asambleas</option>
              <option>Solo activas</option>
              <option>Solo finalizadas</option>
              <option>Programadas</option>
            </select>

            <input
              type="text"
              placeholder="Buscar unidad residencial..."
              className="p-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#3498db]"
            />

            <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
              Buscar
            </button>
          </div>
        </div>

        {/* 📋 Tabla */}
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Unidad Residencial",
                "Fecha/Hora",
                "Copropietarios",
                "Conectados",
                "Estado",
                "Progreso",
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
            {/* 🟢 Asamblea en vivo */}
            <tr className="bg-[#d5f4e6] hover:bg-[#c7ecd8] transition-all">
              <td className="p-4 font-semibold text-[#2c3e50]">
                Torres del Parque
              </td>
              <td className="p-4">2025-01-15 15:00</td>
              <td className="p-4">120</td>
              <td className="p-4 text-[#27ae60] font-bold">87 (72%)</td>
              <td className="p-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                  EN VIVO
                </span>
              </td>
              <td className="p-4">
                <div className="bg-gray-200 rounded-full h-2 mb-1">
                  <div className="bg-[#27ae60] h-2 rounded-full w-[65%]"></div>
                </div>
                <small className="text-gray-600 text-xs">65% completado</small>
              </td>
              <td className="p-4 flex flex-col gap-2">
                <button
                  onClick={() => monitorAssembly(1)}
                  className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  Ingresar
                </button>
                <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                  Configurar
                </button>
              </td>
            </tr>

            {/* 🟡 Asamblea programada */}
            <tr className="hover:bg-gray-50">
              <td className="p-4">Conjunto Palmeras</td>
              <td className="p-4">2025-01-20 09:00</td>
              <td className="p-4">85</td>
              <td className="p-4">-</td>
              <td className="p-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-[#f39c12]">
                  Programada
                </span>
              </td>
              <td className="p-4 text-gray-500">-</td>
              <td className="p-4 flex flex-col gap-2">
                <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                  Previsualizar
                </button>
                <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                  Editar
                </button>
              </td>
            </tr>

            {/* 🔵 Asamblea finalizada */}
            <tr className="hover:bg-gray-50">
              <td className="p-4">Edificio Central</td>
              <td className="p-4">2025-01-10 17:00</td>
              <td className="p-4">45</td>
              <td className="p-4">42 (93%)</td>
              <td className="p-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-[#e74c3c]">
                  Finalizada
                </span>
              </td>
              <td className="p-4">
                <div className="bg-gray-200 rounded-full h-2 mb-1">
                  <div className="bg-[#3498db] h-2 rounded-full w-full"></div>
                </div>
                <small className="text-gray-600 text-xs">Completado</small>
              </td>
              <td className="p-4 flex flex-col gap-2">
                <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                  Reportes
                </button>
                <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                  Descargar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default MonitoringSection;
