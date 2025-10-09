import React, { useState } from "react";

import Sidebar from "../../../frontend/src/components/Sidebar";
import Header from "../../../frontend/src/components/Header";

import DashboardSection from "../../../frontend/src/components/sections/DashboardSection";
import ClientsSection from "../../../frontend/src/components/sections/ClientsSection";
import AssembliesSection from "../../../frontend/src/components/sections/AssembliesSection";
import CalendarSection from "../../../frontend/src/components/sections/CalendarSection";
import MonitoringSection from "../../../frontend/src/components/sections/MonitoringSection";
import ReportsSection from "../../../frontend/src/components/sections/ReportsSection";
import UsersSection from "../../../frontend/src/components/sections/UsersSection";

export const SADashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");

  const titles = {
    dashboard: "Dashboard",
    clients: "Gestión de Clientes",
    assemblies: "Configurar Asambleas",
    calendar: "Calendario de Eventos",
    monitoring: "Monitoreo de Asambleas",
    reports: "Informes y Reportes",
    users: "Gestión de Usuarios",
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} titles={titles} />
      <div className="main-content">
        <Header title={titles[activeSection]} />

        <div className="content">
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "clients" && <ClientsSection />}
          {activeSection === "assemblies" && <AssembliesSection />}
          {activeSection === "calendar" && <CalendarSection />}
          {activeSection === "monitoring" && <MonitoringSection />}
          {activeSection === "reports" && <ReportsSection />}
          {activeSection === "users" && <UsersSection />}
        </div>
      </div>
    </div>
  );
};
