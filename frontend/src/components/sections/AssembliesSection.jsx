import React from "react";

const AssembliesSection = () => {
  const addUserRow = () => {
    console.log("Agregar usuario (aquí metes la lógica)");
  };

  const triggerUpload = (id) => {
    document.getElementById(id)?.click();
  };

  return (
  <div className="ml-[280px] min-h-screen bg-[#f5f7fa]">
    <section id="assemblies" className="p-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Configurar Nueva Asamblea
        </h2>

        <form className="space-y-8">
          {/* 🧩 Grid principal */}
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Seleccionar Unidad Residencial
              </label>
              <select className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]">
                <option>Seleccione una unidad...</option>
                <option>Torres del Parque</option>
                <option>Conjunto Palmeras</option>
                <option>Edificio Central</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Logo/Imagen de la Unidad
              </label>
              <div
                className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center bg-gray-50 cursor-pointer hover:border-[#3498db] hover:bg-gray-200 transition-all"
                onClick={() => triggerUpload("logo-upload")}
              >
                <input
                  type="file"
                  id="logo-upload"
                  className="hidden"
                  accept="image/*"
                />
                📷 Subir Logo (Opcional)
              </div>
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Nombre de la asamblea
              </label>
              <input
                type="text"
                placeholder="Ej: Asamblea mensual"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Cantidad de Copropietarios
              </label>
              <input
                type="number"
                placeholder="Ej: 120"
                id="copropietarios-count"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Fecha de Inicio
              </label>
              <input
                type="datetime-local"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Hora de Citación
              </label>
              <input
                type="time"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Segunda Convocatoria
              </label>
              <input
                type="datetime-local"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Link de Zoom
              </label>
              <input
                type="url"
                placeholder="https://zoom.us/j/1234567890"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Fecha Habilitación Plataforma
              </label>
              <input
                type="date"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Fecha Fin Plataforma
              </label>
              <input
                type="date"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>
          </div>

          {/* 👥 Crear usuarios */}
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Crear Usuarios con Roles
          </h3>

          <div className="space-y-6">
            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
              <div>
                <label className="block mb-2 font-semibold text-gray-600">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: María González"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#3498db] focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-600">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="maria@email.com"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#3498db] focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-600">
                  Rol
                </label>
                <select className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#3498db] focus:outline-none">
                  <option>Administrador</option>
                  <option>Invitado</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-600">
                  Contraseña
                </label>
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#3498db] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={addUserRow}
            className="w-full bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Agregar Usuario
          </button>

          {/* 📂 Subida de Excel */}
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Base de Datos Copropietarios
          </h3>

          <div
            className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center bg-gray-50 cursor-pointer hover:border-[#3498db] hover:bg-gray-200 transition-all"
            onClick={() => triggerUpload("excel-upload")}
          >
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx,.xls"
            />
            <span className="font-medium">Subir Excel con Copropietarios</span>
            <p className="text-sm text-gray-500 mt-2">
              Formato: Apartamento, Nombre, Correo, WhatsApp, etc.
            </p>
          </div>

          {/* 🔘 Botones finales */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="submit"
              className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Crear Asamblea
            </button>

            <button
              type="button"
              className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Enviar Invitaciones
            </button>

            <button
              type="button"
              className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Generar QR (PDF)
            </button>

            <button
              type="button"
              className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Generar Excel
            </button>
          </div>
        </form>
      </div>
    </section>
    </div>
  );
};

export default AssembliesSection;
