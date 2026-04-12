import { getTelraamZone } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { createUnifiedRecord } from "../lib/normalize.js";

const TELRAAM_MODE_DEFINITIONS = [
  {
    metric: "bicycle_count",
    label: "Bicycles",
    directionalFields: ["mode_bicycle_lft", "mode_bicycle_rgt"],
    fallbackFields: ["bike", "bicycle", "bike_count", "bicycle_count"],
  },
  {
    metric: "bus_count",
    label: "Buses",
    directionalFields: ["mode_bus_lft", "mode_bus_rgt"],
    fallbackFields: ["bus", "bus_count"],
  },
  {
    metric: "car_count",
    label: "Cars",
    directionalFields: ["mode_car_lft", "mode_car_rgt"],
    fallbackFields: ["car", "car_count"],
  },
  {
    metric: "light_truck_count",
    label: "Light trucks",
    directionalFields: ["mode_lighttruck_lft", "mode_lighttruck_rgt"],
    fallbackFields: ["lighttruck", "light_truck", "lighttruck_count"],
  },
  {
    metric: "motorcycle_count",
    label: "Motorcycles",
    directionalFields: ["mode_motorcycle_lft", "mode_motorcycle_rgt"],
    fallbackFields: ["motorcycle", "motorcycle_count"],
  },
  {
    metric: "pedestrian_count",
    label: "Pedestrians",
    directionalFields: ["mode_pedestrian_lft", "mode_pedestrian_rgt"],
    fallbackFields: ["pedestrian", "pedestrian_count", "pedestrians"],
  },
  {
    metric: "stroller_count",
    label: "Strollers",
    directionalFields: ["mode_stroller_lft", "mode_stroller_rgt"],
    fallbackFields: ["stroller", "stroller_count"],
  },
  {
    metric: "tractor_count",
    label: "Tractors",
    directionalFields: ["mode_tractor_lft", "mode_tractor_rgt"],
    fallbackFields: ["tractor", "tractor_count"],
  },
  {
    metric: "trailer_count",
    label: "Trailers",
    directionalFields: ["mode_trailer_lft", "mode_trailer_rgt"],
    fallbackFields: ["trailer", "trailer_count"],
  },
  {
    metric: "truck_count",
    label: "Trucks",
    directionalFields: ["mode_truck_lft", "mode_truck_rgt"],
    fallbackFields: ["truck", "truck_count"],
  },
];

function resolveDirectionalCount(row, directionalFields = [], fallbackFields = []) {
  const directionalValues = directionalFields
    .map((field) => row?.[field])
    .filter((value) => value !== undefined && value !== null)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (directionalValues.length) {
    return directionalValues.reduce((sum, value) => sum + value, 0);
  }

  return resolveCount(row, fallbackFields);
}

const TELRAAM_ADVANCED_COLUMNS = [
  "segment_id",
  "date",
  "uptime",
  "mode_bicycle_lft",
  "mode_bicycle_rgt",
  "mode_bus_lft",
  "mode_bus_rgt",
  "mode_car_lft",
  "mode_car_rgt",
  "mode_lighttruck_lft",
  "mode_lighttruck_rgt",
  "mode_motorcycle_lft",
  "mode_motorcycle_rgt",
  "mode_pedestrian_lft",
  "mode_pedestrian_rgt",
  "mode_stroller_lft",
  "mode_stroller_rgt",
  "mode_tractor_lft",
  "mode_tractor_rgt",
  "mode_trailer_lft",
  "mode_trailer_rgt",
  "mode_truck_lft",
  "mode_truck_rgt",
  "mode_night_lft",
  "mode_night_rgt",
];

function resolveCount(row, candidates) {
  for (const candidate of candidates) {
    const value = row?.[candidate];
    if (value !== undefined && value !== null) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function statusFromTotalFlow(totalFlow) {
  if (totalFlow >= 250) return "warning";
  return "ok";
}

function buildTrafficRequestBody(env) {
  const dateEnd = new Date();
  const dateStart = new Date(dateEnd.getTime() - env.telraamLookbackHours * 60 * 60 * 1000);

  return {
    level: "segments",
    format: "per-hour",
    id: String(env.telraamSegmentId),
    time_start: dateStart.toISOString(),
    time_end: dateEnd.toISOString(),
    columns: TELRAAM_ADVANCED_COLUMNS.join(","),
  };
}

function normalizeTrafficRows(rawJson) {
  if (Array.isArray(rawJson?.report)) return rawJson.report;
  if (Array.isArray(rawJson?.results)) return rawJson.results;
  if (Array.isArray(rawJson?.data)) return rawJson.data;
  return [];
}

export async function getTelraamLiveData(env) {
  const fetchedAt = new Date().toISOString();

  if (!env.telraamApiKey) {
    return {
      source: "telraam",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error: "Missing TELRAAM_API_KEY",
    };
  }

  return getOrSetCache("ops:telraam", env.opsCacheTtlMs, async () => {
    try {
      const body = buildTrafficRequestBody(env);
      const url = `${env.telraamBaseUrl.replace(/\/$/, "")}/advanced/reports/traffic`;
      const rawJson = await fetchJson(url, {
        timeoutMs: env.opsHttpTimeoutMs,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": env.telraamApiKey,
        },
        body: JSON.stringify(body),
      });

      const rows = normalizeTrafficRows(rawJson);
      const latestRow = rows.at(-1) || {};
      const zone = getTelraamZone(env.telraamSegmentId);
      const observedAt =
        latestRow.date || latestRow.recorded_at || latestRow.time || latestRow.timestamp || fetchedAt;
      const modeCounts = Object.fromEntries(
        TELRAAM_MODE_DEFINITIONS.map((definition) => [
          definition.metric,
          resolveDirectionalCount(latestRow, definition.directionalFields, definition.fallbackFields),
        ]),
      );
      const pedestrians = modeCounts.pedestrian_count || 0;
      const bicycles = modeCounts.bicycle_count || 0;
      const vehicles =
        (modeCounts.bus_count || 0) +
        (modeCounts.car_count || 0) +
        (modeCounts.light_truck_count || 0) +
        (modeCounts.motorcycle_count || 0) +
        (modeCounts.tractor_count || 0) +
        (modeCounts.trailer_count || 0) +
        (modeCounts.truck_count || 0);
      const totalFlow = Object.values(modeCounts).reduce((sum, value) => sum + Number(value || 0), 0);

      const records = [
        ...TELRAAM_MODE_DEFINITIONS.map((definition) =>
          createUnifiedRecord({
            id: `telraam-${env.telraamSegmentId}-${definition.metric}`,
            source: "telraam",
            category: "mobility",
            metric: definition.metric,
            label: definition.label,
            value: modeCounts[definition.metric] || 0,
            unit: "count/hour",
            status: statusFromTotalFlow(totalFlow),
            confidence: "high",
            observedAt,
            fetchedAt,
            lat: zone.lat,
            lon: zone.lon,
            zoneId: zone.id,
            zone: zone.label,
            raw: latestRow,
          }),
        ),
        createUnifiedRecord({
          id: `telraam-${env.telraamSegmentId}-vehicles`,
          source: "telraam",
          category: "mobility",
          metric: "vehicle_count",
          label: "Vehicles",
          value: vehicles,
          unit: "count/hour",
          status: totalFlow >= 350 ? "warning" : "ok",
          confidence: "medium",
          observedAt,
          fetchedAt,
          lat: zone.lat,
          lon: zone.lon,
          zoneId: zone.id,
          zone: zone.label,
          raw: latestRow,
        }),
        createUnifiedRecord({
          id: `telraam-${env.telraamSegmentId}-total-flow`,
          source: "telraam",
          category: "mobility",
          metric: "total_flow",
          label: "Total traffic flow",
          value: totalFlow,
          unit: "count/hour",
          status: statusFromTotalFlow(totalFlow),
          confidence: "medium",
          observedAt,
          fetchedAt,
          lat: zone.lat,
          lon: zone.lon,
          zoneId: zone.id,
          zone: zone.label,
          raw: latestRow,
        }),
      ];

      return {
        source: "telraam",
        status: rows.length ? statusFromTotalFlow(totalFlow) : "unknown",
        fetchedAt,
        lastSuccessAt: fetchedAt,
        records,
        raw: {
          request: body,
          rows,
        },
        error: null,
      };
    } catch (error) {
      return {
        source: "telraam",
        status: "unknown",
        fetchedAt,
        lastSuccessAt: null,
        records: [],
        raw: null,
        error: error.message,
      };
    }
  });
}
