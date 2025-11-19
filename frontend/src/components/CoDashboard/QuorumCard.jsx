export default function QuorumCard({ title, number, sub, percentage }) {
  return (
    <div className="bg-green-500 text-white p-5 rounded-xl text-center">
      <p className="text-3xl font-bold">{number}</p>
      <p className="opacity-80">{sub}</p>

      <div className="bg-white/20 h-3 rounded-full mt-3 overflow-hidden">
        <div
          className="bg-yellow-300 h-full transition-all"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <p className="mt-2">{title}</p>
    </div>
  );
}
