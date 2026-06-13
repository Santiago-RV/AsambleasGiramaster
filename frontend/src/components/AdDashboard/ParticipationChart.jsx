import { useEffect, useRef } from "react";

const ParticipationChart = ({ title, voted, notVoted }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;

    const initChart = async () => {
      const { default: Chart } = await import("chart.js/auto");

      if (!mounted) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const dataValues = [voted, notVoted];
      const total = dataValues.reduce((a, b) => a + b, 0);

      const labelsPlugin = {
        id: "labelsPlugin",
        afterDraw(chart) {
          const { ctx } = chart;

          chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
            const value = dataValues[index];

            if (!value) return;

            const percentage = ((value / total) * 100).toFixed(1);
            const position = datapoint.tooltipPosition();

            ctx.save();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillText(
              `${value.toFixed(2)}Q`,
              position.x,
              position.y - 8
            );

            ctx.fillText(
              `(${percentage}%)`,
              position.x,
              position.y + 10
            );

            ctx.restore();
          });
        }
      };

      chartRef.current = new Chart(canvasRef.current, {
        type: "pie",
        data: {
          labels: [
            `Participó - ${voted.toFixed(2)} (${((voted / total) * 100).toFixed(1)}%)`,
            `No participó - ${notVoted.toFixed(2)} (${((notVoted / total) * 100).toFixed(1)}%)`
          ],
          datasets: [
            {
              data: dataValues,
              backgroundColor: [
                "#10b981",
                "#ef4444"
              ],
              borderWidth: 2,
              borderColor: "#ffffff"
            }
          ]
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
          }
        },
        plugins: [labelsPlugin]
      });
    };

    initChart();

    return () => {
      mounted = false;

      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [voted, notVoted, title]);

  return (
    <div className="w-full max-w-md h-[280px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default ParticipationChart;