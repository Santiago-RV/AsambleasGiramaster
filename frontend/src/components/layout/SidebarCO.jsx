export default function Sidebar({ section, setSection }) {
  return (
    <nav className="w-[280px] fixed left-0 top-0 h-screen bg-gradient-to-br from-[#2c5aa0] to-[#1e3c72] text-white shadow-xl overflow-y-auto">

      {/* Header */}
      <div className="p-6 border-b border-white/10 text-center">
        <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center text-3xl">
          🏢
        </div>
        <h2 className="mt-3 text-lg font-semibold">Torre Azul</h2>
        <p className="text-sm opacity-80">Copropietario</p>
      </div>

      {/* User Info */}
      <div className="bg-white/10 rounded-lg m-5 p-4 text-sm">
        <div className="font-bold">María González</div>
        <div>Apartamento: 101</div>
        <div>Coeficiente: 2.5%</div>
        <div>maria.gonzalez@email.com</div>
      </div>

      {/* Navigation */}
      <ul className="mt-4 space-y-2 px-2">
        <li>
          <button
            onClick={() => setSection("assembly")}
            className={`w-full text-left flex items-center gap-3 p-4 rounded-lg transition ${
              section === "assembly"
                ? "bg-white/20 border-l-4 border-yellow-400 pl-6"
                : "hover:bg-white/10"
            }`}
          >
            <span className="text-xl">🏛️</span>
            Asamblea Actual
          </button>
        </li>

        <li>
          <button
            onClick={() => setSection("voting")}
            className={`w-full text-left flex items-center gap-3 p-4 rounded-lg transition ${
              section === "voting"
                ? "bg-white/20 border-l-4 border-yellow-400 pl-6"
                : "hover:bg-white/10"
            }`}
          >
            <span className="text-xl">🗳️</span>
            Votaciones
          </button>
        </li>

        <li>
          <button
            onClick={() => setSection("profile")}
            className={`w-full text-left flex items-center gap-3 p-4 rounded-lg transition ${
              section === "profile"
                ? "bg-white/20 border-l-4 border-yellow-400 pl-6"
                : "hover:bg-white/10"
            }`}
          >
            <span className="text-xl">👤</span>
            Mi Perfil
          </button>
        </li>

        <li className="border-t border-white/10 mt-6 pt-4">
          <button
            onClick={() => alert("Salir de reunión (luego lo pasamos a modal)")}
            className="w-full text-left flex items-center gap-3 p-4 rounded-lg hover:bg-white/10 transition"
          >
            <span className="text-xl">🚪</span>
            Salir de Reunión
          </button>
        </li>
      </ul>
    </nav>
  );
}
