import {
  LayoutDashboard,
  Users,
  Calendar,
  Video,
  FileText,
  Settings,
  LogOut
} from 'lucide-react';

export default function SidebarAdmin({ section, setSection }) {
  const navItem = (id, Icon, label) => (
    <li>
      <button
        onClick={() => setSection(id)}
        className={`w-full text-left flex items-center gap-3 p-4 rounded transition ${
          section === id ? "bg-white/10 border-l-4 border-yellow-400 pl-6" : "hover:bg-white/5"
        }`}
      >
        <Icon size={20} />
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
        {navItem("dashboard", LayoutDashboard, "Dashboard")}
        {navItem("users", Users, "Gestión de Usuarios")}
        {navItem("assemblies", Calendar, "Gestión de Asambleas")}
        {navItem("live", Video, "Reunión en Vivo")}
        {navItem("reports", FileText, "Reportes")}
        {navItem("settings", Settings, "Configuración")}

        <li className="mt-6 border-t border-white/10 pt-4">
          <button
            onClick={() => { if (confirm("¿Cerrar sesión?")) alert("Sesión cerrada"); }}
            className="w-full text-left flex items-center gap-3 p-4 rounded hover:bg-white/5"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </li>
      </ul>
    </nav>
  );
}
