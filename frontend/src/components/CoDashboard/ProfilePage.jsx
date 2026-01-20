import { UserCircle } from "lucide-react";
import ProfileCard from "./ProfileCard";
import ProfileStats from "./ProfileStats";
import HistoryTable from "./HistoryTable";
import NotificationSettings from "./NotificationSettings";

export default function ProfilePage() {
  const user = {
    name: "María González",
    email: "maria.gonzalez@email.com",
    apartment: "101",
    coefficient: 2.5,
  };

  const stats = {
    assemblies: "8/10 (80%)",
    votes: "42/45 (93%)",
    powers: "3 ocasiones",
    last: "Hoy, 19:05",
    average: "Excelente",
  };

  const history = [
    {
      date: "15 Sep 2025",
      name: "Asamblea Ordinaria Septiembre",
      status: "En curso",
      votes: "1/5 emitidas",
      powers: "1 activo",
    },
    {
      date: "28 May 2025",
      name: "Asamblea Ordinaria Mayo",
      status: "Parcial",
      votes: "2/4 emitidas",
      powers: "Sin poderes",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sección de información personal y estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileCard user={user} />
        <ProfileStats stats={stats} />
      </div>

      {/* Historial de asambleas */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <UserCircle className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold text-gray-800">
            Historial de Asambleas
          </h3>
        </div>
        <HistoryTable data={history} />
      </div>

      {/* Configuración de notificaciones */}
      <NotificationSettings />
    </div>
  );
}