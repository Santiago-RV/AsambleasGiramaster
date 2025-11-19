export default function PowerIndicator() {
  return (
    <div className="bg-blue-50 border-2 border-blue-400 p-5 rounded-xl mb-6">
      <h4 className="text-blue-700 font-semibold mb-3 flex items-center text-lg">
        ⚖️ Poder de Representación Activo
      </h4>

      <div className="flex justify-between items-center text-sm">
        <div>
          <p>
            <strong>Representando a:</strong> Carlos Rodríguez (Apt. 202)
          </p>
          <p className="text-gray-600">Coeficiente adicional: 3.1%</p>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold text-blue-700">5.6%</p>
          <p className="text-gray-600 text-xs">Mi voto + Poder</p>
        </div>
      </div>
    </div>
  );
}
