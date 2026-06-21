import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CloudSun, Download, Droplets, Info, Thermometer, Volume2, Waves, type LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOpsLiveData } from "../../hooks/useOpsLiveData";
import { useTelraamTraffic } from "../../hooks/useTelraamTraffic";
import { DASHBOARD_HEADER_THEME, MAIN_COLORS, MT_COLORS } from "../../styles/theme";
import mt_down from "../../assets/mt_down.jpg";
import UpcomingAgendaCard from "./UpcomingAgendaCard";
import { getSensorCatalogItems } from "./live-map/sensorCatalog";
import {
  fetchHusenseDashboardSummary,
  fetchOpsAgenda,
  fetchSoundHourly,
  type AgendaItem,
  type HusenseDashboardSummary,
  type OpsLiveOverviewResponse,
  type SoundHourlyPoint,
  type TelraamTrafficPoint,
  type TrafficRangeRequest,
} from "../../lib/opsLiveClient";
import {
  getEnvironmentThreshold,
  type EnvironmentThresholdResult,
  type EnvironmentThresholdStatus,
} from "../../utils/environmentThresholds";
import {
  deriveAnomalyChart,
  deriveLiveAlerts,
  deriveLiveKpis,
  deriveLiveMetaSummary,
  deriveSoundSummary,
  deriveTelraamTrendChart,
  deriveWaterSummary,
  deriveWeatherWidgetModel,
} from "./opsLiveViewModel";
import { Card, CardContent, CardHeader, Pill, SectionTitle, SelectLike } from "./ui";
import type { AlertItem } from "./types";

const locationOptions = ["All locations", "Portiersloge", "TAPP", "CODAM", "AHK MakerSpace", "Swim area"];
const sensorCategories = ["busyness", "water temp", "vehicle classification", "air quality", "sound"];
const severityOptions = ["All severities", "info", "warning", "critical"];
const timeRangeOptions = ["Average of past weeks", "Last week", "This week", "Today", "Past 3 hours"];
const modeOptions = ["Live", "Incident mode"];
const ANCHOR_SCROLL_STYLE = { scrollMarginTop: "2rem" } as const;

type DashboardNavItem = {
  id: string;
  label: string;
};

type DashboardNavSection = {
  id: string;
  label: string;
  description: string;
  items: DashboardNavItem[];
};

const DASHBOARD_NAV: DashboardNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Immediate live metrics and operator controls.",
    items: [
      { id: "overview-site-summary", label: "Site summary" },
      { id: "overview-controls", label: "Controls" },
    ],
  },
  {
    id: "crowd",
    label: "Crowd",
    description: "Visitor and vehicle signals grouped together to read current pressure within the selected range.",
    items: [
      { id: "crowd-occupancy", label: "Visitor summary" },
      { id: "crowd-mobility-split", label: "Vehicle summary" },
      { id: "crowd-history", label: "Movement summary" },
      { id: "crowd-baseline", label: "Busiest visitors" },
      { id: "crowd-daily-visitors", label: "Daily visitors" },
    ],
  },
  {
    id: "environment",
    label: "Environment",
    description: "Water, air, sound, and upcoming air-quality context.",
    items: [
      { id: "environment-summary", label: "Environment summary" },
      { id: "environment-temperature", label: "Temperature trend" },
    ],
  },
  {
    id: "events",
    label: "Events",
    description: "Planning context from the agenda and public calendar.",
    items: [
      { id: "events-agenda", label: "Agenda" },
      { id: "events-holidays", label: "Holidays" },
    ],
  },
  {
    id: "map",
    label: "Map",
    description: "Sensor locations and status across Marineterrein.",
    items: [
      { id: "map-operational", label: "Operational map" },
    ],
  },
];

const HIDDEN_OCCUPANCY_ZONE_IDS = new Set(["5db05d88-7833-440a-9c3e-24c93fb08406"]);

const DAILY_MOVEMENT_LINES = [
  { key: "today", label: "Selected range", color: MT_COLORS.coral },
] as const;

const NAV_ACCENTS: Record<string, string> = {
  overview: MT_COLORS.darkTeal,
  map: MT_COLORS.teal,
  crowd: MT_COLORS.cyan,
  environment: MT_COLORS.green,
  events: MT_COLORS.burgundy,
};

type EnvironmentTrendPoint = {
  day: string;
  waterTemperature: number | null;
  airTemperature: number | null;
  visitors: number;
};

type PresenceZone = {
  id?: string | number;
  name?: string;
  zone?: string;
  label?: string;
  capacity?: number | string | null;
  presenceCount?: number | string | null;
  currentPresence?: number | string | null;
  currentOccupancy?: number | string | null;
  occupancyCount?: number | string | null;
  peopleCount?: number | string | null;
  count?: number | string | null;
};

type OccupancyCardModel = {
  id: string;
  zone: string;
  visitors: number;
  dayIns: number;
  dayOuts: number;
  dayNetVisitors: number;
  capacity: number | null;
  density: number;
};

type DailyMovementPoint = {
  hour: string;
  today: number | null;
  yesterday: number | null;
};

type VehicleCategoryKey = "car" | "bus" | "light_truck" | "truck" | "motorcycle" | "tractor" | "trailer";

type VehicleCategoryCard = {
  key: string;
  label: string;
  count: number | null;
};

type VehicleChartPoint = {
  time: string;
  total: number;
  cars: number;
  buses: number;
  lightTrucks: number;
  trucks: number;
  motorcycles: number;
  tractors: number;
  trailers: number;
  vehicles: number;
};

type SafeDensitySummary = {
  capacity: number;
  density: number;
  sharePct: number;
};

type DashboardTimeRange = {
  label: string;
  start: Date;
  end: Date;
  lookbackHours: number;
};

const VEHICLE_CATEGORIES: Array<{
  key: VehicleCategoryKey;
  dataKey: keyof Omit<VehicleChartPoint, "time">;
  label: string;
  color: string;
  iconFile: string;
}> = [
  { key: "car", dataKey: "cars", label: "Cars", color: MT_COLORS.cyan, iconFile: "Car - Clolor@2x.png" },
  { key: "bus", dataKey: "buses", label: "Buses", color: MT_COLORS.blue, iconFile: "Bus - Color.png" },
  { key: "light_truck", dataKey: "lightTrucks", label: "Light trucks", color: MT_COLORS.teal, iconFile: "img_LightTruck.png" },
  { key: "truck", dataKey: "trucks", label: "Trucks", color: MT_COLORS.coral, iconFile: "img_Truck.png" },
  { key: "motorcycle", dataKey: "motorcycles", label: "Motorcycles", color: MT_COLORS.yellow, iconFile: "img_Motorcycle.png" },
  { key: "tractor", dataKey: "tractors", label: "Tractors", color: MT_COLORS.green, iconFile: "img_Tractor.png" },
  { key: "trailer", dataKey: "trailers", label: "Trailers", color: MT_COLORS.burgundy, iconFile: "img_Trailer.png" },
];

const assetModules = import.meta.glob("../../assets/*.{png,jpg,jpeg,svg,webp,gif,avif}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const assetUrlByFileName = Object.fromEntries(
  Object.entries(assetModules)
    .map(([path, assetUrl]) => {
      const fileName = path.split("/").pop();
      return fileName ? [fileName, assetUrl] : null;
    })
    .filter((entry): entry is [string, string] => Boolean(entry)),
);

const VISITOR_DENSITY_CONFIG = {
  areaSquareMeters: null as number | null,
  safeDensityPeoplePerSquareMeter: null as number | null,
};

function resolveActiveSection(activeId: string) {
  return DASHBOARD_NAV.find((section) => section.id === activeId || section.items.some((item) => item.id === activeId));
}

function CategoryHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-1">
      <div className="mb-3 h-1 w-12 rounded-full" style={{ backgroundColor: MT_COLORS.cyan }} />
      <h2
        className="text-[2rem] font-semibold tracking-normal"
        style={{ color: MAIN_COLORS.aColorBlack, fontFamily: '"Vesper Libre", "Overpass", sans-serif' }}
      >
        {title}
      </h2>
      <p className="mt-1.5 w-full max-w-none text-[0.94rem] leading-6 xl:whitespace-nowrap" style={{ color: "#617389" }}>
        {description}
      </p>
    </div>
  );
}

function SubsectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#5a748c" }}>
        {title}
      </p>
      <p className="mt-1 text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
        {description}
      </p>
    </div>
  );
}

function DashboardNavigation({ activeId }: { activeId: string }) {
  const activeSection = resolveActiveSection(activeId) || DASHBOARD_NAV[0];
  const desktopRailSlotRef = useRef<HTMLDivElement | null>(null);
  const [desktopRailMetrics, setDesktopRailMetrics] = useState({ left: 0, width: 220, startY: 0 });
  const [desktopRailPinned, setDesktopRailPinned] = useState(false);

  useEffect(() => {
    const measureDesktopRail = () => {
      if (window.innerWidth < 1280 || !desktopRailSlotRef.current) {
        setDesktopRailPinned(false);
        return;
      }

      const rect = desktopRailSlotRef.current.getBoundingClientRect();
      const startY = rect.top + window.scrollY;
      const nextMetrics = {
        left: rect.left,
        width: rect.width,
        startY,
      };

      setDesktopRailMetrics((current) =>
        current.left === nextMetrics.left &&
        current.width === nextMetrics.width &&
        current.startY === nextMetrics.startY
          ? current
          : nextMetrics,
      );
      setDesktopRailPinned(true);
    };

    const syncDesktopRail = () => {
      if (window.innerWidth < 1280) {
        setDesktopRailPinned(false);
        return;
      }

      measureDesktopRail();
    };

    syncDesktopRail();
    window.addEventListener("resize", syncDesktopRail);
    window.addEventListener("scroll", syncDesktopRail, { passive: true });

    return () => {
      window.removeEventListener("resize", syncDesktopRail);
      window.removeEventListener("scroll", syncDesktopRail);
    };
  }, []);

  return (
    <>
      <div className="sticky top-4 z-20 xl:hidden">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {DASHBOARD_NAV.map((section) => {
                  const isActive = section.id === activeSection.id;

                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-full px-3 py-2 text-sm font-medium transition"
                      style={{
                        border: `1px solid ${isActive ? `${NAV_ACCENTS[section.id]}66` : MT_COLORS.border}`,
                        backgroundColor: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.78)",
                        color: isActive ? MT_COLORS.darkTeal : MAIN_COLORS.aColorGray,
                        boxShadow: isActive ? `inset 0 -3px 0 ${NAV_ACCENTS[section.id]}` : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {section.label}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {activeSection.items.map((item) => {
                const isActive = item.id === activeId;

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-2xl px-3 py-2 text-sm transition"
                    style={{
                      border: `1px solid ${isActive ? "rgba(120, 169, 198, 0.72)" : "rgba(148, 163, 184, 0.2)"}`,
                      backgroundColor: isActive ? "rgba(120, 169, 198, 0.12)" : "rgba(255, 255, 255, 0.7)",
                      color: isActive ? MAIN_COLORS.aColorBlack : MAIN_COLORS.aColorGray,
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="hidden xl:block xl:self-start">
        <div ref={desktopRailSlotRef} className="flex min-h-[calc(100vh-2rem)] w-[220px] items-center">
          <div
            className={desktopRailPinned ? "fixed z-20" : "relative"}
            style={
              desktopRailPinned
                ? {
                    left: `${desktopRailMetrics.left}px`,
                    top: "50vh",
                    transform: "translateY(-50%)",
                    width: `${desktopRailMetrics.width}px`,
                  }
                : undefined
            }
          >
            <Card
              className="rounded-[22px]"
              style={{
                border: `1px solid ${MT_COLORS.border}`,
                background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,249,251,0.92) 100%)",
                boxShadow: "0 8px 24px rgba(26, 75, 88, 0.06)",
              }}
            >
              <CardContent className="p-2.5">
                <nav className="space-y-2">
                  {DASHBOARD_NAV.map((section) => {
                    const isSectionActive = section.id === activeSection.id;

                    return (
                      <div key={section.id} className="space-y-1.5">
                        <a
                          href={`#${section.id}`}
                          className="block rounded-lg px-2 py-1 text-[13px] font-semibold whitespace-nowrap transition"
                          style={{
                            borderLeft: `3px solid ${isSectionActive ? NAV_ACCENTS[section.id] : "transparent"}`,
                            backgroundColor: isSectionActive ? "#ffffff" : "transparent",
                            color: isSectionActive ? MAIN_COLORS.aColorBlack : "#3f5870",
                          }}
                        >
                          <span
                            className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                            style={{ backgroundColor: NAV_ACCENTS[section.id] }}
                          />
                          {section.label}
                        </a>

                        <div className="space-y-0.5 pl-4">
                          {section.items.map((item) => {
                            const isActive = item.id === activeId;

                            return (
                              <a
                                key={item.id}
                                href={`#${item.id}`}
                                className="block rounded-md px-1.5 py-0.5 text-[12px] leading-4 whitespace-nowrap transition"
                                style={{
                                  backgroundColor: isActive ? "rgba(31, 95, 134, 0.11)" : "transparent",
                                  color: isActive ? MT_COLORS.darkTeal : "#6a7b8f",
                                  fontWeight: isActive ? 600 : 500,
                                }}
                              >
                                {item.label}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>
      </aside>
    </>
  );
}

function SignalCard({
  title,
  value,
  helper,
  detail,
  stats,
  tone,
  className,
}: {
  title: string;
  value: string;
  helper: string;
  detail: string[];
  stats?: { label: string; value: string }[];
  tone: "slate" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  return (
    <Card
      className={className}
      style={{
        boxShadow: tone === "amber" ? "0 8px 24px rgba(13, 146, 122, 0.08)" : undefined,
        borderColor: tone === "rose" ? `${MT_COLORS.coral}66` : tone === "amber" ? `${MT_COLORS.teal}55` : MT_COLORS.border,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle title={title} subtitle={helper} />
          <Pill tone={tone}>{title === "Swim-area decision" && tone !== "emerald" ? "Incomplete data" : tone === "slate" ? "Awaiting feed" : tone}</Pill>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
          {value}
        </p>
        {stats?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border px-4 py-3"
                style={{
                  borderColor: `${MAIN_COLORS.aColor1}26`,
                  backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                  {stat.label}
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
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

function average(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => value !== null);
  if (!numericValues.length) return null;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function minMax(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => value !== null);
  if (!numericValues.length) return { min: null, max: null };
  return { min: Math.min(...numericValues), max: Math.max(...numericValues) };
}

function formatTemperature(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(1)} C`;
}

function formatLocalDateTime(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function environmentStatusTone(status: EnvironmentThresholdStatus): "slate" | "emerald" | "amber" | "rose" {
  if (status === "green") return "emerald";
  if (status === "yellow" || status === "orange") return "amber";
  if (status === "red" || status === "darkRed") return "rose";
  return "slate";
}

function environmentStatusColor(status: EnvironmentThresholdStatus) {
  if (status === "green") return MT_COLORS.teal;
  if (status === "yellow") return MT_COLORS.yellow;
  if (status === "orange") return MT_COLORS.coral;
  if (status === "red" || status === "darkRed") return MT_COLORS.burgundy;
  return MT_COLORS.paleBlue;
}

function alertSeverityFromEnvironmentStatus(status: EnvironmentThresholdStatus): AlertItem["severity"] | null {
  if (status === "red" || status === "darkRed") return "critical";
  if (status === "orange" || status === "yellow") return "warning";
  return null;
}

function EnvironmentMetricCard({
  title,
  value,
  helper,
  icon: Icon,
  stats,
  threshold,
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  stats: { label: string; value: string }[];
  threshold?: EnvironmentThresholdResult;
}) {
  const thresholdTone = threshold ? environmentStatusTone(threshold.status) : null;
  const thresholdColor = threshold ? environmentStatusColor(threshold.status) : MT_COLORS.teal;

  return (
    <Card
      className="h-full min-w-0 overflow-hidden"
      style={{
        borderColor: threshold ? `${thresholdColor}66` : MT_COLORS.border,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold tracking-normal" style={{ color: MAIN_COLORS.aColorBlack }}>
              {title}
            </p>
            <p className="mt-1 break-words text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
              {helper}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className="h-5 w-5 shrink-0" style={{ color: thresholdColor }} />
            {threshold && threshold.status !== "unavailable" ? <Pill tone={thresholdTone || "slate"}>{threshold.label}</Pill> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        {value ? (
          <p
            className={`${value === "Incomplete data" ? "text-[2.1rem]" : "text-[1.8rem]"} break-words font-semibold leading-tight tracking-tight`}
            style={{ color: MAIN_COLORS.aColorBlack }}
          >
            {value}
          </p>
        ) : null}
        {threshold ? (
          <div
            className="rounded-xl border px-3 py-2 text-sm break-words"
            style={{
              borderColor: `${thresholdColor}44`,
              backgroundColor: threshold.status === "unavailable" ? "#edf4f8" : `${thresholdColor}14`,
              color: MAIN_COLORS.aColorGray,
            }}
          >
            {threshold.message}
          </div>
        ) : null}
        {stats.length ? (
          <div className="space-y-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
              >
                <span className="min-w-0 break-words" style={{ color: MAIN_COLORS.aColorGray }}>{stat.label}</span>
                <span className="shrink-0 text-right font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>{stat.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EnvironmentTrendCard({ data }: { data: EnvironmentTrendPoint[] }) {
  const hasTemperatureData = data.some((point) => point.waterTemperature !== null || point.airTemperature !== null);

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="7-day temperature and visitors"
          subtitle="Water temperature and air temperature shown together, with visitors as a secondary line for context."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {hasTemperatureData ? (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                <XAxis dataKey="day" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="temp"
                  label={{ value: "Temperature (C)", angle: -90, position: "insideLeft", fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                  tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="visitors"
                  orientation="right"
                  label={{ value: "Visitors", angle: 90, position: "insideRight", fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                  tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Boardwalk visitors & swimmers" || name === "visitors") {
                      return [`${formatMetricNumber(Number(value))}`, "Boardwalk visitors & swimmers"];
                    }
                    if (name === "Water temperature" || name === "waterTemperature") return [`${Number(value).toFixed(1)} C`, "Water temperature"];
                    return [`${Number(value).toFixed(1)} C`, "Air temperature"];
                  }}
                />
                <Legend />
                <Line yAxisId="temp" type="monotone" dataKey="waterTemperature" name="Water temperature" stroke={MT_COLORS.teal} strokeWidth={3} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="temp" type="monotone" dataKey="airTemperature" name="Air temperature" stroke={MT_COLORS.coral} strokeWidth={3} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="visitors" type="monotone" dataKey="visitors" name="Boardwalk visitors & swimmers" stroke={MT_COLORS.blue} strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartPlaceholder
            title="Temperature trend not available yet"
            detail="Water and air temperature lines will appear once at least one connected feed returns temperature data."
          />
        )}
      </CardContent>
    </Card>
  );
}

function HusenseMovementSummaryCard({
  summary,
  error,
}: {
  summary: HusenseDashboardSummary | null;
  error?: string | null;
}) {
  const inColor = "#15803d";
  const outColor = "#dc2626";
  const totals = summary?.totals || {};
  const movementRows = [
    { label: "People", value: Number(totals.person || 0), color: MT_COLORS.cyan },
    { label: "Runners", value: Number(totals.runner || 0), color: MT_COLORS.blue },
    { label: "Bikes", value: Number(totals.bike || 0), color: MT_COLORS.teal },
  ];
  const totalMovement = movementRows.reduce((sum, row) => sum + row.value, 0);
  const dominant = movementRows
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)[0];
  const personArrivals = (gate: NonNullable<HusenseDashboardSummary["gates"]>[number]) =>
    Number(gate.modeCounts?.person?.arrivals ?? 0);
  const personDepartures = (gate: NonNullable<HusenseDashboardSummary["gates"]>[number]) =>
    Number(gate.modeCounts?.person?.departures ?? 0);
  const labelGate = (gateName: string, index: number) => {
    const normalized = gateName.toLowerCase();
    if (normalized.includes("hoofd") || normalized.includes("main")) return "Main Gate";
    if (normalized.includes("oude") || normalized.includes("old")) return "Old Port";
    if (normalized.includes("brug") || normalized.includes("bridge")) return "Bridge";
    return ["Main Gate", "Old Port", "Bridge"][index] || gateName || `Gate ${index + 1}`;
  };
  const gateDirectionRows = [...(summary?.gates || []).reduce((rows, gate, index) => {
    const label = labelGate(gate.gateName, index);
    const current = rows.get(label) || { label, arrivals: 0, departures: 0 };
    current.arrivals += personArrivals(gate);
    current.departures += personDepartures(gate);
    rows.set(label, current);
    return rows;
  }, new Map<string, { label: string; arrivals: number; departures: number }>()).values()];
  const totalEntering = gateDirectionRows.reduce((sum, row) => sum + row.arrivals, 0);
  const totalLeaving = gateDirectionRows.reduce((sum, row) => sum + row.departures, 0);
  const hasDirectionCounts = gateDirectionRows.length > 0;
  const totalPeopleInMt = hasDirectionCounts
    ? totalEntering - totalLeaving
    : Number(totals.person || summary?.currentPresence || 0);
  const directionTotals: Array<{
    label: string;
    value: number;
    note: string;
    color: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Ins",
      value: totalEntering,
      note: "HuSense person IN counts across the configured gates",
      color: inColor,
      icon: ArrowDownLeft,
    },
    {
      label: "Outs",
      value: totalLeaving,
      note: "HuSense person OUT counts across the configured gates",
      color: outColor,
      icon: ArrowUpRight,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Movement summary"
          subtitle="HuSense classified gates across the Marineterrein captors, using the live gate counts instead of Telraam."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                  Total people in MT
                </p>
                <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {formatMetricNumber(totalPeopleInMt)}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                  {hasDirectionCounts ? "HuSense net people today, IN minus OUT" : `HuSense person class, latest update ${formatLocalDateTime(summary.observedAt)}`}
                </p>
              </div>

              {directionTotals.map((item) => {
                const Icon = item.icon;

                return (
                <div
                  key={item.label}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                      {item.label}
                    </p>
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${item.color}18`, color: item.color }}
                      title={item.label === "Ins" ? "Incoming visitors" : "Outgoing visitors"}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                  </div>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>
                    {formatMetricNumber(item.value)}
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.note}
                  </p>
                </div>
              );
              })}
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                    Current HuSense movement mix
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                    {dominant ? `${dominant.label} are the main movement type in the selected range.` : "No classified movement stands out in the selected range."}
                  </p>
                </div>
                <Pill tone={totalMovement > 0 ? "emerald" : "slate"}>Selected range</Pill>
              </div>

              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200/70">
                {movementRows.map((row) => (
                  <div
                    key={row.label}
                    className="h-full transition-all duration-500"
                    style={{
                      width: totalMovement > 0 ? `${(row.value / totalMovement) * 100}%` : "0%",
                      backgroundColor: row.color,
                    }}
                  />
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {movementRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border p-3.5"
                    style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, backgroundColor: "rgba(255, 255, 255, 0.76)" }}
                  >
                    <p className="text-sm" style={{ color: row.color }}>
                      {row.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                      {formatMetricNumber(row.value)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                      {totalMovement > 0 ? `${formatMetricNumber((row.value / totalMovement) * 100, 1)}% of selected movement` : "No current share"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                  Gate direction counts
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${inColor}14`, color: inColor }}>
                    <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
                    IN
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${outColor}14`, color: outColor }}>
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.6} />
                    OUT
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {gateDirectionRows.length ? (
                  gateDirectionRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, backgroundColor: "rgba(255, 255, 255, 0.74)" }}
                    >
                      <span className="min-w-0 truncate" style={{ color: MAIN_COLORS.aColorGray }}>
                        {row.label}
                      </span>
                      <span className="inline-flex min-w-[4.5rem] items-center justify-end gap-1.5 font-semibold" style={{ color: inColor }}>
                        <ArrowDownLeft className="h-4 w-4" strokeWidth={2.6} />
                        {formatMetricNumber(row.arrivals)}
                      </span>
                      <span className="inline-flex min-w-[4.5rem] items-center justify-end gap-1.5 font-semibold" style={{ color: outColor }}>
                        <ArrowUpRight className="h-4 w-4" strokeWidth={2.6} />
                        {formatMetricNumber(row.departures)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, color: MAIN_COLORS.aColorGray }}>
                    No HuSense gate direction counts are available in the latest summary.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <ChartPlaceholder
            title="HuSense movement summary not available yet"
            detail={error || "The HuSense dashboard summary endpoint has not returned live classified gate counts yet."}
          />
        )}
      </CardContent>
    </Card>
  );
}

type SoundHourlyChartPoint = {
  time: string;
  average: number | null;
  min: number | null;
  max: number | null;
};

function buildSoundHourlyChart(points: SoundHourlyPoint[]): SoundHourlyChartPoint[] {
  return points.map((point) => {
    const bucket = new Date(point.bucket);

    return {
      time: Number.isNaN(bucket.getTime())
        ? point.bucket
        : bucket.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
      average: point.averageSoundLevelDb,
      min: point.minSoundLevelDb,
      max: point.maxSoundLevelDb,
    };
  });
}

function SoundHourlyCard({
  points,
  error,
  rangeLabel,
}: {
  points: SoundHourlyPoint[];
  error: string | null;
  rangeLabel: string;
}) {
  const chartData = useMemo(() => buildSoundHourlyChart(points), [points]);
  const hasSoundData = chartData.some((point) => point.average !== null);

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Hourly sound"
          subtitle={`Average decibels by hour for ${rangeLabel.toLowerCase()}.`}
        />
      </CardHeader>
      <CardContent>
        {hasSoundData ? (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  label={{ value: "dB", angle: -90, position: "insideLeft", fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                  tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    value === null ? "No reading" : `${Number(value).toFixed(1)} dB`,
                    name === "average" ? "Average" : name === "min" ? "Minimum" : "Maximum",
                  ]}
                />
                <Legend />
                <Line type="monotone" dataKey="average" name="Average" stroke={MT_COLORS.teal} strokeWidth={3} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="min" name="Minimum" stroke={MT_COLORS.cyan} strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                <Line type="monotone" dataKey="max" name="Maximum" stroke={MT_COLORS.coral} strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartPlaceholder
            title="Hourly sound data not available yet"
            detail={error || "The sound MQTT store has not returned hourly decibel observations for the selected range."}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ExternalSensorMapCard() {
  const sensors = getSensorCatalogItems();
  const shortCategory = (category: string) => {
    if (category.toLowerCase().includes("crowd")) return "Crowd";
    if (category.toLowerCase().includes("environment")) return "Environment";
    if (category.toLowerCase().includes("water")) return "Water";
    if (category.toLowerCase().includes("mobility")) return "Mobility";
    return category;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <SectionTitle
          title="Sensor map"
          subtitle="Marineterrein sensor map"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: `${MAIN_COLORS.aColor1}26` }}>
          <iframe
            title="Marineterrein sensor map"
            src="https://tomvanarman.github.io/marineterrein-sensors/"
            className="h-[640px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="mt-4 space-y-3">
          {(["installed", "planned"] as const).map((state) => {
            const group = sensors.filter((s) => s.installState === state);
            if (!group.length) return null;
            return (
              <div key={state}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MAIN_COLORS.aColorGray }}>
                  {state === "installed" ? "Active sensors" : "Planned"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.map((sensor) => (
                    <div
                      key={sensor.id}
                      className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                      style={{
                        borderColor: state === "installed" ? `${MT_COLORS.teal}44` : `${MAIN_COLORS.aColor1}1a`,
                        backgroundColor: state === "installed" ? `${MT_COLORS.teal}0d` : "rgba(255,255,255,0.6)",
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: state === "installed" ? MT_COLORS.teal : MT_COLORS.muted }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
                          {sensor.name}
                        </p>
                        <p className="text-[11px]" style={{ color: MAIN_COLORS.aColorGray }}>
                          {shortCategory(sensor.category)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ExportPdfTool({ onExport }: { onExport: () => void }) {
  return (
    <div className="flex justify-center pb-8 print:hidden">
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
        style={{
          borderColor: `${MT_COLORS.teal}55`,
          backgroundColor: "#ffffff",
          color: MT_COLORS.darkTeal,
        }}
      >
        <Download className="h-4 w-4" />
        Export as PDF
      </button>
    </div>
  );
}

function VehicleSummaryCard({
  chartData,
  categoryCards,
  error,
  rangeLabel,
}: {
  chartData: VehicleChartPoint[];
  categoryCards: VehicleCategoryCard[];
  error?: string | null;
  rangeLabel: string;
}) {
  const hasVehicleData = chartData.some(
    (point) => VEHICLE_CATEGORIES.some((category) => Number(point[category.dataKey] || 0) > 0),
  );
  const hasCategoryBreakdown = categoryCards.some((card) => card.count !== null);
  const visibleCategoryCards = hasCategoryBreakdown
    ? categoryCards
    : [
        {
          key: "vehicles",
          label: "Vehicles",
          count: chartData.reduce((sum, point) => sum + point.vehicles, 0),
        },
      ];

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Vehicle summary"
          subtitle={`Telraam vehicle category shares for ${rangeLabel.toLowerCase()}.`}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {hasVehicleData ? (
          <>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                  <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${formatMetricNumber(Number(value), 1)}%`, String(name)]}
                    labelFormatter={(label, payload) => {
                      const total = Number(payload?.[0]?.payload?.total || 0);
                      return `${label} / ${formatMetricNumber(total)} vehicles`;
                    }}
                  />
                  {hasCategoryBreakdown ? (
                    VEHICLE_CATEGORIES.map((category) => (
                      <Bar
                        key={category.key}
                        dataKey={category.dataKey}
                        name={category.label}
                        stackId="vehicles"
                        fill={category.color}
                      />
                    ))
                  ) : (
                    <Bar dataKey="vehicles" name="Vehicles" fill={MT_COLORS.teal} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {VEHICLE_CATEGORIES.map((category) => (
                <div key={category.key} className="flex min-w-0 items-center gap-2 text-sm">
                  <VehicleTypeIcon iconFile={category.iconFile} color={category.color} />
                  <span className="min-w-0 truncate" style={{ color: category.color }}>
                    {category.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {visibleCategoryCards.map((card) => (
                (() => {
                  const category = VEHICLE_CATEGORIES.find((item) => item.key === card.key);

                  return (
                <div
                  key={card.key}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {category ? <VehicleTypeIcon iconFile={category.iconFile} color={category.color} /> : null}
                    <p className="min-w-0 truncate text-sm" style={{ color: category?.color || MAIN_COLORS.aColorGray }}>
                      {card.label}
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                    {card.count === null ? "Unavailable" : `${formatMetricNumber(card.count, 1)}%`}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                    Share of selected-range Telraam vehicles
                  </p>
                </div>
                  );
                })()
              ))}
            </div>
          </>
        ) : (
          <ChartPlaceholder
            title="Vehicle summary not available yet"
            detail={error || "Telraam vehicle summary data has not returned category counts for the selected range yet."}
          />
        )}
      </CardContent>
    </Card>
  );
}

function VisitorBusynessRows({ cards }: { cards: OccupancyCardModel[] }) {
  const labels = ["Boardwalk", "Picnic", "Terrace"];
  const rows = labels.map((label, index) => ({ label, value: cards[index]?.visitors ?? null }));
  const maxValue = Math.max(1, ...rows.map((row) => row.value ?? 0));

  if (!cards.length) {
    return (
      <div className="mt-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: `${MAIN_COLORS.aColor1}26`, color: MAIN_COLORS.aColorGray }}>
        Busyness values unavailable
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span style={{ color: MAIN_COLORS.aColorGray }}>{row.label}</span>
            <span className="font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
              {row.value === null ? "Unavailable" : formatMetricNumber(row.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full"
              style={{
                width: row.value === null ? "0%" : `${Math.min(100, (row.value / maxValue) * 100)}%`,
                backgroundColor: MT_COLORS.teal,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BusiestVisitorCountSummary({ summary }: { summary: HusenseDashboardSummary | null }) {
  const observedTimes = (summary?.gates || [])
    .map((gate) => gate.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestObservedAt = observedTimes.length ? observedTimes[observedTimes.length - 1] : summary?.observedAt || null;

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Busiest visitor count summary"
          subtitle="Historical busiest-period tracking needs stored HuSense snapshots, not only the latest live payload."
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartPlaceholder
          title="Busiest visitor history not available yet"
          detail="Right now the dashboard only receives the latest HuSense classified gate data. To calculate busiest days or hours, we need either a HuSense historical endpoint or a local job that stores snapshots over time."
        />
        {latestObservedAt ? (
          <div
            className="rounded-2xl border px-4 py-3 text-sm"
            style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8`, color: MAIN_COLORS.aColorGray }}
          >
            Latest available HuSense visitor payload: {formatLocalDateTime(latestObservedAt)}.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VehicleTypeIcon({ iconFile, color }: { iconFile: string; color: string }) {
  const iconUrl = assetUrlByFileName[iconFile];

  if (!iconUrl) {
    return <span className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
  }

  return (
    <span
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${iconUrl})`,
        maskImage: `url(${iconUrl})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
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

function InfoHint({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border outline-none transition focus-visible:ring-2"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          borderColor: `${MAIN_COLORS.aColorGray}33`,
          backgroundColor: "rgba(255, 255, 255, 0.82)",
          color: MAIN_COLORS.aColorGray,
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border px-3 py-2 text-xs leading-5 shadow-lg"
          style={{
            borderColor: `${MAIN_COLORS.aColor1}33`,
            backgroundColor: MAIN_COLORS.aColorWhite,
            color: MAIN_COLORS.aColorBlack,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

function formatMetricNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function formatSignedPercent(value: number) {
  const formatted = formatMetricNumber(Math.abs(value), 1);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

function getOccupancyStatusByRank(index: number, total: number) {
  if (total <= 1 || index === 0) {
    return { label: "High", tone: "rose" as const, color: MT_COLORS.coral };
  }

  if (index === total - 1) {
    return { label: "Low", tone: "sky" as const, color: MT_COLORS.cyan };
  }

  return { label: "Medium", tone: "amber" as const, color: MT_COLORS.yellow };
}

function describeAnomaly(
  deviationPct: number,
  threshold: number,
): {
  label: string;
  tone: "emerald" | "amber" | "rose" | "sky";
  detail: string;
} {
  const magnitude = Math.abs(deviationPct);

  if (magnitude < threshold) {
    return {
      label: "Normal",
      tone: "emerald",
      detail: `${formatSignedPercent(deviationPct)} from the expected baseline, still within the normal range.`,
    };
  }

  if (deviationPct >= threshold * 1.5) {
    return {
      label: "Unusually high",
      tone: "rose",
      detail: `${formatSignedPercent(deviationPct)} above the expected baseline.`,
    };
  }

  if (deviationPct >= threshold) {
    return {
      label: "Above normal",
      tone: "amber",
      detail: `${formatSignedPercent(deviationPct)} above the expected baseline.`,
    };
  }

  if (deviationPct <= -threshold * 1.5) {
    return {
      label: "Unusually low",
      tone: "sky",
      detail: `${formatSignedPercent(deviationPct)} below the expected baseline.`,
    };
  }

  return {
    label: "Below normal",
    tone: "sky",
    detail: `${formatSignedPercent(deviationPct)} below the expected baseline.`,
  };
}

function numberFromRecord(record?: OpsLiveOverviewResponse["records"][number]) {
  if (!record) return null;
  const numeric = typeof record.value === "number" ? record.value : Number(record.value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getRecord(overview: OpsLiveOverviewResponse, source: string, metric: string) {
  return overview.records.find((record) => record.source === source && record.metric === metric);
}

function getMetricRecord(overview: OpsLiveOverviewResponse, metrics: string[]) {
  const normalizedMetrics = new Set(metrics.map((metric) => metric.toLowerCase()));
  return overview.records.find((record) => normalizedMetrics.has(record.metric.toLowerCase()));
}

function parseOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readPresenceCount(zone: PresenceZone) {
  return (
    parseOptionalNumber(zone.presenceCount) ??
    parseOptionalNumber(zone.currentPresence) ??
    parseOptionalNumber(zone.currentOccupancy) ??
    parseOptionalNumber(zone.occupancyCount) ??
    parseOptionalNumber(zone.peopleCount) ??
    parseOptionalNumber(zone.count) ??
    0
  );
}

function normalizeLookupLabel(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildHusenseDirectionBySpace(summary: HusenseDashboardSummary | null) {
  const bySpaceId = new Map<string, { ins: number; outs: number }>();
  const bySpaceName = new Map<string, { ins: number; outs: number }>();

  for (const gate of summary?.gates || []) {
    const ins = Number(gate.modeCounts?.person?.arrivals ?? 0);
    const outs = Number(gate.modeCounts?.person?.departures ?? 0);
    const spaceId = gate.spaceId ? String(gate.spaceId) : null;
    const spaceName = normalizeLookupLabel(gate.spaceName);

    if (spaceId) {
      const current = bySpaceId.get(spaceId) || { ins: 0, outs: 0 };
      current.ins += ins;
      current.outs += outs;
      bySpaceId.set(spaceId, current);
    }

    if (spaceName) {
      const current = bySpaceName.get(spaceName) || { ins: 0, outs: 0 };
      current.ins += ins;
      current.outs += outs;
      bySpaceName.set(spaceName, current);
    }
  }

  return { bySpaceId, bySpaceName };
}

function buildOccupancyCards(zones: PresenceZone[], summary: HusenseDashboardSummary | null): OccupancyCardModel[] {
  const directions = buildHusenseDirectionBySpace(summary);
  const mapped = zones.map((zone, index) => {
    const capacity = parseOptionalNumber(zone.capacity);
    const id = String(zone.id ?? zone.name ?? zone.zone ?? `zone-${index + 1}`);
    const zoneLabel = zone.name || zone.zone || zone.label || `Zone ${index + 1}`;
    const direction =
      directions.bySpaceId.get(id) ||
      directions.bySpaceName.get(normalizeLookupLabel(zoneLabel)) ||
      { ins: 0, outs: 0 };
    const dayNetVisitors = direction.ins - direction.outs;

    return {
      id,
      zone: zoneLabel,
      visitors: dayNetVisitors || readPresenceCount(zone),
      dayIns: direction.ins,
      dayOuts: direction.outs,
      dayNetVisitors,
      capacity,
      density: 0,
    };
  });
  const totalNetVisitors = mapped.reduce((sum, zone) => sum + Math.max(0, zone.dayNetVisitors), 0);

  return mapped
    .map((zone) => ({
      ...zone,
      density: totalNetVisitors > 0 ? Math.round((Math.max(0, zone.dayNetVisitors) / totalNetVisitors) * 1000) / 10 : 0,
    }))
    .sort((left, right) => right.density - left.density || right.visitors - left.visitors || left.zone.localeCompare(right.zone));
}

function buildOccupancyInsight(zones: OccupancyCardModel[], error: string | null) {
  if (!zones.length) {
    return error
      ? "Visitor summary is unavailable because the Husense backend feed could not be loaded."
      : "Visitor summary will appear when the Husense backend returns live zone readings.";
  }

  const busiest = [...zones].sort((left, right) => right.density - left.density || right.visitors - left.visitors)[0];
  const comparison = `${formatMetricNumber(busiest.density, 1)}% of detected people`;

  return `${busiest.zone} is currently the busiest live Husense zone at ${comparison}.`;
}

function totalTelraamMovement(point: TelraamTrafficPoint) {
  return (
    Number(point.pedestrian_count || 0) +
    Number(point.bicycle_count || 0) +
    Number(point.vehicle_count || 0) +
    Number(point.night_count || 0)
  );
}

function startOfLocalWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function resolveDashboardTimeRange(range: string): DashboardTimeRange {
  const end = new Date();
  const start = new Date(end);

  if (range === "Average of past weeks") {
    start.setDate(end.getDate() - 28);
  } else if (range === "Last week") {
    const thisWeekStart = startOfLocalWeek(end);
    start.setTime(thisWeekStart.getTime());
    start.setDate(start.getDate() - 7);
    end.setTime(thisWeekStart.getTime());
  } else if (range === "This week") {
    start.setTime(startOfLocalWeek(end).getTime());
  } else if (range === "Today") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setHours(start.getHours() - 3);
  }

  const lookbackHours = Math.max(0.5, (end.getTime() - start.getTime()) / (60 * 60 * 1000));
  return {
    label: range,
    start,
    end,
    lookbackHours,
  };
}

function buildTrafficRangeRequest(range: DashboardTimeRange): TrafficRangeRequest {
  if (range.label === "Past 3 hours") {
    return {
      lookbackHours: range.lookbackHours,
    };
  }

  return {
    lookbackHours: range.lookbackHours,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  };
}

function formatRangeWindow(range: DashboardTimeRange) {
  const sameDay = formatDateKey(range.start) === formatDateKey(range.end);
  const options: Intl.DateTimeFormatOptions = sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "2-digit" };

  return `${range.start.toLocaleString([], options)} to ${range.end.toLocaleString([], options)}`;
}

function vehicleCategoryValue(point: TelraamTrafficPoint, key: VehicleCategoryKey) {
  const record = point as TelraamTrafficPoint & Record<string, unknown>;
  const value = record[`${key}_count`];
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildVehicleChart(points: TelraamTrafficPoint[]): VehicleChartPoint[] {
  const byDay = new Map<
    string,
    {
      label: string;
      cars: number;
      buses: number;
      lightTrucks: number;
      trucks: number;
      motorcycles: number;
      tractors: number;
      trailers: number;
      vehicles: number;
    }
  >();

  for (const point of points) {
    const recordedAt = new Date(point.recorded_at);
    if (Number.isNaN(recordedAt.getTime())) continue;

    const key = formatDateKey(recordedAt);
    const current = byDay.get(key) || {
      label: recordedAt.toLocaleDateString([], { month: "short", day: "numeric" }),
      cars: 0,
      buses: 0,
      lightTrucks: 0,
      trucks: 0,
      motorcycles: 0,
      tractors: 0,
      trailers: 0,
      vehicles: 0,
    };

    current.cars += vehicleCategoryValue(point, "car") ?? 0;
    current.buses += vehicleCategoryValue(point, "bus") ?? 0;
    current.lightTrucks += vehicleCategoryValue(point, "light_truck") ?? 0;
    current.trucks += vehicleCategoryValue(point, "truck") ?? 0;
    current.motorcycles += vehicleCategoryValue(point, "motorcycle") ?? 0;
    current.tractors += vehicleCategoryValue(point, "tractor") ?? 0;
    current.trailers += vehicleCategoryValue(point, "trailer") ?? 0;
    current.vehicles += Number(point.vehicle_count || 0);
    byDay.set(key, current);
  }

  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, day]) => {
      const categoryTotal =
        day.cars +
        day.buses +
        day.lightTrucks +
        day.trucks +
        day.motorcycles +
        day.tractors +
        day.trailers;
      const total = categoryTotal || day.vehicles;
      const share = (value: number) => (total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0);

      return {
        time: day.label,
        total,
        cars: share(day.cars),
        buses: share(day.buses),
        lightTrucks: share(day.lightTrucks),
        trucks: share(day.trucks),
        motorcycles: share(day.motorcycles),
        tractors: share(day.tractors),
        trailers: share(day.trailers),
        vehicles: total,
      };
    });
}

function buildVehicleCategoryCards(points: TelraamTrafficPoint[]): VehicleCategoryCard[] {
  const totals = VEHICLE_CATEGORIES.reduce<Record<VehicleCategoryKey, number>>(
    (summary, category) => {
      summary[category.key] = 0;
      return summary;
    },
    {} as Record<VehicleCategoryKey, number>,
  );
  let total = 0;

  for (const point of points) {
    for (const category of VEHICLE_CATEGORIES) {
      const value = vehicleCategoryValue(point, category.key) ?? 0;
      totals[category.key] += value;
      total += value;
    }
  }

  return VEHICLE_CATEGORIES.map((category) => {
    const share = total > 0 ? (totals[category.key] / total) * 100 : null;

    return {
      key: category.key,
      label: category.label,
      count: share === null ? null : Number(share.toFixed(1)),
    };
  });
}

function buildSafeDensitySummary(totalVisitors: number): SafeDensitySummary | null {
  const { areaSquareMeters, safeDensityPeoplePerSquareMeter } = VISITOR_DENSITY_CONFIG;
  if (!areaSquareMeters || !safeDensityPeoplePerSquareMeter) return null;

  const capacity = areaSquareMeters * safeDensityPeoplePerSquareMeter;
  return {
    capacity,
    density: totalVisitors / areaSquareMeters,
    sharePct: capacity > 0 ? (totalVisitors / capacity) * 100 : 0,
  };
}

function buildDailyMovementTrend(points: TelraamTrafficPoint[], range: DashboardTimeRange): DailyMovementPoint[] {
  const selectedByBucket = new Map<string, number>();
  const rangeMs = range.end.getTime() - range.start.getTime();
  const useDailyBuckets = rangeMs > 48 * 60 * 60 * 1000;

  for (const point of points) {
    const recordedAt = new Date(point.recorded_at);
    if (Number.isNaN(recordedAt.getTime())) continue;

    const label = useDailyBuckets
      ? recordedAt.toLocaleDateString([], { month: "short", day: "numeric" })
      : recordedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    selectedByBucket.set(label, (selectedByBucket.get(label) || 0) + totalTelraamMovement(point));
  }

  return [...selectedByBucket.entries()].map(([hour, value]) => ({
    hour,
    today: value,
    yesterday: null,
  }));
}

function buildEnvironmentTrend(
  overview: OpsLiveOverviewResponse,
  dailyMovementTrend: DailyMovementPoint[],
): EnvironmentTrendPoint[] {
  const waterRecord = getRecord(overview, "water", "water_temperature_c");
  const airRecord = getRecord(overview, "weather", "temperature_c");
  const waterCurrent = numberFromRecord(waterRecord);
  const airCurrent = numberFromRecord(airRecord);
  const waterHistory = (waterRecord?.raw &&
    typeof waterRecord.raw === "object" &&
    "history" in waterRecord.raw &&
    waterRecord.raw.history &&
    typeof waterRecord.raw.history === "object"
      ? waterRecord.raw.history
      : null) as { trailingWeekAvg?: number | null; yesterdayAvg?: number | null } | null;
  const waterDailyHistory = (waterRecord?.raw &&
    typeof waterRecord.raw === "object" &&
    "dailyHistory" in waterRecord.raw &&
    Array.isArray(waterRecord.raw.dailyHistory)
      ? waterRecord.raw.dailyHistory
      : []) as { date: string; avg?: number | null; min?: number | null; max?: number | null }[];
  const weeklyRange = (airRecord?.raw &&
    typeof airRecord.raw === "object" &&
    "weeklyRange" in airRecord.raw &&
    airRecord.raw.weeklyRange &&
    typeof airRecord.raw.weeklyRange === "object"
      ? airRecord.raw.weeklyRange
      : null) as { min?: number | null; max?: number | null; days?: { date: string; avg?: number | null; min?: number | null; max?: number | null }[] } | null;
  const latestVisitors = dailyMovementTrend.length
    ? dailyMovementTrend.reduce((sum, point) => sum + (point.today ?? 0), 0)
    : 0;
  const trend: EnvironmentTrendPoint[] = [];

  if ((Array.isArray(weeklyRange?.days) && weeklyRange.days.length) || waterDailyHistory.length) {
    const byDate = new Map<string, EnvironmentTrendPoint>();

    for (const day of weeklyRange?.days || []) {
      byDate.set(day.date, {
        day: new Date(`${day.date}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
        waterTemperature: null,
        airTemperature:
          typeof day.avg === "number"
            ? day.avg
            : typeof day.min === "number" && typeof day.max === "number"
              ? (day.min + day.max) / 2
              : null,
        visitors: 0,
      });
    }

    for (const day of waterDailyHistory) {
      const existing = byDate.get(day.date) || {
        day: new Date(`${day.date}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
        waterTemperature: null,
        airTemperature: null,
        visitors: 0,
      };

      existing.waterTemperature =
        typeof day.avg === "number"
          ? day.avg
          : typeof day.min === "number" && typeof day.max === "number"
            ? (day.min + day.max) / 2
            : null;
      byDate.set(day.date, existing);
    }

    trend.push(...[...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, point]) => point));
  } else {
    if (typeof waterHistory?.trailingWeekAvg === "number" || typeof weeklyRange?.min === "number") {
      trend.push({
        day: "7d low",
        waterTemperature: waterHistory?.trailingWeekAvg ?? null,
        airTemperature: weeklyRange?.min ?? null,
        visitors: 0,
      });
    }

    if (typeof waterHistory?.yesterdayAvg === "number" || typeof weeklyRange?.max === "number") {
      trend.push({
        day: "7d high",
        waterTemperature: waterHistory?.yesterdayAvg ?? null,
        airTemperature: weeklyRange?.max ?? null,
        visitors: 0,
      });
    }
  }

  if (waterCurrent !== null || airCurrent !== null || latestVisitors > 0) {
    trend.push({
      day: "Now",
      waterTemperature: waterCurrent,
      airTemperature: airCurrent,
      visitors: latestVisitors,
    });
  }

  return trend;
}

function getWaterHistoryStats(overview: OpsLiveOverviewResponse) {
  const waterRecord = getRecord(overview, "water", "water_temperature_c");
  return (waterRecord?.raw &&
    typeof waterRecord.raw === "object" &&
    "history" in waterRecord.raw &&
    waterRecord.raw.history &&
    typeof waterRecord.raw.history === "object"
      ? waterRecord.raw.history
      : null) as
    | {
        trailingWeekAvg?: number | null;
        trailingWeekMin?: number | null;
        trailingWeekMax?: number | null;
      }
    | null;
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
  const [category, setCategory] = useState(sensorCategories[0]);
  const [severity, setSeverity] = useState("All severities");
  const [range, setRange] = useState("Past 3 hours");
  const [mode, setMode] = useState("Live");
  const [flowThreshold, setFlowThreshold] = useState(150);
  const [anomalyThreshold, setAnomalyThreshold] = useState(20);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [activeNavId, setActiveNavId] = useState(DASHBOARD_NAV[0].id);
  const [occupancyData, setOccupancyData] = useState<PresenceZone[]>([]);
  const [husenseError, setHusenseError] = useState<string | null>(null);
  const [husenseSummary, setHusenseSummary] = useState<HusenseDashboardSummary | null>(null);
  const [husenseSummaryError, setHusenseSummaryError] = useState<string | null>(null);
  const [soundHourly, setSoundHourly] = useState<SoundHourlyPoint[]>([]);
  const [soundHourlyError, setSoundHourlyError] = useState<string | null>(null);
  const selectedTimeRange = useMemo(() => resolveDashboardTimeRange(range), [range]);
  const trafficRangeRequest = useMemo(() => buildTrafficRangeRequest(selectedTimeRange), [selectedTimeRange]);

  useEffect(() => {
    let cancelled = false;

    const fetchOccupancy = async () => {
      try {
        const response = await fetch("/api/husense/presence");
        if (!response.ok) throw new Error("Husense Network Error");
        const data = await response.json();

        // Handle the live endpoint defensively because the upstream payload shape can vary.
        const zones = Array.isArray(data) ? data : (data?.value || data?.zones || data?.data || [data]);

        if (!cancelled) {
          setHusenseError(null);
          setOccupancyData(zones);
        }
      } catch (err: any) {
        console.error("Failed to fetch Husense:", err);
        if (!cancelled) {
          setHusenseError(err.message);
          setOccupancyData([]);
        }
      }
    };

    fetchOccupancy();
    const intervalId = setInterval(fetchOccupancy, 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [range]);

  useEffect(() => {
    let cancelled = false;

    const loadHusenseSummary = async () => {
      try {
        const summary = await fetchHusenseDashboardSummary();
        if (!cancelled) {
          setHusenseSummary(summary);
          setHusenseSummaryError(null);
        }
      } catch (error) {
        console.error("Failed to fetch HuSense summary:", error);
        if (!cancelled) {
          setHusenseSummary(null);
          setHusenseSummaryError(error instanceof Error ? error.message : "Unable to load HuSense movement summary.");
        }
      }
    };

    loadHusenseSummary();
    const intervalId = setInterval(loadHusenseSummary, 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [range]);

  const { overview, health, loading: opsLoading, error: opsError } = useOpsLiveData();
  const { points: telraamHistory, error: telraamHistoryError } = useTelraamTraffic(trafficRangeRequest);

  useEffect(() => {
    let cancelled = false;

    async function loadSoundHourly() {
      try {
        const rows = await fetchSoundHourly(selectedTimeRange.lookbackHours);
        if (!cancelled) {
          setSoundHourly(rows);
          setSoundHourlyError(null);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSoundHourly([]);
          setSoundHourlyError("Unable to load hourly sound data.");
        }
      }
    }

    loadSoundHourly();
    const intervalId = window.setInterval(loadSoundHourly, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedTimeRange.lookbackHours]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadAgenda() {
      try {
        setAgendaLoading(true);
        const agenda = await fetchOpsAgenda(4);

        if (!cancelled) {
          setAgendaItems(Array.isArray(agenda.items) ? agenda.items : []);
          setAgendaError(agenda.error);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setAgendaItems([]);
          setAgendaError("Unable to load Marineterrein agenda.");
        }
      } finally {
        if (!cancelled) {
          setAgendaLoading(false);
        }
      }
    }

    loadAgenda();

    return () => {
      cancelled = true;
    };
  }, []);

  const husenseCurrentPresence = useMemo(
    () => (occupancyData.length ? occupancyData.reduce((sum, item) => sum + readPresenceCount(item), 0) : null),
    [occupancyData],
  );
  const husenseLoading = !husenseError && !occupancyData.length;
  const husenseGateCount = occupancyData.length;
  const husenseDirectionCounts = useMemo(() => {
    if (!husenseSummary?.gates?.length) return null;

    return husenseSummary.gates.reduce(
      (totals, gate) => ({
        ins: totals.ins + Number(gate.modeCounts?.person?.arrivals ?? 0),
        outs: totals.outs + Number(gate.modeCounts?.person?.departures ?? 0),
      }),
      { ins: 0, outs: 0 },
    );
  }, [husenseSummary]);
  const liveKpis = useMemo(
    () =>
      deriveLiveKpis(
        overview,
        health,
        opsLoading,
        husenseCurrentPresence,
        husenseLoading,
        husenseGateCount,
        husenseDirectionCounts,
      ),
    [overview, health, opsLoading, husenseCurrentPresence, husenseLoading, husenseGateCount, husenseDirectionCounts],
  );
  const liveWeatherWidget = useMemo(() => deriveWeatherWidgetModel(overview, health), [overview, health]);
  const liveMetaSummary = useMemo(() => deriveLiveMetaSummary(overview, health), [overview, health]);
  const waterSummary = useMemo(() => deriveWaterSummary(overview, health), [overview, health]);
  const soundSummary = useMemo(() => deriveSoundSummary(overview, health), [overview, health]);
  const dailyMovementTrend = useMemo(() => buildDailyMovementTrend(telraamHistory, selectedTimeRange), [telraamHistory, selectedTimeRange]);
  const environmentTrend = useMemo(() => buildEnvironmentTrend(overview, dailyMovementTrend), [overview, dailyMovementTrend]);
  const waterHistoryStats = useMemo(() => getWaterHistoryStats(overview), [overview]);
  const waterTemperatureValues = environmentTrend.map((point) => point.waterTemperature);
  const airTemperatureValues = environmentTrend.map((point) => point.airTemperature);
  const waterTemperatureRange = minMax(waterTemperatureValues);
  const airTemperatureRange = minMax(airTemperatureValues);
  const waterTemperatureStats = [
    { label: "7-day average", value: formatTemperature(waterHistoryStats?.trailingWeekAvg ?? average(waterTemperatureValues)) },
    { label: "7-day min", value: formatTemperature(waterHistoryStats?.trailingWeekMin ?? waterTemperatureRange.min) },
    { label: "7-day max", value: formatTemperature(waterHistoryStats?.trailingWeekMax ?? waterTemperatureRange.max) },
  ];
  const airTemperatureStats = [
    { label: "7-day average", value: formatTemperature(average(airTemperatureValues)) },
    { label: "7-day min", value: formatTemperature(airTemperatureRange.min) },
    { label: "7-day max", value: formatTemperature(airTemperatureRange.max) },
  ];
  const soundFeedConnected = soundSummary.value !== "Unavailable";
  const soundLevelRecord = getRecord(overview, "sound", "sound_level_db");
  const soundLevelValue = numberFromRecord(soundLevelRecord);
  const soundThreshold = getEnvironmentThreshold("noise", soundLevelValue);
  const airTemperatureRecord = getRecord(overview, "weather", "temperature_c");
  const airTemperatureValue = numberFromRecord(airTemperatureRecord);
  const airTemperatureThreshold = getEnvironmentThreshold("temperature", airTemperatureValue);
  const humidityRecord = getMetricRecord(overview, ["humidity", "relative_humidity", "humidity_pct"]);
  const humidityValue = numberFromRecord(humidityRecord);
  const humidityThreshold = getEnvironmentThreshold("humidity", humidityValue);
  const no2Record = getMetricRecord(overview, ["no2", "no2_ug_m3", "nitrogen_dioxide"]);
  const no2Value = numberFromRecord(no2Record);
  const no2Threshold = getEnvironmentThreshold("no2", no2Value);
  const aqiRecord = getMetricRecord(overview, ["aqi", "air_quality_index"]);
  const aqiValue = numberFromRecord(aqiRecord);
  const aqiThreshold = getEnvironmentThreshold("aqi", aqiValue);
  const co2Record = getMetricRecord(overview, ["co2", "co2_ppm", "carbon_dioxide"]);
  const co2Value = numberFromRecord(co2Record);
  const hasAirQualityReading = (aqiValue !== null && aqiValue !== 0) || (no2Value !== null && no2Value !== 0);
  const soundStats = soundFeedConnected ? soundSummary.stats || [] : [];
  const humidityStats = humidityValue !== null ? [{ label: "Status", value: humidityThreshold.label }] : [];
  const airQualityStats = [
    aqiValue !== null ? { label: "AQI", value: aqiValue.toFixed(0) } : null,
    no2Value !== null && no2Value !== 0 && aqiValue === null
      ? { label: "NO2", value: `${no2Value.toFixed(0)} ${no2Record?.unit || "ug/m3"}` }
      : null,
    co2Value !== null ? { label: "CO2 context", value: `${co2Value.toFixed(0)} ${co2Record?.unit || "ppm"}` } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const airQualityValue =
    aqiValue !== null
      ? aqiValue.toFixed(0)
      : hasAirQualityReading
        ? `${no2Value!.toFixed(0)} ${no2Record?.unit || "ug/m3"}`
        : "Unavailable";
  const airQualityHelper =
    aqiValue !== null
      ? aqiThreshold.label
      : hasAirQualityReading
      ? "NO2 pollutant-specific threshold"
      : co2Value !== null
        ? getEnvironmentThreshold("co2", co2Value).message
        : "Sensor feed not connected yet";
  const anomalyChart = useMemo(() => deriveAnomalyChart(telraamHistory), [telraamHistory]);
  const telraamTrendChart = useMemo(() => deriveTelraamTrendChart(telraamHistory), [telraamHistory]);
  const vehicleChart = useMemo(() => buildVehicleChart(telraamHistory), [telraamHistory]);
  const vehicleCategoryCards = useMemo(() => buildVehicleCategoryCards(telraamHistory), [telraamHistory]);
  const visibleOccupancyZones = useMemo(
    () => occupancyData.filter((zone) => !HIDDEN_OCCUPANCY_ZONE_IDS.has(String(zone?.id ?? ""))),
    [occupancyData],
  );
  const occupancyCards = useMemo(() => buildOccupancyCards(visibleOccupancyZones, husenseSummary), [visibleOccupancyZones, husenseSummary]);
  const occupancyInsight = useMemo(() => buildOccupancyInsight(occupancyCards, husenseError), [occupancyCards, husenseError]);
  const safeDensitySummary = useMemo(
    () => buildSafeDensitySummary(occupancyCards.reduce((sum, card) => sum + card.visitors, 0)),
    [occupancyCards],
  );
  const latestAnomaly = anomalyChart.length ? anomalyChart[anomalyChart.length - 1] : undefined;
  const latestTelraamPoint = telraamTrendChart.length ? telraamTrendChart[telraamTrendChart.length - 1] : null;
  const thresholdAlerts = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];
    let id = 1000;

    const currentFlow =
      (latestTelraamPoint?.pedestrians ?? 0) +
      (latestTelraamPoint?.bicycles ?? 0) +
      (latestTelraamPoint?.vehicles ?? 0) +
      (latestTelraamPoint?.night ?? 0);
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

    const addEnvironmentAlert = ({
      title,
      zone,
      source,
      time,
      value,
      unit,
      threshold,
    }: {
      title: string;
      zone: string;
      source: string;
      time: string;
      value: number | null;
      unit: string;
      threshold: EnvironmentThresholdResult;
    }) => {
      const severity = alertSeverityFromEnvironmentStatus(threshold.status);
      if (value === null || !severity) return;

      alerts.push({
        id: id++,
        severity,
        title,
        zone,
        source,
        time,
        detail: `${value.toFixed(0)} ${unit}: ${threshold.label}. ${threshold.message}`,
      });
    };

    addEnvironmentAlert({
      title: "Sound level threshold reached",
      zone: "Marineterrein",
      source: "SOUND",
      time: formatLocalDateTime(soundLevelRecord?.observedAt || liveMetaSummary.generatedAt),
      value: soundLevelValue,
      unit: soundLevelRecord?.unit || "dB",
      threshold: soundThreshold,
    });

    addEnvironmentAlert({
      title: "Heat threshold reached",
      zone: "Marineterrein",
      source: "WEATHER",
      time: formatLocalDateTime(airTemperatureRecord?.observedAt || liveMetaSummary.generatedAt),
      value: airTemperatureValue,
      unit: airTemperatureRecord?.unit || "C",
      threshold: airTemperatureThreshold,
    });

    addEnvironmentAlert({
      title: "NO2 threshold reached",
      zone: no2Record?.zone || "Marineterrein",
      source: "AIR",
      time: formatLocalDateTime(no2Record?.observedAt || liveMetaSummary.generatedAt),
      value: no2Value,
      unit: no2Record?.unit || "ug/m3",
      threshold: no2Threshold,
    });

    return alerts;
  }, [
    flowThreshold,
    anomalyThreshold,
    latestTelraamPoint,
    latestAnomaly,
    liveMetaSummary.generatedAt,
    soundLevelRecord,
    soundLevelValue,
    soundThreshold,
    airTemperatureRecord,
    airTemperatureValue,
    airTemperatureThreshold,
    no2Record,
    no2Value,
    no2Threshold,
  ]);
  const filteredAlerts = useMemo(() => {
    const feedAlerts = deriveLiveAlerts(overview, "All locations", "All severities");
    return [...thresholdAlerts, ...feedAlerts]
      .filter((alert) => matchesZoneSelection(zone, alert.zone))
      .filter((alert) => severity === "All severities" || alert.severity === severity);
  }, [overview, thresholdAlerts, zone, severity]);

  useEffect(() => {
    const anchorIds = DASHBOARD_NAV.flatMap((section) => [section.id, ...section.items.map((item) => item.id)]);

    const updateActiveAnchor = () => {
      const threshold = window.innerWidth >= 1280 ? 220 : 180;
      let nextActiveId = anchorIds[0];

      for (const id of anchorIds) {
        const element = document.getElementById(id);
        if (!element) continue;

        if (element.getBoundingClientRect().top - threshold <= 0) {
          nextActiveId = id;
        } else {
          break;
        }
      }

      setActiveNavId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    updateActiveAnchor();
    window.addEventListener("scroll", updateActiveAnchor, { passive: true });
    window.addEventListener("resize", updateActiveAnchor);

    return () => {
      window.removeEventListener("scroll", updateActiveAnchor);
      window.removeEventListener("resize", updateActiveAnchor);
    };
  }, []);

  function handleExportPdf() {
    const previousTitle = document.title;
    document.title = `Marineterrein Operations - ${range}`;
    window.requestAnimationFrame(() => {
      window.print();
      document.title = previousTitle;
    });
  }

  return (
    <div
      className="min-h-screen px-4 py-5 md:px-6 md:py-6"
      style={{
        color: MAIN_COLORS.aColorBlack,
        backgroundImage:
          "radial-gradient(circle at top left, rgba(0, 173, 239, 0.09), transparent 26%), linear-gradient(180deg, #f6f9fb 0%, #eef5f8 100%)",
      }}
    >
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="grid gap-9 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start">
          <div className="hidden xl:block" aria-hidden="true" />
          <div className="min-w-0 xl:mx-auto xl:w-full xl:max-w-[1080px]">
            <div
              className="mt-header-pattern rounded-[16px] px-7 py-5 md:px-10 md:py-5"
              style={{
                border: `1px solid ${MT_COLORS.border}`,
                backgroundColor: "#ffffff",
                boxShadow: "0 8px 24px rgba(26, 75, 88, 0.06)",
              }}
            >
              <div className="grid min-h-[72px] w-full grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
                <div className="min-w-0 max-w-[760px]">
                  <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] md:text-[2.25rem]" style={DASHBOARD_HEADER_THEME.title}>
                    Marineterrein Operations
                  </h1>
                  <p className="mt-2 text-[0.98rem] leading-6 md:text-base" style={DASHBOARD_HEADER_THEME.subtitle}>
                    Live view of movement, water, weather and sensor health.
                  </p>
                </div>

                <div
                  className="w-full justify-self-start rounded-[1.1rem] px-4 py-2.5 text-sm sm:max-w-[440px] lg:w-[400px] lg:justify-self-end"
                  style={{
                    border: `1px solid ${MT_COLORS.border}`,
                    backgroundColor: "#f8fbfd",
                    color: MAIN_COLORS.aColorBlack,
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.82)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Pill tone={liveMetaSummary.statusTone}>{health?.status || "unknown"}</Pill>
                    <span>Current visitors: {liveKpis[0]?.value || "Unavailable"}</span>
                  </div>
                  <p className="mt-2 text-xs" style={{ color: MT_COLORS.muted }}>
                    {liveWeatherWidget.condition} / {liveWeatherWidget.temperature} / {liveWeatherWidget.location}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                    Last refresh {liveMetaSummary.generatedAt} / partial sources {liveMetaSummary.degradedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-9 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start">
          <DashboardNavigation activeId={activeNavId} />

          <div className="min-w-0 space-y-8 xl:mx-auto xl:w-full xl:max-w-[1080px]">
            <section id="overview" className="space-y-4" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Overview"
                description="The most important live operational metrics first, with controls for the current view."
              />

              {opsError ? (
                <div
                  className="rounded-2xl px-5 py-4 text-sm"
                  style={{
                    border: `1px solid ${MAIN_COLORS.aColorBlack}44`,
                    backgroundColor: `${MAIN_COLORS.aColor3}`,
                    color: MAIN_COLORS.aColorBlack,
                  }}
                >
                  <p className="font-semibold">Live data temporarily unavailable</p>
                  <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>{opsError}</p>
                </div>
              ) : null}

              <div id="overview-site-summary" className="space-y-3" style={ANCHOR_SCROLL_STYLE}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {liveKpis.map((kpi) => {
                    const Icon = typeof kpi.icon === "string" ? null : kpi.icon;
                    const definition =
                      kpi.label === "Current visitors"
                        ? "Net HuSense visitor count from incoming minus outgoing person counts."
                        : kpi.label === "Sound level"
                          ? "Current decibel level with the main detected sound categories when available."
                        : kpi.label === "Visitor busyness"
                          ? "HuSense busyness monitor values by location."
                            : kpi.label === "Weather"
                              ? "Current weather feed for Marineterrein."
                              : kpi.label === "Air quality"
                                ? "Environmental context for operators; detailed air readings appear when available."
                            : undefined;

                    return (
                      <Card key={kpi.label} className="h-full overflow-visible">
                        <CardContent className="flex h-full flex-col p-[1.1rem]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                                  {kpi.label}
                                </p>
                                {definition ? <InfoHint label={definition} /> : null}
                              </div>
                            </div>

                            {Icon ? (
                              <div
                                className="shrink-0 rounded-[16px] p-2.5"
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

                          <div className="mt-4 min-w-0">
                            <p
                              className={`${kpi.label === "Current visitors" ? "text-[2.15rem]" : "text-[1.75rem]"} font-semibold leading-none tracking-[-0.04em]`}
                              style={{ color: MAIN_COLORS.aColorBlack }}
                            >
                              {kpi.value}
                            </p>
                            {kpi.directionCounts?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                {kpi.directionCounts.map((direction) => {
                                  const DirectionIcon = direction.label === "IN" ? ArrowDownLeft : ArrowUpRight;

                                  return (
                                    <span
                                      key={direction.label}
                                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                                      style={{ backgroundColor: `${direction.color}14`, color: direction.color }}
                                    >
                                      <DirectionIcon className="h-3.5 w-3.5" strokeWidth={2.6} />
                                      {direction.label} {formatMetricNumber(direction.value)}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : null}
                            <p className="mt-3 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                              {kpi.helper}
                            </p>
                            {kpi.label === "Visitor busyness" ? <VisitorBusynessRows cards={occupancyCards} /> : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div id="overview-controls" style={ANCHOR_SCROLL_STYLE}>
                <div
                  className="rounded-[24px] px-5 py-4 md:px-6 md:py-4"
                  style={{
                    border: "1px solid rgba(196, 210, 223, 0.94)",
                    backgroundImage:
                      `linear-gradient(rgba(249, 251, 253, 0.92), rgba(244, 248, 251, 0.95)), url(${mt_down})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.075)",
                  }}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "#48657f" }}>
                        Operator controls
                      </p>
                      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em]">Filter the current operational view</h2>
                      <p className="mt-1.5 text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
                        This filter sets the absolute time range for all graphs and summaries below it where the connected source exposes range data.
                      </p>
                    </div>

                    <div
                      className="rounded-[1.1rem] px-4 py-2.5 text-sm"
                      style={{
                        border: "1px solid rgba(203, 213, 225, 0.92)",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        color: MAIN_COLORS.aColorBlack,
                      }}
                    >
                      <span className="font-semibold" style={{ color: "#36546f" }}>
                        Current view:
                      </span>{" "}
                      {zone} | {category} | {severity} | {range} | {mode}
                    </div>
                  </div>

                  <p className="mt-3 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                    Active graph window: {formatRangeWindow(selectedTimeRange)}
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <SelectLike dark label="Time range" value={range} onChange={setRange} options={timeRangeOptions} />
                    <SelectLike dark label="Location" value={zone} onChange={setZone} options={locationOptions} />
                    <SelectLike dark label="Sensor category" value={category} onChange={setCategory} options={sensorCategories} />
                    <SelectLike dark label="Alert severity" value={severity} onChange={setSeverity} options={severityOptions} />
                    <SelectLike dark label="View mode" value={mode} onChange={setMode} options={modeOptions} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <ThresholdField label="High crowding threshold" value={flowThreshold} unit="visitors" onChange={setFlowThreshold} />
                    <ThresholdField label="Change threshold" value={anomalyThreshold} unit="%" onChange={setAnomalyThreshold} />
                  </div>
                </div>
              </div>

            </section>

            <section id="crowd" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Crowd"
                description="Visitor and vehicle signals grouped together to read current pressure within the selected range."
              />

              <div id="crowd-occupancy" style={ANCHOR_SCROLL_STYLE}>
                <Card>
                  <CardHeader>
                    <SectionTitle
                      title="Visitor summary"
                      subtitle="Visitor summary based on busyness monitor and HuSense visitor data for the selected time range."
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {husenseError ? (
                      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                        Visitor summary feed degraded: using the latest available zone estimate.
                      </div>
                    ) : null}

                    {occupancyCards.length ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        {occupancyCards.map((occupancyZone, index) => {
                        const density = occupancyZone.density;
                        const status = getOccupancyStatusByRank(index, occupancyCards.length);

                        return (
                          <div
                            key={occupancyZone.id}
                            className="rounded-2xl border p-4"
                            style={{
                              borderColor: `${MAIN_COLORS.aColor1}26`,
                              backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
                                {occupancyZone.zone}
                              </p>
                              <Pill tone={status.tone}>{status.label}</Pill>
                            </div>

                            <p className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>
                              {formatMetricNumber(occupancyZone.dayNetVisitors)}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                              Latest HuSense net visitors, IN minus OUT
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(21, 128, 61, 0.08)", color: "#15803d" }}>
                                <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
                                IN {formatMetricNumber(occupancyZone.dayIns)}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(220, 38, 38, 0.08)", color: "#dc2626" }}>
                                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.6} />
                                OUT {formatMetricNumber(occupancyZone.dayOuts)}
                              </span>
                            </div>

                            <div className="mt-4">
                              <div className="mb-1.5 flex items-end justify-between gap-3">
                                <span className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                                  Share of crowd
                                </span>
                                <span className="text-xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                                  {formatMetricNumber(density, 1)}%
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    width: `${density}%`,
                                    backgroundColor: status.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    ) : (
                      <ChartPlaceholder
                        title="Visitor summary not available yet"
                        detail={husenseError || "The Husense backend has not returned live zone readings yet."}
                      />
                    )}

                    {safeDensitySummary ? (
                      <div
                        className="rounded-2xl border px-4 py-3 text-sm leading-6"
                        style={{
                          borderColor: `${MAIN_COLORS.aColor1}26`,
                          backgroundColor: "rgba(0, 173, 239, 0.08)",
                          color: MAIN_COLORS.aColorBlack,
                        }}
                      >
                        Safe density: {formatMetricNumber(safeDensitySummary.density, 2)} people/m2, {formatMetricNumber(safeDensitySummary.sharePct, 1)}% of configured safe capacity ({formatMetricNumber(safeDensitySummary.capacity)} people).
                      </div>
                    ) : (
                      <ChartPlaceholder
                        title="Safe density calculation unavailable"
                        detail="Area in m2 and the safe density threshold are not configured yet."
                      />
                    )}

                    <div
                      className="rounded-2xl border px-4 py-3 text-sm leading-6"
                      style={{
                        borderColor: `${MAIN_COLORS.aColor1}26`,
                        backgroundColor: "rgba(120, 169, 198, 0.09)",
                        color: MAIN_COLORS.aColorBlack,
                      }}
                    >
                      {occupancyInsight}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div id="crowd-mobility-split" style={ANCHOR_SCROLL_STYLE}>
                <VehicleSummaryCard
                  chartData={vehicleChart}
                  categoryCards={vehicleCategoryCards}
                  error={telraamHistoryError}
                  rangeLabel={range}
                />
              </div>

              <div className="grid gap-5">
                <div id="crowd-history" style={ANCHOR_SCROLL_STYLE}>
                  <HusenseMovementSummaryCard summary={husenseSummary} error={husenseSummaryError} />
                </div>

                <div id="crowd-baseline" style={ANCHOR_SCROLL_STYLE}>
                  <BusiestVisitorCountSummary summary={husenseSummary} />
                </div>

                <div id="crowd-daily-visitors" style={ANCHOR_SCROLL_STYLE}>
                  <Card>
                    <CardHeader>
                      <SectionTitle
                        title="Selected movement"
                        subtitle={`Telraam movement inside the active ${range.toLowerCase()} filter.`}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {DAILY_MOVEMENT_LINES.map((zoneItem) => (
                          <span key={zoneItem.key} className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zoneItem.color }} />
                            {zoneItem.label}
                          </span>
                        ))}
                      </div>

                      {dailyMovementTrend.length ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={dailyMovementTrend} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                              <XAxis dataKey="hour" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis
                                label={{ value: "Movement", angle: -90, position: "insideLeft", fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                                tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                formatter={(value, name) => [
                                  value === null ? "No reading" : `${formatMetricNumber(Number(value))} movements`,
                                  DAILY_MOVEMENT_LINES.find((item) => item.key === name)?.label || String(name),
                                ]}
                              />
                              <Legend />
                              {DAILY_MOVEMENT_LINES.map((zoneItem) => (
                                <Line
                                  key={zoneItem.key}
                                  type="monotone"
                                  dataKey={zoneItem.key}
                                  name={zoneItem.label}
                                  stroke={zoneItem.color}
                                  strokeWidth={3}
                                  dot={{ r: 3, fill: zoneItem.color }}
                                  connectNulls={false}
                                />
                              ))}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <ChartPlaceholder
                          title="Daily movement not available yet"
                          detail={telraamHistoryError || "Live Telraam rows for yesterday and today are needed before this chart can be drawn."}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            <section id="environment" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Environment"
                description="Water, air temperature, air quality, and sound context in one readable block."
              />

              <div id="environment-summary" className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))]" style={ANCHOR_SCROLL_STYLE}>
                <EnvironmentMetricCard
                  title="Water temperature"
                  value={waterSummary.value}
                  helper="Swim-area water"
                  icon={Waves}
                  stats={waterTemperatureStats}
                />
                <EnvironmentMetricCard
                  title="Air temperature"
                  value={liveWeatherWidget.temperature}
                  helper={liveWeatherWidget.condition}
                  icon={Thermometer}
                  stats={airTemperatureStats}
                  threshold={airTemperatureThreshold}
                />
                <EnvironmentMetricCard
                  title="Air quality"
                  value={airQualityValue}
                  helper={airQualityHelper}
                  icon={CloudSun}
                  stats={airQualityStats}
                  threshold={aqiValue !== null ? aqiThreshold : hasAirQualityReading ? no2Threshold : undefined}
                />
                <EnvironmentMetricCard
                  title="Humidity"
                  value={humidityValue !== null ? `${humidityValue.toFixed(0)}%` : "Unavailable"}
                  helper={humidityValue !== null ? "Relative humidity" : "Humidity feed not connected yet"}
                  icon={Droplets}
                  stats={humidityStats}
                  threshold={humidityValue !== null ? humidityThreshold : undefined}
                />
                <EnvironmentMetricCard
                  title="Sound level"
                  value={soundFeedConnected ? soundSummary.value : ""}
                  helper={soundFeedConnected ? soundSummary.helper : "Sensor feed not connected yet"}
                  icon={Volume2}
                  stats={[]}
                  threshold={soundThreshold}
                />
              </div>

              <Card>
                <CardHeader>
                  <SectionTitle
                    title="Sound summary"
                    subtitle="Current sound level and requested classifier categories only."
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  {soundFeedConnected ? (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: MAIN_COLORS.aColorGray }}>
                            Current
                          </p>
                          <p className="mt-1 text-3xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                            {soundSummary.value}
                          </p>
                          <p className="mt-1 text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                            {soundSummary.helper}
                          </p>
                        </div>
                        <Volume2 className="h-6 w-6" style={{ color: MT_COLORS.teal }} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {soundStats.map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-2xl border p-3"
                            style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                          >
                            <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                              {stat.label}
                            </p>
                            <Pill tone={stat.value === "Detected" ? "emerald" : "slate"}>{stat.value}</Pill>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <ChartPlaceholder
                      title="Sound summary not available yet"
                      detail="The sound feed has not returned the current level or requested classifier categories yet."
                    />
                  )}
                </CardContent>
              </Card>

              <SoundHourlyCard points={soundHourly} error={soundHourlyError} rangeLabel={range} />

              <div id="environment-temperature" style={ANCHOR_SCROLL_STYLE}>
                <EnvironmentTrendCard data={environmentTrend} />
              </div>
            </section>

            <section id="events" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Events"
                description="Upcoming site activity and public holidays placed together as planning support rather than as a live operational metric block."
              />

              <UpcomingAgendaCard
                loading={agendaLoading}
                error={agendaError}
                items={agendaItems}
                holidaysLoading={holidaysLoading}
                holidays={holidays}
                eventsId="events-agenda"
                holidaysId="events-holidays"
              />
            </section>

            <section id="map" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Map"
                description="Sensor locations and marker status across Marineterrein."
              />

              <div id="map-operational" style={ANCHOR_SCROLL_STYLE}>
                <ExternalSensorMapCard />
              </div>
            </section>

            <ExportPdfTool onExport={handleExportPdf} />
          </div>
        </div>
      </div>
    </div>
  );
}
