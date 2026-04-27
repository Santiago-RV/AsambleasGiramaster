import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

const PollChart = ({ poll }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !poll) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // 🎯 Filtrar solo opciones con votos
    const filteredOptions = poll.options.filter(opt => opt.votes_weight > 0);

    const labels = filteredOptions.map(opt => opt.text);
    const dataValues = filteredOptions.map(opt => opt.votes_weight);

    const total = dataValues.reduce((a, b) => a + b, 0);

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

          // 🔥 AQUÍ LOS PORCENTAJES
          datalabels: {
            color: "#fff",
            font: {
              weight: "bold",
              size: 12,
            },
            formatter: (value) => {
              if (!total) return "0%";
              const percentage = (value / total) * 100;
              return percentage.toFixed(1) + "%";
            },
          },
        },
      },
      plugins: [ChartDataLabels], // 👈 IMPORTANTE
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