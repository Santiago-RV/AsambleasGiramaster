import { X } from "lucide-react";
export default function HelpModal({ isOpen, onClose }) {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">

      <div className="bg-white w-[500px] max-w-[90%] rounded-xl shadow-xl p-6 relative">

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Guía de uso
        </h2>

        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Usa <b>Agregar Copropietario</b> para registrar un nuevo residente.</li>
          <li>Usa <b>Agregar Invitado</b> para registrar visitantes.</li>
          <li>Usa <b>Nueva Reunion</b> para crear una asamblea.</li>
          <li>Selecciona el tipo de asmablea (Virtual o presencial)</li>
          <li>Ingresa la informacion de la asmamblea</li>
          <li><b>Recuerde:</b> Una vez creada la asamblea esta se puede iniciar, modificar o cancelar, ademas solo los usuarios activos recibiran la invitacion</li>
          
        </ol>

      </div>

    </div>
  );
}