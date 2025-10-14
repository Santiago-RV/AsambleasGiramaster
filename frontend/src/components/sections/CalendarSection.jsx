import React from "react";

const CalendarSection = () => {
  const previousMonth = () => console.log("Mes anterior");
  const nextMonth = () => console.log("Mes siguiente");

  return (
    <section id="calendar" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* 🗓️ Encabezado del calendario */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#2c3e50]">Calendario de Asambleas</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="bg-[#3498db] text-white px-4 py-2 rounded-md hover:bg-[#2980b9] transition-all"
            >
              ← Anterior
            </button>
            <h3 id="current-month" className="font-semibold text-[#2c3e50]">
              Enero 2025
            </h3>
            <button
              onClick={nextMonth}
              className="bg-[#3498db] text-white px-4 py-2 rounded-md hover:bg-[#2980b9] transition-all"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* 📅 Celdas del calendario */}
        <div className="grid grid-cols-7 gap-[1px] bg-[#ecf0f1] rounded-lg overflow-hidden">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div
              key={day}
              className="bg-[#34495e] text-white p-4 text-center font-bold"
            >
              {day}
            </div>
          ))}

          {/* Día 1 */}
          <div className="bg-white p-3 min-h-[100px] border-r border-[#ecf0f1]">
            <div className="font-bold mb-2">1</div>
          </div>

          {/* Día 2 */}
          <div className="bg-white p-3 min-h-[100px] border-r border-[#ecf0f1]">
            <div className="font-bold mb-2">2</div>
          </div>

          {/* Día 3 con evento */}
          <div className="bg-white p-3 min-h-[100px] border-r border-[#ecf0f1]">
            <div className="font-bold mb-2">3</div>
            <div className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white p-2 rounded-md text-sm">
              Torres del Parque - 15:00
            </div>
          </div>

          {/* Día 4 */}
          <div className="bg-white p-3 min-h-[100px] border-r border-[#ecf0f1]">
            <div className="font-bold mb-2">4</div>
          </div>

          {/* Día 5 con evento */}
          <div className="bg-white p-3 min-h-[100px] border-r border-[#ecf0f1]">
            <div className="font-bold mb-2">5</div>
            <div className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white p-2 rounded-md text-sm">
              Conjunto Palmeras - 09:00
            </div>
          </div>

          {/* Día 6 */}
          <div className="bg-white p-3 min-h-[100px] border-r border-[#ecf0f1]">
            <div className="font-bold mb-2">6</div>
          </div>

          {/* Día 7 */}
          <div className="bg-white p-3 min-h-[100px]">
            <div className="font-bold mb-2">7</div>
          </div>
        </div>

        {/* 📈 Resumen del mes */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-[#2c3e50]">Resumen del Mes</h3>

          <div className="grid gap-6 mt-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            {/* Tarjeta 1 */}
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#3498db] to-[#2980b9]">
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-1">12</h3>
                <p className="text-gray-500 text-sm">Asambleas Programadas</p>
              </div>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#27ae60] to-[#229954]">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-1">3</h3>
                <p className="text-gray-500 text-sm">Asambleas Hoy</p>
              </div>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#f39c12] to-[#e67e22]">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-1">85%</h3>
                <p className="text-gray-500 text-sm">Ocupación Promedio</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CalendarSection;
