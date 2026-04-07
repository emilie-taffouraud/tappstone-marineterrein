import { getZoneById, inferZoneFromText } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { createUnifiedRecord } from "../lib/normalize.js";

function normalizeEntries(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.sensors)) return payload.sensors;
  return [];
}

function numericValue(entry, keys) {
  for (const key of keys) {
    const parsed = Number(entry?.[key]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function textValue(entry, keys) {
  for (const key of keys) {
    const value = entry?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function inferSensorZone(entry, index) {
  const explicitZone = textValue(entry, ["zone", "location", "zone_name", "area"]);
  if (explicitZone) return inferZoneFromText(explicitZone);

  const fallbackZones = ["codam", "tapp", "ahk-makerspace"];
  return getZoneById(fallbackZones[index] || "general");
}

function soundStatus(level) {
  if (level === null) return "unknown";
  if (level >= 80) return "warning";
  return "ok";
}

export async function getHusenseLiveData(env) {
  const fetchedAt = new Date().toISOString();

  if (!env.husenseApiUrl) {
    return {
      source: "husense",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error: "Awaiting Husense endpoint configuration for Marineterrein sound sensors.",
    };
  }

  return getOrSetCache("ops:husense", env.opsCacheTtlMs, async () => {
    try {
      const rawJson = await fetchJson(env.husenseApiUrl, {
        timeoutMs: env.opsHttpTimeoutMs,
        headers: env.husenseApiToken ? { Authorization: `Bearer ${env.husenseApiToken}` } : undefined,
      });

      const entries = normalizeEntries(rawJson);
      const records = entries.flatMap((entry, index) => {
        const zone = inferSensorZone(entry, index);
        const sensorId = textValue(entry, ["id", "sensor_id", "uuid", "name"]) || `sensor-${index + 1}`;
        const observedAt = textValue(entry, ["observed_at", "timestamp", "measured_at", "time"]) || fetchedAt;
        const soundLevel = numericValue(entry, ["sound_level_db", "db", "dba", "level"]);
        const soundClass =
          textValue(entry, ["sound_class", "classification", "predicted_sound", "label"]) || "Unclassified";

        return [
          createUnifiedRecord({
            id: `husense-${sensorId}-level`,
            source: "husense",
            category: "sound",
            metric: "sound_level_db",
            label: `${zone.label} sound level`,
            value: soundLevel,
            unit: "dB",
            status: soundStatus(soundLevel),
            confidence: "medium",
            observedAt,
            fetchedAt,
            lat: zone.lat,
            lon: zone.lon,
            zone: zone.label,
            raw: entry,
          }),
          createUnifiedRecord({
            id: `husense-${sensorId}-class`,
            source: "husense",
            category: "sound",
            metric: "sound_classification",
            label: `${zone.label} dominant sound`,
            value: soundClass,
            unit: null,
            status: soundStatus(soundLevel),
            confidence: "low",
            observedAt,
            fetchedAt,
            lat: zone.lat,
            lon: zone.lon,
            zone: zone.label,
            raw: entry,
          }),
        ];
      });

      return {
        source: "husense",
        status: records.length ? "ok" : "unknown",
        fetchedAt,
        lastSuccessAt: records.length ? fetchedAt : null,
        records,
        raw: rawJson,
        error: records.length ? null : "Husense endpoint responded, but no live Marineterrein sound records were available yet.",
      };
    } catch (error) {
      return {
        source: "husense",
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
