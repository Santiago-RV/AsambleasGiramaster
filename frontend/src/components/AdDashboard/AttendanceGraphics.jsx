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