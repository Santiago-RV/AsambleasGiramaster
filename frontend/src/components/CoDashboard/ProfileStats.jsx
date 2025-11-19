export default function ProfileStats({ stats }) {
  return (
    <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-[#2c5aa0] shadow-sm">
      <h4 className="text-[#2c5aa0] font-semibold text-lg mb-4">
        📊 Estadísticas de Participación
      </h4>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span>Asambleas Asistidas:</span>
          <strong>{stats.assemblies}</strong>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span>Votaciones Participadas:</span>
          <strong>{stats.votes}</strong>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span>Poderes Recibidos:</span>
          <strong>{stats.powers}</strong>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span>Última Participación:</span>
          <strong>{stats.last}</strong>
        </div>

        <div className="flex justify-between">
          <span>Promedio de Asistencia:</span>
          <strong>{stats.average}</strong>
        </div>
      </div>
    </div>
  );
}
