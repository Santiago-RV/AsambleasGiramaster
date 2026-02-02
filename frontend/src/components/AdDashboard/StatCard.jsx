export default function StatCard({ number, label }) {
  return (
    <div className="bg-gradient-to-br from-[#059669] to-[#10b981] text-white p-6 rounded-lg shadow">
      <div className="text-3xl font-bold">{number}</div>
      <div className="opacity-90 mt-1">{label}</div>
    </div>
  );
}
