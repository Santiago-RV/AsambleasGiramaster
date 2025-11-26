import { useState } from "react";
import SidebarAdmin from "../components/layout/SidebarAD";
import DashboardPage from "../components/AdDashboard/DashboardPage";
import UsersPage from "../components/AdDashboard/UsersPage";
import AssembliesPage from "../components/AdDashboard/AssembliesPage";
import LivePage from "../components/AdDashboard/LivePage";
import ReportsPage from "../components/AdDashboard/ReportsPage";
import SettingsPage from "../components/AdDashboard/SettingsPage";
import PowerModal from "../components/AdDashboard/PowerModal";

export default function AppAdmin() {
  const [section, setSection] = useState("dashboard");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAssemblyForm, setShowAssemblyForm] = useState(false);
  const [powerModalData, setPowerModalData] = useState(null); 

  const openPowerModal = (fromLabel, onConfirm) => {
  setPowerModalData({ fromLabel, onConfirm });
  };

  const closePowerModal = () => setPowerModalData(null);

  return (
  <div className="flex min-h-screen bg-gray-50">
    <SidebarAdmin section={section} setSection={setSection} />

    <main className="flex-1 ml-[280px] p-6">
    <div className="header mb-6 flex justify-between items-center">
      <h1 id="page-title" className="text-2xl font-semibold">
      {section === "dashboard" && "Dashboard"}
      {section === "users" && "Gestión de Usuarios"}
      {section === "assemblies" && "Gestión de Asambleas"}
      {section === "live" && "Reunión en Vivo"}
      {section === "reports" && "Reportes"}
      {section === "settings" && "Configuración"}
      </h1>

      <div className="flex gap-3">
      <button className="btn px-4 py-2 rounded bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
        📱 Versión Móvil
      </button>
      <button className="btn px-4 py-2 rounded bg-gray-300">
        🔔 Notificaciones (3)
      </button>
      </div>
    </div>

    {section === "dashboard" && <DashboardPage />}
    {section === "users" && (
      <UsersPage
      onCreateUser={() => setShowUserForm(true)}
      onTransferPower={(fromLabel, onConfirm) =>
        openPowerModal(fromLabel, onConfirm)
      }
      />
    )}
    {section === "assemblies" && (
      <AssembliesPage
      onCreateAssembly={() => setShowAssemblyForm(true)}
      />
    )}
    {section === "live" && <LivePage />}
    {section === "reports" && <ReportsPage />}
    {section === "settings" && <SettingsPage />}

    {showUserForm && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="bg-white rounded-lg shadow-lg w-[min(900px,95%)] p-6">
        <button
        className="float-right text-sm text-gray-500"
        onClick={() => setShowUserForm(false)}
        >
        ✖
        </button>
        <h3 className="text-lg font-semibold mb-4">Crear/Editar Usuario</h3>
        <div>
        <p className="text-sm text-gray-600">Formulario</p>
        <div className="mt-4 flex gap-2">
          <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => { alert("Usuario guardado (simulado)"); setShowUserForm(false); }}
          >
          Guardar Usuario
          </button>
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowUserForm(false)}>
          Cancelar
          </button>
        </div>
        </div>
      </div>
      </div>
    )}

    {showAssemblyForm && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="bg-white rounded-lg shadow-lg w-[min(900px,95%)] p-6">
        <button
        className="float-right text-sm text-gray-500"
        onClick={() => setShowAssemblyForm(false)}
        >
        ✖
        </button>
        <h3 className="text-lg font-semibold mb-4">Crear/Editar Asamblea</h3>
        <p className="text-sm text-gray-600">Formulario de asamblea</p>
        <div className="mt-4 flex gap-2">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => { alert("Asamblea guardada"); setShowAssemblyForm(false); }}
        >
          Guardar Asamblea
        </button>
        <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowAssemblyForm(false)}>
          Cancelar
        </button>
        </div>
      </div>
      </div>
    )}

    {powerModalData && (
      <PowerModal
      fromLabel={powerModalData.fromLabel}
      onClose={closePowerModal}
      onConfirm={(to, type) => {
        alert(`Poder cedido a ${to} (${type}) — simulación`);
        if (powerModalData.onConfirm) powerModalData.onConfirm(to, type);
        closePowerModal();
      }}
      />
    )}
    </main>
  </div>
  );
}
