import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const PollChart = ({ poll }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !poll) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // 🎯 labels y data dinámicos
    const labels = poll.options.map(opt => opt.text);
    const dataValues = poll.options.map(opt => opt.votes_weight);

    // colores dinámicos (puedes personalizar)
    const colors = [
      "#6366f1", "#10b981", "#f59e0b", "#ef4444",
      "#8b5cf6", "#14b8a6", "#f97316", "#ec4899"
    ];

    chartRef.current = new Chart(canvasRef.current, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: colors.slice(0, labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [poll]);

  return (
    <div className="flex justify-center">
      <div className="w-72 h-72">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default PollChart;