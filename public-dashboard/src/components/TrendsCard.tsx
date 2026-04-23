import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CARD_STYLE, MAIN_COLORS, TREND_COLORS, LAYER_TOGGLE_THEME } from "../styles/theme";
import type { TrendsData, TrendPeriod } from "../types";
import type { Translations } from "../i18n";

interface Props {
  data: TrendsData | null;
  loading: boolean;
  period: TrendPeriod;
  onPeriodChange: (p: TrendPeriod) => void;
  t: Translations;
}

function formatBucket(bucket: string, resolution: "hourly" | "daily") {
  const d = new Date(bucket);
  if (isNaN(d.getTime())) return bucket;
  if (resolution === "hourly") {
    return d.toLocaleTimeString("nl-NL", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function PeriodToggle({
  period,
  onPeriodChange,
  t,
}: {
  period: TrendPeriod;
  onPeriodChange: (p: TrendPeriod) => void;
  t: Translations;
}) {
  return (
    <div className="flex gap-1.5">
      {(["7d", "30d"] as TrendPeriod[]).map((p) => (
        <button
          key={p}
          onClick={() => onPeriodChange(p)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={period === p ? LAYER_TOGGLE_THEME.active : LAYER_TOGGLE_THEME.inactive}
        >
          {p === "7d" ? t.period7d : t.period30d}
        </button>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="h-64 rounded-2xl animate-pulse"
      style={{ background: "rgba(100,116,139,0.07)" }}
    />
  );
}

export function TrendsCard({ data, loading, period, onPeriodChange, t }: Props) {
  const rows = data?.rows ?? [];
  const resolution = data?.resolution ?? "hourly";

  const chartData = rows.map((r) => ({
    label: formatBucket(r.bucket, resolution),
    [t.pedestrians]: r.pedestrians,
    [t.bicycles]: r.bicycles,
    [t.vehicles]: r.vehicles,
  }));

  // Show every Nth label to avoid crowding
  const tickEvery = resolution === "hourly" ? Math.max(1, Math.floor(rows.length / 12)) : 1;

  return (
    <div style={CARD_STYLE} className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${MAIN_COLORS.aColor2}18`, color: MAIN_COLORS.aColor1 }}
          >
            <TrendingUp size={16} />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: MAIN_COLORS.aColorBlack, letterSpacing: "-0.01em" }}
          >
            {t.trends}
          </h2>
        </div>
        <PeriodToggle period={period} onPeriodChange={onPeriodChange} t={t} />
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : rows.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
            {t.noData}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: MAIN_COLORS.aColorGray }}
              tickLine={false}
              interval={tickEvery - 1}
              axisLine={{ stroke: "rgba(100,116,139,0.15)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: MAIN_COLORS.aColorGray }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid rgba(226,232,240,0.95)",
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey={t.pedestrians}
              stroke={TREND_COLORS.pedestrians}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey={t.bicycles}
              stroke={TREND_COLORS.bicycles}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey={t.vehicles}
              stroke={TREND_COLORS.vehicles}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
