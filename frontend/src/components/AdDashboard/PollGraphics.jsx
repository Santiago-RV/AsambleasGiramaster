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

      let filteredOptions = poll.options.filter(
        (opt) => opt.votes_weight > 0
      );


      if (filteredOptions.length === 0) {
        filteredOptions = [
          {
            text: "Sin votos",
            votes_weight: 1,
          },
        ];
      }

      const labels = filteredOptions.map((opt) => opt.text);
      const dataValues = filteredOptions.map((opt) => opt.votes_weight);

      const total = dataValues.reduce((a, b) => a + b, 0);

      const colors = [
        "#6366f1",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#14b8a6",
        "#f97316",
        "#ec4899",
      ];

      const percentageLabels = {
        id: "percentageLabels",
        afterDraw(chart) {
          const { ctx } = chart;

          chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
            const value = dataValues[index];

            if (!value) return;

            const percentage = ((value / total) * 100).toFixed(1) + "%";

            const position = datapoint.tooltipPosition();

            ctx.save();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillText(
              percentage,
              position.x,
              position.y
            );

            ctx.restore();
          });
        },
      };

      chartRef.current = new Chart(canvasRef.current, {
        type: "pie",
        data: {
          labels: labels.map((label, index) => {
            const percentage = ((dataValues[index] / total) * 100).toFixed(1);

            return `${label} (${percentage}%)`;
          }),
          datasets: [
            {
              data: dataValues,
              backgroundColor: colors.slice(0, labels.length),
              borderWidth: 2,
              borderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                font: {
                  size: 12,
                },
              },
            },
          },
        },
        plugins: [percentageLabels],
      });
    };

    initChart();

    return () => {
      mounted = false;

      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [poll]);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md h-[320px]">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default PollChart;