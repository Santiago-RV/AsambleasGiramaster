import React, { useState } from "react";

const AssembliesSection = () => {
  const [asamblea, setAsamblea] = useState({
    unidad: "",
    nombre: "",
    copropietarios: "",
    fechaInicio: "",
    horaCita: "",
    segundaConvocatoria: "",
    linkZoom: "",
    fechaInicioPlataforma: "",
    fechaFinPlataforma: "",
  });

  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    rol: "Administrador",
    contraseña: "",
  });

  const [asambleas, setAsambleas] = useState([]);

  const handleAsambleaChange = (e) => {
    const { name, value } = e.target;
    setAsamblea((s) => ({ ...s, [name]: value }));
  };

  const handleUsuarioChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario((s) => ({ ...s, [name]: value }));
  };

  const addUserRow = () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.correo) {
      alert("Por favor completa los campos de usuario");
      return;
    }
    setUsuarios((s) => [...s, { ...nuevoUsuario }]);
    setNuevoUsuario({ nombre: "", correo: "", rol: "Administrador", contraseña: "" });
  };

  const deleteUser = (index) => {
    setUsuarios((s) => s.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();


    if (!asamblea.unidad || !asamblea.nombre) {
      alert("Selecciona unidad y nombra la asamblea");
      return;
    }

    const nueva = {
      id: Date.now(),
      ...asamblea,
      usuarios,
    };

    setAsambleas((s) => [nueva, ...s]);

    setAsamblea({
      unidad: "",
      nombre: "",
      copropietarios: "",
      fechaInicio: "",
      horaCita: "",
      segundaConvocatoria: "",
      linkZoom: "",
      fechaInicioPlataforma: "",
      fechaFinPlataforma: "",
    });
    setUsuarios([]);
    alert("✅ Asamblea creada (simulación)");
    console.log("Asamblea creada:", nueva);
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

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
              <div>
                <label className="block mb-2 font-semibold text-gray-600">
                  Seleccionar Unidad Residencial
                </label>
                <select
                  name="unidad"
                  value={asamblea.unidad}
                  onChange={handleAsambleaChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                >
                  <option value="">Seleccione una unidad...</option>
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
                  <input type="file" id="logo-upload" className="hidden" accept="image/*" />
                  📷 Subir Logo (Opcional)
                </div>
              </div>

              <InputField
                name="nombre"
                label="Nombre de la asamblea"
                placeholder="Ej: Asamblea mensual"
                value={asamblea.nombre}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="copropietarios"
                label="Cantidad de Copropietarios"
                type="number"
                placeholder="Ej: 120"
                id="copropietarios-count"
                value={asamblea.copropietarios}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="fechaInicio"
                label="Fecha de Inicio"
                type="datetime-local"
                value={asamblea.fechaInicio}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="horaCita"
                label="Hora de Citación"
                type="time"
                value={asamblea.horaCita}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="segundaConvocatoria"
                label="Segunda Convocatoria"
                type="datetime-local"
                value={asamblea.segundaConvocatoria}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="linkZoom"
                label="Link de Zoom"
                type="url"
                placeholder="https://zoom.us/j/1234567890"
                value={asamblea.linkZoom}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="fechaInicioPlataforma"
                label="Fecha Habilitación Plataforma"
                type="date"
                value={asamblea.fechaInicioPlataforma}
                onChange={handleAsambleaChange}
              />

              <InputField
                name="fechaFinPlataforma"
                label="Fecha Fin Plataforma"
                type="date"
                value={asamblea.fechaFinPlataforma}
                onChange={handleAsambleaChange}
              />
            </div>

            <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
              Crear Usuarios con Roles
            </h3>

            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
              <InputField
                name="nombre"
                label="Nombre Completo"
                placeholder="Ej: María González"
                value={nuevoUsuario.nombre}
                onChange={handleUsuarioChange}
              />
              <InputField
                name="correo"
                label="Correo Electrónico"
                type="email"
                placeholder="maria@email.com"
                value={nuevoUsuario.correo}
                onChange={handleUsuarioChange}
              />

              <div>
                <label className="block mb-2 font-semibold text-gray-600">Rol</label>
                <select
                  name="rol"
                  value={nuevoUsuario.rol}
                  onChange={handleUsuarioChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#3498db] focus:outline-none"
                >
                  <option>Administrador</option>
                  <option>Invitado</option>
                </select>
              </div>

              <InputField
                name="contraseña"
                label="Contraseña"
                type="password"
                placeholder="Contraseña"
                value={nuevoUsuario.contraseña}
                onChange={handleUsuarioChange}
              />
            </div>

            <button
              type="button"
              onClick={addUserRow}
              className="w-full bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Agregar Usuario
            </button>

            {usuarios.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Nombre", "Correo", "Rol", "Acciones"].map((head) => (
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
                    {usuarios.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-4">{u.nombre}</td>
                        <td className="p-4">{u.correo}</td>
                        <td className="p-4">{u.rol}</td>
                        <td className="p-4">
                          <button
                            onClick={() => deleteUser(i)}
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
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <button type="submit" className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
                Crear Asamblea
              </button>

              <button type="button" className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
                Enviar Invitaciones
              </button>

              <button type="button" className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
                Generar QR (PDF)
              </button>

              <button type="button" className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all">
                Generar Excel
              </button>
            </div>
          </form>
        </div>

        {asambleas.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-[#2c3e50]">Asambleas creadas (simulación)</h3>
            </div>
            <div className="p-4">
              {asambleas.map((a) => (
                <div key={a.id} className="mb-4 p-4 border rounded-lg">
                  <div className="font-semibold">{a.nombre} — {a.unidad}</div>
                  <div className="text-sm text-gray-600">Copropietarios: {a.copropietarios || "—"}</div>
                  <div className="text-sm text-gray-600">Fecha inicio: {a.fechaInicio || "—"} {a.horaCita || ""}</div>
                  <div className="text-sm text-gray-600">Usuarios: {a.usuarios?.length ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};


const InputField = ({ name, label, type = "text", placeholder, value, onChange, id }) => (
  <div>
    <label className="block mb-2 font-semibold text-gray-600">{label}</label>
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3498db]"
    />
  </div>
);

export default AssembliesSection;
