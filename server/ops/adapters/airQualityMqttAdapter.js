import pg from "pg";
import { getZoneById } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { createUnifiedRecord } from "../lib/normalize.js";

let airQualityPool;

const AIR_QUALITY_TABLE_CANDIDATES = [
  "mqtt_consumer",
  "mqtt_air_quality",
  "mqtt_air_quality_readings",
  "air_quality_mqtt",
  "air_quality_readings",
  "mqtt_readings",
  "mqtt_sensor_data",
  "mqtt_data",
  "mqtt_measurements",
  "air_mqtt",
  "airquality",
  "air_quality",
];

const AIR_QUALITY_METRICS = [
  { metric: "pm25", label: "PM2.5", unit: "ug/m3", columns: ["pm25", "pm2_5", "pm_25", "pm2_5_ug_m3", "pm2p5", "pm2_5_atm", "pm2_5_cf_1"] },
  { metric: "pm10", label: "PM10", unit: "ug/m3", columns: ["pm10", "pm_10", "pm10_ug_m3", "pm10_atm", "pm10_cf_1"] },
  { metric: "no2", label: "NO2", unit: "ug/m3", columns: ["no2", "no2_ug_m3", "nitrogen_dioxide"] },
  { metric: "co2", label: "CO2", unit: "ppm", columns: ["co2", "co2_ppm", "carbon_dioxide", "co2eq"] },
  { metric: "humidity", label: "Humidity", unit: "%", columns: ["humidity", "relative_humidity", "humidity_pct", "relativeHumidity", "relativehumidity", "relative_humidity_pct", "rh", "hum"] },
  { metric: "temperature_c", label: "Air temperature", unit: "C", columns: ["temperature", "temperature_c", "temp", "temp_c", "air_temperature", "air_temperature_c", "temperature_air", "tempC", "tempc", "temp_c1"] },
];

const AIR_QUALITY_DEVICE_COLUMNS = [
  "device_id",
  "dev_id",
  "sensor_id",
  "sensor",
  "name",
  "camera_id",
  "camera",
  "camera_name",
  "device_name",
  "topic",
  "mqtt_topic",
];

const AIR_QUALITY_PAYLOAD_COLUMNS = [
  "payload",
  "raw_payload",
  "decoded_payload",
  "payload_fields",
  "data",
  "message",
  "body",
  "raw",
  "json",
  "uplink_message",
];

const AIR_QUALITY_OBSERVED_COLUMNS = [
  "received_at",
  "recorded_at",
  "observed_at",
  "time",
  "timestamp",
  "created_at",
  "inserted_at",
  "published_at",
];

function hasWaterDatabaseConfig(env) {
  return Boolean(env.waterDatabaseUrl || (env.waterDbHost && env.waterDbName && env.waterDbUser));
}

function resolveAirQualityDatabaseConfig(env) {
  if (env.airQualityDatabaseUrl) {
    return {
      source: "air-quality-db-url",
      config: {
        connectionString: env.airQualityDatabaseUrl,
        ssl: env.airQualityDbSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: env.opsHttpTimeoutMs,
      },
    };
  }

  if (env.airQualityDbHost && env.airQualityDbName && env.airQualityDbUser) {
    return {
      source: "air-quality-db",
      config: {
        host: env.airQualityDbHost,
        port: env.airQualityDbPort,
        database: env.airQualityDbName,
        user: env.airQualityDbUser,
        password: env.airQualityDbPassword,
        ssl: env.airQualityDbSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: env.opsHttpTimeoutMs,
      },
    };
  }

  if (env.waterDatabaseUrl) {
    return {
      source: "water-db-url-fallback",
      config: {
        connectionString: env.waterDatabaseUrl,
        ssl: env.waterDbSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: env.opsHttpTimeoutMs,
      },
    };
  }

  if (hasWaterDatabaseConfig(env)) {
    return {
      source: "water-db-fallback",
      config: {
        host: env.waterDbHost,
        port: env.waterDbPort,
        database: env.waterDbName,
        user: env.waterDbUser,
        password: env.waterDbPassword,
        ssl: env.waterDbSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: env.opsHttpTimeoutMs,
      },
    };
  }

  return null;
}

function getPool(env) {
  const resolved = resolveAirQualityDatabaseConfig(env);
  if (!resolved) return null;

  if (!airQualityPool) {
    airQualityPool = new pg.Pool(resolved.config);
  }

  return airQualityPool;
}

function airQualityCacheKey(env) {
  const host = env.airQualityDbHost || (env.airQualityDatabaseUrl ? "url" : env.waterDbHost || "none");
  const db = env.airQualityDbName || (env.airQualityDatabaseUrl ? "url" : env.waterDbName || "none");
  const table = env.airQualityMqttTable || "auto";
  const prefix = env.airQualityDevicePrefix || "all";
  return `ops:air-quality-mqtt:v2:${host}:${db}:${table}:${prefix}`;
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
  const lowerToColumn = new Map([...columns].map((column) => [String(column).toLowerCase(), column]));
  return candidates.map((candidate) => lowerToColumn.get(String(candidate).toLowerCase())).find(Boolean) || null;
}

function existingColumns(columns, candidates) {
  const lowerToColumn = new Map([...columns].map((column) => [String(column).toLowerCase(), column]));
  return candidates
    .map((candidate) => lowerToColumn.get(String(candidate).toLowerCase()))
    .filter(Boolean);
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (Buffer.isBuffer(value)) {
    return parsePayload(value.toString("utf8"));
  }
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function mergePayloadSources(row, payloadColumns = []) {
  const columns = [...new Set([...payloadColumns, ...AIR_QUALITY_PAYLOAD_COLUMNS])];
  const payloads = columns.map((column) => parsePayload(row[column])).filter(Boolean);

  if (!payloads.length) return null;

  return payloads.reduce((merged, payload) => ({ ...merged, ...payload }), {});
}

function findNestedValue(payload, keys) {
  if (!payload || typeof payload !== "object") return null;
  const queue = [payload];
  const lookup = new Set(keys.map((key) => key.toLowerCase()));

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;

    for (const [key, value] of Object.entries(current)) {
      if (lookup.has(key.toLowerCase())) return value;
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return null;
}

function valueFromPayload(payload, columns) {
  if (!payload || typeof payload !== "object") return null;

  for (const key of columns) {
    const parsed = firstFiniteNumber(
      payload[key],
      payload[key.toUpperCase()],
      findNestedValue(payload, [key, key.toUpperCase()]),
    );
    if (parsed !== null) return parsed;
  }

  return null;
}

function valueFromRow(row, columns) {
  const lowerToColumn = new Map(Object.keys(row).map((column) => [String(column).toLowerCase(), column]));
  return firstFiniteNumber(
    ...columns.map((column) => {
      const rowColumn = lowerToColumn.get(String(column).toLowerCase());
      return rowColumn ? row[rowColumn] : undefined;
    }),
  );
}

function safeText(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function deviceIdFromPayload(payload) {
  const direct = safeText(
    findNestedValue(payload, [
      ...AIR_QUALITY_DEVICE_COLUMNS,
      "deviceId",
      "devId",
      "device_id",
      "dev_eui",
      "devEui",
    ]),
  );
  if (direct) return direct;

  const nestedDeviceId = safeText(
    payload?.end_device_ids?.device_id ??
      payload?.end_device_ids?.dev_eui ??
      payload?.deviceInfo?.deviceName ??
      payload?.deviceInfo?.devEui ??
      payload?.device_info?.device_name ??
      payload?.application_ids?.application_id,
  );
  if (nestedDeviceId) {
    return nestedDeviceId;
  }

  return null;
}

function payloadContainsDevicePrefix(payload, prefix) {
  if (!prefix || !payload) return false;
  try {
    return JSON.stringify(payload).toLowerCase().includes(prefix.toLowerCase());
  } catch {
    return false;
  }
}

function matchesDevicePrefix(value, prefix) {
  if (!prefix) return true;
  if (value === null || value === undefined) return false;
  return String(value).trim().toLowerCase().includes(prefix.toLowerCase());
}

function statusForMetric(metric, value) {
  if (value === null) return "unknown";
  if (metric === "pm25" && value > 25) return "warning";
  if (metric === "pm10" && value > 50) return "warning";
  if (metric === "no2" && value > 40) return "warning";
  if (metric === "co2" && value > 1200) return "warning";
  return "ok";
}

async function readLatestAirQuality(db, tableName, env) {
  const columns = await readColumns(db, tableName);
  const observedColumn = firstExisting(columns, AIR_QUALITY_OBSERVED_COLUMNS);
  const payloadColumns = existingColumns(columns, AIR_QUALITY_PAYLOAD_COLUMNS);
  const deviceColumn = firstExisting(columns, AIR_QUALITY_DEVICE_COLUMNS);
  const deviceColumns = existingColumns(columns, AIR_QUALITY_DEVICE_COLUMNS);
  const devicePrefix = env.airQualityDevicePrefix;
  const metricColumns = existingColumns(
    columns,
    AIR_QUALITY_METRICS.flatMap((definition) => definition.columns),
  );
  const selectColumns = [...new Set([
    observedColumn,
    ...payloadColumns,
    ...deviceColumns,
    ...metricColumns,
  ].filter(Boolean))];

  if (!observedColumn) {
    throw new Error(`Air-quality table ${tableName} is missing a timestamp column. Tried: ${AIR_QUALITY_OBSERVED_COLUMNS.join(", ")}.`);
  }

  if (selectColumns.length <= 1) {
    throw new Error(`Air-quality table ${tableName} is missing readable payload, camera/device, or metric columns.`);
  }

  const sql = `
    SELECT ${selectColumns.map(quoteIdentifier).join(", ")}
    FROM ${quoteIdentifier(tableName)}
    ORDER BY ${quoteIdentifier(observedColumn)} DESC
    LIMIT $1
  `;
  const result = await db.query(sql, [env.airQualityLookbackRows]);
  const candidates = result.rows.map((row) => {
    const payload = mergePayloadSources(row, payloadColumns);
    const deviceId =
      deviceColumns.map((column) => safeText(row[column])).find(Boolean) ??
      deviceIdFromPayload(payload);

    return {
      row,
      payload,
      observedAt: row[observedColumn],
      deviceId,
    };
  });
  const latest = devicePrefix
    ? candidates.find(
        (candidate) =>
          matchesDevicePrefix(candidate.deviceId, devicePrefix) ||
          deviceColumns.some((column) => matchesDevicePrefix(candidate.row[column], devicePrefix)) ||
          payloadContainsDevicePrefix(candidate.payload, devicePrefix),
      )
    : candidates[0];
  if (!latest) return null;

  return {
    row: latest.row,
    payload: latest.payload,
    observedAt: latest.observedAt,
    deviceId: latest.deviceId,
  };
}

export async function inspectAirQualityMqtt(env) {
  const dbConfig = resolveAirQualityDatabaseConfig(env);
  if (!dbConfig) {
    return {
      status: "error",
      error: "Air-quality database is not configured. Set AIR_QUALITY_DB_* or AIR_QUALITY_DATABASE_URL.",
      databaseSource: null,
    };
  }

  try {
    const db = getPool(env);
    const tableName = await resolveTableName(db, env);
    if (!tableName) {
      return {
        status: "error",
        error: "No MQTT air-quality table found.",
        databaseSource: dbConfig.source,
        configuredTable: env.airQualityMqttTable || null,
      };
    }

    const columns = await readColumns(db, tableName);
    const latest = await readLatestAirQuality(db, tableName, env);
    const metrics = latest
      ? AIR_QUALITY_METRICS.map((definition) => {
          const value = valueFromRow(latest.row, definition.columns) ?? valueFromPayload(latest.payload, definition.columns);
          return {
            metric: definition.metric,
            label: definition.label,
            hasValue: value !== null,
            value,
            unit: definition.unit,
          };
        })
      : [];

    return {
      status: latest && metrics.some((metric) => metric.hasValue) ? "ok" : "unknown",
      databaseSource: dbConfig.source,
      tableName,
      configuredTable: env.airQualityMqttTable || null,
      devicePrefix: env.airQualityDevicePrefix || null,
      selectedDeviceId: latest?.deviceId || null,
      selectedObservedAt: latest?.observedAt || null,
      columns: [...columns].sort(),
      metrics,
      error: latest ? null : "No matching MQTT row was found for the configured air-quality device prefix.",
    };
  } catch (error) {
    return {
      status: "error",
      databaseSource: dbConfig.source,
      configuredTable: env.airQualityMqttTable || null,
      devicePrefix: env.airQualityDevicePrefix || null,
      error: error.message,
    };
  }
}

export async function getAirQualityMqttLiveData(env) {
  const fetchedAt = new Date().toISOString();

  return getOrSetCache(airQualityCacheKey(env), env.opsCacheTtlMs, async () => {
    try {
      const db = getPool(env);
      if (!db) {
        throw new Error("Air-quality database is not configured. Set AIR_QUALITY_DB_* or AIR_QUALITY_DATABASE_URL.");
      }

      const tableName = await resolveTableName(db, env);
      if (!tableName) {
        throw new Error("No MQTT air-quality table found. Set AIR_QUALITY_MQTT_TABLE to the table name in the air-quality database.");
      }

      const latest = await readLatestAirQuality(db, tableName, env);
      if (!latest) {
        throw new Error(
          env.airQualityDevicePrefix
            ? `No rows were found in ${tableName} for camera/device prefix ${env.airQualityDevicePrefix}.`
            : `No rows were found in ${tableName}.`,
        );
      }

      const zone = getZoneById("general");
      const records = AIR_QUALITY_METRICS.map((definition) => {
        const directValue = valueFromRow(latest.row, definition.columns);
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
