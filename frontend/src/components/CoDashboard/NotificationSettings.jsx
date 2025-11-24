import { useState } from "react";

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    email: true,
    reminder: true,
    voting: true,
  });

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl shadow mt-6">
      <h4 className="text-[#2c5aa0] font-semibold text-lg mb-4">
        Configuración de Notificaciones
      </h4>

      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.email}
            onChange={() => toggle("email")}
          />
          Recibir invitaciones por correo electrónico
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.reminder}
            onChange={() => toggle("reminder")}
          />
          Recordatorios 24 horas antes
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.voting}
            onChange={() => toggle("voting")}
          />
          Notificaciones de nuevas votaciones
        </label>
      </div>

      <button className="mt-5 px-4 py-2 bg-[#2c5aa0] text-white rounded-lg hover:bg-blue-800">
        Guardar Preferencias
      </button>
    </div>
  );
}
