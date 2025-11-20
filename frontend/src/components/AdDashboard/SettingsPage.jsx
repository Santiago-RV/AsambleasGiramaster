export default function SettingsPage() {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Configuración del Sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Configuración General</h4>
          <label className="block text-sm mb-1">Nombre del Edificio</label>
          <input className="border p-2 rounded w-full mb-3" defaultValue="Edificio Torre Azul" />
          <label className="block text-sm mb-1">Dirección</label>
          <input className="border p-2 rounded w-full mb-3" defaultValue="Calle 123 #45-67, Medellín" />
          <label className="block text-sm mb-1">Quórum Mínimo Requerido (%)</label>
          <input type="number" className="border p-2 rounded w-full" defaultValue={51} />
          <button className="mt-3 px-3 py-1 bg-green-600 text-white rounded" onClick={() => alert("Configuración guardada")}>Guardar Configuración</button>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Configuración de Seguridad</h4>
          <label className="block text-sm mb-1">Tiempo de Sesión (minutos)</label>
          <input type="number" className="border p-2 rounded w-full mb-3" defaultValue={120} />
          <label className="block text-sm mb-1">Intentos de Login Permitidos</label>
          <input type="number" className="border p-2 rounded w-full mb-3" defaultValue={3} />
          <label className="block text-sm mb-1">Notificaciones por Email</label>
          <select className="border p-2 rounded w-full">
            <option>Habilitadas</option>
            <option>Deshabilitadas</option>
          </select>
          <button className="mt-3 px-3 py-1 bg-green-600 text-white rounded" onClick={() => alert("Seguridad actualizada")}>Actualizar Seguridad</button>
        </div>
      </div>

      <div className="mt-4 bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
        <h4 className="font-semibold">Acciones Administrativas</h4>
        <p className="text-sm text-gray-600 mb-2">Estas acciones afectan todo el sistema. Úsalas con precaución.</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => alert("Exportando datos")}>Exportar Datos</button>
          <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => alert("Respaldando sistema")}>Respaldar Sistema</button>
          <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => { if (confirm("Reiniciar configuración?")) alert("Configuración reiniciada"); }}>Reiniciar Configuración</button>
        </div>
      </div>
    </section>
  );
}
