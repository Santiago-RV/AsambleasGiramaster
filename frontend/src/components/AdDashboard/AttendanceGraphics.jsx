import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const AttendanceChart = ({ summary }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "pie",
      data: {
        labels: ["Asistieron", "No asistieron"],
        datasets: [
          {
            data: [summary.total_attended, summary.total_absent],
            backgroundColor: ["#10b981", "#ef4444"],
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });

    return () => {
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