import React from "react";

const Sidebar = ({ activeSection, setActiveSection, titles }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Super Admin</h2>
        <p>Sistema de Asambleas</p>
      </div>
      <nav className="sidebar-nav">
        {Object.keys(titles).map((key) => (
          <a
            key={key}
            href="#"
            className={`nav-item ${activeSection === key ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveSection(key);
            }}
          >
            {titles[key]}
          </a>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
