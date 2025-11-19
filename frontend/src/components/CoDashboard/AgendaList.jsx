export default function AgendaList() {
  return (
    <div className="bg-green-50 p-5 rounded-xl border-l-4 border-green-600">
      <h4 className="text-green-700 font-semibold mb-3">📋 Agenda de la Asamblea</h4>

      <ol className="list-decimal ml-5 text-green-700 space-y-1">
        <li>Verificación de quórum y apertura</li>
        <li>Lectura y aprobación del acta anterior</li>
        <li>Informe de administración</li>
        <li>Aprobación presupuesto obras 2026</li>
        <li>Elección comité de convivencia</li>
        <li>Proposiciones y varios</li>
      </ol>
    </div>
  );
}
