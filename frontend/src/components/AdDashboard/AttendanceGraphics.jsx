import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";


const AttendanceChart = ({ summary }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !summary) return;

    const attended = summary.total_attended || 0;
    const absent = summary.total_absent || 0;

    if (attended === 0 && absent === 0) return;

    const ctx = canvasRef.current;
    const total = attended + absent;
  
    if (!chartRef.current) {

    chartRef.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: [
          `Asistieron (${((attended / total) * 100).toFixed(1)}%)`,
          `No asistieron (${((absent / total) * 100).toFixed(1)}%)`
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
          legend: {
            position: "top",
          },
        },
      },
      plugins: [{
  id: 'textInside',
  afterDraw(chart) {
    const { ctx } = chart;

    chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
      const { x, y } = datapoint.tooltipPosition();

      const value = chart.data.datasets[0].data[index];
      const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

      const percentage = ((value / total) * 100).toFixed(1) + "%";

      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(percentage, x, y);
    });
  }
}]
    });
    } else {
      chartRef.current.data.datasets[0].data = [attended, absent];
      chartRef.current.update();
    }

  }, [summary]);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xs h-[250px]">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default AttendanceChart;