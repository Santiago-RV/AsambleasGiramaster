import React from "react";

const Sidebar = ({ activeSection, setActiveSection, titles }) => {
  return (
    <aside className="fixed left-0 top-0 w-[280px] h-screen bg-gradient-to-br from-[#2c3e50] to-[#34495e] text-white p-8 overflow-y-auto z-[1000]">
      <div className="px-6 pb-8 border-b border-white/10">
        <h2 className="text-xl font-semibold mb-2">Super Admin</h2>
        <p className="text-sm text-gray-400">Sistema de Asambleas</p>
      </div>

      <nav className="py-4">
        {Object.keys(titles).map((key) => (
          <a
            key={key}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection(key);
            }}
            className={`block px-6 py-4 text-gray-400 border-l-4 border-transparent transition-all duration-300 cursor-pointer hover:bg-white/10 hover:text-white hover:border-blue-500 hover:translate-x-1 ${
              activeSection === key
                ? "bg-white/10 text-white border-blue-500 translate-x-1"
                : ""
            }`}
          >
            {titles[key]}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
