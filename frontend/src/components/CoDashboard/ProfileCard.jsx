export default function ProfileCard({ user }) {
  return (
    <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-[#2c5aa0] shadow-sm">
      <h4 className="text-[#2c5aa0] font-semibold text-lg mb-4">
         Información Personal
      </h4>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span>Nombre Completo:</span>
          <strong>{user.name}</strong>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span>Correo Electrónico:</span>
          <strong>{user.email}</strong>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span>Apartamento:</span>
          <strong>{user.apartment}</strong>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span>Coeficiente:</span>
          <strong>{user.coefficient}%</strong>
        </div>

        <div className="flex justify-between">
          <span>Estado:</span>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
            Activo
          </span>
        </div>
      </div>
    </div>
  );
}
