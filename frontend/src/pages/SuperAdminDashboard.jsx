import React, { useState } from "react";
import "./super_admin_dashboard.css";

import Sidebar from "../../../frontend_old/src/components/Sidebar";
import Header from "../../../frontend_old/src/components/Header";

import DashboardSection from "../../../frontend_old/src/components/sections/DashboardSection";
import ClientsSection from "../../../frontend_old/src/components/sections/ClientsSection";
import AssembliesSection from "../../../frontend_old/src/components/sections/AssembliesSection";
import CalendarSection from "../../../frontend_old/src/components/sections/CalendarSection";
import MonitoringSection from "../../../frontend_old/src/components/sections/MonitoringSection";
import ReportsSection from "../../../frontend_old/src/components/sections/ReportsSection";
import UsersSection from "../../../frontend_old/src/components/sections/UsersSection";

const SuperAdminDashboard = () => {
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

export default SuperAdminDashboard;
