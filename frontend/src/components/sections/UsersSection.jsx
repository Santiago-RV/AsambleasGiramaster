import React from "react";

const UsersSection = () => {
  return (
    <section id="users" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      {/* 🧩 Gestión de Usuarios */}
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Gestión de Usuarios y Roles
        </h2>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Super Administradores", value: "156" },
            { title: "Administradores", value: "1,247" },
            { title: "Invitados Activos", value: "8,932" },
            { title: "Total Copropietarios", value: "23,456" },
          ].map((stat, i) => (
            <div key={i} className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white rounded-xl p-6 shadow-md">
              <h3 className="text-3xl font-bold">{stat.value}</h3>
              <p className="text-sm mt-1">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          {[
            { label: "Nombre Completo", type: "text", placeholder: "Ej: Carlos Administrador" },
            { label: "Correo Electrónico", type: "email", placeholder: "carlos@email.com" },
          ].map((field, i) => (
            <div key={i}>
              <label className="block mb-2 font-semibold text-gray-600">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
            </div>
          ))}

          <div>
            <label className="block mb-2 font-semibold text-gray-600">Rol del Usuario</label>
            <select className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3498db]">
              <option>Super Administrador</option>
              <option>Administrador</option>
              <option>Invitado</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-gray-600">Unidad Residencial (si aplica)</label>
            <select className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3498db]">
              <option>Todas las unidades</option>
              <option>Torres del Parque</option>
              <option>Conjunto Palmeras</option>
              <option>Edificio Central</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-gray-600">Contraseña</label>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-gray-600">Estado</label>
            <select className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3498db]">
              <option>Activo</option>
              <option>Inactivo</option>
              <option>Pendiente</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap gap-4 mt-8">
          <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Crear Usuario
          </button>
          <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Enviar Credenciales
          </button>
        </div>
      </div>

      {/* 📋 Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200 flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-[#2c3e50]">Lista de Usuarios del Sistema</h3>

          <div className="flex flex-wrap gap-2 items-center">
            <select className="p-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-[#3498db]">
              <option>Todos los roles</option>
              <option>Super Administradores</option>
              <option>Administradores</option>
              <option>Invitados</option>
            </select>
            <input
              type="text"
              placeholder="Buscar usuario..."
              className="p-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-[#3498db]"
            />
            <button className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
              Buscar
            </button>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {["Usuario", "Correo", "Rol", "Unidad Asignada", "Último Acceso", "Estado", "Acciones"].map((h) => (
                <th key={h} className="p-4 text-left font-semibold text-[#2c3e50] border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                nombre: "Juan Administrador",
                correo: "juan.admin@adminpro.com",
                rol: "Super Admin",
                colorRol: "bg-green-100 text-green-600",
                unidad: "Torres del Parque",
                acceso: "2025-01-15 14:30",
                estado: "Activo",
              },
              {
                nombre: "María González",
                correo: "maria.gonzalez@conjuntopalmeras.com",
                rol: "Administrador",
                colorRol: "bg-yellow-100 text-yellow-600",
                unidad: "Conjunto Palmeras",
                acceso: "2025-01-14 09:15",
                estado: "Activo",
              },
            ].map((user, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white flex items-center justify-center text-sm font-semibold">
                    {user.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <strong>{user.nombre}</strong>
                </td>
                <td className="p-4">{user.correo}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.colorRol}`}>
                    {user.rol}
                  </span>
                </td>
                <td className="p-4">{user.unidad}</td>
                <td className="p-4">{user.acceso}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                    {user.estado}
                  </span>
                </td>
                <td className="p-4 flex flex-wrap gap-2">
                  <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Editar
                  </button>
                  <button className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default UsersSection;
