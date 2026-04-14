import { Activity, CloudSun, Radar, ShieldCheck, TrafficCone, Waves } from "lucide-react";
import type { AlertItem, Kpi, SensorHealthItem } from "./types";
import type {
  OpsHealthResponse,
  OpsLiveOverviewResponse,
  TelraamTrafficPoint,
  UnifiedLiveRecord,
} from "../../lib/opsLiveClient";

type WeatherWidgetModel = {
  statusTone: "slate" | "emerald" | "amber" | "rose";
  headline: string;
  temperature: string;
  location: string;
  condition: string;
  metrics: { label: string; value: string }[];
  helper: string;
};

type Tone = WeatherWidgetModel["statusTone"];

type SummaryModel = {
  title: string;
  value: string;
  helper: string;
  tone: Tone;
  detail: string[];
  stats?: { label: string; value: string }[];
};

export type SoundChartPoint = {
  label: string;
  value: number;
};

export type SensorStatusChartPoint = {
  label: string;
  value: number;
};

export type BreakdownChartPoint = {
  label: string;
  value: number;
};

export type AnomalyChartPoint = {
  time: string;
  actual: number;
  expected: number;
  deviationPct: number;
};

export type AirQualityChartPoint = {
  time: string;
  pm25?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
};

export type AirQualityChartModel = {
  points: AirQualityChartPoint[];
  availableMetrics: AirQualityMetricKey[];
};

type AirQualityMetricKey = "pm25" | "pm10" | "no2" | "o3";

export type IncidentCorrelationPoint = {
  time: string;
  busyness: number;
  vehicles: number;
  sound: number | null;
};

export type CrowdingSoundPoint = {
  label: string;
  crowding: number;
  sound: number;
};

function asNumber(value: UnifiedLiveRecord["value"]) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatValue(record?: UnifiedLiveRecord) {
  if (!record) return "Unavailable";
  if (typeof record.value === "number") {
    const rounded = record.metric === "water_temperature_c" ? record.value.toFixed(1) : Math.round(record.value).toString();
    return record.unit ? `${rounded} ${record.unit}` : rounded;
  }

  return record.value !== null ? String(record.value) : "Unavailable";
}

function statusTone(status: "ok" | "warning" | "critical" | "unknown" | "degraded" | "error") {
  if (status === "critical" || status === "error") return "rose" as const;
  if (status === "warning" || status === "degraded") return "amber" as const;
  if (status === "ok") return "emerald" as const;
  return "slate" as const;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTemperatureStat(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(1)} C`;
}

function mapAlertSeverity(status: UnifiedLiveRecord["status"]): AlertItem["severity"] {
  if (status === "critical") return "critical";
  if (status === "warning") return "warning";
  return "info";
}

function matchesZoneSelection(selection: string, zoneName: string) {
  if (selection === "All locations") return true;

  const normalizedSelection = selection.toLowerCase();
  const normalizedZone = zoneName.toLowerCase();
  const bareSelection = normalizedSelection.split("(")[0]?.trim() || normalizedSelection;

  return normalizedZone.includes(bareSelection) || bareSelection.includes(normalizedZone);
}

function cleanZoneLabel(zone?: string | null) {
  if (!zone || zone.toLowerCase().includes("unknown")) return "Marineterrein";
  if (zone.toLowerCase().startsWith("general marineterrein")) return "Marineterrein";
  return zone;
}

function findRecord(overview: OpsLiveOverviewResponse, source: UnifiedLiveRecord["source"], metric: string) {
  return overview.records.find((record) => record.source === source && record.metric === metric);
}

export function deriveLiveKpis(
  overview: OpsLiveOverviewResponse,
  health: OpsHealthResponse | null,
  loading: boolean,
): Kpi[] {
  const telraamTotal = findRecord(overview, "telraam", "total_flow");
  const husenseZones = new Set(
    overview.records
      .filter((record) => record.source === "husense" && record.category !== "sound")
      .map((record) => record.zone || record.id),
  );
  const waterTemp = findRecord(overview, "water", "water_temperature_c");
  const healthySources = health
    ? Object.values(health.sources).filter((source) => source.status === "ok").length
    : 0;
  const totalSources = health ? Object.keys(health.sources).length : 0;

  if (loading && !overview.generatedAt) {
    return [
      {
        label: "Live records",
        value: "Loading...",
        delta: "",
        trend: "up",
        helper: "syncing with ops backend",
        icon: Activity,
      },
    ];
  }

  return [
    {
      label: "Live records",
      value: overview.summary.totalRecords.toLocaleString(),
      delta: "",
      trend: "up",
      helper: "current cross-source signals",
      icon: Activity,
    },
    {
      label: "Telraam gate flow",
      value: telraamTotal ? formatValue(telraamTotal) : "Unavailable",
      delta: "",
      trend: "up",
      helper: "single counter at Kattenburgerstraat 7",
      icon: TrafficCone,
    },
    {
      label: "Husense activity zones",
      value: husenseZones.size.toLocaleString(),
      delta: "",
      trend: "up",
      helper: husenseZones.size ? "presence and movement zones reporting now" : "awaiting Marineterrein Husense feed",
      icon: Radar,
    },
    {
      label: "Water temperature",
      value: waterTemp ? formatValue(waterTemp) : "Unavailable",
      delta: "",
      trend: "up",
      helper: waterTemp ? "Binnenhaven swim context" : "not published as a numeric live reading yet",
      icon: Waves,
    },
    {
      label: "Healthy sources",
      value: totalSources ? `${healthySources} / ${totalSources}` : "Unavailable",
      delta: "",
      trend: "up",
      helper: health ? `overall state: ${health.status}` : "health endpoint unavailable",
      icon: ShieldCheck,
    },
  ];
}

export function deriveLiveAlerts(
  overview: OpsLiveOverviewResponse,
  zone: string,
  severity: string,
): AlertItem[] {
  return overview.records
    .filter((record) => record.category === "warning")
    .map((record, index) => ({
      id: index + 1,
      severity: mapAlertSeverity(record.status),
      title: record.label,
      zone: cleanZoneLabel(record.zone),
      source: record.source.toUpperCase(),
      time: formatTimestamp(record.observedAt),
      detail:
        typeof record.value === "string"
          ? record.value
          : `Status ${record.status} with ${record.confidence} confidence.`,
    }))
    .filter((alert) => matchesZoneSelection(zone, alert.zone))
    .filter((alert) => severity === "All severities" || alert.severity === severity);
}

export function deriveSourceHealthItems(
  health: OpsHealthResponse | null,
  category: string,
): SensorHealthItem[] {
  if (!health) return [];

  const categoryMap: Record<string, string> = {
    telraam: "Mobility & Access",
    husense: "Crowd & Presence",
    weather: "Environmental Conditions",
    water: "Recreation & Water",
    knmi: "Safety & Monitoring",
  };

  const zoneMap: Record<string, string> = {
    telraam: "Kattenburgerstraat 7",
    husense: "Marineterrein movement zones",
    weather: "Marineterrein",
    water: "Swim area",
    knmi: "Marineterrein",
  };

  return Object.entries(health.sources)
    .map(([sourceName, source]) => {
      const status: SensorHealthItem["status"] =
        source.status === "ok"
          ? "healthy"
          : source.status === "warning"
            ? "degraded"
            : "offline";

      return {
        sensor: `${sourceName.toUpperCase()} live source`,
        category: categoryMap[sourceName] || "Safety & Monitoring",
        status,
        zone: zoneMap[sourceName] || "Marineterrein",
      };
    })
    .filter((item) => category === "All categories" || item.category === category);
}

export function deriveWeatherWidgetModel(
  overview: OpsLiveOverviewResponse,
  health: OpsHealthResponse | null,
): WeatherWidgetModel {
  const condition = overview.records.find((record) => record.metric === "condition_text");
  const temperature = overview.records.find((record) => record.metric === "temperature_c");
  const feelsLike = overview.records.find((record) => record.metric === "feelslike_c");
  const wind = overview.records.find((record) => record.metric === "wind_kph");
  const precip = overview.records.find((record) => record.metric === "precip_mm");

  return {
    statusTone: statusTone(health?.sources.weather?.status || "unknown"),
    headline: health?.sources.weather?.status === "ok" ? "Live weather context" : "Weather context limited",
    temperature: temperature ? formatValue(temperature) : "Unavailable",
    location: cleanZoneLabel(temperature?.zone),
    condition: condition?.value ? String(condition.value) : "No current weather data",
    metrics: [
      { label: "Feels like", value: feelsLike ? formatValue(feelsLike) : "Unavailable" },
      { label: "Wind", value: wind ? formatValue(wind) : "Unavailable" },
      { label: "Precip", value: precip ? formatValue(precip) : "Unavailable" },
      {
        label: "Updated",
        value: formatTimestamp(health?.sources.weather?.lastSuccessAt || temperature?.fetchedAt || null),
      },
    ],
    helper:
      health?.sources.weather?.error ||
      (condition?.value ? `Condition: ${condition.value}` : "Weather source currently unavailable"),
  };
}

export function deriveLiveMetaSummary(overview: OpsLiveOverviewResponse, health: OpsHealthResponse | null) {
  const degradedCount = health
    ? Object.values(health.sources).filter((source) => source.status !== "ok").length
    : 0;

  return {
    totalRecords: overview.summary.totalRecords,
    degradedCount,
    generatedAt: formatTimestamp(overview.generatedAt || null),
    statusTone: statusTone(health?.status || "unknown"),
  };
}

export function deriveMobilitySnapshot(overview: OpsLiveOverviewResponse) {
  const pedestrians = asNumber(findRecord(overview, "telraam", "pedestrian_count")?.value ?? null) || 0;
  const bicycles = asNumber(findRecord(overview, "telraam", "bicycle_count")?.value ?? null) || 0;
  const vehicles = asNumber(findRecord(overview, "telraam", "vehicle_count")?.value ?? null) || 0;

  return {
    pedestrians,
    bicycles,
    vehicles,
    total: pedestrians + bicycles + vehicles,
  };
}

export function deriveTelraamSummary(
  overview: OpsLiveOverviewResponse,
  health: OpsHealthResponse | null,
): SummaryModel {
  const pedestrians = findRecord(overview, "telraam", "pedestrian_count");
  const bicycles = findRecord(overview, "telraam", "bicycle_count");
  const vehicles = findRecord(overview, "telraam", "vehicle_count");
  const total = findRecord(overview, "telraam", "total_flow");

  return {
    title: "Telraam gate counter",
    value: total ? formatValue(total) : "Unavailable",
    helper: "Single mobility counter at Kattenburgerstraat 7 for arrival pressure at the main edge of the site.",
    tone: statusTone(health?.sources.telraam?.status || "unknown"),
    detail: [
      `Pedestrians: ${pedestrians ? formatValue(pedestrians) : "Unavailable"}`,
      `Bicycles: ${bicycles ? formatValue(bicycles) : "Unavailable"}`,
      `Vehicles: ${vehicles ? formatValue(vehicles) : "Unavailable"}`,
    ],
  };
}

export function deriveSoundSummary(
  overview: OpsLiveOverviewResponse,
  health: OpsHealthResponse | null,
): SummaryModel {
  const levelRecords = overview.records.filter(
    (record) => record.source === "husense" && record.metric === "sound_level_db",
  );
  const classRecords = overview.records.filter(
    (record) => record.source === "husense" && record.metric === "sound_classification",
  );

  if (!levelRecords.length) {
    return {
      title: "Sound intelligence",
      value: "Not live yet",
      helper:
        health?.sources.husense?.error ||
        "The Marineterrein Husense feed is expected soon. When it arrives, this panel will show decibel ranges plus detected categories such as talking, crashes, and vehicle activity.",
      tone: statusTone(health?.sources.husense?.status || "unknown"),
      detail: [
        "Expected categories: talking, crashes / impacts, and movement / vehicles",
        "Planned scale: 2 to 3 sound sensors across the site",
      ],
    };
  }

  const values = levelRecords.map((record) => asNumber(record.value)).filter((value): value is number => value !== null);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const categories = Array.from(
    new Set(
      classRecords
        .map((record) => (typeof record.value === "string" ? record.value : null))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return {
    title: "Sound intelligence",
    value: min !== null && max !== null ? `${min.toFixed(0)}-${max.toFixed(0)} dB` : `${levelRecords.length} sensors live`,
    helper: "Current sound picture from live classifiers, meant to explain what kind of sound is being picked up rather than where it sits on the map.",
    tone: statusTone(health?.sources.husense?.status || "unknown"),
    detail: [
      `${levelRecords.length} sensor${levelRecords.length > 1 ? "s" : ""} reporting`,
      categories.length ? `Categories now: ${categories.slice(0, 4).join(", ")}` : "Categories now: awaiting classification labels",
    ],
  };
}

export function deriveWaterSummary(
  overview: OpsLiveOverviewResponse,
  health: OpsHealthResponse | null,
): SummaryModel {
  const water = findRecord(overview, "water", "water_temperature_c");

  if (!water) {
    return {
      title: "Binnenhaven water temperature",
      value: "Awaiting live reading",
      helper:
        health?.sources.water?.error ||
        "The Marineterrein sports page mentions water temperature, but a stable numeric reading was not detectable yet.",
      tone: statusTone(health?.sources.water?.status || "unknown"),
      detail: ["This card stays explicit about availability so we do not imply a live feed that is not there yet."],
      stats: [
        { label: "Yesterday avg", value: "Unavailable" },
        { label: "7-day avg", value: "Unavailable" },
      ],
    };
  }

  const history = (water.raw &&
    typeof water.raw === "object" &&
    "history" in water.raw &&
    water.raw.history &&
    typeof water.raw.history === "object"
      ? water.raw.history
      : null) as
    | {
        yesterdayAvg?: number | null;
        trailingWeekAvg?: number | null;
      }
    | null;

  return {
    title: "Binnenhaven water temperature",
    value: formatValue(water),
    helper: "Useful swim context for recreation planning and public communications around the water edge.",
    tone: statusTone(health?.sources.water?.status || "unknown"),
    detail: [`Last observed ${formatTimestamp(water.observedAt)}`],
    stats: [
      { label: "Yesterday avg", value: formatTemperatureStat(history?.yesterdayAvg ?? null) },
      { label: "7-day avg", value: formatTemperatureStat(history?.trailingWeekAvg ?? null) },
    ],
  };
}

export function deriveSoundCategoryChart(overview: OpsLiveOverviewResponse): SoundChartPoint[] {
  const classRecords = overview.records.filter(
    (record) => record.source === "husense" && record.metric === "sound_classification" && typeof record.value === "string",
  );

  if (!classRecords.length) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const record of classRecords) {
    const label = String(record.value);
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

export function deriveSensorStatusChart(health: OpsHealthResponse | null): SensorStatusChartPoint[] {
  if (!health) {
    return [
      { label: "Live", value: 0 },
      { label: "Degraded", value: 0 },
      { label: "Offline", value: 0 },
    ];
  }

  const live = Object.values(health.sources).filter((source) => source.status === "ok").length;
  const degraded = Object.values(health.sources).filter((source) => source.status === "warning").length;
  const offline = Object.values(health.sources).filter((source) => source.status !== "ok" && source.status !== "warning").length;

  return [
    { label: "Live", value: live },
    { label: "Degraded", value: degraded },
    { label: "Offline", value: offline },
  ];
}

export function deriveSourceBreakdownChart(overview: OpsLiveOverviewResponse): BreakdownChartPoint[] {
  return Object.entries(overview.summary.bySource).map(([label, value]) => ({
    label: label.toUpperCase(),
    value,
  }));
}

export function deriveCategoryBreakdownChart(overview: OpsLiveOverviewResponse): BreakdownChartPoint[] {
  return Object.entries(overview.summary.byCategory).map(([label, value]) => ({
    label,
    value,
  }));
}

export function deriveCurrentModalityChart(overview: OpsLiveOverviewResponse): BreakdownChartPoint[] {
  const pedestrians = asNumber(findRecord(overview, "telraam", "pedestrian_count")?.value ?? null) || 0;
  const bicycles = asNumber(findRecord(overview, "telraam", "bicycle_count")?.value ?? null) || 0;
  const vehicles = asNumber(findRecord(overview, "telraam", "vehicle_count")?.value ?? null) || 0;

  return [
    { label: "Pedestrians", value: pedestrians },
    { label: "Bicycles", value: bicycles },
    { label: "Vehicles", value: vehicles },
  ];
}

const TELRAAM_LIVE_MODE_METRICS: Array<{ metric: string; label: string }> = [
  { metric: "pedestrian_count", label: "Pedestrians" },
  { metric: "bicycle_count", label: "Bicycles" },
  { metric: "car_count", label: "Cars" },
  { metric: "bus_count", label: "Buses" },
  { metric: "light_truck_count", label: "Light trucks" },
  { metric: "motorcycle_count", label: "Motorcycles" },
  { metric: "truck_count", label: "Trucks" },
  { metric: "trailer_count", label: "Trailers" },
  { metric: "tractor_count", label: "Tractors" },
  { metric: "stroller_count", label: "Strollers" },
];

export function deriveTelraamLiveModeSplitChart(overview: OpsLiveOverviewResponse): BreakdownChartPoint[] {
  return TELRAAM_LIVE_MODE_METRICS.map(({ metric, label }) => ({
    label,
    value: asNumber(findRecord(overview, "telraam", metric)?.value ?? null) || 0,
  })).sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

function formatChartTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function deriveAnomalyChart(points: TelraamTrafficPoint[]): AnomalyChartPoint[] {
  const orderedPoints = [...points].reverse();

  return orderedPoints.map((point, index, list) => {
    const actual =
      Number(point.pedestrian_count || 0) +
      Number(point.bicycle_count || 0) +
      Number(point.vehicle_count || 0);
    const neighbors = list.slice(Math.max(0, index - 2), Math.min(list.length, index + 3));
    const expected =
      neighbors.reduce(
        (sum, item) =>
          sum +
          Number(item.pedestrian_count || 0) +
          Number(item.bicycle_count || 0) +
          Number(item.vehicle_count || 0),
        0,
      ) / Math.max(neighbors.length, 1);
    const deviationPct = expected > 0 ? ((actual - expected) / expected) * 100 : 0;

    return {
      time: formatChartTime(point.recorded_at),
      actual,
      expected: Number(expected.toFixed(1)),
      deviationPct: Number(deviationPct.toFixed(1)),
    };
  });
}

function normalizeMetric(metric: string) {
  return metric.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function deriveAirQualityChart(overview: OpsLiveOverviewResponse): AirQualityChartModel {
  const supportedMetrics = new Map<string, AirQualityMetricKey>([
    ["pm25", "pm25"],
    ["pm2_5", "pm25"],
    ["pm_25", "pm25"],
    ["pm10", "pm10"],
    ["no2", "no2"],
    ["o3", "o3"],
  ]);

  const grouped = new Map<string, AirQualityChartPoint>();

  for (const record of overview.records) {
    const normalizedMetric = normalizeMetric(record.metric);
    const targetKey = supportedMetrics.get(normalizedMetric);
    const numericValue = asNumber(record.value);

    if (!targetKey || numericValue === null) continue;

    const time = formatChartTime(record.observedAt);
    const existingPoint = grouped.get(time) || { time };
    existingPoint[targetKey] = numericValue;
    grouped.set(time, existingPoint);
  }

  const points = [...grouped.values()].sort((left, right) => left.time.localeCompare(right.time));
  const metricKeys: AirQualityMetricKey[] = ["pm25", "pm10", "no2", "o3"];
  const availableMetrics = metricKeys.filter((metric) =>
    points.some((point) => typeof point[metric] === "number"),
  );

  return {
    points,
    availableMetrics,
  };
}

export function deriveIncidentCorrelationChart(
  telraamPoints: TelraamTrafficPoint[],
  overview: OpsLiveOverviewResponse,
): IncidentCorrelationPoint[] {
  const orderedPoints = [...telraamPoints].reverse();
  const soundLevels = overview.records
    .filter((record) => record.source === "husense" && record.metric === "sound_level_db")
    .map((record) => asNumber(record.value))
    .filter((value): value is number => value !== null);
  const averageSound =
    soundLevels.length > 0 ? soundLevels.reduce((sum, value) => sum + value, 0) / soundLevels.length : null;

  return orderedPoints.map((point) => ({
    time: formatChartTime(point.recorded_at),
    busyness:
      Number(point.pedestrian_count || 0) +
      Number(point.bicycle_count || 0) +
      Number(point.vehicle_count || 0),
    vehicles: Number(point.vehicle_count || 0),
    sound: averageSound !== null ? Number(averageSound.toFixed(1)) : null,
  }));
}

export function deriveCrowdingSoundChart(
  overview: OpsLiveOverviewResponse,
): CrowdingSoundPoint[] {
  const crowdingRecords = overview.records.filter((record) => {
    const metric = normalizeMetric(record.metric);
    return (
      metric === "busyness" ||
      metric === "crowding" ||
      metric === "crowding_index" ||
      metric === "people_count" ||
      metric === "presence_count"
    );
  });
  const soundRecords = overview.records.filter(
    (record) => record.source === "husense" && record.metric === "sound_level_db",
  );

  if (!crowdingRecords.length || !soundRecords.length) {
    return [];
  }

  const soundByZone = new Map(
    soundRecords
      .map((record, index) => [cleanZoneLabel(record.zone) || `Sensor ${index + 1}`, asNumber(record.value)] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null),
  );

  return crowdingRecords
    .map((record, index) => {
      const zoneLabel = cleanZoneLabel(record.zone) || `Zone ${index + 1}`;
      const crowding = asNumber(record.value);
      const sound = soundByZone.get(zoneLabel);

      if (crowding === null || sound === undefined) return null;

      return {
        label: zoneLabel,
        crowding,
        sound,
      };
    })
    .filter((entry): entry is CrowdingSoundPoint => entry !== null);
}
