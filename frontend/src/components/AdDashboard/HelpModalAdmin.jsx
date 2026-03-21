import { X } from "lucide-react";
export default function HelpModalAdmin({ isOpen, onClose }) {

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
          <li>Usa <b>Cargar Excel</b> para adjuntar un archivo con el formato sugerido para cargar una lista de residentes. </li>
          <li>Usa <b>Agregar Copropietario</b> para registrar un nuevo residente. </li>
          <li>Usa <b>Agregar Invitado</b> para registrar visitantes. </li>
          <li>Usa <b>Soporte Tecnico</b> para asignar, modificar o eliminar el contacto de soporte tecnico de la unidad residencial. </li>
          <li>Usa <b>Nueva Reunión</b> para crear una asamblea. </li>
          <li>Selecciona el tipo de asamblea (Virtual o presencial)</li>
          <li>Ingresa la información de la asamblea</li>
          <li><b>Recuerde:</b> Una vez creada la asamblea esta se puede iniciar, modificar o cancelar, además solo los usuarios activos recibirán la invitación</li>
          <li>Usa <b>Escanear Qr</b> para abrir la aplicacion de camara y escanear qr de asistencia. </li>
        </ol>
      </div>
    </div>
  );
}