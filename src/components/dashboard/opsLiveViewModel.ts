import { Activity, AlertTriangle, CloudSun, RefreshCw, ShieldCheck } from "lucide-react";
import type { AlertItem, Kpi, SensorHealthItem } from "./types";
import type { OpsHealthResponse, OpsLiveOverviewResponse, UnifiedLiveRecord } from "../../lib/opsLiveClient";

import peopleCrowdSizeColor from "../components/dashboard/images/People - CrowdSize - Color.png";
import alertColor from "../components/dashboard/images/Operation Dashboards - Color@2x.png";
import soundColor from "../components/dashboard/images/Sound Level - Color.png";
import dataVisColor from "../components/dashboard/images/Data Vis - Color.png";
import tempColor from "../components/dashboard/images/Temperature - Color.png";

type WeatherWidgetModel = {
  statusTone: "slate" | "emerald" | "amber" | "rose";
  headline: string;
  temperature: string;
  location: string;
  condition: string;
  metrics: { label: string; value: string }[];
  helper: string;
};

function asNumber(value: UnifiedLiveRecord["value"]) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatValue(record?: UnifiedLiveRecord) {
  if (!record) return "Unavailable";
  if (typeof record.value === "number") {
    return record.unit ? `${Math.round(record.value)} ${record.unit}` : String(Math.round(record.value));
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

export function deriveLiveKpis(
  overview: OpsLiveOverviewResponse,
  health: OpsHealthResponse | null,
  loading: boolean,
): Kpi[] {
  const weatherTemp = overview.records.find((record) => record.metric === "temperature_c");
  const warningCount = overview.records.filter((record) => record.category === "warning").length;
  const healthySources = health
    ? Object.values(health.sources).filter((source) => source.status === "ok").length
    : 0;
  const totalSources = health ? Object.keys(health.sources).length : 0;
  const mobilityCount = overview.records.filter((record) => record.category === "mobility").length;

  if (loading && !overview.generatedAt) {
    return [
      {
        label: "Live records",
        value: "Loading...",
        delta: "",
        trend: "up",
        helper: "syncing with ops backend",
        icon: RefreshCw,
      },
    ];
  }

  return [
    {
      label: "Live records",
      value: overview.summary.totalRecords.toLocaleString(),
      delta: "",
      trend: "up",
      helper: "normalized signals currently available",
      icon: Activity,
    },
    {
      label: "Mobility signals",
      value: mobilityCount.toLocaleString(),
      delta: "",
      trend: "up",
      helper: "Telraam-derived live observations",
      icon: ShieldCheck,
    },
    {
      label: "Active warnings",
      value: warningCount.toLocaleString(),
      delta: "",
      trend: "up",
      helper: warningCount ? "warnings currently carried by KNMI data" : "no current live warnings",
      icon: AlertTriangle,
    },
    {
      label: "Current weather",
      value: weatherTemp ? formatValue(weatherTemp) : "Unavailable",
      delta: "",
      trend: "up",
      helper: weatherTemp ? "latest live weather temperature" : "weather source unavailable",
      icon: CloudSun,
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
      zone: record.zone || "General Marineterrein / unknown",
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
    weather: "Environmental Conditions",
    knmi: "Safety & Monitoring",
  };

  const zoneMap: Record<string, string> = {
    telraam: "Portiersloge",
    weather: "General Marineterrein / unknown",
    knmi: "General Marineterrein / unknown",
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
        zone: zoneMap[sourceName] || "General Marineterrein / unknown",
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
    location: temperature?.zone || "Marineterrein",
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
  const pedestrians =
    asNumber(overview.records.find((record) => record.metric === "pedestrian_count")?.value ?? null) || 0;
  const bicycles =
    asNumber(overview.records.find((record) => record.metric === "bicycle_count")?.value ?? null) || 0;
  const vehicles =
    asNumber(overview.records.find((record) => record.metric === "vehicle_count")?.value ?? null) || 0;
  const total = pedestrians + bicycles + vehicles;

  return {
    pedestrians,
    bicycles,
    vehicles,
    total,
  };
}

export function deriveZoneSnapshotCards(overview: OpsLiveOverviewResponse) {
  const preferredZones = ["Portiersloge", "TAPP", "CODAM", "AHK MakerSpace"];
  const grouped = new Map<string, UnifiedLiveRecord[]>();

  for (const record of overview.records) {
    const zoneName = record.zone || "General Marineterrein / unknown";
    grouped.set(zoneName, [...(grouped.get(zoneName) || []), record]);
  }

  const cards = preferredZones.map((zoneName) => {
    const records = grouped.get(zoneName) || [];
    const totalFlow =
      asNumber(records.find((record) => record.metric === "total_flow")?.value ?? null) ||
      records
        .filter((record) => record.category === "mobility")
        .reduce((sum, record) => sum + (asNumber(record.value) || 0), 0);
    const warningCount = records.filter((record) => record.category === "warning").length;
    const status =
      warningCount > 0
        ? "watch"
        : totalFlow >= 150
          ? "busy"
          : totalFlow > 0
            ? "stable"
            : "calm";

    return {
      zone: zoneName,
      visitors: totalFlow,
      density: 0,
      status,
      helper:
        warningCount > 0
          ? `${warningCount} warning signal${warningCount > 1 ? "s" : ""}`
          : totalFlow > 0
            ? "current live movement count"
            : "no mapped live data yet",
    };
  });

  const maxVisitors = Math.max(...cards.map((card) => card.visitors), 0);

  return cards.map((card) => ({
    ...card,
    density: maxVisitors > 0 ? Math.round((card.visitors / maxVisitors) * 100) : 0,
  }));
}
