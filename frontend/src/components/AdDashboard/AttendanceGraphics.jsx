import { useEffect, useRef } from "react";

const AttendanceChart = ({ summary }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;

    const initChart = async () => {
      const { default: Chart } = await import("chart.js/auto");
      if (!mounted || !canvasRef.current) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const counts = [summary.total_attended, summary.total_absent];

      const centerLabels = {
        id: "centerLabels",
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.visible) return;
            meta.data.forEach((element, index) => {
              const value = counts[index];
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
          labels: ["Asistieron", "No asistieron"],
          datasets: [
            {
              data: counts,
              backgroundColor: ["#10b981", "#ef4444"],
            },
          ],
        },
        options: {
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
  }, [summary]);

  return (
    <div className="flex justify-center">
      <div className="w-72 h-72">
      <canvas ref={canvasRef} width={180} height={180}></canvas>
    </div>
    </div>
  );
};

export default AttendanceChart;