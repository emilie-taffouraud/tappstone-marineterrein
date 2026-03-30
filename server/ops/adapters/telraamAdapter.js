import { getTelraamZone } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { createUnifiedRecord } from "../lib/normalize.js";

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
      const url = `${env.telraamBaseUrl.replace(/\/$/, "")}/v1/reports/traffic`;
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
      const pedestrians = resolveCount(latestRow, ["pedestrian", "pedestrian_count", "pedestrians"]);
      const bicycles = resolveCount(latestRow, ["bike", "bicycle", "bike_count", "bicycle_count"]);
      const cars = resolveCount(latestRow, ["car", "vehicle", "car_count", "vehicle_count"]);
      const heavy = resolveCount(latestRow, ["heavy", "heavy_count", "heavy_vehicle"]);
      const totalFlow = pedestrians + bicycles + cars + heavy;

      const records = [
        createUnifiedRecord({
          id: `telraam-${env.telraamSegmentId}-pedestrians`,
          source: "telraam",
          category: "mobility",
          metric: "pedestrian_count",
          label: "Pedestrians",
          value: pedestrians,
          unit: "count/hour",
          status: statusFromTotalFlow(totalFlow),
          confidence: "high",
          observedAt,
          fetchedAt,
          lat: zone.lat,
          lon: zone.lon,
          zone: zone.label,
          raw: latestRow,
        }),
        createUnifiedRecord({
          id: `telraam-${env.telraamSegmentId}-bicycles`,
          source: "telraam",
          category: "mobility",
          metric: "bicycle_count",
          label: "Bicycles",
          value: bicycles,
          unit: "count/hour",
          status: statusFromTotalFlow(totalFlow),
          confidence: "high",
          observedAt,
          fetchedAt,
          lat: zone.lat,
          lon: zone.lon,
          zone: zone.label,
          raw: latestRow,
        }),
        createUnifiedRecord({
          id: `telraam-${env.telraamSegmentId}-vehicles`,
          source: "telraam",
          category: "mobility",
          metric: "vehicle_count",
          label: "Vehicles",
          value: cars + heavy,
          unit: "count/hour",
          status: totalFlow >= 350 ? "warning" : "ok",
          confidence: "medium",
          observedAt,
          fetchedAt,
          lat: zone.lat,
          lon: zone.lon,
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
