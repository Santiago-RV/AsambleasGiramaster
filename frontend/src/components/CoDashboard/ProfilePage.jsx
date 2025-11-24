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
    <section className="bg-white rounded-xl p-6 shadow-md">
      <h1 className="text-2xl font-semibold text-[#2c5aa0] border-b-2 pb-2 mb-6">
        Mi Perfil
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ProfileCard user={user} />
        <ProfileStats stats={stats} />
      </div>

      <h3 className="mt-8 mb-3 text-[#2c5aa0] text-lg font-semibold">
         Historial de Asambleas
      </h3>

      <HistoryTable data={history} />

      <NotificationSettings />
    </section>
  );
}
