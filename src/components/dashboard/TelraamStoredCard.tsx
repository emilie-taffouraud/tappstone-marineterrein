import type { TelraamTrafficPoint } from "../../lib/opsLiveClient";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MAIN_COLORS } from "../../styles/theme";
import { Card, CardContent, CardHeader, SectionTitle } from "./ui";

type TelraamStoredCardProps = {
  points: TelraamTrafficPoint[];
  error?: string | null;
};

function formatLocalDateTime(value: string | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function flow(point: TelraamTrafficPoint) {
  return Number(point.pedestrian_count || 0) + Number(point.bicycle_count || 0) + Number(point.vehicle_count || 0);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default function TelraamStoredCard({ points, error }: TelraamStoredCardProps) {
  const ordered = [...points].sort(
    (left, right) => new Date(left.recorded_at).getTime() - new Date(right.recorded_at).getTime(),
  );
  const trendChart = ordered.map((point) => ({
    time: new Date(point.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    pedestrians: Number(point.pedestrian_count || 0),
    bicycles: Number(point.bicycle_count || 0),
    vehicles: Number(point.vehicle_count || 0),
  }));
  const latest = ordered.length ? ordered[ordered.length - 1] : null;
  const earliest = ordered.length ? ordered[0] : null;
  const windowSpanHours = earliest && latest
    ? Math.max(0, (new Date(latest.recorded_at).getTime() - new Date(earliest.recorded_at).getTime()) / (1000 * 60 * 60))
    : 0;
  const segmentCount = new Set(points.map((point) => String(point.segment_id))).size;

  const totals = points.reduce(
    (sum, point) => ({
      pedestrians: sum.pedestrians + Number(point.pedestrian_count || 0),
      bicycles: sum.bicycles + Number(point.bicycle_count || 0),
      vehicles: sum.vehicles + Number(point.vehicle_count || 0),
    }),
    { pedestrians: 0, bicycles: 0, vehicles: 0 },
  );

  const combinedTotal = totals.pedestrians + totals.bicycles + totals.vehicles;
  const averageFlowPerHour = points.length ? Math.round(combinedTotal / points.length) : 0;
  const latestFlow = latest ? flow(latest) : 0;
  const latestBicycleSharePct = latestFlow > 0 && latest
    ? (Number(latest.bicycle_count || 0) / latestFlow) * 100
    : 0;
  const peakPoint = ordered.reduce<{ point: TelraamTrafficPoint | null; totalFlow: number }>(
    (peak, point) => {
      const totalFlow = flow(point);
      if (!peak.point || totalFlow > peak.totalFlow) {
        return { point, totalFlow };
      }
      return peak;
    },
    { point: null, totalFlow: 0 },
  );

  const dominantMode = [
    { label: "Bicycles", value: totals.bicycles },
    { label: "Pedestrians", value: totals.pedestrians },
    { label: "Vehicles", value: totals.vehicles },
  ].sort((left, right) => right.value - left.value)[0];

  const timeWindowLabel = earliest && latest
    ? `${formatLocalDateTime(earliest.recorded_at)} to ${formatLocalDateTime(latest.recorded_at)}`
    : "Unavailable";

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Stored Telraam Data"
          subtitle="Summary from the database"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {points.length ? (
          <>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                  <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCompactNumber(Number(value || 0)), name]}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area type="monotone" dataKey="pedestrians" stackId="1" stroke={MAIN_COLORS.aColor1} fill={MAIN_COLORS.aColor1} fillOpacity={0.85} />
                  <Area type="monotone" dataKey="bicycles" stackId="1" stroke={MAIN_COLORS.aColor2} fill={MAIN_COLORS.aColor2} fillOpacity={0.8} />
                  <Area type="monotone" dataKey="vehicles" stackId="1" stroke="#0f766e" fill="#0f766e" fillOpacity={0.75} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Stored rows", value: formatCompactNumber(points.length), note: "Rows returned by this database query" },
                { label: "History span", value: `${windowSpanHours.toFixed(1)} h`, note: `From ${formatLocalDateTime(earliest?.recorded_at)} to ${formatLocalDateTime(latest?.recorded_at)}` },
                { label: "Latest bicycle share", value: `${latestBicycleSharePct.toFixed(0)}%`, note: "Bicycle share within the latest stored row" },
                { label: "Latest total flow", value: formatCompactNumber(latestFlow), note: "Pedestrians + bicycles + vehicles in latest row" },
                { label: "Average flow / row", value: formatCompactNumber(averageFlowPerHour), note: "Average movements across loaded rows" },
                {
                  label: "Peak flow row",
                  value: peakPoint.point ? formatCompactNumber(peakPoint.totalFlow) : "0",
                  note: peakPoint.point ? `Occurred at ${formatLocalDateTime(peakPoint.point.recorded_at)}` : "Unavailable",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                >
                  <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-6" style={{ color: MAIN_COLORS.aColorBlack }}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
              Mode mix in loaded rows: {formatCompactNumber(totals.pedestrians)} pedestrians, {formatCompactNumber(totals.bicycles)} bicycles, {formatCompactNumber(totals.vehicles)} vehicles. Dominant mode: {dominantMode.label} ({formatCompactNumber(dominantMode.value)}).
            </p>

            <p className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
              <span
                title="The number of unique Telraam counter segments in these loaded rows."
                className="cursor-help underline decoration-dotted underline-offset-2"
              >
                Segments represented
              </span>
              : {segmentCount}
            </p>
          </>
        ) : (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{
              borderColor: `${MAIN_COLORS.aColor1}26`,
              backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
              color: MAIN_COLORS.aColorGray,
            }}
          >
            {error || "No traffic rows are currently available from the database."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}