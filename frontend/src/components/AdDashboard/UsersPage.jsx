import { useState } from "react";
import UsersTable from "./UsersTable";

export default function UsersPage({ onCreateUser, onTransferPower }) {
  const [users] = useState([
    { id: 1, name: "María González", email: "maria.gonzalez@email.com", apartment: "101", role: "Copropietario", coefficient: "2.5% (No editable)", active: true },
    { id: 2, name: "Carlos Rodríguez", email: "carlos.rodriguez@email.com", apartment: "202", role: "Copropietario", coefficient: "3.1% (No editable)", active: true },
    { id: 3, name: "Ana Martínez", email: "ana.martinez@email.com", apartment: "303", role: "Representante", coefficient: "1.8% (Poder cedido)", active: true },
  ]);

  const handleEdit = (user) => {
    alert(`Editar usuario ${user.name}`);
    onCreateUser?.();
  };

  const handleTransferPower = (user) => {
    onTransferPower?.(`${user.name} (Apt. ${user.apartment})`, (to, type) => {
      console.log("Poder transferido", { from: user, to, type });
    });
  };

  const handleRevoke = (user) => {
    if (confirm(`¿Revocar poder de ${user.name}?`)) {
      alert("Poder revocado");
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
        <button onClick={onCreateUser} className="px-4 py-2 bg-green-600 text-white rounded"> Crear Usuario</button>
      </div>

      <UsersTable
        users={users}
        onEdit={handleEdit}
        onTransferPower={handleTransferPower}
        onRevoke={handleRevoke}
      />

      <div className="mt-4">
        <p className="text-sm text-gray-500">Aquí puedes editar usuarios, ceder poderes o revocar.</p>
      </div>
    </section>
  );
}
