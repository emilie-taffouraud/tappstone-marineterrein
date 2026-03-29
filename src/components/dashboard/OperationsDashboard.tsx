import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Camera,
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
  alertsData,
  anomalyPanel,
  crowdByZone,
  dailyTrend,
  infrastructureStatus,
  kpis,
  modeOptions,
  pedestrianTrend,
  sensorCategories,
  sensorHealth,
  severityOptions,
  timeRangeOptions,
  zones,
} from "../../data/mockDashboardData";
import { Card, CardContent, CardHeader, Pill, SectionTitle, SelectLike } from "./ui";
import WeatherWidget from "./WeatherWidget";
import { MAIN_COLORS, PAGE_CONTAINER, PAGE_HEADER, FILTER_CONTROLS, VIEW_STATUS } from "./theme";
import mt_up from "./images/mt_up.jpg";
import mt_down from "./images/mt_down.jpg";

/* ============================================================================
   TYPE DEFINITIONS
   ============================================================================ */

type SummaryResponse = {
  rows_loaded: string | number;
  total_pedestrians: string | number;
  total_bicycles: string | number;
  total_vehicles: string | number;
  last_update: string;
};

type TrafficRow = {
  segment_id: number;
  recorded_at: string;
  pedestrian_count: number | string;
  bicycle_count: number | string;
  vehicle_count: number | string;
  uptime: number | string;
  source_name: string;
};

type BusiestHourResponse = {
  segment_id: number;
  recorded_at: string;
  pedestrian_count: number | string;
  bicycle_count: number | string;
  vehicle_count: number | string;
  total_flow: number | string;
} | null;

type KnmiWarningFeature = {
  properties?: {
    code?: string;
    headline?: string;
    description?: string;
    areaDesc?: string;
    event?: string;
    severity?: string;
    urgency?: string;
    effective?: string;
    expires?: string;
  };
};

type KnmiWarningsResponse = {
  source: string;
  dataset: string;
  filename: string;
  created: string;
  lastModified: string;
  data?: {
    features?: KnmiWarningFeature[];
  };
};

/* ============================================================================
   CONSTANTS
   ============================================================================ */

const SEGMENT_ID = 9000006266;
const API_BASE_URL = "";

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

export function OperationsDashboard() {
  /* ---------- STATE ---------- */
  const [zone, setZone] = useState("All zones");
  const [category, setCategory] = useState("All categories");
  const [severity, setSeverity] = useState("All severities");
  const [range, setRange] = useState("Last 2 hrs");
  const [mode, setMode] = useState("Live");

  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [trafficSeries, setTrafficSeries] = useState<TrafficRow[]>([]);
  const [busiestHour, setBusiestHour] = useState<BusiestHourResponse>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [knmiWarnings, setKnmiWarnings] = useState<KnmiWarningsResponse | null>(null);
  const [knmiLoading, setKnmiLoading] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  /* ---------- EFFECTS ---------- */

  // Load Telraam data on mount
  useEffect(() => {
    async function loadTelraamData() {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, trafficRes, busiestRes] = await Promise.all([
          fetch(`/api/dashboard/summary?segment_id=${SEGMENT_ID}`),
          fetch(`/api/traffic/latest?segment_id=${SEGMENT_ID}`),
          fetch(`/api/dashboard/busiest-hour?segment_id=${SEGMENT_ID}`),
        ]);

        if (!summaryRes.ok || !trafficRes.ok || !busiestRes.ok) {
          throw new Error("Failed to fetch Telraam dashboard data");
        }

        const summaryJson: SummaryResponse = await summaryRes.json();
        const trafficJson: TrafficRow[] = await trafficRes.json();
        const busiestJson: BusiestHourResponse = await busiestRes.json();

        setSummaryData(summaryJson);
        setTrafficSeries(trafficJson);
        setBusiestHour(busiestJson);
      } catch (err) {
        console.error(err);
        setError("Unable to load Telraam data from the local backend.");
      } finally {
        setLoading(false);
      }
    }

    loadTelraamData();
  }, []);

  useEffect(() => {
    async function loadHolidays() {
      try {
        setHolidaysLoading(true);

        const res = await fetch("/api/holidays");

        if (!res.ok) {
          throw new Error("Failed to fetch holidays");
        }

        const json = await res.json();

        console.log("HOLIDAYS:", json);

        setHolidays(json.data); // IMPORTANT
      } catch (err) {
        console.error(err);
      } finally {
        setHolidaysLoading(false);
      }
    }

    loadHolidays();
  }, []);

  // Load KNMI weather warnings periodically
  useEffect(() => {
    let intervalId: number | undefined;

    async function loadKnmiWarnings() {
      try {
        setKnmiLoading(true);

        const res = await fetch(`${API_BASE_URL}/api/knmi/warnings`);

        if (!res.ok) {
          throw new Error("Failed to fetch KNMI warnings");
        }

        const json: KnmiWarningsResponse = await res.json();
        setKnmiWarnings(json);
      } catch (err) {
        console.error(err);
      } finally {
        setKnmiLoading(false);
      }
    }

    loadKnmiWarnings();

    intervalId = window.setInterval(() => {
      loadKnmiWarnings();
    }, 5 * 60 * 1000);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  /* ---------- MEMOS ---------- */

  // Transform KNMI warnings into alert format
  const liveKnmiAlerts = useMemo(() => {
    const features = knmiWarnings?.data?.features ?? [];

    return features.slice(0, 3).map((feature, index) => {
      const props = feature.properties ?? {};
      const rawSeverity = (props.severity || "").toLowerCase();

      let mappedSeverity: "info" | "warning" | "critical" = "info";
      if (rawSeverity.includes("severe") || rawSeverity.includes("extreme")) {
        mappedSeverity = "critical";
      } else if (rawSeverity.includes("moderate")) {
        mappedSeverity = "warning";
      }

      return {
        id: `knmi-${index}`,
        severity: mappedSeverity,
        time: props.effective
          ? new Date(props.effective).toLocaleString()
          : "KNMI update",
        title: props.headline || props.event || "KNMI weather warning",
        detail: props.description || "No extra description available.",
        zone: props.areaDesc || "Netherlands",
        source: "KNMI",
      };
    });
  }, [knmiWarnings]);

  // Filter alerts by zone and severity
  const filteredAlerts = useMemo(() => {
    const combinedAlerts = [...liveKnmiAlerts, ...alertsData];

    return combinedAlerts.filter((item) => {
      const zoneMatch =
        zone === "All zones" ||
        item.zone === zone ||
        item.zone === "Netherlands";
      const severityMatch =
        severity === "All severities" || item.severity === severity;

      return zoneMatch && severityMatch;
    });
  }, [zone, severity, liveKnmiAlerts]);

  // Filter sensor health by zone and category
  const filteredSensorHealth = useMemo(() => {
    return sensorHealth.filter((item) => {
      const zoneMatch = zone === "All zones" || item.zone === zone;
      const categoryMatch = category === "All categories" || item.category === category;
      return zoneMatch && categoryMatch;
    });
  }, [zone, category]);

  // Build KPI cards from live data or defaults
  const liveKpis = useMemo(() => {
    if (!summaryData) return kpis;

    return [
      {
        label: "Pedestrian total",
        value: Number(summaryData.total_pedestrians || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "from loaded Telraam records",
        icon: Users,
        iconSize: "h-8 w-8",
      },
      {
        label: "Bicycle total",
        value: Number(summaryData.total_bicycles || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "from loaded Telraam records",
        icon: Router,
        iconSize: "h-8 w-8",
      },
      {
        label: "Vehicle total",
        value: Number(summaryData.total_vehicles || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "from loaded Telraam records",
        icon: Camera,
        iconSize: "h-8 w-8",
      },
      {
        label: "Rows loaded",
        value: Number(summaryData.rows_loaded || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "database rows for selected segment",
        icon: Activity,
        iconSize: "h-8 w-8",
      },
      {
        label: "Peak interval flow",
        value: busiestHour ? String(busiestHour.total_flow) : "—",
        delta: "",
        trend: "up" as const,
        helper: busiestHour?.recorded_at
          ? new Date(busiestHour.recorded_at).toLocaleString()
          : "latest peak interval",
        icon: Clock3,
        iconSize: "h-8 w-8",
      },
    ];
  }, [summaryData, busiestHour]);

  // Transform traffic data into trend chart format
  const livePedestrianTrend = useMemo(() => {
    if (!trafficSeries.length) return pedestrianTrend;

    return [...trafficSeries].reverse().map((item) => {
      const pedestrians = Number(item.pedestrian_count || 0);
      const bicycles = Number(item.bicycle_count || 0);
      const vehicles = Number(item.vehicle_count || 0);

      return {
        time: new Date(item.recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        flow: pedestrians,
        crowd: pedestrians + bicycles + vehicles,
        sound: Number(item.uptime || 0),
      };
    });
  }, [trafficSeries]);

  // Build access activity chart data
  const liveAccessActivity = useMemo(() => {
    if (!trafficSeries.length) {
      return [
        { time: "09:20", access: 18, vehicles: 4 },
        { time: "09:40", access: 22, vehicles: 7 },
        { time: "10:00", access: 27, vehicles: 6 },
        { time: "10:20", access: 35, vehicles: 9 },
      ];
    }

    return [...trafficSeries].reverse().map((item) => ({
      time: new Date(item.recorded_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      access: Number(item.pedestrian_count || 0) + Number(item.bicycle_count || 0),
      vehicles: Number(item.vehicle_count || 0),
    }));
  }, [trafficSeries]);

  // Calculate modality split percentages
  const liveModalitySplit = useMemo(() => {
    if (!summaryData) {
      return [
        { name: "Pedestrian", value: 61 },
        { name: "Bike", value: 23 },
        { name: "Service Vehicle", value: 9 },
        { name: "Other", value: 7 },
      ];
    }

    const pedestrians = Number(summaryData.total_pedestrians || 0);
    const bicycles = Number(summaryData.total_bicycles || 0);
    const vehicles = Number(summaryData.total_vehicles || 0);
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
  }, [summaryData]);

  // Get latest scanner stats
  const scannerStats = useMemo(() => {
    if (!trafficSeries.length) {
      return { access: 102, vehicles: 26 };
    }

    const latest = trafficSeries[0];
    return {
      access: Number(latest?.pedestrian_count || 0) + Number(latest?.bicycle_count || 0),
      vehicles: Number(latest?.vehicle_count || 0),
    };
  }, [trafficSeries]);

  /* ---------- RENDER ---------- */

  return (
    <div
      className="min-h-screen p-6 text-slate-900 md:p-8"
      style={PAGE_CONTAINER}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ====== HEADER & TITLE ====== */}
        <div
          className="rounded-[30px] px-6 py-10 shadow-lg backdrop-blur md:px-10 md:py-12"
          style={{
            backgroundColor: PAGE_HEADER.backgroundColor,
            backgroundImage: `
              linear-gradient(${MAIN_COLORS.aColor4}, ${MAIN_COLORS.aColor4}),
              url(${mt_up})
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: PAGE_HEADER.border,
          }}
        >
          <div className="max-w-3xl space-y-3">
            <h1
              className="font-semibold tracking-tight"
              style={{
                color: PAGE_HEADER.titleColor,
                fontFamily: '"Vesper Libre", serif',
                fontSize: PAGE_HEADER.titleFontSize,
                lineHeight: PAGE_HEADER.titleLineHeight,
                letterSpacing: PAGE_HEADER.titleLetterSpacing,
              }}
            >
              Tapp Marineterrein Urban Operations Intelligence Dashboard
            </h1>

            <div
              style={{
                width: "60px",
                height: "3px",
                backgroundColor: PAGE_HEADER.titleColor,
                borderRadius: "2px",
              }}
            />

            <p
              className="leading-relaxed"
              style={{
                color: `rgba(255, 255, 255, ${PAGE_HEADER.subtitleOpacity})`,
                fontSize: PAGE_HEADER.subtitleFontSize,
                lineHeight: PAGE_HEADER.subtitleLineHeight,
                letterSpacing: PAGE_HEADER.subtitleLetterSpacing,
                maxWidth: "500px",
              }}
            >
              Unified live view of crowd dynamics, access activity, environmental conditions, and infrastructure health across the public space.
            </p>
          </div>
        </div>

        {/* ====== WEATHER WIDGET ====== */}
        <WeatherWidget />

        {/* ====== FILTER CONTROLS ====== */}
        <div
          className="rounded-[30px] px-6 py-6 text-slate-900 md:px-8"
          style={{
            backgroundColor: FILTER_CONTROLS.backgroundColor,
            backgroundImage: `
              linear-gradient(${MAIN_COLORS.aColor3}, ${MAIN_COLORS.aColor3}),
              url(${mt_down})
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: FILTER_CONTROLS.boxShadow,
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p
                className="text-xs font-medium uppercase tracking-[0.22em]"
                style={{ color: FILTER_CONTROLS.labelColor }}
              >
                Operator controls
              </p>

              <h2
                className="mt-2 text-xl font-semibold tracking-tight"
                style={{ color: FILTER_CONTROLS.titleColor }}
              >
                Look up a specific area, signal, or incident pattern
              </h2>

              <p
                className="mt-2 text-sm leading-6"
                style={{ color: FILTER_CONTROLS.descriptionColor }}
              >
                Use filters to narrow the dashboard to a specific zone, sensor category, alert severity, or time
                window before reviewing the live operational picture below.
              </p>
            </div>

            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={VIEW_STATUS}
            >
              <span style={{ color: VIEW_STATUS.color, fontWeight: 500 }}>Current view:</span> {zone} · {category} · {severity} ·{" "}
              {range}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SelectLike dark label="Time range" value={range} onChange={setRange} options={timeRangeOptions} />
            <SelectLike
              dark
              label="Zone"
              value={zone}
              onChange={setZone}
              options={["All zones", ...zones.map((z) => z.name)]}
            />
            <SelectLike dark label="Sensor category" value={category} onChange={setCategory} options={sensorCategories} />
            <SelectLike dark label="Alert severity" value={severity} onChange={setSeverity} options={severityOptions} />
            <SelectLike dark label="View mode" value={mode} onChange={setMode} options={modeOptions} />
          </div>
        </div>

        {/* ====== ERROR STATE ====== */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* ====== KEY PERFORMANCE INDICATORS ====== */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {liveKpis.map((kpi) => {
            const Icon = kpi.icon;
            const TrendIcon = kpi.trend === "up" ? ArrowUpRight : ArrowDownRight;

            return (
              <Card key={kpi.label} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{kpi.label}</p>
                      <div className="mt-2 flex items-end gap-2">
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {loading ? "…" : kpi.value}
                        </p>
                        {kpi.delta ? (
                          <span
                            className={`mb-1 inline-flex items-center gap-1 text-xs font-medium ${kpi.trend === "up" ? "text-emerald-700" : "text-rose-600"
                              }`}
                          >
                            <TrendIcon className="h-3.5 w-3.5" />
                            {kpi.delta}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{kpi.helper}</p>
                    </div>

                    {typeof Icon === "string" ? (
                      <img
                        src={Icon}
                        alt={`${kpi.label} icon`}
                        className={`${kpi.iconSize ?? "h-8 w-8"} object-contain`}
                      />
                    ) : (
                      <Icon className={kpi.iconSize ?? "h-8 w-8"} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ====== ACTIVITY & ALERTS SECTION ====== */}
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Live activity overview"
                subtitle="Footfall and combined traffic conditions in the current observation window"
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
                    <CartesianGrid strokeDasharray="3 3" stroke={MAIN_COLORS.aColorBlack} />
                    <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
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
                      stroke={MAIN_COLORS.aColorBlack}
                      strokeWidth={2}
                      dot={false}
                      name="Total flow"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {crowdByZone.map((item) => (
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
                    <p className="text-xs text-slate-500">estimated live visitors</p>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Density index</span>
                        <span>{item.density}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${item.density >= 80 ? "bg-rose-500" : item.density >= 70 ? "bg-lime-500" : "bg-emerald-500"
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
              {knmiLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Loading KNMI warnings...
                </div>
              ) : null}
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "9999px",
                            border: `1px solid ${MAIN_COLORS.aColor1}`,
                            paddingLeft: "0.625rem",
                            paddingRight: "0.625rem",
                            paddingTop: "0.25rem",
                            paddingBottom: "0.25rem",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: MAIN_COLORS.aColor1,
                            backgroundColor: MAIN_COLORS.aColor3,
                          }}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs text-slate-500">{alert.time}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                      <p className="text-sm text-slate-600">{alert.detail}</p>
                    </div>

                    <AlertTriangle
                      className={`mt-1 h-4 w-4 ${alert.severity === "critical"
                        ? "text-rose-600"
                        : alert.severity === "warning"
                          ? "text-amber-600"
                          : "text-emerald-600"
                        }`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill>{alert.zone}</Pill>
                    <Pill>{alert.source}</Pill>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Mobility, access, and modality"
                subtitle="Entry activity and transport composition for the selected view"
              />
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveAccessActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={MAIN_COLORS.aColorBlack} />
                      <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="access" radius={[8, 8, 0, 0]} fill={MAIN_COLORS.aColor1} name="Pedestrian + bike" />
                      <Bar dataKey="vehicles" radius={[8, 8, 0, 0]} fill={MAIN_COLORS.aColor2} name="Vehicles" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Modality split</p>
                        <p className="text-xs text-slate-500">Computed from current Telraam totals</p>
                      </div>
                      <Router className="h-4 w-4 text-slate-500" />
                    </div>

                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={liveModalitySplit} innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {liveModalitySplit.map((entry, index) => (
                              <Cell key={entry.name} fill={[MAIN_COLORS.aColor1, MAIN_COLORS.aColor2, MAIN_COLORS.aColor2, MAIN_COLORS.aColor1][index % 4]} />
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
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-slate-600" />
                      <p className="text-sm font-medium text-slate-800">Scanner activity</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-slate-500">Pedestrian + bike</p>
                        <p className="mt-1 text-xl font-semibold text-slate-950">{loading ? "…" : scannerStats.access}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-slate-500">Vehicles</p>
                        <p className="mt-1 text-xl font-semibold text-slate-950">{loading ? "…" : scannerStats.vehicles}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Based on the latest interval recorded for the selected Telraam segment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            {/* ====== WATER & RECREATION STATUS ====== */}
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
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Picnic activity</p>
                      <p className="text-xs text-slate-500">Harbor Edge occupancy cue</p>
                    </div>
                    <Trees className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">31 setups</p>
                  <p className="mt-2 text-sm text-slate-600">Moderate shore-side dwell time; no intervention needed.</p>
                </div>
              </CardContent>
            </Card>

            {/* ====== INFRASTRUCTURE STATUS ====== */}
            <Card>
              <CardHeader>
                <SectionTitle title="Public infrastructure" subtitle="Status of visible operational assets" />
              </CardHeader>
              <CardContent className="space-y-3">
                {infrastructureStatus.map((item) => {
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
          </div>
        </div>

        {/* ====== CORRELATION & HISTORICAL TRENDS ====== */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Environmental + crowd correlation"
                subtitle="Useful for anticipating comfort and escalation risk"
              />
            </CardHeader>
            <CardContent>
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pedestrianTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={MAIN_COLORS.aColorBlack} />
                    <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }}
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
                      stroke={MAIN_COLORS.aColorBlack}
                      strokeWidth={2.2}
                      name="Sound dB"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {anomalyPanel.map((item) => (
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
              <SectionTitle title="Historical trend snapshot" subtitle="Seven-day context for operations planning" />
            </CardHeader>
            <CardContent>
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={MAIN_COLORS.aColorBlack} />
                    <XAxis dataKey="day" tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MAIN_COLORS.aColor1, fontSize: 12 }} axisLine={false} tickLine={false} />
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

        {/* ====== SENSOR HEALTH & OPERATOR NOTES ====== */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Sensor health and system status"
                subtitle="Operational readiness across the sensor network"
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
                      <span>heartbeat &lt; 2 min</span>
                    </div>

                    <div className="justify-self-end">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "9999px",
                          border: `1px solid ${MAIN_COLORS.aColor1}`,
                          paddingLeft: "0.625rem",
                          paddingRight: "0.625rem",
                          paddingTop: "0.25rem",
                          paddingBottom: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: MAIN_COLORS.aColor1,
                          backgroundColor: MAIN_COLORS.aColor3,
                        }}
                      >
                        {item.status === "offline" ? <WifiOff className="mr-1 h-3.5 w-3.5" /> : null}
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle title="Operator notes" subtitle="Action framing for the next 30–60 minutes" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">Recommended attention areas</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Central Plaza: verify whether sound spike is event-related or emerging congestion.</li>
                  <li>Swim Dock: prep soft crowd management if occupancy passes 80.</li>
                  <li>Makers Court: restore CCTV shutter feed to recover full monitoring coverage.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}