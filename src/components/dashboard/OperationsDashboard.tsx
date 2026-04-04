import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Droplets,
  Router,
  ScanLine,
  Trees,
  Users,
  Waves,
  WifiOff,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  anomalyPanel as demoAnomalyPanel,
  dailyTrend as demoDailyTrend,
  infrastructureStatus as demoInfrastructureStatus,
  modeOptions,
  pedestrianTrend as demoPedestrianTrend,
  sensorCategories as dashboardSensorCategories,
  severityOptions,
  timeRangeOptions,
  zones,
} from "../../data/mockDashboardData";
import { useOpsLiveData } from "../../hooks/useOpsLiveData";
import { Card, CardContent, CardHeader, Pill, SectionTitle, SelectLike } from "./ui";
import { LiveOperationsMapSection } from "./live-map/LiveOperationsMapSection";
import {
  deriveLiveAlerts,
  deriveLiveKpis,
  deriveLiveMetaSummary,
  deriveMobilitySnapshot,
  deriveSourceHealthItems,
  deriveWeatherWidgetModel,
  deriveZoneSnapshotCards,
} from "./opsLiveViewModel";
import WeatherWidget from "./WeatherWidget";
import TelraamDetailsCard from "./TelraamDetailsCard";
import PublicHolidaysCard from "./PublicHolidaysCard";
import { MAIN_COLORS, getBadgeStyle } from "../../styles/theme";
import mt_down from "../../assets/mt_down.jpg";
import mt_up from "../../assets/mt_up.jpg";

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

const alertIconColor = (severity: "info" | "warning" | "critical") => {
  if (severity === "critical") return MAIN_COLORS.aColorBlack;
  if (severity === "warning") return MAIN_COLORS.aColor1;
  return MAIN_COLORS.aColor2;
};

export function OperationsDashboard() {
  const [zone, setZone] = useState("All locations");
  const [category, setCategory] = useState("All categories");
  const [severity, setSeverity] = useState("All severities");
  const [range, setRange] = useState("Last 2 hrs");
  const [mode, setMode] = useState("Live");
  const { overview, health, loading: opsLoading, error: opsError } = useOpsLiveData();

  const filteredAlerts = useMemo(() => {
    return deriveLiveAlerts(overview, zone, severity);
  }, [overview, zone, severity]);

  const filteredSensorHealth = useMemo(() => {
    return deriveSourceHealthItems(health, category);
  }, [health, category]);

  const liveKpis = useMemo(() => {
    return deriveLiveKpis(overview, health, opsLoading);
  }, [overview, health, opsLoading]);

  const liveWeatherWidget = useMemo(() => deriveWeatherWidgetModel(overview, health), [overview, health]);
  const liveMetaSummary = useMemo(() => deriveLiveMetaSummary(overview, health), [overview, health]);
  const mobilitySnapshot = useMemo(() => deriveMobilitySnapshot(overview), [overview]);
  const zoneSnapshotCards = useMemo(() => deriveZoneSnapshotCards(overview), [overview]);
  const hasLiveMobilitySnapshot = mobilitySnapshot.total > 0;

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  useEffect(() => {
    async function loadHolidays() {
      try {
        setHolidaysLoading(true);

        const res = await fetch("/api/holidays");
        if (!res.ok) {
          throw new Error("Failed to fetch holidays");
        }

        const json = await res.json();
        const holidayData = Array.isArray(json?.data) ? json.data : [];
        setHolidays(holidayData);
      } catch (err) {
        console.error(err);
        setHolidays([]);
      } finally {
        setHolidaysLoading(false);
      }
    }

    loadHolidays();
  }, []);

  const livePedestrianTrend = useMemo(() => {
    return demoPedestrianTrend;
  }, []);

  const liveAccessActivity = useMemo(() => {
    if (!hasLiveMobilitySnapshot) {
      return [];
    }

    return [
      { time: "Current", access: mobilitySnapshot.pedestrians + mobilitySnapshot.bicycles, vehicles: mobilitySnapshot.vehicles },
    ];
  }, [hasLiveMobilitySnapshot, mobilitySnapshot]);

  const liveModalitySplit = useMemo(() => {
    const pedestrians = mobilitySnapshot.pedestrians;
    const bicycles = mobilitySnapshot.bicycles;
    const vehicles = mobilitySnapshot.vehicles;
    const total = pedestrians + bicycles + vehicles;

    if (total === 0) {
      return [
        { name: "Pedestrian", value: 0 },
        { name: "Bike", value: 0 },
        { name: "Vehicle", value: 0 },
      ];
    }

    return [
      { name: "Pedestrian", value: Math.round((pedestrians / total) * 100) },
      { name: "Bike", value: Math.round((bicycles / total) * 100) },
      { name: "Vehicle", value: Math.round((vehicles / total) * 100) },
    ];
  }, [mobilitySnapshot]);

  const scannerStats = useMemo(() => {
    return {
      access: hasLiveMobilitySnapshot ? mobilitySnapshot.pedestrians + mobilitySnapshot.bicycles : null,
      vehicles: hasLiveMobilitySnapshot ? mobilitySnapshot.vehicles : null,
    };
  }, [hasLiveMobilitySnapshot, mobilitySnapshot]);

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{
        color: MAIN_COLORS.aColorBlack,
        backgroundImage: `radial-gradient(circle at top, ${MAIN_COLORS.aColor1}22, transparent 30%), linear-gradient(180deg, ${MAIN_COLORS.aColorWhite} 0%, ${MAIN_COLORS.aColor3} 52%, ${MAIN_COLORS.aColorWhite} 100%)`,
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div
          className="rounded-[30px] px-6 py-7 backdrop-blur md:px-8"
          style={{
            border: `1px solid ${MAIN_COLORS.aColorWhite}cc`,
            backgroundColor: MAIN_COLORS.aColorBlack,
            backgroundImage: `
              linear-gradient(${MAIN_COLORS.aColor4}, ${MAIN_COLORS.aColor4}),
              url(${mt_up})
            `,
            boxShadow: `0 12px 35px ${MAIN_COLORS.aColorBlack}22`,
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1
                className="text-3xl font-semibold tracking-tight md:text-[2rem]"
                style={{ color: MAIN_COLORS.aColor2, fontFamily: '"Vesper Libre", serif' }}
              >
                Tapp Marineterrein Urban Operations Intelligence Dashboard
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6" style={{ color: MAIN_COLORS.aColorWhite }}>
                Unified live view of crowd dynamics, access activity, environmental conditions, and infrastructure
                health across the public space.
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
          className="rounded-[30px] px-6 py-6 md:px-8"
          style={{
            border: `1px solid ${MAIN_COLORS.aColor1}66`,
            backgroundImage: `
              linear-gradient(${MAIN_COLORS.aColor3}, ${MAIN_COLORS.aColor3}),
              url(${mt_down})
            `,
            color: MAIN_COLORS.aColorBlack,
            boxShadow: `0 18px 45px ${MAIN_COLORS.aColorBlack}1a`,
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: MAIN_COLORS.aColor1 }}>
                Operator controls
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
                Look up a specific location, signal, or incident pattern
              </h2>
              <p className="mt-2 text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
                Use filters to narrow the dashboard to a specific location, sensor category, alert severity, or time
                window before reviewing the live operational picture below.
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
              <span className="font-medium" style={{ color: MAIN_COLORS.aColor1 }}>
                Current view:
              </span>{" "}
              {zone} · {category} · {severity} ·{" "}
              {range}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SelectLike dark label="Time range" value={range} onChange={setRange} options={timeRangeOptions} />
            <SelectLike
              dark
              label="Location"
              value={zone}
              onChange={setZone}
              options={["All locations", ...zones.map((z) => z.name)]}
            />
            <SelectLike
              dark
              label="Sensor category"
              value={category}
              onChange={setCategory}
              options={dashboardSensorCategories}
            />
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

        <LiveOperationsMapSection />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveKpis.map((kpi) => {
            const Icon = kpi.icon;
            const TrendIcon = kpi.trend === "up" ? ArrowUpRight : ArrowDownRight;

            return (
              <Card key={kpi.label} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>{kpi.label}</p>
                      <div className="mt-2 flex items-end gap-2">
                        <p className="text-2xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
                          {kpi.value}
                        </p>
                        {kpi.delta ? (
                          <span
                            className="mb-1 inline-flex items-center gap-1 text-xs font-medium"
                            style={{ color: kpi.trend === "up" ? MAIN_COLORS.aColor1 : MAIN_COLORS.aColorBlack }}
                          >
                            <TrendIcon className="h-3.5 w-3.5" />
                            {kpi.delta}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>{kpi.helper}</p>
                    </div>

                    <div
                      className="rounded-2xl p-2.5"
                      style={{
                        border: `1px solid ${MAIN_COLORS.aColor1}33`,
                        backgroundColor: `${MAIN_COLORS.aColor3}`,
                        color: MAIN_COLORS.aColor1,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <TelraamDetailsCard overview={overview} />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Live activity overview"
                subtitle="Current live zone state plus demo historical context until real trend storage is available"
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={livePedestrianTrend}>
                    <defs>
                      <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MAIN_COLORS.aColor1} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={MAIN_COLORS.aColor1} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                    <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="flow"
                      stroke={MAIN_COLORS.aColor1}
                      fill="url(#flowFill)"
                      strokeWidth={2.2}
                      name="Pedestrian flow"
                    />
                    <Line
                      type="monotone"
                      dataKey="crowd"
                      stroke={MAIN_COLORS.aColor2}
                      strokeWidth={2}
                      dot={false}
                      name="Total flow"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-slate-500">
                The chart remains a demo historical placeholder for now. The current unified ops feed is snapshot-based
                and does not yet provide truthful time-series history.
              </p>

              <div className="grid gap-3 md:grid-cols-4">
                {zoneSnapshotCards.map((item) => (
                  <div key={item.zone} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">{item.zone}</p>
                      <Pill
                        tone={
                          item.status === "busy"
                            ? "rose"
                            : item.status === "watch"
                              ? "amber"
                              : item.status === "stable"
                                ? "sky"
                                : "emerald"
                        }
                      >
                        {item.status}
                      </Pill>
                    </div>

                    <p className="mt-3 text-2xl font-semibold text-slate-950">{item.visitors}</p>
                    <p className="text-xs text-slate-500">{item.helper}</p>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Density index</span>
                        <span>{item.density}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${
                            item.density >= 80 ? "bg-rose-500" : item.density >= 70 ? "bg-lime-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${item.density}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle title="Active alerts" subtitle="Prioritized for current shift response" />
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredAlerts.length ? (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

                      <AlertTriangle className="mt-1 h-4 w-4" style={{ color: alertIconColor(alert.severity) }} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill>{alert.zone}</Pill>
                      <Pill>{alert.source}</Pill>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No live warnings match the current filters. This card now uses the unified ops warning feed rather
                  than demo alert content.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Mobility, access, and modality"
                subtitle="Arrivals and transport mix for the selected view"
              />
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="h-[260px]">
                  {hasLiveMobilitySnapshot ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={liveAccessActivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                        <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="access" radius={[8, 8, 0, 0]} fill={MAIN_COLORS.aColor1} name="Pedestrian + bike" />
                        <Bar dataKey="vehicles" radius={[8, 8, 0, 0]} fill={MAIN_COLORS.aColor2} name="Vehicles" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-[rgba(248,250,252,0.82)] px-6 text-center">
                      <div className="max-w-sm space-y-2">
                        <p className="text-sm font-medium text-slate-800">No current live mobility snapshot</p>
                        <p className="text-xs leading-6 text-slate-500">
                          This panel updates from the unified ops feed when Telraam mobility records are available.
                          Until then, we avoid showing synthetic chart history.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-slate-200 bg-[rgba(248,250,252,0.78)] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Modality split</p>
                        <p className="text-xs text-slate-500">Based on the current counts</p>
                      </div>
                      <Router className="h-4 w-4 text-slate-500" />
                    </div>

                      {hasLiveMobilitySnapshot ? (
                        <>
                          <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={liveModalitySplit} innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={3}>
                                  {liveModalitySplit.map((entry, index) => (
                                    <Cell
                                      key={entry.name}
                                      fill={[MAIN_COLORS.aColor1, MAIN_COLORS.aColor2, `${MAIN_COLORS.aColor1}99`, `${MAIN_COLORS.aColor2}66`][index % 4]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-2">
                            {liveModalitySplit.map((item) => (
                              <div key={item.name} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-medium text-slate-900">{item.value}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex h-[220px] items-center justify-center text-center text-sm text-slate-500">
                          No current mode split is available until live mobility counts arrive.
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-[rgba(248,250,252,0.78)] p-4">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-slate-600" />
                      <p className="text-sm font-medium text-slate-800">Latest count snapshot</p>
                    </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-[rgba(255,255,255,0.72)] p-3">
                          <p className="text-slate-500">Pedestrian + bike</p>
                          <p className="mt-1 text-xl font-semibold text-slate-950">{scannerStats.access ?? "Unavailable"}</p>
                        </div>
                        <div className="rounded-2xl bg-[rgba(255,255,255,0.72)] p-3">
                          <p className="text-slate-500">Vehicles</p>
                          <p className="mt-1 text-xl font-semibold text-slate-950">{scannerStats.vehicles ?? "Unavailable"}</p>
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Based on the most recent update for the selected count point.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <SectionTitle title="Water & recreation status" subtitle="Swim area conditions and shoreline activity" />
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Swim area status</p>
                      <p className="text-xs text-slate-500">Current operational state</p>
                    </div>
                    <Droplets className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-2xl font-semibold text-slate-950">Open</p>
                    <Pill tone="amber">near threshold</Pill>
                  </div>
                    <p className="mt-2 text-sm text-slate-600">
                      74 swimmers active, soft capacity 80, hard capacity 95.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Demo placeholder until swim-area sensors are connected to the live ops layer.</p>
                  </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Water temperature</p>
                      <p className="text-xs text-slate-500">Rolling sensor average</p>
                    </div>
                    <Waves className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">19.1°C</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Within expected recreational band. Rising slowly through the morning.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Demo placeholder. The current live feed exposes air weather, not water temperature.</p>
                  </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Picnic activity</p>
                      <p className="text-xs text-slate-500">Public space activity cue</p>
                    </div>
                    <Trees className="h-4 w-4 text-slate-500" />
                  </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">31 setups</p>
                    <p className="mt-2 text-sm text-slate-600">Moderate shore-side dwell time; no intervention needed.</p>
                    <p className="mt-2 text-xs text-slate-500">Demo placeholder until recreation sensing is added to the backend.</p>
                  </div>
              </CardContent>
            </Card>

            <Card>
            <CardHeader>
              <SectionTitle title="Public infrastructure" subtitle="Status of visible operational assets" />
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Demo placeholder until infrastructure telemetry is added to the unified live ops feed.
              </p>
              {demoInfrastructureStatus.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-slate-950">{item.value}</span>
                          <div className="rounded-2xl bg-white p-2 text-slate-700">
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <PublicHolidaysCard holidaysLoading={holidaysLoading} holidays={holidays} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Environmental + crowd correlation"
                subtitle="Demo historical placeholder until the live ops feed includes stored environmental history"
              />
            </CardHeader>
            <CardContent>
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={demoPedestrianTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                    <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="crowd"
                      stroke={MAIN_COLORS.aColor1}
                      strokeWidth={2.2}
                      name="Visitors"
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sound"
                      stroke={MAIN_COLORS.aColor2}
                      strokeWidth={2.2}
                      name="Sound dB"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                This trend/correlation card remains demo because the current ops endpoints expose current-state signals,
                not historical environmental series.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {demoAnomalyPanel.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <Pill
                        tone={
                          item.confidence === "high"
                            ? "emerald"
                            : item.confidence === "moderate"
                              ? "amber"
                              : "slate"
                        }
                      >
                        {item.confidence}
                      </Pill>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle title="Historical trend snapshot" subtitle="Demo placeholder until the live backend exposes stored history" />
            </CardHeader>
            <CardContent>
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demoDailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                    <XAxis dataKey="day" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="visitors" fill={MAIN_COLORS.aColor1} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">7-day visitors</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">33.0k</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Avg. daily alerts</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">4.0</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Avg. noise</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">63.9 dB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="order-2">
            <CardHeader>
              <SectionTitle
                title="System check"
                subtitle="Action framing for the next 30–60 minutes"
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSensorHealth.map((item) => (
                  <div
                    key={`${item.sensor}-${item.zone}`}
                    className="grid grid-cols-[1.2fr_1fr_110px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{item.sensor}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.zone} · {item.category}
                      </p>
                    </div>

                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock3 className="h-4 w-4" />
                        <span>{health ? `last ops refresh ${liveMetaSummary.generatedAt}` : "live refresh unavailable"}</span>
                      </div>

                    <div className="justify-self-end">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={getBadgeStyle(item.status)}
                      >
                        {item.status === "offline" ? <WifiOff className="mr-1 h-3.5 w-3.5" /> : null}
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
                {!filteredSensorHealth.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No live source-health items match the current category filter.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="order-1">
            <CardHeader>
              <SectionTitle title="Operator notes" subtitle="Action framing for the next 30–60 minutes" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">Recommended attention areas</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>CODAM (039): check whether the higher sound level is linked to an event or a temporary crowd build-up.</li>
                  <li>TAPP (027 E): keep an eye on lunch-time activity if visitor numbers continue to rise.</li>
                  <li>AHK MakerSpace (027 N): restore the camera feed so the team has full visual coverage again.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
