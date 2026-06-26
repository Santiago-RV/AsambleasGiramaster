import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";


const AttendanceChart = ({ title, attended, absent, unit = "" }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || attended == null || absent == null) return;
    if (attended === 0 && absent === 0) return;

    const ctx = canvasRef.current;
    const total = attended + absent;

    if (chartRef.current) {
      chartRef.current.destroy();
    }
    const attendedLabel = unit
      ? attended.toFixed(2)
      : attended;

    const absentLabel = unit
      ? absent.toFixed(2)
      : absent;
    chartRef.current = new Chart(ctx, {
      
      type: "pie",
      data: {
        labels: [
          `Asistentes - ${attendedLabel}${unit} (${((attended / total) * 100).toFixed(1)}%)`,
          `Sin Ingresar - ${absentLabel}${unit} (${((absent / total) * 100).toFixed(1)}%)`
        ],
        datasets: [
          {
            data: [attended, absent],
            backgroundColor: ["#10b981", "#ef4444"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title
          },
          legend: {
            position: "top",
          },
          tooltip: {
            enabled: false,
          },
        },
      },
      plugins: [{
        id: "textInside",
        afterDraw(chart) {
          const { ctx } = chart;

          chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
            const { x, y } = datapoint.tooltipPosition();

            const value = chart.data.datasets[0].data[index];
            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

            if (!value) return;

            const percentage = ((value / total) * 100).toFixed(1);

            ctx.save();

            ctx.fillStyle = "#fff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const displayValue = unit
              ? `${Number(value).toFixed(2)}${unit}`
              : `${Math.round(value)}`;

            ctx.fillText(
              displayValue,
              x,
              y - 8
            );

            ctx.fillText(
              `(${percentage}%)`,
              x,
              y + 10
            );

            ctx.restore();
          });
        }
      }]
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };

  }, [attended, absent, title, unit]);
    return (
    <div className="w-full h-[280px]">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};


export default AttendanceChart;