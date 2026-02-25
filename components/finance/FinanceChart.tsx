import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// ────────────────────────────────────────────────────────────
// Workaround: recharts' ResponsiveContainer return type is
// incompatible with React 18's stricter JSX element types.
// Cast through `any` so the wrapper itself is a valid JSX element.
// ────────────────────────────────────────────────────────────
const SafeResponsiveContainer = ResponsiveContainer as any;
const SafeAreaChart = AreaChart as any;
const SafeXAxis = XAxis as any;
const SafeYAxis = YAxis as any;
const SafeCartesianGrid = CartesianGrid as any;
const SafeTooltip = Tooltip as any;
const SafeLegend = Legend as any;
const SafeArea = Area as any;
const SafeReferenceLine = ReferenceLine as any;

function ChartContainer({
  children,
  height,
}: {
  children: React.ReactNode;
  height: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <SafeResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </SafeResponsiveContainer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Formatting helper
// ────────────────────────────────────────────────────────────
function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ────────────────────────────────────────────────────────────
// Custom Tooltip
// ────────────────────────────────────────────────────────────
interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload?: Record<string, any>;
}

function CustomTooltip({
  active,
  payload,
  label: _label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = (payload[0] as any)?.payload as Record<string, any> | undefined;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{item?.date ?? ""}</p>
      {payload.map((entry: TooltipPayload, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {fmtCurrency(entry.value)}
        </p>
      ))}
      {item?.label && (
        <p className="text-gray-500 mt-1 italic text-[10px] max-w-[250px] truncate">
          {item.label}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Single-line area chart (e.g. net worth, stock value)
// ────────────────────────────────────────────────────────────
export interface SingleLineChartProps {
  data: Array<{ date: string; value: number; label?: string }>;
  color?: string;
  gradientId?: string;
  height?: number;
  name?: string;
  /** Reference lines (e.g. zero line, target) */
  refLines?: Array<{ y: number; label: string; color: string }>;
}

export function SingleLineChart({
  data,
  color = "#818cf8",
  gradientId = "areaGrad",
  height = 300,
  name = "Value",
  refLines,
}: SingleLineChartProps) {
  if (data.length < 2) {
    return (
      <div className="text-gray-500 text-sm py-8 text-center">
        Not enough data points to show a chart (need at least 2 events).
      </div>
    );
  }

  return (
    <ChartContainer height={height}>
      <SafeAreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <SafeCartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <SafeXAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={{ stroke: "#4b5563" }}
          interval="preserveStartEnd"
        />
        <SafeYAxis
          tickFormatter={fmtCurrency}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={{ stroke: "#4b5563" }}
          width={80}
        />
        <SafeTooltip content={<CustomTooltip />} />
        <SafeArea
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "#111827", strokeWidth: 2 }}
        />
        {refLines?.map((rl, i) => (
          <SafeReferenceLine
            key={i}
            y={rl.y}
            stroke={rl.color}
            strokeDasharray="5 5"
            label={{ value: rl.label, fill: rl.color, fontSize: 10, position: "insideTopLeft" }}
          />
        ))}
      </SafeAreaChart>
    </ChartContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Multi-line area chart (e.g. cost basis vs market value)
// ────────────────────────────────────────────────────────────
export interface MultiLineChartProps {
  data: Array<Record<string, any>>;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  refLines?: Array<{ y: number; label: string; color: string }>;
}

export function MultiLineChart({
  data,
  lines,
  height = 300,
  refLines,
}: MultiLineChartProps) {
  if (data.length < 2) {
    return (
      <div className="text-gray-500 text-sm py-8 text-center">
        Not enough data points to show a chart.
      </div>
    );
  }

  return (
    <ChartContainer height={height}>
      <SafeAreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient
              key={line.dataKey}
              id={`grad-${line.dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={line.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <SafeCartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <SafeXAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={{ stroke: "#4b5563" }}
          interval="preserveStartEnd"
        />
        <SafeYAxis
          tickFormatter={fmtCurrency}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={{ stroke: "#4b5563" }}
          width={80}
        />
        <SafeTooltip content={<CustomTooltip />} />
        <SafeLegend
          wrapperStyle={{ fontSize: 12, color: "#d1d5db" }}
        />
        {lines.map((line) => (
          <SafeArea
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            fill={`url(#grad-${line.dataKey})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: line.color, stroke: "#111827", strokeWidth: 2 }}
          />
        ))}
        {refLines?.map((rl, i) => (
          <SafeReferenceLine
            key={i}
            y={rl.y}
            stroke={rl.color}
            strokeDasharray="5 5"
            label={{ value: rl.label, fill: rl.color, fontSize: 10, position: "insideTopLeft" }}
          />
        ))}
      </SafeAreaChart>
    </ChartContainer>
  );
}
