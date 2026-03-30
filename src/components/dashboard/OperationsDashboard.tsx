// React
import { useEffect, useMemo, useState } from "react";
// Static assets
import bikeColor from "./images/People - Bike - Color.png";
import carColor from "./images/Car - Clolor@2x.png";
import footColor from "./images/People - Crossing - Color@2x.png";
import mt_down from "./images/mt_down.jpg";
import mt_up from "./images/mt_up.jpg";

// Icons and charts
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

// Local data and UI
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
import { MAIN_COLORS, getBadgeStyle } from "./theme";
import { MapView } from "./MapView";

// Backend response shapes
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

const SEGMENT_ID = 9000006266;
const API_BASE_URL = "";

// Consistent alert icon coloring from the global theme tokens.
const alertIconColor = (severity: "info" | "warning" | "critical") => {
  if (severity === "critical") return MAIN_COLORS.aColorBlack;
  if (severity === "warning") return MAIN_COLORS.aColor1;
  return MAIN_COLORS.aColor2;
};

export function OperationsDashboard() {
  // Filter and view controls
  const [zone, setZone] = useState("All locations");
  const [category, setCategory] = useState("All categories");
  const [severity, setSeverity] = useState("All severities");
  const [range, setRange] = useState("Last 2 hrs");
  const [mode, setMode] = useState("Live");

  // Live dashboard data
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [trafficSeries, setTrafficSeries] = useState<TrafficRow[]>([]);
  const [busiestHour, setBusiestHour] = useState<BusiestHourResponse>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supplementary feeds
  const [knmiWarnings, setKnmiWarnings] = useState<KnmiWarningsResponse | null>(null);
  const [knmiLoading, setKnmiLoading] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  // Initial load: Telraam summary, trend series, and busiest hour.
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


  // Initial load: Dutch public holidays (used by operations planning card).
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


  // Live feed: KNMI weather warnings, refreshed every 5 minutes.
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

  // Normalize KNMI warning features into local alert item shape.
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

  // Merge static alerts with live KNMI alerts, then apply active filters.
  const filteredAlerts = useMemo(() => {
    const combinedAlerts = [...liveKnmiAlerts, ...alertsData];

    return combinedAlerts.filter((item) => {
      const zoneMatch =
        zone === "All locations" ||
        item.zone === zone ||
        item.zone === "Netherlands";
      const severityMatch =
        severity === "All severities" || item.severity === severity;

      return zoneMatch && severityMatch;
    });
  }, [zone, severity, liveKnmiAlerts]);

  // Apply active zone/category filters to system health panel.
  const filteredSensorHealth = useMemo(() => {
    return sensorHealth.filter((item) => {
      const zoneMatch = zone === "All locations" || item.zone === zone;
      const categoryMatch = category === "All categories" || item.category === category;
      return zoneMatch && categoryMatch;
    });
  }, [zone, category]);

  // Swap mock KPI cards with live backend totals when available.
  const liveKpis = useMemo(() => {
    if (!summaryData) return kpis;

    return [
      {
        label: "People on foot",
        value: Number(summaryData.total_pedestrians || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "counted in the current view",
        icon: footColor,
        iconSize: "h-12 w-12",
      },
      {
        label: "Cyclists",
        value: Number(summaryData.total_bicycles || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "counted in the current view",
        icon: bikeColor,
        iconSize: "h-12 w-12",
      },
      {
        label: "Vehicles",
        value: Number(summaryData.total_vehicles || 0).toLocaleString(),
        delta: "",
        trend: "up" as const,
        helper: "counted in the current view",
        icon: carColor,
        iconSize: "h-12 w-12",
      },
    ];
  }, [summaryData]);

  // Build line/area chart series from latest traffic samples.
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

  // Build mobility access bars from latest traffic samples.
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

  // Convert raw totals into percentage split for modality pie chart.
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

  // Compact snapshot used in the "Latest count snapshot" mini cards.
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
            backgroundPosition: "0 0, center bottom",
            boxShadow: `0 12px 35px ${MAIN_COLORS.aColorBlack}22`,
          }}
        >
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-[2rem]" style={{ color: MAIN_COLORS.aColor2, fontFamily: '"Vesper Libre", serif', }}>
              Tapp Marineterrein Urban Operations Intelligence Dashboard
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6" style={{ color: MAIN_COLORS.aColorWhite }}>
              Unified live view of crowd dynamics, access activity, environmental conditions, and infrastructure
              health across the public space.
            </p>
          </div>
        </div>

        <WeatherWidget />

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
            <SelectLike dark label="Sensor category" value={category} onChange={setCategory} options={sensorCategories} />
            <SelectLike dark label="Alert severity" value={severity} onChange={setSeverity} options={severityOptions} />
            <SelectLike dark label="View mode" value={mode} onChange={setMode} options={modeOptions} />
          </div>
        </div>

        {/* Interactive map */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: MAIN_COLORS.aColor1 }}>Live map</p>
              <p className="mt-1 text-sm" style={{ color: MAIN_COLORS.aColorGray }}>Sensor and count locations for the selected view</p>
            </div>
          </CardHeader>
          <CardContent>
            <MapView
              center={[52.3771, 4.9168]}   
              zoom={15}
              height="420px"   
              markers={[
                { id: "main-entrance", lat: 52.37256228505068, lng: 4.917815245538353, label: "Main entrance", description: "Primary pedestrian access point" },
                { id: "codam", lat: 52.374469, lng: 4.915641, label: "CODAM (039)", description: "Sound level elevated" },
                { id: "tapp-e", lat: 52.37247851399919, lng: 4.917577304563304 , label: "TAPP 027 E", description: "Watch: rising visitor count" },
                { id: "ahk", lat: 52.373927, lng: 4.915432, label: "AHK MakerSpace (027 N)", description: "Camera feed offline" },
              ]}
            />
          </CardContent>
        </Card>

        {error ? (
          <div
            className="rounded-2xl px-5 py-4 text-sm"
            style={{
              border: `1px solid ${MAIN_COLORS.aColorBlack}44`,
              backgroundColor: `${MAIN_COLORS.aColor3}`,
              color: MAIN_COLORS.aColorBlack,
            }}
          >
            {error}
          </div>
        ) : null}

        {/* KPI strip */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveKpis.map((kpi) => {
            const imageIcon = typeof kpi.icon === "string" ? kpi.icon : null;
            const LucideIcon = typeof kpi.icon === "string" ? null : kpi.icon;
            const iconClassName = kpi.iconSize ?? "h-5 w-5";
            const TrendIcon = kpi.trend === "up" ? ArrowUpRight : ArrowDownRight;

            return (
              <Card key={kpi.label} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                        {kpi.label}
                      </p>
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
                      <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {kpi.helper}
                      </p>
                    </div>

                    {imageIcon ? (
                      <img src={imageIcon} alt={`${kpi.label} icon`} className={`${iconClassName} object-contain`} />
                    ) : LucideIcon ? (
                      <LucideIcon className={iconClassName} style={{ color: MAIN_COLORS.aColor1 }} />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Primary situational view: crowd activity + active alerts */}
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Live activity overview"
                subtitle="People movement and overall activity in the current view"
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
                    <XAxis
                      dataKey="time"
                      tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
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

              <div className="grid gap-3 md:grid-cols-4">
                {crowdByZone.map((item) => (
                  <div
                    key={item.zone}
                    className="rounded-2xl p-4"
                    style={{ border: `1px solid ${MAIN_COLORS.aColorGray}44`, backgroundColor: `${MAIN_COLORS.aColor3}` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {item.zone}
                      </p>
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

                    <p className="mt-3 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                      {item.visitors}
                    </p>
                    <p className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                      estimated visitors right now
                    </p>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        <span>Density index</span>
                        <span>{item.density}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: `${MAIN_COLORS.aColorGray}33` }}>
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
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl p-4"
                  style={{ border: `1px solid ${MAIN_COLORS.aColorGray}44`, backgroundColor: `${MAIN_COLORS.aColor3}` }}
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
                        <span className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                          {alert.time}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {alert.title}
                      </h4>
                      <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                        {alert.detail}
                      </p>
                    </div>

                    <AlertTriangle className="mt-1 h-4 w-4" style={{ color: alertIconColor(alert.severity) }} />
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

        {/* Operations analysis row */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <SectionTitle
                title="Mobility, Access, and Modality"
                subtitle="Arrivals and transport mix for the selected view"
              />
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[1.4fr_0.85fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">Access trend by time</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MAIN_COLORS.aColor1 }} />
                        Pedestrian + bike
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MAIN_COLORS.aColor2 }} />
                        Vehicles
                      </span>
                    </div>
                  </div>
                  <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveAccessActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
                      <Tooltip />
                      <Bar dataKey="access" radius={[8, 8, 0, 0]} fill={MAIN_COLORS.aColor1} name="Pedestrian + bike" barSize={24} />
                      <Bar dataKey="vehicles" radius={[8, 8, 0, 0]} fill={MAIN_COLORS.aColor2} name="Vehicles" barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                </div>

                <div className="grid gap-5 md:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Modality split</p>
                        <p className="text-xs text-slate-500">Based on the current counts</p>
                      </div>
                      <Router className="h-4 w-4 text-slate-500" />
                    </div>

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
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-800">Latest count snapshot</p>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-medium leading-tight text-slate-500">
                          <span className="block">Pedestrian</span>
                          <span className="block">+ bike</span>
                        </p>
                        <p className="mt-1 text-2xl font-semibold leading-none text-slate-950">{scannerStats.access}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-medium leading-tight text-slate-500">Vehicles</p>
                        <p className="mt-1 text-2xl font-semibold leading-none text-slate-950">{scannerStats.vehicles}</p>
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

          <Card>
            <CardHeader>
              <SectionTitle
                title="Environmental + Crowd Correlation"
                subtitle="How activity and sound levels move together"
              />
            </CardHeader>
            <CardContent>
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pedestrianTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
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
        </div>

        {/* Domain status row */}
        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <SectionTitle title="Public Infrastructure" subtitle="Status of visible operational assets" />
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

          <Card>
            <CardHeader>
              <SectionTitle title="Water & Recreation Status" subtitle="Swim area conditions and shoreline activity" />
            </CardHeader>
            <CardContent className="grid gap-4">
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
                <p className="mt-2 text-sm text-slate-600">74 swimmers active, soft capacity 80, hard capacity 95.</p>
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
                    <p className="text-xs text-slate-500">Public space activity cue</p>
                  </div>
                  <Trees className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950">31 setups</p>
                <p className="mt-2 text-sm text-slate-600">Moderate shore-side dwell time; no intervention needed.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle title="Public Holidays (NL)" subtitle="Days that may impact crowd levels" />
            </CardHeader>
            <CardContent>
              {holidaysLoading ? (
                <p className="text-sm text-slate-500">Loading holidays...</p>
              ) : (
                holidays.slice(0, 6).map((holiday) => (
                  <div key={holiday.date} className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-800">{holiday.localName}</p>
                    <p className="text-xs text-slate-500">{new Date(holiday.date).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action and planning row */}
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
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
                      <span>updated in the last few minutes</span>
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
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <SectionTitle title="Historical Trend Snapshot" subtitle="Seven-day context for operations planning" />
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}55`} />
                      <XAxis dataKey="day" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="visitors" fill={MAIN_COLORS.aColor1} radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
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

            <Card>
              <CardHeader>
                <SectionTitle title="Operator Notes" subtitle="Action framing for the next 30–60 minutes" />
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
    </div>
  );
}
