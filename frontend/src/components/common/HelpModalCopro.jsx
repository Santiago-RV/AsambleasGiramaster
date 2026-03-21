import { X, QrCode, Mail, UserCheck, UserX, MoreVertical,Eye,SquarePen, Trash2 } from "lucide-react";
export default function HelpModalCopro({ isOpen, onClose }) {

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

        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 list-decimal pl-5 text-gray-700">

          <li>Usa <b>La barra de busqueda</b> para filtrar los residentes segun el criterio de busqueda. </li>
          <li>Usa <b>Seleccionar todos</b> para relizar una acccion sobre todos los residentes. </li>
          <li>Usa <b>La seleccion individual</b> para relizar una acccion sobre los residentes seleccionados. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><QrCode className="w-4 h-4"/></b> para ver las opciones para compartir el acceso a la plataforma. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><Mail className="w-4 h-4"/></b> para enviar las crendeciales de acceso al correo registrado del residente. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><UserCheck className="w-4 h-4"/></b> para desabilitar el acceso del residente seleccionado. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><UserX className="w-4 h-4"/></b> para habilitar el acceso del residente seleccionado. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><MoreVertical className="w-4 h-4"/></b> para ver las opciones adicionales. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><Eye className="w-4 h-4"/></b> para ver los detalles del residente seleccionado. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><SquarePen className="w-4 h-4"/></b> para editar la informacion del residente seleccionado. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><QrCode className="w-4 h-4"/></b> para ver las opciones para compartir el acceso a la plataforma. </li>
          <li>Usa <b className="inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/></b> para eliminar el residente seleccionado </li>
        </ol>
      </div>
    </div>
  );
}