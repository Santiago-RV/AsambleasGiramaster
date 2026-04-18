import { X, QrCode, Mail, UserCheck, UserX, MoreVertical,Eye,SquarePen, Trash2 } from "lucide-react";
export default function HelpModalCopro({ isOpen, onClose }) {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

      <div className="bg-white w-full max-w-md md:max-w-lg lg:max-w-xl rounded-xl shadow-xl p-4 md:p-6 relative max-h-[90vh] overflow-y-auto">

        <button
          onClick={onClose}
          className="absolute top-2 right-2 md:top-3 md:right-3 text-gray-500 hover:text-gray-700 p-2"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 pr-10">
          Guía de uso
        </h2>

        <ol className="space-y-2 md:space-y-3 list-decimal pl-5 pr-2 text-gray-700 text-sm md:text-base">
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