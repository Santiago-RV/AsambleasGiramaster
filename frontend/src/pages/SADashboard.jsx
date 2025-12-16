import React, { useState } from "react";
import { LayoutDashboard, Building2, Users, Calendar, MonitorSquare, FileText, UserCog } from 'lucide-react';
import DashboardLayout from "../components/layout/DashboardLayout";
import Header from "../components/layout/Header";
import DashboardSection from "../components/sections/DashboardSection";
import ClientsSection from "../components/sections/ClientsSection";
import AssembliesSection from "../components/sections/AssembliesSection";
import CalendarSection from "../components/sections/CalendarSection";
import MonitoringSection from "../components/sections/MonitoringSection";
import ReportsSection from "../components/sections/ReportsSection";
import UsersSection from "../components/sections/UsersSection";

export const SADashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");

  // Configuración del menú del sidebar
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'clients',
      label: 'Unidades Residenciales',
      icon: Building2,
    },
    {
      id: 'assemblies',
      label: 'Residentes',
      icon: Users,
    },
    {
      id: 'calendar',
      label: 'Asambleas',
      icon: Calendar,
    },
    {
      id: 'monitoring',
      label: 'Monitoreo de Asambleas',
      icon: MonitorSquare,
    },
    {
      id: 'reports',
      label: 'Informes y Reportes',
      icon: FileText,
    },
    {
      id: 'users',
      label: 'Gestión de Usuarios',
      icon: UserCog,
    },
  ];

  const titles = {
    dashboard: "Dashboard",
    clients: "Unidades Residenciales",
    assemblies: "Residentes",
    calendar: "Asambleas",
    monitoring: "Monitoreo de Asambleas",
    reports: "Informes y Reportes",
    users: "Gestión de Usuarios",
  };

  return (
    <DashboardLayout
      title="Giramaster"
      subtitle="Super Administrador"
      menuItems={menuItems}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      gradientFrom="#2c3e50"
      gradientTo="#34495e"
      accentColor="#3498db"
    >
      <Header title={titles[activeSection]} />

      {activeSection === "dashboard" && <DashboardSection />}
      {activeSection === "clients" && <ClientsSection />}
      {activeSection === "assemblies" && <AssembliesSection />}
      {activeSection === "calendar" && <CalendarSection />}
      {activeSection === "monitoring" && <MonitoringSection />}
      {activeSection === "reports" && <ReportsSection />}
      {activeSection === "users" && <UsersSection />}
    </DashboardLayout>
  );
};
