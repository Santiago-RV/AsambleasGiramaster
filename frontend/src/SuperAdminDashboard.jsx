import React, { useState } from "react";
import "./super_admin_dashboard.css";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import DashboardSection from "./components/sections/DashboardSection";
import ClientsSection from "./components/sections/ClientsSection";
import AssembliesSection from "./components/sections/AssembliesSection";
import CalendarSection from "./components/sections/CalendarSection";
import MonitoringSection from "./components/sections/MonitoringSection";
import ReportsSection from "./components/sections/ReportsSection";
import UsersSection from "./components/sections/UsersSection";

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
