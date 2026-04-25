import { useEffect, useRef } from "react";

const PollChart = ({ poll }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !poll) return;

    let mounted = true;

    const initChart = async () => {
      const { default: Chart } = await import("chart.js/auto");
      if (!mounted || !canvasRef.current) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const labels = poll.options.map(opt => opt.text);
      const dataValues = poll.options.map(opt => opt.votes_weight);
      const countValues = poll.options.map(opt => opt.votes_count);

      const colors = [
        "#6366f1", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#14b8a6", "#f97316", "#ec4899"
      ];

      const centerLabels = {
        id: "centerLabels",
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.visible) return;
            meta.data.forEach((element, index) => {
              const value = countValues[index];
              if (!value) return;
              const midAngle = (element.startAngle + element.endAngle) / 2;
              const radius = element.outerRadius * 0.6;
              const x = element.x + Math.cos(midAngle) * radius;
              const y = element.y + Math.sin(midAngle) * radius;
              ctx.save();
              ctx.fillStyle = "#ffffff";
              ctx.font = `bold ${Math.max(11, Math.round(element.outerRadius * 0.18))}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(String(value), x, y);
              ctx.restore();
            });
          });
        },
      };

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
            legend: { position: "top" },
          },
        },
        plugins: [centerLabels],
      });
    };

    initChart();

    return () => {
      mounted = false;
      chartRef.current?.destroy();
    };
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