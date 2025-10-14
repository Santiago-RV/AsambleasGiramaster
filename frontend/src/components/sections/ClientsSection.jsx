import React from "react";

const ClientsSection = () => {
  return (
    <section id="clients" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      {/* 🧾 Formulario */}
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Crear Nueva Unidad Residencial
        </h2>

        <form className="space-y-8">
          {/* Información Unidad */}
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {[
              ["Nombre de la Unidad Residencial", "text", "Ej: Torres del Parque"],
              ["Número de Apartamentos", "number", "Ej: 120"],
              ["NIT", "text", "Ej: 900123456-7"],
              ["Ciudad", "text", "Ej: Medellín"],
              ["Dirección", "text", "Ej: Carrera 15 # 25-30"],
              ["Correo Electrónico", "email", "administracion@unidadresidencial.com"],
              ["Teléfono Administración", "tel", "Ej: +57 4 123 4567"],
              ["Teléfono Portería", "tel", "Ej: +57 4 765 4321"],
            ].map(([label, type, placeholder]) => (
              <div key={label}>
                <label className="block mb-2 font-semibold text-gray-600">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                />
              </div>
            ))}
          </div>

          {/* Empresa de Administración */}
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Información Empresa de Administración
          </h3>
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {[
              ["Nombre", "text", "Ej: AdminPro S.A.S"],
              ["Correo", "email", "contacto@adminpro.com"],
              ["Teléfono", "tel", "Ej: +57 4 555 1234"],
              ["Nombre del Administrador", "text", "Ej: Juan Pérez"],
              ["Correo Administrador", "email", "juan.perez@adminpro.com"],
              ["Celular Administrador", "tel", "Ej: +57 300 123 4567"],
              ["Nombre Auxiliar", "text", "Ej: María González"],
              ["Correo Auxiliar", "email", "maria.gonzalez@adminpro.com"],
              ["Celular Auxiliar", "tel", "Ej: +57 301 234 5678"],
            ].map(([label, type, placeholder]) => (
              <div key={label}>
                <label className="block mb-2 font-semibold text-gray-600">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                />
              </div>
            ))}
          </div>

          {/* Contabilidad y Revisoría */}
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Información Contabilidad y Revisoría
          </h3>
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {[
              ["Nombre Contador(a)", "text", "Ej: Carlos Rodríguez"],
              ["Correo Contador", "email", "contador@contabilidadpro.com"],
              ["Celular Contador", "tel", "Ej: +57 302 345 6789"],
              ["Nombre Revisor Fiscal", "text", "Ej: Ana Martínez"],
              ["Correo Revisor Fiscal", "email", "revisor@auditoriapro.com"],
              ["Celular Revisor Fiscal", "tel", "Ej: +57 303 456 7890"],
            ].map(([label, type, placeholder]) => (
              <div key={label}>
                <label className="block mb-2 font-semibold text-gray-600">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                />
              </div>
            ))}
          </div>

          {/* Botones */}
          <div className="flex flex-wrap gap-4 mt-6">
            <button
              type="submit"
              className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Guardar Cliente
            </button>

            <button
              type="reset"
              className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Limpiar Formulario
            </button>
          </div>
        </form>
      </div>

      {/* 📋 Tabla */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#2c3e50]">
            Lista de Unidades Residenciales
          </h3>
        </div>

        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {["Unidad Residencial", "Ciudad", "Apartamentos", "Administrador", "Estado", "Acciones"].map(
                (head) => (
                  <th
                    key={head}
                    className="p-4 text-left font-semibold text-[#2c3e50] border-b border-gray-200"
                  >
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            <tr className="hover:bg-gray-50">
              <td className="p-4">Torres del Parque</td>
              <td className="p-4">Medellín</td>
              <td className="p-4">120</td>
              <td className="p-4">Juan Pérez</td>
              <td className="p-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                  Activo
                </span>
              </td>
              <td className="p-4">
                <div className="flex flex-col gap-2">
                  <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Editar
                  </button>
                  <button className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Borrar
                  </button>
                  <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Informe
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ClientsSection;
