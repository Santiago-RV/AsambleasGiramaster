import React, { useState } from "react";

const UsersSection = () => {
  const [usuarios, setUsuarios] = useState([
    { nombre: "Carlos Administrador", correo: "carlos@email.com", rol: "Administrador", unidad: "Torres del Parque", estado: "Activo" },
    { nombre: "Laura Pérez", correo: "laura@admin.com", rol: "Super Administrador", unidad: "Todas las unidades", estado: "Activo" },
  ]);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    rol: "Invitado",
    unidad: "Todas las unidades",
    contraseña: "",
    estado: "Activo",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario((prev) => ({ ...prev, [name]: value }));
  };

  const agregarUsuario = () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.correo || !nuevoUsuario.contraseña) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    setUsuarios((prev) => [...prev, nuevoUsuario]);
    setNuevoUsuario({
      nombre: "",
      correo: "",
      rol: "Invitado",
      unidad: "Todas las unidades",
      contraseña: "",
      estado: "Activo",
    });
  };

  const eliminarUsuario = (index) => {
    setUsuarios((prev) => prev.filter((_, i) => i !== index));
  };

  const stats = [
    {
      title: "Super Administradores",
      value: usuarios.filter((u) => u.rol === "Super Administrador").length,
    },
    {
      title: "Administradores",
      value: usuarios.filter((u) => u.rol === "Administrador").length,
    },
    {
      title: "Invitados Activos",
      value: usuarios.filter((u) => u.rol === "Invitado" && u.estado === "Activo").length,
    },
    {
      title: "Total Copropietarios",
      value: usuarios.length,
    },
  ];

  return (
    <section id="users" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Gestión de Usuarios y Roles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white rounded-xl p-6 shadow-md"
            >
              <h3 className="text-3xl font-bold">{stat.value}</h3>
              <p className="text-sm mt-1">{stat.title}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))] mb-6">
          <InputField
            label="Nombre Completo"
            name="nombre"
            type="text"
            placeholder="Ej: Carlos Administrador"
            value={nuevoUsuario.nombre}
            onChange={handleChange}
          />

          <InputField
            label="Correo Electrónico"
            name="correo"
            type="email"
            placeholder="correo@email.com"
            value={nuevoUsuario.correo}
            onChange={handleChange}
          />

          <SelectField
            label="Rol del Usuario"
            name="rol"
            value={nuevoUsuario.rol}
            onChange={handleChange}
            options={["Super Administrador", "Administrador", "Invitado"]}
          />

          <SelectField
            label="Unidad Residencial (si aplica)"
            name="unidad"
            value={nuevoUsuario.unidad}
            onChange={handleChange}
            options={["Todas las unidades", "Torres del Parque", "Conjunto Palmeras", "Edificio Central"]}
          />

          <InputField
            label="Contraseña"
            name="contraseña"
            type="password"
            placeholder="Contraseña"
            value={nuevoUsuario.contraseña}
            onChange={handleChange}
          />

          <SelectField
            label="Estado"
            name="estado"
            value={nuevoUsuario.estado}
            onChange={handleChange}
            options={["Activo", "Inactivo", "Pendiente"]}
          />
        </div>

        <button
          onClick={agregarUsuario}
          className="w-full bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          Agregar Usuario
        </button>
      </div>

      {usuarios.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Usuarios Registrados (Simulación)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {["Nombre", "Correo", "Rol", "Unidad", "Estado", "Acciones"].map((head, i) => (
                    <th
                      key={i}
                      className="p-4 text-left font-semibold text-[#2c3e50] border-b border-gray-200"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-4">{u.nombre}</td>
                    <td className="p-4">{u.correo}</td>
                    <td className="p-4">{u.rol}</td>
                    <td className="p-4">{u.unidad}</td>
                    <td className="p-4">{u.estado}</td>
                    <td className="p-4">
                      <button
                        onClick={() => eliminarUsuario(i)}
                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};


const InputField = ({ label, name, type = "text", placeholder, value, onChange }) => (
  <div>
    <label className="block mb-2 font-semibold text-gray-600">{label}</label>
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, options = [] }) => (
  <div>
    <label className="block mb-2 font-semibold text-gray-600">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3498db]"
    >
      {options.map((opt, i) => (
        <option key={i}>{opt}</option>
      ))}
    </select>
  </div>
);

export default UsersSection;