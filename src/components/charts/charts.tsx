"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/utils";

export interface SeriesDef {
  key: string;
  label: string;
  color: string; // CSS var reference, e.g. "var(--series-1)"
}

// Fixed slot order: sent → blue, replies → orange (brand), opened → aqua.
export const EMAIL_SERIES: SeriesDef[] = [
  { key: "sent", label: "Sent", color: "var(--series-1)" },
  { key: "opened", label: "Opened", color: "var(--series-3)" },
  { key: "replied", label: "Replies", color: "var(--series-2)" },
];

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

function ChartTooltip({ active, payload, label, series }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; series: SeriesDef[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {series.map((s) => {
        const v = payload.find((p) => p.dataKey === s.key)?.value ?? 0;
        return (
          <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{formatNumber(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Multi-series activity chart over time with a crosshair tooltip. */
export function ActivityChart({
  data,
  series = EMAIL_SERIES,
  height = 260,
}: {
  data: Record<string, string | number>[];
  series?: SeriesDef[];
  height?: number;
}) {
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`Chart of ${series.map((s) => s.label).join(", ")} over time`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <Tooltip content={<ChartTooltip series={series} />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.4 }} />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center">
        <Legend series={series} />
      </div>
    </div>
  );
}

/** Single-series bar chart (one hue; the title names the measure). */
export function SimpleBarChart({
  data,
  dataKey,
  label,
  height = 220,
  color = "var(--series-1)",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  label: string;
  height?: number;
  color?: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`${label} bar chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            content={<ChartTooltip series={[{ key: dataKey, label, color }]} />}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
