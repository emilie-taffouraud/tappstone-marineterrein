import { getDefaultSitePlace, getSitePlaceByDisplayName, getSitePlaceById } from "../../../config/sitePlaces.js";
import { sitePlaces } from "./mapConfig";
import { getSensorPoints, summarizeSensorPoints } from "./sensorCatalog";
import type {
  OpsHealthResponse,
  OpsLiveOverviewResponse,
  SpatialSummary,
  UnifiedLiveRecord,
  WarningPoint,
  WeatherPoint,
  ZoneFeature,
} from "./types";

function toNumber(value: UnifiedLiveRecord["value"]) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function statusRank(status: UnifiedLiveRecord["status"]) {
  return { unknown: 0, ok: 1, warning: 2, critical: 3 }[status] ?? 0;
}

function maxStatus(statuses: UnifiedLiveRecord["status"][]) {
  return statuses.reduce<UnifiedLiveRecord["status"]>((current, candidate) => {
    return statusRank(candidate) > statusRank(current) ? candidate : current;
  }, "unknown");
}

function resolveSitePlace(record: Pick<UnifiedLiveRecord, "zoneId" | "zone">) {
  if (record.zoneId) {
    return getSitePlaceById(record.zoneId) ?? getDefaultSitePlace();
  }

  if (record.zone) {
    return getSitePlaceByDisplayName(record.zone) ?? getDefaultSitePlace();
  }

  return getDefaultSitePlace();
}

function formatObservedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function buildZoneFeatures(records: UnifiedLiveRecord[]): ZoneFeature[] {
  return sitePlaces.map((place) => {
    const zoneRecords = records.filter((record) => {
      return resolveSitePlace(record)?.id === place.id;
    });

    const weatherRecord = zoneRecords.find((record) => record.category === "weather" && record.metric === "condition_text");
    const totalFlowRecord = zoneRecords.find((record) => record.metric === "total_flow");
    const warnings = zoneRecords.filter((record) => record.category === "warning");

    return {
      id: place.id,
      displayName: place.displayName,
      center: place.geometry.type === "point" ? place.geometry.coordinates : place.labelPosition,
      labelPosition: place.labelPosition,
      geometry: place.geometry,
      recordCount: zoneRecords.length,
      activeWarnings: warnings.length,
      mobilityScore: totalFlowRecord ? toNumber(totalFlowRecord.value) : 0,
      weatherSummary: typeof weatherRecord?.value === "string" ? weatherRecord.value : null,
      status: maxStatus(zoneRecords.map((record) => record.status)),
    };
  });
}

export function buildWeatherPoints(records: UnifiedLiveRecord[]): WeatherPoint[] {
  const supportedMetrics = ["condition_text", "temperature_c", "wind_kph", "precip_mm"];
  const offsets: Record<string, [number, number]> = {
    condition_text: [0, 0],
    temperature_c: [0.00011, -0.00008],
    wind_kph: [-0.0001, 0.00009],
    precip_mm: [0.00002, 0.00016],
  };

  return records
    .filter((record) => record.category === "weather" && supportedMetrics.includes(record.metric))
    .map((record) => {
      const place = resolveSitePlace(record) ?? getDefaultSitePlace();
      const fallbackCenter: [number, number] = [52.37278, 4.91535];
      const offset = offsets[record.metric] || [0, 0];
      const baseCenter = place
        ? place.geometry.type === "point"
          ? place.geometry.coordinates
          : place.labelPosition
        : fallbackCenter;
      return {
        id: record.id,
        center: [baseCenter[0] + offset[0], baseCenter[1] + offset[1]],
        zone: place?.displayName || "Unknown place",
        title: record.label,
        value: record.unit ? `${record.value ?? "n/a"} ${record.unit}` : String(record.value ?? "n/a"),
        status: record.status,
        observedAt: record.observedAt,
      };
    });
}

export function buildWarningPoints(records: UnifiedLiveRecord[]): WarningPoint[] {
  return records
    .filter((record) => record.category === "warning")
    .map((record) => {
      const place = resolveSitePlace(record) ?? getDefaultSitePlace();
      const center: [number, number] = place
        ? place.geometry.type === "point"
          ? place.geometry.coordinates
          : place.labelPosition
        : [52.37278, 4.91535];
      return {
        id: record.id,
        center,
        zone: place?.displayName || "Unknown place",
        title: record.label,
        detail: typeof record.value === "string" ? record.value : "Warning active",
        status: record.status,
        observedAt: record.observedAt,
      };
    });
}

export function buildSpatialSummary(overview: OpsLiveOverviewResponse, health: OpsHealthResponse | null): SpatialSummary {
  const sensorSummary = summarizeSensorPoints(getSensorPoints(health));
  const weatherCondition = overview.records.find(
    (record) => record.category === "weather" && record.metric === "condition_text",
  );
  const telraamFlow = overview.records.find(
    (record) => record.source === "telraam" && record.metric === "total_flow",
  );
  const warningCount = overview.records.filter((record) => record.category === "warning").length;

  return {
    gateFlowLabel: telraamFlow?.zone || "Kattenburgerstraat 7",
    gateFlow: telraamFlow ? toNumber(telraamFlow.value) : null,
    sensorCoverage: `${sensorSummary.installed} installed sensor locations`,
    installedSensors: sensorSummary.installed,
    liveSensors: sensorSummary.live,
    pendingSensors: sensorSummary.pending,
    currentWeather: weatherCondition
      ? `${weatherCondition.value ?? "Unknown"}`
      : "Weather source unavailable",
    warningCount,
    lastRefreshLabel: formatObservedAt(overview.generatedAt),
  };
}

export function formatTimestamp(value: string | null) {
  if (!value) return "No successful fetch yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusTone(
  status: UnifiedLiveRecord["status"] | "degraded" | "error",
): "slate" | "emerald" | "amber" | "rose" {
  if (status === "critical" || status === "error") return "rose";
  if (status === "warning" || status === "degraded") return "amber";
  if (status === "ok") return "emerald";
  return "slate";
}
