import { getZoneById, getZoneByLookupKey } from "../config/zones.js";
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

function resolveSensorZone(entry) {
  const explicitZone = textValue(entry, ["zone", "location", "zone_name", "area"]);
  if (explicitZone) return getZoneByLookupKey(explicitZone);
  return getZoneById("general");
}

function soundStatus(level) {
  if (level === null) return "unknown";
  if (level >= 80) return "warning";
  return "ok";
}

export async function getSoundClassificationLiveData(env) {
  const fetchedAt = new Date().toISOString();

  if (!env.soundClassificationApiUrl) {
    return {
      source: "sound",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error:
        "Sound classification source is not connected yet. Configure an ingest URL now or add the MQTT subscriber for the sound sensor feed.",
    };
  }

  return getOrSetCache("ops:sound-classification", env.opsCacheTtlMs, async () => {
    try {
      const rawJson = await fetchJson(env.soundClassificationApiUrl, {
        timeoutMs: env.opsHttpTimeoutMs,
        headers: env.soundClassificationApiToken
          ? { Authorization: `Bearer ${env.soundClassificationApiToken}` }
          : undefined,
      });

      const entries = normalizeEntries(rawJson);
      const records = entries.flatMap((entry, index) => {
        const zone = resolveSensorZone(entry);
        const sensorId = textValue(entry, ["id", "sensor_id", "uuid", "name"]) || `sensor-${index + 1}`;
        const observedAt = textValue(entry, ["observed_at", "timestamp", "measured_at", "time"]) || fetchedAt;
        const soundLevel = numericValue(entry, ["sound_level_db", "noise_db", "db", "dba", "level"]);
        const soundClass =
          textValue(entry, ["sound_class", "classification", "predicted_sound", "label"]) || "Unclassified";

        return [
          createUnifiedRecord({
            id: `sound-${sensorId}-level`,
            source: "sound",
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
            zoneId: zone.id,
            zone: zone.label,
            raw: entry,
          }),
          createUnifiedRecord({
            id: `sound-${sensorId}-class`,
            source: "sound",
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
            zoneId: zone.id,
            zone: zone.label,
            raw: entry,
          }),
        ];
      });

      return {
        source: "sound",
        status: records.length ? "ok" : "unknown",
        fetchedAt,
        lastSuccessAt: records.length ? fetchedAt : null,
        records,
        raw: rawJson,
        error: records.length ? null : "Sound source responded, but no sound classification records were available yet.",
      };
    } catch (error) {
      return {
        source: "sound",
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
