import { useState } from "react";

export default function ZoomEmbed() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    setTimeout(() => {
      setConnected(true);
      setLoading(false);
    }, 1500);
  };

  const handleDisconnect = () => {
    setConnected(false);
  };

  return (
    <div className="bg-gray-100 border-2 border-gray-300 p-6 rounded-xl mb-6">
      <h3 className="text-xl font-semibold mb-4"> Reunión Virtual</h3>

      <div className="w-full h-72 bg-black text-white rounded-lg flex items-center justify-center mb-4">
        {!connected ? (
          <div className="text-center opacity-80">
            <div className="text-4xl mb-2">📹</div>
            <p>Haz clic en “Conectar” para unirte</p>
            <p className="text-sm opacity-70 mt-1">ID: 123-456-7890</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-2xl mb-1">📹</div>
            <p>Conectado a la Reunión</p>
            <p className="opacity-70 text-sm">Asamblea Ordinaria 2025</p>
            <div className="mt-3 bg-white/20 px-4 py-1 rounded-full text-sm">
              <span className="w-2 h-2 inline-block bg-yellow-300 rounded-full mr-1 animate-pulse"></span>
              EN VIVO
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        {!connected ? (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? " Conectando..." : " Conectar"}
          </button>
        ) : (
          <>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
               Desconectar
            </button>
          </>
        )}

        <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
           Abrir en App
        </button>
      </div>
    </div>
  );
}
