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
      return <LineChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    // Renderizado SVG simple para gráfica de barras
    if (chart.type === "bar") {
      return <BarChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    // Renderizado SVG para gráfica de pie
    if (chart.type === "pie") {
      return <PieChartSVG data={chartData} yLabel={chart.y_axis_label} />;
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
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 62;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);
  const minY = 0;

  const xCount = data[0]?.values.length || 1;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const xStep = chartWidth / (xCount - 1 || 1);
  const yRange = maxY - minY || 1;
  const yScale = chartHeight / yRange;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
  const xValues = data[0]?.values.map((v) => v.x) ?? [];
  const tickIndices = getTickIndices(xValues.length, 6);

  return (
    <svg width="100%" height="300" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`grid-${ratio}`}
          x1={paddingLeft}
          y1={height - paddingBottom - ratio * chartHeight}
          x2={width - paddingRight}
          y2={height - paddingBottom - ratio * chartHeight}
          stroke="#27272a"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis */}
      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={paddingLeft}
        y1={height - paddingBottom}
        x2={width - paddingRight}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text
          key={`y-label-${ratio}`}
          x={paddingLeft - 10}
          y={height - paddingBottom - ratio * chartHeight + 4}
          fontSize="11"
          fill="#9ca3af"
          textAnchor="end"
        >
          {formatAxisValue(minY + ratio * yRange, yLabel)}
        </text>
      ))}

      {/* X-axis ticks */}
      {tickIndices.map((idx) => {
        const x = paddingLeft + idx * xStep;
        return (
          <g key={`x-tick-${idx}`}>
            <line
              x1={x}
              y1={height - paddingBottom}
              x2={x}
              y2={height - paddingBottom + 5}
              stroke="#71717a"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - paddingBottom + 18}
              fontSize="10"
              fill="#a1a1aa"
              textAnchor="middle"
            >
              {truncateLabel(xValues[idx] ?? "", 10)}
            </text>
          </g>
        );
      })}

      {/* Data lines */}
      {data.map((series, seriesIdx) => (
        <g key={`series-${seriesIdx}`}>
          {/* Line */}
          <polyline
            points={series.values
              .map((v, i) => {
                const x = paddingLeft + i * xStep;
                const y = height - paddingBottom - ((v.y - minY) * yScale);
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
            const x = paddingLeft + i * xStep;
            const y = height - paddingBottom - ((v.y - minY) * yScale);
            return (
              <g key={`point-${seriesIdx}-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={colors[seriesIdx % colors.length]}
                  opacity="0.8"
                />
                {series.values.length <= 12 && (
                  <text
                    x={x}
                    y={y - 8}
                    fontSize="9"
                    fill="#d4d4d8"
                    textAnchor="middle"
                  >
                    {formatDataValue(v.y, yLabel)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}

      {/* Legend */}
      {data.map((series, idx) => (
        <g key={`legend-${idx}`}>
          <rect
            x={width - 170}
            y={paddingTop + idx * 16}
            width={10}
            height={10}
            fill={colors[idx % colors.length]}
            rx="2"
          />
          <text x={width - 154} y={paddingTop + idx * 16 + 9} fontSize="10" fill="#d4d4d8">
            {truncateLabel(series.name, 20)}
          </text>
        </g>
      ))}

      {/* Axis labels */}
      {xLabel && (
        <text
          x={paddingLeft + chartWidth / 2}
          y={height - 10}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={16}
          y={paddingTop + chartHeight / 2}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
          transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function BarChartSVG({
  data,
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 62;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);

  const xCount = data[0]?.values.length || 1;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const groupWidth = chartWidth / xCount;
  const barWidth = Math.max(8, groupWidth / (data.length + 0.6));
  const yScale = chartHeight / maxY;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
  const xValues = data[0]?.values.map((v) => v.x) ?? [];
  const tickIndices = getTickIndices(xValues.length, 6);

  return (
    <svg width="100%" height="300" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`grid-${ratio}`}
          x1={paddingLeft}
          y1={height - paddingBottom - ratio * chartHeight}
          x2={width - paddingRight}
          y2={height - paddingBottom - ratio * chartHeight}
          stroke="#27272a"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis */}
      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={paddingLeft}
        y1={height - paddingBottom}
        x2={width - paddingRight}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text
          key={`y-label-${ratio}`}
          x={paddingLeft - 10}
          y={height - paddingBottom - ratio * chartHeight + 4}
          fontSize="11"
          fill="#9ca3af"
          textAnchor="end"
        >
          {formatAxisValue(ratio * maxY, yLabel)}
        </text>
      ))}

      {/* X-axis ticks */}
      {tickIndices.map((idx) => {
        const x = paddingLeft + idx * groupWidth + groupWidth / 2;
        return (
          <g key={`x-tick-${idx}`}>
            <line
              x1={x}
              y1={height - paddingBottom}
              x2={x}
              y2={height - paddingBottom + 5}
              stroke="#71717a"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - paddingBottom + 18}
              fontSize="10"
              fill="#a1a1aa"
              textAnchor="middle"
            >
              {truncateLabel(xValues[idx] ?? "", 10)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((series, seriesIdx) =>
        series.values.map((v, valueIdx) => {
          const barX =
            paddingLeft +
            valueIdx * groupWidth +
            seriesIdx * barWidth +
            3;
          const barHeight = (v.y * yScale);
          const barY = height - paddingBottom - barHeight;

          return (
            <g key={`bar-${seriesIdx}-${valueIdx}`}>
              <rect
                x={barX}
                y={barY}
                width={barWidth - 2}
                height={barHeight}
                fill={colors[seriesIdx % colors.length]}
                opacity="0.85"
                rx="2"
              />
              {xCount <= 12 && (
                <text
                  x={barX + (barWidth - 2) / 2}
                  y={barY - 6}
                  fontSize="9"
                  fill="#d4d4d8"
                  textAnchor="middle"
                >
                  {formatDataValue(v.y, yLabel)}
                </text>
              )}
            </g>
          );
        })
      )}

      {/* Legend */}
      {data.map((series, idx) => (
        <g key={`legend-${idx}`}>
          <rect
            x={width - 170}
            y={paddingTop + idx * 16}
            width={10}
            height={10}
            fill={colors[idx % colors.length]}
            rx="2"
          />
          <text x={width - 154} y={paddingTop + idx * 16 + 9} fontSize="10" fill="#d4d4d8">
            {truncateLabel(series.name, 20)}
          </text>
        </g>
      ))}

      {/* Axis labels */}
      {xLabel && (
        <text
          x={paddingLeft + chartWidth / 2}
          y={height - 10}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={16}
          y={paddingTop + chartHeight / 2}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
          transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function PieChartSVG({
  data,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const cx = 200;
  const cy = 148;
  const r = 120;

  const colors = [
    "#38bdf8", "#818cf8", "#34d399", "#fb923c", "#f472b6",
    "#a78bfa", "#facc15", "#4ade80", "#60a5fa", "#f87171",
  ];

  // Flatten into slices: each {x, y} pair is one slice
  const allSlices = data.flatMap((s) =>
    s.values.map((v) => ({ label: v.x, value: v.y }))
  );
  const total = allSlices.reduce((s, v) => s + Math.abs(v.value), 0) || 1;

  // Pre-compute slice angles
  let currentAngle = -Math.PI / 2;
  const slices = allSlices.map((slice, idx) => {
    const startAngle = currentAngle;
    const sweep = (Math.abs(slice.value) / total) * 2 * Math.PI;
    currentAngle += sweep;
    const endAngle = currentAngle;
    const midAngle = startAngle + sweep / 2;
    const pct = (Math.abs(slice.value) / total) * 100;
    const labelR = r * 0.62;
    return {
      ...slice,
      startAngle,
      endAngle,
      midAngle,
      pct,
      labelX: cx + labelR * Math.cos(midAngle),
      labelY: cy + labelR * Math.sin(midAngle),
      idx,
    };
  });

  const polarToCartesian = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const describeArc = (slice: (typeof slices)[0]) => {
    const start = polarToCartesian(slice.startAngle, r);
    const end = polarToCartesian(slice.endAngle, r);
    const largeArc = slice.endAngle - slice.startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
  };

  const legendX = cx + r + 30;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} overflow="visible">
      {/* Slices */}
      {slices.map((s, i) => (
        <path
          key={i}
          d={describeArc(s)}
          fill={colors[i % colors.length]}
          stroke="#18181b"
          strokeWidth={1.5}
          opacity={0.9}
        />
      ))}

      {/* Percentage labels inside slice (only if slice ≥ 5%) */}
      {slices.map((s, i) =>
        s.pct >= 5 ? (
          <text
            key={i}
            x={s.labelX}
            y={s.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="#fff"
            fontWeight="600"
          >
            {s.pct.toFixed(1)}%
          </text>
        ) : null
      )}

      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(${legendX}, ${20 + i * 20})`}>
          <rect width={11} height={11} rx={2} fill={colors[i % colors.length]} />
          <text x={16} y={9} fontSize={11} fill="#d4d4d8" dominantBaseline="middle">
            {truncateLabel(s.label, 22)}
            {" — "}{formatDataValue(s.value, yLabel)}
            {" ("}{s.pct.toFixed(1)}{"%}"}
          </text>
        </g>
      ))}
    </svg>
  );
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function getTickIndices(total: number, maxTicks: number) {
  if (total <= 0) return [] as number[];
  if (total <= maxTicks) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const step = Math.ceil(total / maxTicks);
  const indices: number[] = [];
  for (let i = 0; i < total; i += step) {
    indices.push(i);
  }

  if (indices[indices.length - 1] !== total - 1) {
    indices.push(total - 1);
  }

  return indices;
}

function formatAxisValue(value: number, yLabel?: string) {
  return formatSmartValue(value, yLabel, true);
}

function formatDataValue(value: number, yLabel?: string) {
  return formatSmartValue(value, yLabel, false);
}

function formatSmartValue(value: number, yLabel?: string, compact: boolean = true) {
  if (!Number.isFinite(value)) return "0";

  const isPercentage = /%|porcent|percent/i.test(yLabel ?? "");
  const abs = Math.abs(value);

  if (isPercentage) {
    const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return `${trimTrailingZeros(value.toFixed(decimals))}%`;
  }

  if (abs >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    return `${trimTrailingZeros(scaled.toFixed(compact ? 1 : 2))}B`;
  }

  if (abs >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${trimTrailingZeros(scaled.toFixed(compact ? 1 : 2))}M`;
  }

  if (abs >= 1_000) {
    const scaled = value / 1_000;
    return `${trimTrailingZeros(scaled.toFixed(compact ? 1 : 2))}K`;
  }

  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return trimTrailingZeros(value.toFixed(decimals));
}

function trimTrailingZeros(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
