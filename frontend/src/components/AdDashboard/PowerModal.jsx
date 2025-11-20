import { useState } from "react";

export default function PowerModal({ fromLabel, onClose, onConfirm }) {
  const [to, setTo] = useState("");
  const [type, setType] = useState("Solo para esta asamblea");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-[min(600px,95%)] shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Ceder Poder de Votación</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Copropietario que cede el poder:</label>
            <input type="text" className="border p-2 rounded w-full" value={fromLabel} readOnly />
          </div>

          <div>
            <label className="block text-sm font-medium">Ceder poder a:</label>
            <select className="border p-2 rounded w-full" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Seleccionar persona...</option>
              <option value="ana.martinez@email.com">Ana Martínez (Apt. 303)</option>
              <option value="luis.garcia@email.com">Luis García (Apt. 104)</option>
              <option value="sofia.lopez@email.com">Sofía López (Apt. 205)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Vigencia del poder:</label>
            <select className="border p-2 rounded w-full" value={type} onChange={(e) => setType(e.target.value)}>
              <option>Solo para esta asamblea</option>
              <option>Permanente hasta revocación</option>
              <option>Temporal (especificar fecha)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>Cancelar</button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={!to}
            onClick={() => onConfirm(to, type)}
          >
            Confirmar Cesión
          </button>
        </div>
      </div>
    </div>
  );
}
