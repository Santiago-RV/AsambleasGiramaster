import { useState } from "react";
import AssembliesTable from "./AssembliesTable";

export default function AssembliesPage({ onCreateAssembly }) {
  const [assemblies] = useState([
    { id: 1, datetime: "15 Sep 2025 - 19:00", title: "Asamblea Ordinaria Septiembre", type: "Ordinaria", participants: "42/45", state: "Programada" },
    { id: 2, datetime: "22 Sep 2025 - 18:30", title: "Reunión Extraordinaria - Obras", type: "Extraordinaria", participants: "38/45", state: "Programada" },
    { id: 3, datetime: "28 Ago 2025 - 19:00", title: "Asamblea Ordinaria Agosto", type: "Ordinaria", participants: "40/45", state: "Finalizada" },
  ]);

  const handleEdit = (a) => {
    alert("Editar asamblea: " + a.title);
    onCreateAssembly?.();
  };

  const handleStart = (a) => {
    if (confirm(`Iniciar ${a.title}?`)) {
      alert("Asamblea iniciada");
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Gestión de Asambleas</h2>
        <button onClick={onCreateAssembly} className="px-4 py-2 bg-green-600 text-white rounded"> Crear Asamblea</button>
      </div>

      <AssembliesTable assemblies={assemblies} onEdit={handleEdit} onStart={handleStart} />

      <div className="mt-4 text-sm text-gray-500">Crea y gestiona asambleas desde aquí.</div>
    </section>
  );
}
