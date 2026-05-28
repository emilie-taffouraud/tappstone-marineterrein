import { useEffect, useMemo, useRef, useState } from "react";
import { Bike, Car, CloudSun, Info, Thermometer, Users, Volume2, Waves, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
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
import TelraamLiveCard from "./TelraamLiveCard";
import { LiveOperationsMapSection } from "./live-map/LiveOperationsMapSection";
import {
  fetchHusenseDashboardSummary,
  fetchOpsAgenda,
  type AgendaItem,
  type HusenseDashboardSummary,
  type OpsLiveOverviewResponse,
  type TelraamTrafficPoint,
} from "../../lib/opsLiveClient";
import {
  getEnvironmentThreshold,
  type EnvironmentThresholdResult,
  type EnvironmentThresholdStatus,
} from "../../utils/environmentThresholds";
import {
  deriveAnomalyChart,
  deriveCurrentModalityChart,
  deriveLiveAlerts,
  deriveLiveKpis,
  deriveLiveMetaSummary,
  deriveSoundSummary,
  deriveTelraamTrendChart,
  deriveTelraamLiveModeSplitChart,
  deriveWaterSummary,
  deriveWeatherWidgetModel,
} from "./opsLiveViewModel";
import { Card, CardContent, CardHeader, Pill, SectionTitle, SelectLike } from "./ui";
import type { AlertItem } from "./types";

const locationOptions = ["All locations", "Portiersloge", "TAPP", "CODAM", "AHK MakerSpace", "Swim area"];
const sensorCategories = ["busyness", "water temp", "vehicle classification", "air quality", "sound"];
const severityOptions = ["All severities", "info", "warning", "critical"];
const timeRangeOptions = ["Last 30 min", "Last 2 hrs", "Today"];
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
    description: "Occupancy, movement flow, and crowd context.",
    items: [
      { id: "crowd-occupancy", label: "Occupancy" },
      { id: "crowd-mobility-split", label: "Movement mix" },
      { id: "crowd-traffic", label: "Movement over time" },
      { id: "crowd-history", label: "Movement summary" },
      { id: "crowd-baseline", label: "Vs normal" },
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
  { key: "today", label: "Today", color: MT_COLORS.coral },
  { key: "yesterday", label: "Yesterday", color: MT_COLORS.cyan },
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
  capacity: number | null;
  density: number;
};

type DailyMovementPoint = {
  hour: string;
  today: number | null;
  yesterday: number | null;
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

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
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
      className="h-full"
      style={{
        borderColor: threshold ? `${thresholdColor}66` : MT_COLORS.border,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle title={title} subtitle={helper} />
          <div className="flex flex-col items-end gap-2">
            <Icon className="h-5 w-5 shrink-0" style={{ color: thresholdColor }} />
            {threshold && threshold.status !== "unavailable" ? <Pill tone={thresholdTone || "slate"}>{threshold.label}</Pill> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {value ? (
          <p className="text-3xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
            {value}
          </p>
        ) : null}
        {threshold ? (
          <div
            className="rounded-xl border px-3 py-2 text-sm"
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
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
              >
                <span style={{ color: MAIN_COLORS.aColorGray }}>{stat.label}</span>
                <span className="font-semibold text-right" style={{ color: MAIN_COLORS.aColorBlack }}>{stat.value}</span>
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
                    if (name === "Visitors" || name === "visitors") return [`${formatMetricNumber(Number(value))}`, "Visitors"];
                    if (name === "Water temperature" || name === "waterTemperature") return [`${Number(value).toFixed(1)} C`, "Water temperature"];
                    return [`${Number(value).toFixed(1)} C`, "Air temperature"];
                  }}
                />
                <Legend />
                <Line yAxisId="temp" type="monotone" dataKey="waterTemperature" name="Water temperature" stroke={MT_COLORS.teal} strokeWidth={3} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="temp" type="monotone" dataKey="airTemperature" name="Air temperature" stroke={MT_COLORS.coral} strokeWidth={3} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="visitors" type="monotone" dataKey="visitors" name="Visitors" stroke={MT_COLORS.blue} strokeWidth={2} strokeDasharray="5 5" dot={false} />
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
  const totals = summary?.totals || {};
  const movementRows = [
    { label: "People", value: Number(totals.person || 0), color: MT_COLORS.cyan },
    { label: "Runners", value: Number(totals.runner || 0), color: MT_COLORS.blue },
    { label: "Bikes", value: Number(totals.bike || 0), color: MT_COLORS.teal },
    { label: "Cars", value: Number(totals.car || 0), color: MT_COLORS.coral },
    { label: "Buses", value: Number(totals.bus || 0), color: MT_COLORS.burgundy },
  ];
  const totalMovement = movementRows.reduce((sum, row) => sum + row.value, 0);
  const dominant = movementRows
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)[0];
  const busiestGate = (summary?.gates || [])
    .filter((gate) => Number(gate.totalCount || 0) > 0)
    .sort((left, right) => Number(right.totalCount || 0) - Number(left.totalCount || 0))[0];

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
              {[
                {
                  label: "Movement now",
                  value: formatMetricNumber(totalMovement),
                  note: `Latest HuSense update ${formatLocalDateTime(summary.observedAt)}`,
                },
                {
                  label: "Current presence",
                  value: formatMetricNumber(Number(summary.currentPresence || 0)),
                  note: "Current HuSense presence across the configured spaces",
                },
                {
                  label: "Active gates",
                  value: formatMetricNumber(Number(summary.activeGateCount || 0)),
                  note: busiestGate
                    ? `${busiestGate.gateName} has the strongest movement right now.`
                    : "No active classified gate movement in the latest HuSense payload.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                    Current HuSense movement mix
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                    {dominant ? `${dominant.label} are the main movement type right now.` : "No classified movement stands out right now."}
                  </p>
                </div>
                <Pill tone={totalMovement > 0 ? "emerald" : "slate"}>HuSense live</Pill>
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
                      {totalMovement > 0 ? `${formatMetricNumber((row.value / totalMovement) * 100, 1)}% of movement now` : "No current share"}
                    </p>
                  </div>
                ))}
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

function buildOccupancyCards(zones: PresenceZone[]): OccupancyCardModel[] {
  const totalVisitors = zones.reduce((sum, zone) => sum + readPresenceCount(zone), 0);

  return zones
    .map((zone, index) => {
      const visitors = readPresenceCount(zone);
      const capacity = parseOptionalNumber(zone.capacity);
      const density = totalVisitors > 0 ? Math.round((visitors / totalVisitors) * 1000) / 10 : 0;
      const id = String(zone.id ?? zone.name ?? zone.zone ?? `zone-${index + 1}`);

      return {
        id,
        zone: zone.name || zone.zone || zone.label || `Zone ${index + 1}`,
        visitors,
        capacity,
        density,
      };
    })
    .sort((left, right) => right.density - left.density || right.visitors - left.visitors || left.zone.localeCompare(right.zone));
}

function buildOccupancyInsight(zones: OccupancyCardModel[], error: string | null) {
  if (!zones.length) {
    return error
      ? "Crowd density is unavailable because the Husense backend feed could not be loaded."
      : "Crowd density will appear when the Husense backend returns live zone readings.";
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

function buildDailyMovementTrend(points: TelraamTrafficPoint[]): DailyMovementPoint[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(yesterday);
  const todayByHour = new Map<number, number>();
  const yesterdayByHour = new Map<number, number>();

  for (const point of points) {
    const recordedAt = new Date(point.recorded_at);
    if (Number.isNaN(recordedAt.getTime())) continue;

    const dayKey = formatDateKey(recordedAt);
    const hour = recordedAt.getHours();
    const target = dayKey === todayKey ? todayByHour : dayKey === yesterdayKey ? yesterdayByHour : null;
    if (!target) continue;

    target.set(hour, (target.get(hour) || 0) + totalTelraamMovement(point));
  }

  return Array.from({ length: 24 }, (_, hour) => ({
    hour: formatHourLabel(hour),
    today: todayByHour.has(hour) ? todayByHour.get(hour)! : null,
    yesterday: yesterdayByHour.has(hour) ? yesterdayByHour.get(hour)! : null,
  })).filter((point) => point.today !== null || point.yesterday !== null);
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
  const [range, setRange] = useState("Last 2 hrs");
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
  }, []);

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
  }, []);

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
  const liveKpis = useMemo(
    () => deriveLiveKpis(overview, health, opsLoading, husenseCurrentPresence, husenseLoading, husenseGateCount),
    [overview, health, opsLoading, husenseCurrentPresence, husenseLoading, husenseGateCount],
  );
  const liveWeatherWidget = useMemo(() => deriveWeatherWidgetModel(overview, health), [overview, health]);
  const liveMetaSummary = useMemo(() => deriveLiveMetaSummary(overview, health), [overview, health]);
  const waterSummary = useMemo(() => deriveWaterSummary(overview, health), [overview, health]);
  const soundSummary = useMemo(() => deriveSoundSummary(overview, health), [overview, health]);
  const dailyMovementTrend = useMemo(() => buildDailyMovementTrend(telraamHistory), [telraamHistory]);
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
  const no2Record = getMetricRecord(overview, ["no2", "no2_ug_m3", "nitrogen_dioxide"]);
  const no2Value = numberFromRecord(no2Record);
  const no2Threshold = getEnvironmentThreshold("no2", no2Value);
  const co2Record = getMetricRecord(overview, ["co2", "co2_ppm", "carbon_dioxide"]);
  const co2Value = numberFromRecord(co2Record);
  const hasAirQualityReading = no2Value !== null && no2Value !== 0;
  const soundStats = soundFeedConnected ? [{ label: "Comfort", value: soundSummary.helper }, ...(soundSummary.stats || [])] : [];
  const airQualityStats = [
    hasAirQualityReading ? { label: "NO2", value: `${no2Value!.toFixed(0)} ${no2Record?.unit || "ug/m3"}` } : null,
    co2Value !== null ? { label: "CO2 context", value: `${co2Value.toFixed(0)} ${co2Record?.unit || "ppm"}` } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const airQualityValue = hasAirQualityReading ? `${no2Value!.toFixed(0)} ${no2Record?.unit || "ug/m3"}` : "Unavailable";
  const airQualityHelper =
    hasAirQualityReading
      ? "NO2 pollutant-specific threshold"
      : co2Value !== null
        ? getEnvironmentThreshold("co2", co2Value).message
        : "Sensor feed not connected yet";
  const currentModalityChart = useMemo(() => deriveCurrentModalityChart(overview), [overview]);
  const telraamLiveModeSplitChart = useMemo(() => deriveTelraamLiveModeSplitChart(overview), [overview]);
  const anomalyChart = useMemo(() => deriveAnomalyChart(telraamHistory), [telraamHistory]);
  const telraamTrendChart = useMemo(() => deriveTelraamTrendChart(telraamHistory), [telraamHistory]);
  const visibleOccupancyZones = useMemo(
    () => occupancyData.filter((zone) => !HIDDEN_OCCUPANCY_ZONE_IDS.has(String(zone?.id ?? ""))),
    [occupancyData],
  );
  const occupancyCards = useMemo(() => buildOccupancyCards(visibleOccupancyZones), [visibleOccupancyZones]);
  const occupancyInsight = useMemo(() => buildOccupancyInsight(occupancyCards, husenseError), [occupancyCards, husenseError]);

  const chartPalette = [
    MT_COLORS.cyan,
    MT_COLORS.blue,
    MT_COLORS.teal,
    MT_COLORS.yellow,
    MT_COLORS.paleBlue,
    MT_COLORS.coral,
    MT_COLORS.green,
    MT_COLORS.burgundy,
    MT_COLORS.darkTeal,
    MT_COLORS.muted,
  ];
  const latestAnomaly = anomalyChart.length ? anomalyChart[anomalyChart.length - 1] : undefined;
  const anomalyStatus = latestAnomaly
    ? describeAnomaly(latestAnomaly.deviationPct, anomalyThreshold)
    : { label: "Normal", tone: "emerald" as const, detail: "Movement is within the expected baseline range." };
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
                      kpi.label === "Current visitors at Marineterrein"
                        ? "Live count at the Kattenburgerstraat gate."
                        : kpi.label === "Sound level"
                          ? "Current decibel level with a simple comfort reading."
                        : kpi.label === "Crowd density"
                          ? "Crowd level shown as share of comfortable capacity."
                            : kpi.label === "Public conditions"
                              ? "Weather and crowd context matching the public dashboard."
                              : kpi.label === "Air quality"
                                ? "Environmental context for operators; detailed air readings appear when available."
                            : undefined;
                    const [primaryHelper, secondaryHelper] = kpi.helper.split(" | ");

                    return (
                      <Card key={kpi.label} className="h-full overflow-visible">
                        <CardContent className="p-[1.1rem]">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                                  {kpi.label}
                                </p>
                                {definition ? <InfoHint label={definition} /> : null}
                              </div>
                              {definition && kpi.label === "Crowd density" ? (
                                <p className="mt-1 text-[11px] leading-4" style={{ color: MAIN_COLORS.aColorGray }}>
                                  capacity-based density estimate
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <p className="text-[1.75rem] font-semibold tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>
                                  {kpi.value}
                                </p>
                              </div>
                              <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                                {primaryHelper}
                              </p>
                              {secondaryHelper ? (
                                <p className="mt-0.5 text-[11px]" style={{ color: MAIN_COLORS.aColorGray }}>
                                  {secondaryHelper}
                                </p>
                              ) : null}
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
                        Telraam remains the site-edge movement counter, while the broader sensor network appears later in the
                        infrastructure section where operators expect to inspect source health and coverage.
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
                description="Movement and occupancy signals grouped together to read current pressure, mode mix, and change versus normal."
              />

              <div id="crowd-occupancy" style={ANCHOR_SCROLL_STYLE}>
                <Card>
                  <CardHeader>
                    <SectionTitle
                      title="Crowd density"
                      subtitle="Live zone estimate compared with comfortable capacity. Shown as a capacity-based density score rather than exact people per square meter."
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {husenseError ? (
                      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                        Crowd density feed degraded: using the latest available zone estimate.
                      </div>
                    ) : null}

                    {occupancyCards.length ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

                            <p className="mt-2 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                              {formatMetricNumber(occupancyZone.visitors)} detected
                              {occupancyZone.capacity ? ` / ${formatMetricNumber(occupancyZone.capacity)} capacity reference` : ""}
                            </p>

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
                        title="Crowd density not available yet"
                        detail={husenseError || "The Husense backend has not returned live zone readings yet."}
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
                <TelraamLiveCard data={telraamLiveModeSplitChart} chartPalette={chartPalette} />
              </div>

              <div id="crowd-traffic" style={ANCHOR_SCROLL_STYLE}>
                <Card>
                    <CardHeader>
                      <SectionTitle
                        title="Movement over time"
                        subtitle="Trend across the loaded Telraam period. Telraam night-mode counts are included in pedestrians so evening and overnight movement stays visible."
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
                            <Area type="monotone" dataKey="pedestrians" stackId="1" stroke={MT_COLORS.cyan} fill={MT_COLORS.cyan} fillOpacity={0.85} />
                            <Area type="monotone" dataKey="bicycles" stackId="1" stroke={MT_COLORS.blue} fill={MT_COLORS.blue} fillOpacity={0.78} />
                            <Area type="monotone" dataKey="vehicles" stackId="1" stroke={MT_COLORS.teal} fill={MT_COLORS.teal} fillOpacity={0.75} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <ChartPlaceholder
                        title="Movement trend not available yet"
                        detail={telraamHistoryError || "Recent movement history is not available yet."}
                      />
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {currentModalityChart.map((item, index) => {
                        const Icon =
                          item.label === "Pedestrians" ? Users : item.label === "Bicycles" ? Bike : Car;

                        return (
                          <div
                            key={item.label}
                            className="rounded-2xl border p-4"
                            style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: chartPalette[index] }} />
                              <p className="text-sm" style={{ color: chartPalette[index] }}>
                                {item.label}
                              </p>
                            </div>
                            <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                              {item.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5">
                <div id="crowd-history" style={ANCHOR_SCROLL_STYLE}>
                  <HusenseMovementSummaryCard summary={husenseSummary} error={husenseSummaryError} />
                </div>

                <div id="crowd-baseline" style={ANCHOR_SCROLL_STYLE}>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <SectionTitle
                          title="Movement vs normal pattern"
                          subtitle="Current movement compared with the expected recent pattern from the Telraam hourly window."
                        />
                        {anomalyChart.length ? <Pill tone={anomalyStatus.tone}>{anomalyStatus.label}</Pill> : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {anomalyChart.length ? (
                        <>
                          <div className="h-[228px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={anomalyChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                                <XAxis dataKey="time" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="expected" stroke={MT_COLORS.cyan} fill={MT_COLORS.cyan} fillOpacity={0.16} />
                                <Line type="monotone" dataKey="actual" stroke={MT_COLORS.coral} strokeWidth={3} dot={false} />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                              {
                                label: "Latest actual",
                                value: formatMetricNumber(latestAnomaly?.actual ?? 0),
                                note: "Current total movements in the latest row",
                              },
                              {
                                label: "Expected baseline",
                                value: formatMetricNumber(latestAnomaly?.expected ?? 0, 1),
                                note: "Rolling expectation from nearby rows",
                              },
                              {
                                label: "Deviation",
                                value: latestAnomaly ? formatSignedPercent(latestAnomaly.deviationPct) : "0%",
                                note: "Difference between actual and expected flow",
                              },
                              {
                                label: "Pattern status",
                                value: anomalyStatus.label,
                                note: anomalyStatus.detail,
                              },
                            ].map((item, index) => (
                              <div
                                key={item.label}
                                className="rounded-2xl border p-4"
                                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
                              >
                                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                                  {item.label}
                                </p>
                                <p
                                  className="mt-2 text-2xl font-semibold"
                                  style={{
                                    color: index === 3
                                      ? anomalyStatus.tone === "rose"
                                      ? MT_COLORS.coral
                                        : anomalyStatus.tone === "amber"
                                          ? MT_COLORS.darkTeal
                                          : anomalyStatus.tone === "sky"
                                            ? MT_COLORS.blue
                                            : MT_COLORS.teal
                                      : MAIN_COLORS.aColorBlack,
                                  }}
                                >
                                  {item.value}
                                </p>
                                <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                                  {item.note}
                                </p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <ChartPlaceholder
                          title="No normal pattern available yet"
                          detail={
                            telraamHistoryError ||
                            "Recent movement history is needed before normal-pattern tracking can be calculated."
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div id="crowd-daily-visitors" style={ANCHOR_SCROLL_STYLE}>
                  <Card>
                    <CardHeader>
                      <SectionTitle
                        title="Daily movement"
                        subtitle="Live Telraam movement compared hour by hour between yesterday and today."
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
                                  strokeWidth={zoneItem.key === "today" ? 3 : 2}
                                  strokeDasharray={zoneItem.key === "yesterday" ? "5 5" : undefined}
                                  dot={{ r: zoneItem.key === "today" ? 3 : 2, fill: zoneItem.color }}
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

              <div id="environment-summary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" style={ANCHOR_SCROLL_STYLE}>
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
                  threshold={hasAirQualityReading ? no2Threshold : undefined}
                />
                <EnvironmentMetricCard
                  title="Sound level"
                  value={soundFeedConnected ? soundSummary.value : ""}
                  helper={soundFeedConnected ? soundSummary.helper : "Sensor feed not connected yet"}
                  icon={Volume2}
                  stats={soundStats}
                  threshold={soundThreshold}
                />
              </div>

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
                <LiveOperationsMapSection sourceHealthId="map-source-health" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
