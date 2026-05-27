import { getZoneById, getZoneByLookupKey } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { createUnifiedRecord } from "../lib/normalize.js";
import { getSoundObservationSummary } from "../services/soundObservationStore.js";
import { startSoundMqttClient } from "./soundMqttClient.js";

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

function zoneLabel(zone) {
  return zone?.label || zone?.displayName || "Marineterrein";
}

function zoneLat(zone) {
  return zone?.lat ?? zone?.labelPosition?.[0] ?? null;
}

function zoneLon(zone) {
  return zone?.lon ?? zone?.labelPosition?.[1] ?? null;
}

function soundStatus(level) {
  if (level === null) return "unknown";
  if (level >= 80) return "warning";
  return "ok";
}

async function buildMqttSoundSource(env, fetchedAt) {
  const snapshot = startSoundMqttClient(env);
  const zone = getZoneById(env.soundMqttZoneId);
  const historicalSummary = await getSoundObservationSummary({ deviceId: snapshot.latest?.deviceId }).catch((error) => ({
    error: error.message,
    sampleCount: 0,
    averageSoundLevelDb: null,
    minSoundLevelDb: null,
    maxSoundLevelDb: null,
    latestObservedAt: null,
    dominantClassifications: [],
  }));

  if (!snapshot.enabled) {
    return {
      source: "sound",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error: snapshot.lastError || "Sound MQTT feed is not configured.",
    };
  }

  if (!snapshot.latest) {
    return {
      source: "sound",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error: snapshot.lastError || "Connected to the sound MQTT feed; waiting for the first sensor message.",
    };
  }

  const ageMs = Date.now() - new Date(snapshot.latest.receivedAt).getTime();
  const isStale = ageMs > env.soundMqttStaleAfterMs;
  const status = isStale ? "warning" : soundStatus(snapshot.latest.soundLevel);
  const sensorId = snapshot.latest.deviceId || "OE-007";
  const records = [
    createUnifiedRecord({
      id: `sound-${sensorId}-mqtt-level`,
      source: "sound",
      category: "sound",
      metric: "sound_level_db",
      label: `${zoneLabel(zone)} sound level`,
      value: snapshot.latest.soundLevel,
      unit: "dB",
      status,
      confidence: isStale ? "low" : "high",
      observedAt: snapshot.latest.observedAt,
      fetchedAt,
      lat: zoneLat(zone),
      lon: zoneLon(zone),
      zoneId: zone.id,
      zone: zoneLabel(zone),
      raw: snapshot.latest.raw,
    }),
    createUnifiedRecord({
      id: `sound-${sensorId}-mqtt-class`,
      source: "sound",
      category: "sound",
      metric: "sound_classification",
      label: `${zoneLabel(zone)} dominant sound`,
      value: snapshot.latest.soundClass,
      unit: null,
      status,
      confidence: snapshot.latest.soundClassScore === null ? "low" : "medium",
      observedAt: snapshot.latest.observedAt,
      fetchedAt,
      lat: zoneLat(zone),
      lon: zoneLon(zone),
      zoneId: zone.id,
      zone: zoneLabel(zone),
      raw: snapshot.latest.raw,
    }),
  ];

  if (historicalSummary.averageSoundLevelDb !== null) {
    records.push(
      createUnifiedRecord({
        id: `sound-${sensorId}-mqtt-level-7d-average`,
        source: "sound",
        category: "sound",
        metric: "sound_level_db_7d_average",
        label: `${zoneLabel(zone)} 7-day average sound level`,
        value: historicalSummary.averageSoundLevelDb,
        unit: "dB",
        status: soundStatus(historicalSummary.averageSoundLevelDb),
        confidence: historicalSummary.sampleCount >= 10 ? "medium" : "low",
        observedAt: historicalSummary.latestObservedAt || snapshot.latest.observedAt,
        fetchedAt,
        lat: zoneLat(zone),
        lon: zoneLon(zone),
        zoneId: zone.id,
        zone: zoneLabel(zone),
        raw: historicalSummary,
      }),
      createUnifiedRecord({
        id: `sound-${sensorId}-mqtt-level-7d-min`,
        source: "sound",
        category: "sound",
        metric: "sound_level_db_7d_min",
        label: `${zoneLabel(zone)} 7-day minimum sound level`,
        value: historicalSummary.minSoundLevelDb,
        unit: "dB",
        status: soundStatus(historicalSummary.minSoundLevelDb),
        confidence: historicalSummary.sampleCount >= 10 ? "medium" : "low",
        observedAt: historicalSummary.latestObservedAt || snapshot.latest.observedAt,
        fetchedAt,
        lat: zoneLat(zone),
        lon: zoneLon(zone),
        zoneId: zone.id,
        zone: zoneLabel(zone),
        raw: historicalSummary,
      }),
      createUnifiedRecord({
        id: `sound-${sensorId}-mqtt-level-7d-max`,
        source: "sound",
        category: "sound",
        metric: "sound_level_db_7d_max",
        label: `${zoneLabel(zone)} 7-day maximum sound level`,
        value: historicalSummary.maxSoundLevelDb,
        unit: "dB",
        status: soundStatus(historicalSummary.maxSoundLevelDb),
        confidence: historicalSummary.sampleCount >= 10 ? "medium" : "low",
        observedAt: historicalSummary.latestObservedAt || snapshot.latest.observedAt,
        fetchedAt,
        lat: zoneLat(zone),
        lon: zoneLon(zone),
        zoneId: zone.id,
        zone: zoneLabel(zone),
        raw: historicalSummary,
      }),
    );
  }

  if (historicalSummary.dominantClassifications.length) {
    records.push(
      createUnifiedRecord({
        id: `sound-${sensorId}-mqtt-class-7d-top`,
        source: "sound",
        category: "sound",
        metric: "sound_classification_7d_top",
        label: `${zoneLabel(zone)} common sound classes`,
        value: historicalSummary.dominantClassifications.map((item) => item.label).join(", "),
        unit: null,
        status,
        confidence: historicalSummary.sampleCount >= 10 ? "medium" : "low",
        observedAt: historicalSummary.latestObservedAt || snapshot.latest.observedAt,
        fetchedAt,
        lat: zoneLat(zone),
        lon: zoneLon(zone),
        zoneId: zone.id,
        zone: zoneLabel(zone),
        raw: historicalSummary,
      }),
    );
  }

  return {
    source: "sound",
    status,
    fetchedAt,
    lastSuccessAt: snapshot.latest.receivedAt,
    records,
    raw: {
      latest: snapshot.latest.raw,
      historicalSummary,
    },
    error: isStale ? "Latest sound MQTT message is older than the freshness window." : historicalSummary.error || null,
  };
}

export async function getSoundClassificationLiveData(env) {
  const fetchedAt = new Date().toISOString();

  if (env.soundMqttPassword) {
    return buildMqttSoundSource(env, fetchedAt);
  }

  if (!env.soundClassificationApiUrl) {
    return {
      source: "sound",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error:
        "Sound classification source is not connected yet. Configure the MQTT subscriber or a sound classification ingest URL.",
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
            label: `${zoneLabel(zone)} sound level`,
            value: soundLevel,
            unit: "dB",
            status: soundStatus(soundLevel),
            confidence: "medium",
            observedAt,
            fetchedAt,
            lat: zoneLat(zone),
            lon: zoneLon(zone),
            zoneId: zone.id,
            zone: zoneLabel(zone),
            raw: entry,
          }),
          createUnifiedRecord({
            id: `sound-${sensorId}-class`,
            source: "sound",
            category: "sound",
            metric: "sound_classification",
            label: `${zoneLabel(zone)} dominant sound`,
            value: soundClass,
            unit: null,
            status: soundStatus(soundLevel),
            confidence: "low",
            observedAt,
            fetchedAt,
            lat: zoneLat(zone),
            lon: zoneLon(zone),
            zoneId: zone.id,
            zone: zoneLabel(zone),
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
