export default function SidebarAdmin({ section, setSection }) {
  const navItem = (id, icon, label) => (
    <li>
      <button
        onClick={() => setSection(id)}
        className={`w-full text-left flex items-center gap-3 p-4 rounded transition ${
          section === id ? "bg-white/10 border-l-4 border-yellow-400 pl-6" : "hover:bg-white/5"
        }`}
      >
        <span className="text-xl">{icon}</span>
        {label}
      </button>
    </li>
  );

  return (
    <nav className="w-[280px] fixed left-0 top-0 h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow overflow-y-auto">
      <div className="p-5 border-b border-white/10 text-center">
        <h2 className="text-lg font-semibold">Asambleas Digital</h2>
        <div className="text-sm opacity-80 mt-1">Administrador: Juan Pérez</div>
        <div className="text-xs opacity-70">admin@edificio.com</div>
      </div>

      <ul className="mt-4 space-y-2 px-2">
        {navItem("dashboard", "Dashboard")}
        {navItem("users", "Gestión de Usuarios")}
        {navItem("assemblies", "Gestión de Asambleas")}
        {navItem("live", "Reunión en Vivo")}
        {navItem("reports", "Reportes")}
        {navItem("settings", "Configuración")}

        <li className="mt-6 border-t border-white/10 pt-4">
          <button
            onClick={() => { if (confirm("¿Cerrar sesión?")) alert("Sesión cerrada"); }}
            className="w-full text-left flex items-center gap-3 p-4 rounded hover:bg-white/5"
          >
            <span className="text-xl"></span> Cerrar Sesión
          </button>
        </li>
      </ul>
    </nav>
  );
}
