export default function AssemblyHeader() {
  return (
    <div className="bg-gradient-to-br from-[#2c5aa0] to-[#1e3c72] text-white p-8 rounded-xl mb-6 text-center">
      <h1 className="text-2xl font-bold">Asamblea Ordinaria - Septiembre 2025</h1>
      <p className="opacity-90 mt-2">
        15 de Septiembre, 2025 •  19:00 hrs
      </p>

      <div className="flex justify-center mt-4">
        <div className="flex items-center bg-white/20 px-5 py-2 rounded-full font-semibold">
          <div className="w-3 h-3 bg-yellow-300 rounded-full mr-2 animate-pulse"></div>
          EN VIVO
        </div>
      </div>
    </div>
  );
}
