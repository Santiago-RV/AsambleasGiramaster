import React from "react";

const DashboardSection = () => {
  return (
    <section className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      <div className="grid gap-6 mb-8 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {/* 🔹 Tarjeta 1 */}
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#3498db] to-[#2980b9]">
            <i className="fa-solid fa-building"></i>
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1">47</h3>
            <p className="text-gray-500 text-sm">Unidades Residenciales</p>
          </div>
        </div>

        {/* 🔹 Tarjeta 2 */}
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#27ae60] to-[#229954]">
            <i className="fa-solid fa-calendar-check"></i>
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1">23</h3>
            <p className="text-gray-500 text-sm">Asambleas Programadas</p>
          </div>
        </div>

        {/* 🔹 Tarjeta 3 */}
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#e74c3c] to-[#c0392b]">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1">8</h3>
            <p className="text-gray-500 text-sm">Asambleas Activas</p>
          </div>
        </div>

        {/* 🔹 Tarjeta 4 */}
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br from-[#f39c12] to-[#e67e22]">
            <i className="fa-solid fa-file-alt"></i>
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1">156</h3>
            <p className="text-gray-500 text-sm">Reportes Generados</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardSection;
