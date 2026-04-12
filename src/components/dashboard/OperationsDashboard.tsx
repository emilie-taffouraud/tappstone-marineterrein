import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOpsLiveData } from "../../hooks/useOpsLiveData";
import { useTelraamTraffic } from "../../hooks/useTelraamTraffic";
import { DASHBOARD_HEADER_THEME, MAIN_COLORS, getBadgeStyle } from "../../styles/theme";
import mt_down from "../../assets/mt_down.jpg";
import mt_up from "../../assets/mt_up.jpg";
import PublicHolidaysCard from "./PublicHolidaysCard";
import TelraamLiveCard from "./TelraamLiveCard";
import TelraamDetailsCard from "./TelraamDetailsCard";
import WeatherWidget from "./WeatherWidget";
import { LiveOperationsMapSection } from "./live-map/LiveOperationsMapSection";
import {
  deriveAnomalyChart,
  deriveCrowdingSoundChart,
  deriveCurrentModalityChart,
  deriveIncidentCorrelationChart,
  deriveLiveAlerts,
  deriveLiveKpis,
  deriveLiveMetaSummary,
  deriveSoundSummary,
  deriveTelraamLiveModeSplitChart,
  deriveWaterSummary,
  deriveWeatherWidgetModel,
} from "./opsLiveViewModel";
import { Card, CardContent, CardHeader, Pill, SectionTitle, SelectLike } from "./ui";
import type { AlertItem } from "./types";

const locationOptions = ["All locations", "Portiersloge", "TAPP", "CODAM", "AHK MakerSpace", "Swim area"];
const sensorCategories = [
  "All categories",
  "Mobility & Access",
  "Sound Monitoring",
  "Environmental Conditions",
  "Recreation & Water",
  "Safety & Monitoring",
];
const severityOptions = ["All severities", "info", "warning", "critical"];
const timeRangeOptions = ["Last 30 min", "Last 2 hrs", "Today"];
const modeOptions = ["Live", "Incident mode"];

function SignalCard({
  title,
  value,
  helper,
  detail,
  tone,
  className,
}: {
  title: string;
  value: string;
  helper: string;
  detail: string[];
  tone: "slate" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle title={title} subtitle={helper} />
          <Pill tone={tone}>{tone === "slate" ? "pending" : tone}</Pill>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
          {value}
        </p>
        {detail.map((item) => (
          <div
            key={item}
            className="rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: `${MAIN_COLORS.aColor1}26`,
              backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
              color: MAIN_COLORS.aColorGray,
            }}
          >
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChartPlaceholder({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      className="rounded-2xl border p-4 text-sm"
      style={{
        borderColor: `${MAIN_COLORS.aColor1}26`,
        backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
        color: MAIN_COLORS.aColorGray,
      }}
    >
      <p className="font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
        {title}
      </p>
      <p className="mt-2 leading-6">{detail}</p>
    </div>
  );
}

function ThresholdField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: MAIN_COLORS.aColorGray }}>
        {label}
      </span>
      <div
        className="flex items-center gap-2 rounded-2xl border px-3 py-2.5"
        style={{
          borderColor: `${MAIN_COLORS.aColor1}33`,
          backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
        }}
      >
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: MAIN_COLORS.aColorBlack }}
        />
        <span className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
          {unit}
        </span>
      </div>
    </label>
  );
}

function matchesZoneSelection(selection: string, alertZone: string) {
  if (selection === "All locations") return true;
  const normalizedSelection = selection.toLowerCase();
  const normalizedZone = alertZone.toLowerCase();
  return normalizedZone.includes(normalizedSelection) || normalizedSelection.includes(normalizedZone);
}

type HolidayItem = {
  date: string;
  localName: string;
  name?: string;
  countryCode?: string;
  fixed?: boolean;
  global?: boolean;
  counties?: string[] | null;
  launchYear?: number | null;
  types?: string[];
};

export function OperationsDashboard() {
  const [zone, setZone] = useState("All locations");
  const [category, setCategory] = useState("All categories");
  const [severity, setSeverity] = useState("All severities");
  const [range, setRange] = useState("Last 2 hrs");
  const [mode, setMode] = useState("Live");
  const [flowThreshold, setFlowThreshold] = useState(150);
  const [anomalyThreshold, setAnomalyThreshold] = useState(20);
  const [soundThreshold, setSoundThreshold] = useState(75);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const { overview, health, loading: opsLoading, error: opsError } = useOpsLiveData();
  const { points: telraamHistory, error: telraamHistoryError } = useTelraamTraffic();

  useEffect(() => {
    let cancelled = false;

    async function loadHolidays() {
      try {
        setHolidaysLoading(true);
        const year = new Date().getFullYear();
        const response = await fetch(`/api/holidays?year=${year}`);
        const json = (await response.json()) as { data?: HolidayItem[] };

        if (!cancelled) {
          setHolidays(Array.isArray(json.data) ? json.data : []);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setHolidays([]);
        }
      } finally {
        if (!cancelled) {
          setHolidaysLoading(false);
        }
      }
    }

    loadHolidays();

    return () => {
      cancelled = true;
    };
  }, []);

  const liveKpis = useMemo(() => deriveLiveKpis(overview, health, opsLoading), [overview, health, opsLoading]);
  const liveWeatherWidget = useMemo(() => deriveWeatherWidgetModel(overview, health), [overview, health]);
  const liveMetaSummary = useMemo(() => deriveLiveMetaSummary(overview, health), [overview, health]);
  const soundSummary = useMemo(() => deriveSoundSummary(overview, health), [overview, health]);
  const waterSummary = useMemo(() => deriveWaterSummary(overview, health), [overview, health]);
  const currentModalityChart = useMemo(() => deriveCurrentModalityChart(overview), [overview]);
  const telraamLiveModeSplitChart = useMemo(() => deriveTelraamLiveModeSplitChart(overview), [overview]);
  const anomalyChart = useMemo(() => deriveAnomalyChart(telraamHistory), [telraamHistory]);
  const incidentCorrelationChart = useMemo(
    () => deriveIncidentCorrelationChart(telraamHistory, overview),
    [telraamHistory, overview],
  );
  const crowdingSoundChart = useMemo(() => deriveCrowdingSoundChart(overview), [overview]);
  const telraamTrendChart = useMemo(
    () =>
      [...telraamHistory].reverse().map((point) => ({
        time: new Date(point.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        pedestrians: Number(point.pedestrian_count || 0),
        bicycles: Number(point.bicycle_count || 0),
        vehicles: Number(point.vehicle_count || 0),
      })),
    [telraamHistory],
  );

  const chartPalette = [
    MAIN_COLORS.aColor1,
    MAIN_COLORS.aColor2,
    "#0f766e",
    "#f59e0b",
    "#94a3b8",
    "#ef4444",
    "#22c55e",
    "#f97316",
    "#14b8a6",
    "#64748b",
  ];
  const latestAnomaly = anomalyChart.length ? anomalyChart[anomalyChart.length - 1] : undefined;
  const husenseConnected =
    health?.sources.husense?.status === "ok" &&
    overview.records.some((record) => record.source === "husense" && record.metric === "sound_level_db");
  const latestTelraamPoint = telraamTrendChart.length ? telraamTrendChart[telraamTrendChart.length - 1] : null;
  const latestSoundValue = husenseConnected
    ? overview.records
        .filter((record) => record.source === "husense" && record.metric === "sound_level_db")
        .map((record) => Number(record.value))
        .filter((value) => Number.isFinite(value))
        .reduce((max, value) => Math.max(max, value), 0)
    : null;
  const thresholdAlerts = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];
    let id = 1000;

    const currentFlow =
      (latestTelraamPoint?.pedestrians ?? 0) + (latestTelraamPoint?.bicycles ?? 0) + (latestTelraamPoint?.vehicles ?? 0);
    if (latestTelraamPoint && currentFlow >= flowThreshold) {
      alerts.push({
        id: id++,
        severity: currentFlow >= flowThreshold * 1.2 ? "critical" : "warning",
        title: "Telraam gate flow above threshold",
        zone: "Kattenburgerstraat 7",
        source: "THRESHOLD",
        time: latestTelraamPoint.time,
        detail: `${currentFlow} movements/hour is above the editable threshold of ${flowThreshold}.`,
      });
    }

    if (latestAnomaly && Math.abs(latestAnomaly.deviationPct) >= anomalyThreshold) {
      alerts.push({
        id: id++,
        severity: Math.abs(latestAnomaly.deviationPct) >= anomalyThreshold * 1.5 ? "critical" : "warning",
        title: "Busyness anomaly outside expected range",
        zone: "Marineterrein",
        source: "THRESHOLD",
        time: latestAnomaly.time,
        detail: `Current movement is ${latestAnomaly.deviationPct}% away from baseline. Threshold is ${anomalyThreshold}%.`,
      });
    }

    if (latestSoundValue !== null && latestSoundValue >= soundThreshold) {
      alerts.push({
        id: id++,
        severity: latestSoundValue >= soundThreshold * 1.1 ? "critical" : "warning",
        title: "Sound level above threshold",
        zone: "Marineterrein",
        source: "THRESHOLD",
        time: liveMetaSummary.generatedAt,
        detail: `Peak live sound level is ${latestSoundValue.toFixed(0)} dB, above the editable threshold of ${soundThreshold} dB.`,
      });
    }

    return alerts;
  }, [
    flowThreshold,
    anomalyThreshold,
    soundThreshold,
    latestTelraamPoint,
    latestAnomaly,
    latestSoundValue,
    liveMetaSummary.generatedAt,
  ]);
  const filteredAlerts = useMemo(() => {
    const feedAlerts = deriveLiveAlerts(overview, "All locations", "All severities");
    return [...thresholdAlerts, ...feedAlerts]
      .filter((alert) => matchesZoneSelection(zone, alert.zone))
      .filter((alert) => severity === "All severities" || alert.severity === severity);
  }, [overview, thresholdAlerts, zone, severity]);

  return (
    <div
      className="min-h-screen px-4 py-5 md:px-6 md:py-6"
      style={{
        color: MAIN_COLORS.aColorBlack,
        backgroundImage: `radial-gradient(circle at top, ${MAIN_COLORS.aColor2}16, transparent 28%), linear-gradient(180deg, #edf6fa 0%, #dfeef4 52%, #edf6fa 100%)`,
      }}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <div
          className="rounded-[30px] px-6 py-6 backdrop-blur md:px-8"
          style={{
            border: `1px solid ${MAIN_COLORS.aColorWhite}cc`,
            backgroundColor: MAIN_COLORS.aColorBlack,
            backgroundImage: `linear-gradient(${MAIN_COLORS.aColor4}, ${MAIN_COLORS.aColor4}), url(${mt_up})`,
            backgroundPosition: "bottom center",
            boxShadow: `0 12px 35px ${MAIN_COLORS.aColorBlack}22`,
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-3xl font-semibold tracking-tight md:text-[2rem]" style={DASHBOARD_HEADER_THEME.title}>
                Tapp Marineterrein Operations Dashboard
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6" style={DASHBOARD_HEADER_THEME.subtitle}>
                Live overview of gate activity, mapped sound context, weather, and swim-area conditions across the public
                space.
              </p>
            </div>

            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                border: `1px solid ${MAIN_COLORS.aColor1}66`,
                backgroundColor: `${MAIN_COLORS.aColor3}`,
                color: MAIN_COLORS.aColorBlack,
              }}
            >
              <div className="flex items-center gap-2">
                <Pill tone={liveMetaSummary.statusTone}>{health?.status || "unknown"}</Pill>
                <span>{liveMetaSummary.totalRecords} live records</span>
              </div>
              <p className="mt-2 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                Last ops refresh {liveMetaSummary.generatedAt} • degraded sources {liveMetaSummary.degradedCount}
              </p>
            </div>
          </div>
        </div>

        <WeatherWidget model={liveWeatherWidget} />

        <div
          className="rounded-[28px] px-6 py-5 md:px-8"
          style={{
            border: `1px solid ${MAIN_COLORS.aColor1}44`,
            backgroundImage: `linear-gradient(rgba(252, 252, 252, 0.68), rgba(252, 252, 252, 0.78)), url(${mt_down})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: `0 14px 36px ${MAIN_COLORS.aColorBlack}14`,
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: MAIN_COLORS.aColor1 }}>
                Operator controls
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Filter the current operational view</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
                Telraam is handled as one site-edge counter, while the broader sensor network appears lower on the page
                after the key operational summaries and charts.
              </p>
            </div>

            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                border: `1px solid ${MAIN_COLORS.aColor1}55`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}c7`,
                color: MAIN_COLORS.aColorBlack,
              }}
            >
              <span className="font-medium" style={{ color: MAIN_COLORS.aColor1 }}>
                Current view:
              </span>{" "}
              {zone} • {category} • {severity} • {range} • {mode}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SelectLike dark label="Time range" value={range} onChange={setRange} options={timeRangeOptions} />
            <SelectLike dark label="Location" value={zone} onChange={setZone} options={locationOptions} />
            <SelectLike dark label="Sensor category" value={category} onChange={setCategory} options={sensorCategories} />
            <SelectLike dark label="Alert severity" value={severity} onChange={setSeverity} options={severityOptions} />
            <SelectLike dark label="View mode" value={mode} onChange={setMode} options={modeOptions} />
          </div>
        </div>

        {opsError ? (
          <div
            className="rounded-2xl px-5 py-4 text-sm"
            style={{
              border: `1px solid ${MAIN_COLORS.aColorBlack}44`,
              backgroundColor: `${MAIN_COLORS.aColor3}`,
              color: MAIN_COLORS.aColorBlack,
            }}
          >
            {opsError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {liveKpis.map((kpi) => {
            const Icon = typeof kpi.icon === "string" ? null : kpi.icon;

            return (
              <Card key={kpi.label} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                        {kpi.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {kpi.value}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {kpi.helper}
                      </p>
                    </div>

                    {Icon ? (
                      <div
                        className="rounded-2xl p-2.5"
                        style={{
                          border: `1px solid ${MAIN_COLORS.aColor1}33`,
                          backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                          color: MAIN_COLORS.aColor1,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:items-start">
          <div className="space-y-5">
            <TelraamDetailsCard overview={overview} />

            <Card>
              <CardHeader>
                <SectionTitle
                  title="Telraam traffic over time"
                  subtitle="Recent pedestrian, bicycle, and vehicle counts with the latest modality snapshot alongside"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {telraamTrendChart.length ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telraamTrendChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                        <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="pedestrians" stackId="1" stroke={MAIN_COLORS.aColor1} fill={MAIN_COLORS.aColor1} fillOpacity={0.85} />
                        <Area type="monotone" dataKey="bicycles" stackId="1" stroke={MAIN_COLORS.aColor2} fill={MAIN_COLORS.aColor2} fillOpacity={0.8} />
                        <Area type="monotone" dataKey="vehicles" stackId="1" stroke="#0f766e" fill="#0f766e" fillOpacity={0.75} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartPlaceholder
                    title="Telraam trend unavailable"
                    detail={telraamHistoryError || "Recent Telraam history is not available yet."}
                  />
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  {currentModalityChart.map((item, index) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border p-4"
                      style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                    >
                      <p className="text-sm" style={{ color: chartPalette[index] }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionTitle
                  title="Busyness anomaly vs baseline"
                  subtitle="Current movement compared against the expected pattern from the recent Telraam hourly window"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {anomalyChart.length ? (
                  <>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={anomalyChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                          <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="expected" stroke={MAIN_COLORS.aColor2} fill={MAIN_COLORS.aColor2} fillOpacity={0.18} />
                          <Line type="monotone" dataKey="actual" stroke={MAIN_COLORS.aColor1} strokeWidth={3} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border p-4" style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}>
                        <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>Latest actual</p>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>{latestAnomaly?.actual ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border p-4" style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}>
                        <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>Expected baseline</p>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>{latestAnomaly?.expected ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border p-4" style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}>
                        <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>Deviation</p>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>{latestAnomaly ? `${latestAnomaly.deviationPct}%` : "0%"}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <ChartPlaceholder
                    title="No busyness trend yet"
                    detail={telraamHistoryError || "Recent Telraam history is needed before anomaly tracking can be calculated."}
                  />
                )}
              </CardContent>
            </Card>

            <PublicHolidaysCard holidaysLoading={holidaysLoading} holidays={holidays} />
          </div>

          <div className="space-y-5">
            <Card className="min-h-[560px]">
              <CardHeader>
                <SectionTitle title="Active alerts" subtitle="Current warning feed plus editable threshold-driven alerts" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <ThresholdField label="Flow threshold" value={flowThreshold} unit="moves/hr" onChange={setFlowThreshold} />
                  <ThresholdField label="Anomaly threshold" value={anomalyThreshold} unit="%" onChange={setAnomalyThreshold} />
                  <ThresholdField label="Sound threshold" value={soundThreshold} unit="dB" onChange={setSoundThreshold} />
                </div>

                {filteredAlerts.length ? (
                  filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: `${MAIN_COLORS.aColor1}26`,
                        backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                              style={getBadgeStyle(alert.severity)}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-xs text-slate-500">{alert.time}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                          <p className="text-sm text-slate-600">{alert.detail}</p>
                        </div>
                        <AlertTriangle className="mt-1 h-4 w-4" style={{ color: MAIN_COLORS.aColor1 }} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill>{alert.zone}</Pill>
                        <Pill>{alert.source}</Pill>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="rounded-2xl border p-4 text-sm"
                    style={{
                      borderColor: `${MAIN_COLORS.aColor1}26`,
                      backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                      color: MAIN_COLORS.aColorGray,
                    }}
                  >
                    No live warnings match the current filters.
                  </div>
                )}
              </CardContent>
            </Card>

            <TelraamLiveCard data={telraamLiveModeSplitChart} chartPalette={chartPalette} />

            <div className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-1">
              <SignalCard {...soundSummary} className="h-full" />
              <SignalCard {...waterSummary} className="h-full" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-1">
          <div className="space-y-5">
            <Card className="min-h-[360px]">
              <CardHeader>
                <SectionTitle
                  title="Multi-sensor incident correlation"
                  subtitle="Shared timeline for crowding, vehicle activity, and sound context so possible disruptions sit together"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {incidentCorrelationChart.length ? (
                  <>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={incidentCorrelationChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                          <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="busyness" stroke={MAIN_COLORS.aColor2} fill={MAIN_COLORS.aColor2} fillOpacity={0.18} />
                          <Line type="monotone" dataKey="vehicles" stroke="#0f766e" strokeWidth={2.5} dot={false} />
                          {husenseConnected ? <Line type="monotone" dataKey="sound" stroke={MAIN_COLORS.aColor1} strokeWidth={2.5} dot={false} /> : null}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {!husenseConnected ? <ChartPlaceholder title="Sound feed" detail="Waiting for Husense to connect" /> : null}
                  </>
                ) : (
                  <ChartPlaceholder
                    title="Correlation view unavailable"
                    detail={telraamHistoryError || "Recent movement history is needed before this incident-correlation card can populate."}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[320px]">
              <CardHeader>
                <SectionTitle
                  title="Crowding vs sound"
                  subtitle="Noise pressure in relation to crowding, kept beside the incident view for quick comparison"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {husenseConnected && crowdingSoundChart.length ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                        <XAxis type="number" dataKey="crowding" name="Crowding" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="number" dataKey="sound" name="Sound" unit=" dB" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter data={crowdingSoundChart} fill={MAIN_COLORS.aColor1} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartPlaceholder title="Sound comparison" detail="Waiting for Husense to connect" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <LiveOperationsMapSection />
      </div>
    </div>
  );
}
