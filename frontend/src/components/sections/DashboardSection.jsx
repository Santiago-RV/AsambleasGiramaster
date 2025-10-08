import React from "react";

const DashboardSection = () => {
  return (
    <div className="content-section active">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>47</h3>
            <p>Unidades Residenciales</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>23</h3>
            <p>Asambleas Programadas</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>8</h3>
            <p>Asambleas Activas</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>156</h3>
            <p>Reportes Generados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
