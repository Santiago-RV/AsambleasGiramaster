import React, { useState } from "react";

const ClientsSection = () => {

  const [formData, setFormData] = useState({
    // Unidad
    nombreUnidad: "",
    numAptos: "",
    nit: "",
    ciudad: "",
    direccion: "",
    correoUnidad: "",
    telAdminUnidad: "",
    telPorteria: "",

    // Empresa
    empresaNombre: "",
    empresaCorreo: "",
    empresaTelefono: "",
    empresaNombreAdmin: "",
    empresaCorreoAdmin: "",
    empresaCelularAdmin: "",
    empresaNombreAuxiliar: "",
    empresaCorreoAuxiliar: "",
    empresaCelularAuxiliar: "",

    // Contabilidad
    contadorNombre: "",
    contadorCorreo: "",
    contadorCelular: "",
    revisorNombre: "",
    revisorCorreo: "",
    revisorCelular: "",
  });

  const [unidades, setUnidades] = useState([
    {
      id: 1,
      nombreUnidad: "Torres del Parque",
      ciudad: "Medellín",
      numAptos: 120,
      admin: "Juan Pérez",
      estado: "Activo",
    },
  ]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();

    const nuevaUnidad = {
      id: Date.now(),
      nombreUnidad: formData.nombreUnidad || "Unidad Sin Nombre",
      ciudad: formData.ciudad || "Sin ciudad",
      numAptos: formData.numAptos || 0,
      admin: formData.empresaNombreAdmin || formData.empresaNombre || "Sin administrador",
      estado: "Activo",
    };

    setUnidades((s) => [...s, nuevaUnidad]);


    setFormData({
      nombreUnidad: "",
      numAptos: "",
      nit: "",
      ciudad: "",
      direccion: "",
      correoUnidad: "",
      telAdminUnidad: "",
      telPorteria: "",

      empresaNombre: "",
      empresaCorreo: "",
      empresaTelefono: "",
      empresaNombreAdmin: "",
      empresaCorreoAdmin: "",
      empresaCelularAdmin: "",
      empresaNombreAuxiliar: "",
      empresaCorreoAuxiliar: "",
      empresaCelularAuxiliar: "",

      contadorNombre: "",
      contadorCorreo: "",
      contadorCelular: "",
      revisorNombre: "",
      revisorCorreo: "",
      revisorCelular: "",
    });

    alert("Unidad guardada");
  };


  const handleDelete = (id) => {
    if (!confirm("¿Seguro que quieres eliminar esta unidad?")) return;
    setUnidades((s) => s.filter((u) => u.id !== id));
  };

  return (
    <section id="clients" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Crear Nueva Unidad Residencial
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {[
              ["nombreUnidad", "Nombre de la Unidad Residencial", "text", "Ej: Torres del Parque"],
              ["numAptos", "Número de Apartamentos", "number", "Ej: 120"],
              ["nit", "NIT", "text", "Ej: 900123456-7"],
              ["ciudad", "Ciudad", "text", "Ej: Medellín"],
              ["direccion", "Dirección", "text", "Ej: Carrera 15 # 25-30"],
              ["correoUnidad", "Correo Electrónico", "email", "administracion@unidadresidencial.com"],
              ["telAdminUnidad", "Teléfono Administración", "tel", "Ej: +57 4 123 4567"],
              ["telPorteria", "Teléfono Portería", "tel", "Ej: +57 4 765 4321"],
            ].map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label className="block mb-2 font-semibold text-gray-600">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                />
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Información Empresa de Administración
          </h3>
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {[
              ["empresaNombre", "Nombre", "text", "Ej: AdminPro S.A.S"],
              ["empresaCorreo", "Correo", "email", "contacto@adminpro.com"],
              ["empresaTelefono", "Teléfono", "tel", "Ej: +57 4 555 1234"],
              ["empresaNombreAdmin", "Nombre del Administrador", "text", "Ej: Juan Pérez"],
              ["empresaCorreoAdmin", "Correo Administrador", "email", "juan.perez@adminpro.com"],
              ["empresaCelularAdmin", "Celular Administrador", "tel", "Ej: +57 300 123 4567"],
              ["empresaNombreAuxiliar", "Nombre Auxiliar", "text", "Ej: María González"],
              ["empresaCorreoAuxiliar", "Correo Auxiliar", "email", "maria.gonzalez@adminpro.com"],
              ["empresaCelularAuxiliar", "Celular Auxiliar", "tel", "Ej: +57 301 234 5678"],
            ].map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label className="block mb-2 font-semibold text-gray-600">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                />
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 border-b-2 border-gray-200 pb-2">
            Información Contabilidad y Revisoría
          </h3>
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {[
              ["contadorNombre", "Nombre Contador(a)", "text", "Ej: Carlos Rodríguez"],
              ["contadorCorreo", "Correo Contador", "email", "contador@contabilidadpro.com"],
              ["contadorCelular", "Celular Contador", "tel", "Ej: +57 302 345 6789"],
              ["revisorNombre", "Nombre Revisor Fiscal", "text", "Ej: Ana Martínez"],
              ["revisorCorreo", "Correo Revisor Fiscal", "email", "revisor@auditoriapro.com"],
              ["revisorCelular", "Celular Revisor Fiscal", "tel", "Ej: +57 303 456 7890"],
            ].map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label className="block mb-2 font-semibold text-gray-600">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                />
              </div>
            ))}
          </div>

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
              onClick={() =>
                setFormData({
                  nombreUnidad: "",
                  numAptos: "",
                  nit: "",
                  ciudad: "",
                  direccion: "",
                  correoUnidad: "",
                  telAdminUnidad: "",
                  telPorteria: "",

                  empresaNombre: "",
                  empresaCorreo: "",
                  empresaTelefono: "",
                  empresaNombreAdmin: "",
                  empresaCorreoAdmin: "",
                  empresaCelularAdmin: "",
                  empresaNombreAuxiliar: "",
                  empresaCorreoAuxiliar: "",
                  empresaCelularAuxiliar: "",

                  contadorNombre: "",
                  contadorCorreo: "",
                  contadorCelular: "",
                  revisorNombre: "",
                  revisorCorreo: "",
                  revisorCelular: "",
                })
              }
            >
              Limpiar Formulario
            </button>
          </div>
        </form>
      </div>

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
            {unidades.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4">{u.nombreUnidad}</td>
                <td className="p-4">{u.ciudad}</td>
                <td className="p-4">{u.numAptos}</td>
                <td className="p-4">{u.admin}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                    {u.estado}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all"
                    >
                      Borrar
                    </button>
                    <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                      Informe
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ClientsSection;
