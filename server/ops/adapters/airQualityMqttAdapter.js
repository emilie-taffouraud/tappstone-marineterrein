import pg from "pg";
import { getZoneById } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { createUnifiedRecord } from "../lib/normalize.js";

let airQualityPool;

const AIR_QUALITY_TABLE_CANDIDATES = [
  "mqtt_air_quality",
  "mqtt_air_quality_readings",
  "air_quality_mqtt",
  "air_quality_readings",
  "mqtt_readings",
];

const AIR_QUALITY_METRICS = [
  { metric: "pm25", label: "PM2.5", unit: "ug/m3", columns: ["pm25", "pm2_5", "pm_25", "pm2_5_ug_m3"] },
  { metric: "pm10", label: "PM10", unit: "ug/m3", columns: ["pm10", "pm_10", "pm10_ug_m3"] },
  { metric: "no2", label: "NO2", unit: "ug/m3", columns: ["no2", "no2_ug_m3", "nitrogen_dioxide"] },
  { metric: "co2", label: "CO2", unit: "ppm", columns: ["co2", "co2_ppm", "carbon_dioxide"] },
  { metric: "humidity", label: "Humidity", unit: "%", columns: ["humidity", "relative_humidity", "humidity_pct"] },
  { metric: "temperature_c", label: "Air temperature", unit: "C", columns: ["temperature", "temperature_c", "temp", "temp_c"] },
];

function hasWaterDatabaseConfig(env) {
  return Boolean(env.waterDatabaseUrl || (env.waterDbHost && env.waterDbName && env.waterDbUser));
}

function getPool(env) {
  const ssl = env.waterDbSsl ? { rejectUnauthorized: false } : false;

  if (env.waterDatabaseUrl) {
    if (!airQualityPool) {
      airQualityPool = new pg.Pool({
        connectionString: env.waterDatabaseUrl,
        ssl,
        connectionTimeoutMillis: env.opsHttpTimeoutMs,
      });
    }
    return airQualityPool;
  }

  if (!hasWaterDatabaseConfig(env)) return null;

  if (!airQualityPool) {
    airQualityPool = new pg.Pool({
      host: env.waterDbHost,
      port: env.waterDbPort,
      database: env.waterDbName,
      user: env.waterDbUser,
      password: env.waterDbPassword,
      ssl,
      connectionTimeoutMillis: env.opsHttpTimeoutMs,
    });
  }

  return airQualityPool;
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function tableExists(db, tableName) {
  const result = await db.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
    `,
    [tableName],
  );

  return result.rowCount > 0;
}

async function resolveTableName(db, env) {
  const candidates = [env.airQualityMqttTable, ...AIR_QUALITY_TABLE_CANDIDATES].filter(Boolean);

  for (const tableName of candidates) {
    if (await tableExists(db, tableName)) return tableName;
  }

  return null;
}

async function readColumns(db, tableName) {
  const result = await db.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function firstExisting(columns, candidates) {
  return candidates.find((candidate) => columns.has(candidate)) || null;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function valueFromPayload(payload, columns) {
  if (!payload || typeof payload !== "object") return null;

  for (const key of columns) {
    const parsed = firstFiniteNumber(payload[key], payload[key.toUpperCase()]);
    if (parsed !== null) return parsed;
  }

  return null;
}

function statusForMetric(metric, value) {
  if (value === null) return "unknown";
  if (metric === "pm25" && value > 25) return "warning";
  if (metric === "pm10" && value > 50) return "warning";
  if (metric === "no2" && value > 40) return "warning";
  if (metric === "co2" && value > 1200) return "warning";
  return "ok";
}

async function readLatestAirQuality(db, tableName) {
  const columns = await readColumns(db, tableName);
  const observedColumn = firstExisting(columns, ["received_at", "recorded_at", "observed_at", "time", "timestamp", "created_at"]);
  const payloadColumn = firstExisting(columns, ["payload", "raw_payload", "decoded_payload", "payload_fields", "data"]);
  const deviceColumn = firstExisting(columns, ["device_id", "dev_id", "sensor_id", "sensor", "name"]);
  const selectColumns = [...new Set([
    observedColumn,
    payloadColumn,
    deviceColumn,
    ...AIR_QUALITY_METRICS.flatMap((definition) => definition.columns).filter((column) => columns.has(column)),
  ].filter(Boolean))];

  if (!observedColumn || !selectColumns.length) {
    throw new Error(`Air-quality table ${tableName} is missing a timestamp or readable metric columns.`);
  }

  const sql = `
    SELECT ${selectColumns.map(quoteIdentifier).join(", ")}
    FROM ${quoteIdentifier(tableName)}
    ORDER BY ${quoteIdentifier(observedColumn)} DESC
    LIMIT 1
  `;
  const result = await db.query(sql);
  const row = result.rows[0];
  if (!row) return null;

  const payload = payloadColumn && row[payloadColumn] && typeof row[payloadColumn] === "object" ? row[payloadColumn] : null;

  return {
    row,
    payload,
    observedAt: row[observedColumn],
    deviceId: deviceColumn ? row[deviceColumn] : null,
  };
}

export async function getAirQualityMqttLiveData(env) {
  const fetchedAt = new Date().toISOString();

  return getOrSetCache("ops:air-quality-mqtt:v1", env.opsCacheTtlMs, async () => {
    try {
      const db = getPool(env);
      if (!db) {
        throw new Error("Water database is not configured for MQTT air-quality data.");
      }

      const tableName = await resolveTableName(db, env);
      if (!tableName) {
        throw new Error("No MQTT air-quality table found. Set AIR_QUALITY_MQTT_TABLE to the table name in the water database.");
      }

      const latest = await readLatestAirQuality(db, tableName);
      if (!latest) {
        throw new Error(`No rows were found in ${tableName}.`);
      }

      const zone = getZoneById("general");
      const records = AIR_QUALITY_METRICS.map((definition) => {
        const directValue = firstFiniteNumber(...definition.columns.map((column) => latest.row[column]));
        const value = directValue ?? valueFromPayload(latest.payload, definition.columns);
        if (value === null) return null;

        return createUnifiedRecord({
          id: `air-${definition.metric}`,
          source: "air",
          category: "weather",
          metric: definition.metric,
          label: definition.label,
          value,
          unit: definition.unit,
          status: statusForMetric(definition.metric, value),
          confidence: "medium",
          observedAt: latest.observedAt || fetchedAt,
          fetchedAt,
          lat: zone.lat,
          lon: zone.lon,
          zoneId: zone.id,
          zone: zone.label,
          raw: {
            tableName,
            deviceId: latest.deviceId,
          },
        });
      }).filter(Boolean);

      return {
        source: "air",
        status: records.length ? "ok" : "unknown",
        fetchedAt,
        lastSuccessAt: records.length ? fetchedAt : null,
        records,
        raw: {
          tableName,
          deviceId: latest.deviceId,
        },
        error: records.length ? null : `No supported air-quality metrics were found in ${tableName}.`,
      };
    } catch (error) {
      return {
        source: "air",
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
