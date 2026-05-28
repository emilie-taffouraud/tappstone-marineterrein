import pg from "pg";
import { getZoneById } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { createUnifiedRecord } from "../lib/normalize.js";

let waterPool;

function hasWaterDatabaseConfig(env) {
  return Boolean(env.waterDatabaseUrl || (env.waterDbHost && env.waterDbName && env.waterDbUser));
}

function getWaterPool(env) {
  const ssl = env.waterDbSsl ? { rejectUnauthorized: false } : false;

  if (env.waterDatabaseUrl) {
    if (!waterPool) {
      waterPool = new pg.Pool({
        connectionString: env.waterDatabaseUrl,
        ssl,
        connectionTimeoutMillis: env.opsHttpTimeoutMs,
      });
    }
    return waterPool;
  }

  if (!hasWaterDatabaseConfig(env)) return null;

  if (!waterPool) {
    waterPool = new pg.Pool({
      host: env.waterDbHost,
      port: env.waterDbPort,
      database: env.waterDbName,
      user: env.waterDbUser,
      password: env.waterDbPassword,
      ssl,
      connectionTimeoutMillis: env.opsHttpTimeoutMs,
    });
  }

  return waterPool;
}

function waterStatus(value) {
  if (value === null) return "unknown";
  if (value < 8 || value > 26) return "warning";
  return "ok";
}

async function readWaterTemperatureFromDatabase(env) {
  const db = getWaterPool(env);
  if (!db) return null;

  const query = `
    select device_id, temp_c1, battery_v, received_at
    from temperature_readings
    where temp_c1 is not null
    order by received_at desc
    limit 1
  `;

  const result = await db.query(query);
  if (!result.rows.length) return null;

  const row = result.rows[0];
  const value = Number(row.temp_c1);
  if (!Number.isFinite(value)) return null;

  return {
    value,
    observedAt: row.received_at,
    sourceName: "upcloud-water-db",
    deviceId: row.device_id || null,
    batteryV: row.battery_v === null ? null : Number(row.battery_v),
  };
}

async function readWaterTemperatureStatsFromDatabase(env) {
  const db = getWaterPool(env);
  if (!db) return null;

  const query = `
    select
      avg(case
        when received_at >= date_trunc('day', now() - interval '1 day')
         and received_at < date_trunc('day', now())
        then temp_c1
      end) as yesterday_avg,
      min(case
        when received_at >= now() - interval '7 days'
        then temp_c1
      end) as trailing_week_min,
      max(case
        when received_at >= now() - interval '7 days'
        then temp_c1
      end) as trailing_week_max,
      avg(case
        when received_at >= now() - interval '7 days'
        then temp_c1
      end) as trailing_week_avg,
      count(case
        when received_at >= date_trunc('day', now() - interval '1 day')
         and received_at < date_trunc('day', now())
        then 1
      end) as yesterday_samples,
      count(case
        when received_at >= now() - interval '7 days'
        then 1
      end) as trailing_week_samples
    from temperature_readings
    where temp_c1 is not null
  `;

  const result = await db.query(query);
  const row = result.rows[0];
  if (!row) return null;

  const yesterdayAvg = row.yesterday_avg === null ? null : Number(row.yesterday_avg);
  const trailingWeekAvg = row.trailing_week_avg === null ? null : Number(row.trailing_week_avg);
  const trailingWeekMin = row.trailing_week_min === null ? null : Number(row.trailing_week_min);
  const trailingWeekMax = row.trailing_week_max === null ? null : Number(row.trailing_week_max);

  return {
    yesterdayAvg: Number.isFinite(yesterdayAvg) ? yesterdayAvg : null,
    trailingWeekAvg: Number.isFinite(trailingWeekAvg) ? trailingWeekAvg : null,
    trailingWeekMin: Number.isFinite(trailingWeekMin) ? trailingWeekMin : null,
    trailingWeekMax: Number.isFinite(trailingWeekMax) ? trailingWeekMax : null,
    yesterdaySamples: Number(row.yesterday_samples || 0),
    trailingWeekSamples: Number(row.trailing_week_samples || 0),
  };
}

async function readWaterTemperatureDailyHistoryFromDatabase(env) {
  const db = getWaterPool(env);
  if (!db) return [];

  const query = `
    select
      date_trunc('day', received_at)::date as date,
      avg(temp_c1) as avg,
      min(temp_c1) as min,
      max(temp_c1) as max
    from temperature_readings
    where temp_c1 is not null
      and received_at >= date_trunc('day', now() - interval '6 days')
    group by date_trunc('day', received_at)::date
    order by date asc
  `;

  const result = await db.query(query);

  return result.rows
    .map((row) => {
      const avg = row.avg === null ? null : Number(row.avg);
      const min = row.min === null ? null : Number(row.min);
      const max = row.max === null ? null : Number(row.max);

      return {
        date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
        avg: Number.isFinite(avg) ? avg : null,
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null,
      };
    })
    .filter((row) => row.date);
}

export async function getWaterTemperatureLiveData(env) {
  const fetchedAt = new Date().toISOString();
  const zone = getZoneById("swim-area");

  return getOrSetCache("ops:water-temperature:v2", env.opsCacheTtlMs, async () => {
    try {
      if (!hasWaterDatabaseConfig(env)) {
        throw new Error("Water temperature database is not configured.");
      }

      const [dbReading, dbStats, dailyHistory] = await Promise.all([
        readWaterTemperatureFromDatabase(env),
        readWaterTemperatureStatsFromDatabase(env),
        readWaterTemperatureDailyHistoryFromDatabase(env),
      ]);

      if (!dbReading) {
        throw new Error("No water temperature rows were found in temperature_readings.");
      }

      return {
        source: "water",
        status: waterStatus(dbReading.value),
        fetchedAt,
        lastSuccessAt: fetchedAt,
        records: [
          createUnifiedRecord({
            id: "water-temperature-binnenhaven",
            source: "water",
            category: "recreation",
            metric: "water_temperature_c",
            label: "Binnenhaven water temperature",
            value: dbReading.value,
            unit: "C",
            status: waterStatus(dbReading.value),
            confidence: "high",
            observedAt: dbReading.observedAt || fetchedAt,
            fetchedAt,
            lat: zone.lat,
            lon: zone.lon,
            zoneId: zone.id,
            zone: zone.label,
            raw: {
              source: dbReading.sourceName,
              deviceId: dbReading.deviceId,
              batteryV: Number.isFinite(dbReading.batteryV) ? dbReading.batteryV : null,
              history: dbStats,
              dailyHistory,
            },
          }),
        ],
        raw: {
          source: dbReading.sourceName,
          deviceId: dbReading.deviceId,
          batteryV: Number.isFinite(dbReading.batteryV) ? dbReading.batteryV : null,
          history: dbStats,
          dailyHistory,
        },
        error: null,
      };
    } catch (error) {
      return {
        source: "water",
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
