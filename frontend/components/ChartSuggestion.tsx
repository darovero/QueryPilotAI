import { useMemo } from "react";
import { SuggestedChart } from "./types";
import { AppIcon } from "./AppIcon";

interface ChartSuggestionProps {
  chart: SuggestedChart;
  data: Record<string, unknown>[];
}

export function ChartSuggestion({ chart, data }: ChartSuggestionProps) {
  const chartData = useMemo(() => {
    if (!chart.x_field || !chart.y_field || data.length === 0) {
      return [];
    }

    if (chart.group_by) {
      const grouped: Record<string, any> = {};
      data.forEach((row) => {
        const groupKey = String(row[chart.group_by!] || "Other");
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(row);
      });

      return Object.entries(grouped).map(([key, rows]: [string, any[]]) => ({
        name: key,
        values: rows.map((r: Record<string, unknown>) => ({
          x: String(r[chart.x_field!]),
          y: Number(r[chart.y_field!]) || 0,
        })),
      }));
    }

    return [
      {
        name: chart.y_field,
        values: data.map((row) => ({
          x: String(row[chart.x_field!]),
          y: Number(row[chart.y_field!]) || 0,
        })),
      },
    ];
  }, [chart, data]);

  const renderChart = () => {
    if (chartData.length === 0 || chartData[0].values.length === 0) {
      return (
        <div className="text-center py-8 text-zinc-400">
          No se pudieron generar los datos para la gráfica
        </div>
      );
    }

    // Renderizado SVG simple para gráfica de líneas
    if (chart.type === "line") {
      return <LineChartSVG data={chartData} label={chart.y_axis_label} />;
    }

    // Renderizado SVG simple para gráfica de barras
    if (chart.type === "bar") {
      return <BarChartSVG data={chartData} label={chart.y_axis_label} />;
    }

    return (
      <div className="text-center py-8 text-zinc-400">
        Tipo de gráfica "{chart.type}" no soportado aún
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
          <AppIcon name="bar_chart" className="h-[16px] w-[16px]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[14px] font-semibold text-sky-200">{chart.title}</h4>
          {chart.description && (
            <p className="text-[12px] text-zinc-300">{chart.description}</p>
          )}
          {chart.filtered_rows_count && (
            <p className="text-[11px] text-zinc-400">
              Datos mostrados: {chart.filtered_rows_count} registros
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-4 overflow-x-auto">
        {renderChart()}
      </div>
    </div>
  );
}

function LineChartSVG({
  data,
  label,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  label?: string;
}) {
  const width = 400;
  const height = 200;
  const padding = 40;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);
  const minY = 0;

  const xCount = data[0]?.values.length || 1;
  const xStep = (width - 2 * padding) / (xCount - 1 || 1);
  const yRange = maxY - minY || 1;
  const yScale = (height - 2 * padding) / yRange;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

  return (
    <svg width="100%" height="240" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`grid-${ratio}`}
          x1={padding}
          y1={height - padding - ratio * (height - 2 * padding)}
          x2={width - padding}
          y2={height - padding - ratio * (height - 2 * padding)}
          stroke="#27272a"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text
          key={`y-label-${ratio}`}
          x={padding - 8}
          y={height - padding - ratio * (height - 2 * padding) + 4}
          fontSize="11"
          fill="#9ca3af"
          textAnchor="end"
        >
          {(minY + ratio * yRange).toFixed(0)}
        </text>
      ))}

      {/* Data lines */}
      {data.map((series, seriesIdx) => (
        <g key={`series-${seriesIdx}`}>
          {/* Line */}
          <polyline
            points={series.values
              .map((v, i) => {
                const x = padding + i * xStep;
                const y = height - padding - ((v.y - minY) * yScale);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={colors[seriesIdx % colors.length]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {series.values.map((v, i) => {
            const x = padding + i * xStep;
            const y = height - padding - ((v.y - minY) * yScale);
            return (
              <circle
                key={`point-${seriesIdx}-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill={colors[seriesIdx % colors.length]}
                opacity="0.8"
              />
            );
          })}
        </g>
      ))}

      {/* Legend */}
      {data.map((series, idx) => (
        <g key={`legend-${idx}`}>
          <rect
            x={padding}
            y={height - 25}
            width={10}
            height={10}
            fill={colors[idx % colors.length]}
            rx="2"
          />
          <text x={padding + 16} y={height - 17} fontSize="11" fill="#d4d4d8">
            {series.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BarChartSVG({
  data,
  label,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  label?: string;
}) {
  const width = 400;
  const height = 200;
  const padding = 40;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);

  const xCount = data[0]?.values.length || 1;
  const barWidth = (width - 2 * padding) / xCount / (data.length + 0.5);
  const yScale = (height - 2 * padding) / maxY;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

  return (
    <svg width="100%" height="240" viewBox={`0 0 ${width} ${height}`}>
      {/* Y-axis */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* Bars */}
      {data.map((series, seriesIdx) =>
        series.values.map((v, valueIdx) => {
          const barX =
            padding +
            (valueIdx * (width - 2 * padding)) / xCount +
            seriesIdx * barWidth +
            5;
          const barHeight = (v.y * yScale);
          const barY = height - padding - barHeight;

          return (
            <rect
              key={`bar-${seriesIdx}-${valueIdx}`}
              x={barX}
              y={barY}
              width={barWidth - 2}
              height={barHeight}
              fill={colors[seriesIdx % colors.length]}
              opacity="0.85"
              rx="2"
            />
          );
        })
      )}
    </svg>
  );
}
