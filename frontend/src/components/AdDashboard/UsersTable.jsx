export default function UsersTable({ users = [], onEdit, onTransferPower, onRevoke }) {
  return (
    <div className="bg-white rounded shadow overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Correo</th>
            <th className="p-3">Apartamento</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Coeficiente</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="p-3">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.apartment}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">{u.coefficient}</td>
              <td className="p-3">
                <span className={`px-3 py-1 rounded-full text-sm ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {u.active ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="p-3 flex gap-2">
                <button onClick={() => onEdit(u)} className="px-3 py-1 bg-gradient-to-br from-[#059669] to-[#10b981] text-white rounded">Editar</button>
                <button onClick={() => onTransferPower(u)} className="px-3 py-1 bg-gray-300 rounded">Ceder Poder</button>
                <button onClick={() => onRevoke(u)} className="px-3 py-1 bg-red-500 text-white rounded">Revocar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
