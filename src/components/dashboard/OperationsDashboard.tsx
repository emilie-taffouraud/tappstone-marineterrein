import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import HusenseHeatmapCard from "./HusenseHeatmapCard";
import {
  Area,
  AreaChart,
  Bar,
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
import { DASHBOARD_HEADER_THEME, MAIN_COLORS, MT_COLORS, getBadgeStyle } from "../../styles/theme";
import mt_down from "../../assets/mt_down.jpg";
import TelraamStoredCard from "./TelraamStoredCard";
import UpcomingAgendaCard from "./UpcomingAgendaCard";
import TelraamLiveCard from "./TelraamLiveCard";
import WeatherWidget from "./WeatherWidget";
import { LiveOperationsMapSection } from "./live-map/LiveOperationsMapSection";
import { fetchOpsAgenda, type AgendaItem } from "../../lib/opsLiveClient";
import {
  deriveAnomalyChart,
  deriveCurrentModalityChart,
  deriveLiveAlerts,
  deriveLiveKpis,
  deriveLiveMetaSummary,
  deriveTelraamTrendChart,
  deriveTelraamLiveModeSplitChart,
  deriveWaterSummary,
  deriveWeatherRangeModel,
  deriveWeatherWidgetModel,
} from "./opsLiveViewModel";
import { Card, CardContent, CardHeader, Pill, SectionTitle, SelectLike } from "./ui";
import type { AlertItem } from "./types";
import { dailyTrend, operationalZoneOccupancy, temporaryTrafficComparisonBaseline } from "../../data/mockDashboardData";

const locationOptions = ["All locations", "Portiersloge", "TAPP", "CODAM", "AHK MakerSpace", "Swim area"];
const sensorCategories = [
  "All categories",
  "Mobility & Access",
  "Crowd & Presence",
  "Environmental Conditions",
  "Recreation & Water",
  "Safety & Monitoring",
];
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
    description: "Immediate health, controls, alerts, and a live site snapshot.",
    items: [
      { id: "overview-site-summary", label: "Site summary" },
      { id: "overview-controls", label: "Controls" },
      { id: "overview-alerts", label: "Alerts" },
    ],
  },
  {
    id: "crowd",
    label: "Crowd",
    description: "Occupancy, movement flow, and crowd context.",
    items: [
      { id: "crowd-occupancy", label: "Occupancy" },
      { id: "crowd-heatmap", label: "Heatmap" },
      { id: "crowd-mobility-split", label: "Movement mix" },
      { id: "crowd-traffic", label: "Movement over time" },
      { id: "crowd-history", label: "Movement summary" },
      { id: "crowd-baseline", label: "Vs normal" },
      { id: "crowd-daily-visitors", label: "Daily visitors" },
      { id: "crowd-expected-measured", label: "Expected vs measured" },
    ],
  },
  {
    id: "water",
    label: "Water",
    description: "Swim-area context and waterfront conditions.",
    items: [{ id: "water-summary", label: "Water summary" }],
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
    id: "weather",
    label: "Weather",
    description: "Current conditions and recent temperature context.",
    items: [
      { id: "weather-conditions", label: "Conditions" },
      { id: "weather-weekly-range", label: "Weekly range" },
    ],
  },
  {
    id: "sensors",
    label: "Sensors",
    description: "Network visibility, source health, and infrastructure inventory.",
    items: [
      { id: "sensors-network", label: "Network map" },
      { id: "sensors-source-health", label: "Source health" },
      { id: "sensors-inventory", label: "Inventory" },
    ],
  },
];

const HIDDEN_OCCUPANCY_ZONE_IDS = new Set(["5db05d88-7833-440a-9c3e-24c93fb08406"]);

const DAILY_ZONE_STACK = [
  { key: "terraceVisitors", label: "Terrace", color: MT_COLORS.cyan },
  { key: "boardwalkVisitors", label: "Boardwalk", color: MT_COLORS.blue },
  { key: "picnicLawnVisitors", label: "Picnic lawn", color: MT_COLORS.green },
  { key: "swimAreaVisitors", label: "Swim area", color: MT_COLORS.teal },
] as const;

const NAV_ACCENTS: Record<string, string> = {
  overview: MT_COLORS.darkTeal,
  crowd: MT_COLORS.cyan,
  water: MT_COLORS.teal,
  events: MT_COLORS.burgundy,
  weather: MT_COLORS.green,
  sensors: MT_COLORS.darkTeal,
};

type TrafficComparisonPoint = {
  time: string;
  measured: number;
  expected: number;
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

function WeatherRangeCard({
  helper,
  periodLabel,
  stats,
  tone,
}: {
  helper: string;
  periodLabel: string;
  stats: { label: string; value: string }[];
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <SectionTitle title="Weekly temperature range" subtitle={helper} />
          <Pill tone={tone}>{tone === "slate" ? "limited" : "7-day view"}</Pill>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="sky">Last 7 days</Pill>
          <span className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
            {periodLabel}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${MAIN_COLORS.aColor1}26`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
              }}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
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
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
      title={label}
      aria-label={label}
      style={{
        borderColor: `${MAIN_COLORS.aColorGray}33`,
        backgroundColor: "rgba(255, 255, 255, 0.82)",
        color: MAIN_COLORS.aColorGray,
      }}
    >
      <Info className="h-3.5 w-3.5" />
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

function getOccupancyStatus(density: number) {
  if (density >= 75) return { label: "High", tone: "rose" as const };
  if (density >= 45) return { label: "Medium", tone: "amber" as const };
  return { label: "Low", tone: "emerald" as const };
}

function buildTrafficComparisonFromAnomaly(points: { time: string; actual: number; expected: number }[]): TrafficComparisonPoint[] {
  return points.map((point) => ({
    time: point.time,
    measured: point.actual,
    expected: point.expected,
  }));
}

function buildTrafficInsight(points: TrafficComparisonPoint[]) {
  if (!points.length) return "Measured activity will be compared with expected movement as soon as traffic rows are available.";

  const largestGap = points.reduce(
    (best, point) => {
      const gap = point.measured - point.expected;
      return gap > best.gap ? { point, gap } : best;
    },
    { point: points[0], gap: points[0].measured - points[0].expected },
  );

  if (largestGap.gap <= 0) {
    return "Measured activity is currently at or below the expected movement pattern.";
  }

  return `Measured activity is above expected around ${largestGap.point.time}.`;
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
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [activeNavId, setActiveNavId] = useState(DASHBOARD_NAV[0].id);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [husenseError, setHusenseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOccupancy = async () => {
      try {
        const response = await fetch("/api/husense/presence");
        if (!response.ok) throw new Error("Husense Network Error");
        const data = await response.json();

        console.log("Husense Data fetched successfully:", data);

        // Handle the live endpoint defensively because the upstream payload shape can vary.
        const zones = Array.isArray(data) ? data : (data?.value || data?.zones || data?.data || [data]);

        if (!cancelled) {
          setHusenseError(null);
          setOccupancyData(zones);
        }
      } catch (err: any) {
        console.error("Failed to fetch Husense:", err);
        if (!cancelled) setHusenseError(err.message);
      }
    };

    fetchOccupancy();
    const intervalId = setInterval(fetchOccupancy, 60 * 1000);

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

  const liveKpis = useMemo(() => deriveLiveKpis(overview, health, opsLoading), [overview, health, opsLoading]);
  const liveWeatherWidget = useMemo(() => deriveWeatherWidgetModel(overview, health), [overview, health]);
  const weatherRange = useMemo(() => deriveWeatherRangeModel(overview, health), [overview, health]);
  const liveMetaSummary = useMemo(() => deriveLiveMetaSummary(overview, health), [overview, health]);
  const waterSummary = useMemo(() => deriveWaterSummary(overview, health), [overview, health]);
  const currentModalityChart = useMemo(() => deriveCurrentModalityChart(overview), [overview]);
  const telraamLiveModeSplitChart = useMemo(() => deriveTelraamLiveModeSplitChart(overview), [overview]);
  const anomalyChart = useMemo(() => deriveAnomalyChart(telraamHistory), [telraamHistory]);
  const telraamTrendChart = useMemo(() => deriveTelraamTrendChart(telraamHistory), [telraamHistory]);
  const trafficComparisonChart = useMemo<TrafficComparisonPoint[]>(
    () =>
      anomalyChart.length
        ? buildTrafficComparisonFromAnomaly(anomalyChart)
        : temporaryTrafficComparisonBaseline.map((point) => ({ ...point })),
    [anomalyChart],
  );
  const trafficComparisonUsesTemporaryBaseline = !anomalyChart.length;
  const trafficComparisonInsight = useMemo(() => buildTrafficInsight(trafficComparisonChart), [trafficComparisonChart]);
  const visibleOccupancyData = useMemo(
    () => occupancyData.filter((zone) => !HIDDEN_OCCUPANCY_ZONE_IDS.has(String(zone?.id ?? ""))),
    [occupancyData],
  );

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

    return alerts;
  }, [flowThreshold, anomalyThreshold, latestTelraamPoint, latestAnomaly]);
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
                    <span>{liveMetaSummary.totalRecords} live records</span>
                  </div>
                  <p className="mt-2 text-xs" style={{ color: MT_COLORS.muted }}>
                    {liveWeatherWidget.condition} | {liveWeatherWidget.temperature} | {liveWeatherWidget.location}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                    Last refresh {liveMetaSummary.generatedAt} | partial sources {liveMetaSummary.degradedCount}
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
                description="Immediate dashboard health, operator controls, active alerts, and the quickest cross-source snapshot of what is happening right now."
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
                        ? "Live count at the Kattenburgerstraat gate."
                        : kpi.label === "Crowd density"
                          ? "Crowd level shown as share of comfortable capacity."
                            : kpi.label === "Swim conditions"
                              ? "Swim recommendation is limited only when the water temperature sensor is offline."
                              : kpi.label === "Air quality"
                                ? "Environmental context for operators; detailed air readings appear when available."
                            : undefined;
                    const [primaryHelper, secondaryHelper] = kpi.helper.split(" | ");

                    return (
                      <Card key={kpi.label} className="h-full overflow-hidden">
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
                                {kpi.label === "Current visitors" ? (
                                  <span className="text-xs font-medium" style={{ color: MAIN_COLORS.aColorGray }}>
                                    movements/hour
                                  </span>
                                ) : null}
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
                </div>
              </div>

              <div id="overview-alerts" style={ANCHOR_SCROLL_STYLE}>
                <Card>
                  <CardHeader>
                    <SectionTitle title="Active alerts" subtitle="Current warning feed plus editable threshold-driven alerts" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <ThresholdField label="Flow threshold" value={flowThreshold} unit="movements/hour" onChange={setFlowThreshold} />
                      <ThresholdField label="Anomaly threshold" value={anomalyThreshold} unit="%" onChange={setAnomalyThreshold} />
                    </div>

                    {filteredAlerts.length ? (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {filteredAlerts.map((alert) => (
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
                        ))}
                      </div>
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

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {operationalZoneOccupancy.map((occupancyZone) => {
                        const density = occupancyZone.density;
                        const status = getOccupancyStatus(density);

                        return (
                          <div
                            key={occupancyZone.zone}
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

                            <div className="mt-4">
                              <div className="mb-1.5 flex items-end justify-between gap-3">
                                <span className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                                  Density score
                                </span>
                                <span className="text-xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                                  {density}%
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    width: `${density}%`,
                                    backgroundColor: density >= 75 ? MT_COLORS.coral : density >= 45 ? MT_COLORS.yellow : MT_COLORS.cyan,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="rounded-2xl border px-4 py-3 text-sm leading-6"
                      style={{
                        borderColor: `${MAIN_COLORS.aColor1}26`,
                        backgroundColor: "rgba(120, 169, 198, 0.09)",
                        color: MAIN_COLORS.aColorBlack,
                      }}
                    >
                      Terrace is currently busiest. Boardwalk still has room and can absorb overflow.
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div id="crowd-heatmap" style={ANCHOR_SCROLL_STYLE}>
                <HusenseHeatmapCard selectedRange={range} />
              </div>

              <div id="crowd-mobility-split" style={ANCHOR_SCROLL_STYLE}>
                <TelraamLiveCard data={telraamLiveModeSplitChart} chartPalette={chartPalette} />
              </div>

              <div id="crowd-traffic" style={ANCHOR_SCROLL_STYLE}>
                <Card>
                    <CardHeader>
                      <SectionTitle
                        title="Movement over time"
                        subtitle="Trend across the loaded Telraam period, with the current pedestrian, bicycle, and vehicle split shown below."
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
              </div>

              <div className="grid gap-5">
                <div id="crowd-history" style={ANCHOR_SCROLL_STYLE}>
                  <TelraamStoredCard points={telraamHistory} error={telraamHistoryError} anomalyThreshold={anomalyThreshold} />
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
                        title="Daily visitors"
                        subtitle="Stacked view of estimated visitors by zone. Each colored section shows one area of the site."
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {DAILY_ZONE_STACK.map((zoneItem) => (
                          <span key={zoneItem.key} className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zoneItem.color }} />
                            {zoneItem.label}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
                          <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-white" />
                          Today
                        </span>
                      </div>

                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={dailyTrend} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                            <XAxis dataKey="day" tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis
                              label={{ value: "Visitors", angle: -90, position: "insideLeft", fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                              tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) => [
                                `${formatMetricNumber(Number(value))} visitors`,
                                DAILY_ZONE_STACK.find((item) => item.key === name)?.label || String(name),
                              ]}
                              labelFormatter={(label) => `${label}${dailyTrend.find((item) => item.day === label)?.isToday ? " - Today" : ""}`}
                            />
                            <Legend />
                            {DAILY_ZONE_STACK.map((zoneItem) => (
                              <Bar
                                key={zoneItem.key}
                                dataKey={zoneItem.key}
                                name={zoneItem.label}
                                stackId="visitors"
                                fill={zoneItem.color}
                                radius={zoneItem.key === "swimAreaVisitors" ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                              />
                            ))}
                            <Line
                              type="monotone"
                              dataKey={(point) => (point.isToday ? point.visitors : null)}
                              name="Today"
                              stroke="#111827"
                              strokeWidth={0}
                              dot={{ r: 5, fill: "#ffffff", stroke: "#111827", strokeWidth: 2 }}
                              activeDot={{ r: 6, fill: "#ffffff", stroke: "#111827", strokeWidth: 2 }}
                              connectNulls={false}
                              legendType="none"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div id="crowd-expected-measured" style={ANCHOR_SCROLL_STYLE}>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <SectionTitle
                          title="Traffic compared with expected"
                          subtitle="Compares live measured movement against the expected pattern for this time period."
                        />
                        <div className="flex items-center gap-2">
                          <InfoHint label="Expected vs measured compares counted movement with the expected movement pattern for the selected time range." />
                          <Pill tone={trafficComparisonUsesTemporaryBaseline ? "amber" : "sky"}>
                            {trafficComparisonUsesTemporaryBaseline ? "temporary baseline" : "loaded traffic"}
                          </Pill>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={trafficComparisonChart} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={`${MAIN_COLORS.aColorGray}33`} />
                            <XAxis
                              dataKey="time"
                              label={{ value: "Time", position: "insideBottom", offset: -4, fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                              tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              label={{ value: "Movement", angle: -90, position: "insideLeft", fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                              tick={{ fill: MAIN_COLORS.aColorGray, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) => [
                                `${formatMetricNumber(Number(value))} movements/hour`,
                                name === "measured" ? "Measured movement" : "Expected movement",
                              ]}
                            />
                            <Legend
                              formatter={(value) => (value === "measured" ? "Measured" : value === "expected" ? "Expected" : value)}
                            />
                            <Bar dataKey="measured" name="Measured" fill={MT_COLORS.coral} radius={[6, 6, 0, 0]} />
                            <Line
                              type="monotone"
                              dataKey="expected"
                              name="Expected"
                              stroke={MT_COLORS.cyan}
                              strokeWidth={3}
                              dot={{ r: 3, fill: MT_COLORS.cyan }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      <div
                        className="rounded-2xl border px-4 py-3 text-sm leading-6"
                        style={{
                          borderColor: `${MAIN_COLORS.aColor1}26`,
                          backgroundColor: "rgba(120, 169, 198, 0.09)",
                          color: MAIN_COLORS.aColorBlack,
                        }}
                      >
                        {trafficComparisonInsight}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            <section id="water" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Water"
                description="Swim-area context for recreation and public communication."
              />

              <div id="water-summary" style={ANCHOR_SCROLL_STYLE}>
                <SignalCard {...waterSummary} />
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

            <section id="weather" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Weather"
                description="Live weather context for site operations."
              />

              <div id="weather-conditions" style={ANCHOR_SCROLL_STYLE}>
                <WeatherWidget model={liveWeatherWidget} />
              </div>

              <div id="weather-weekly-range" style={ANCHOR_SCROLL_STYLE}>
                <WeatherRangeCard
                  helper={weatherRange.helper}
                  periodLabel={weatherRange.periodLabel}
                  stats={weatherRange.stats}
                  tone={weatherRange.tone}
                />
              </div>
            </section>

            <section id="sensors" className="space-y-5" style={ANCHOR_SCROLL_STYLE}>
              <CategoryHeader
                title="Sensors"
                description="Network health and live source availability across Marineterrein."
              />

              <div id="sensors-network" style={ANCHOR_SCROLL_STYLE}>
                <LiveOperationsMapSection sourceHealthId="sensors-source-health" inventoryId="sensors-inventory" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
