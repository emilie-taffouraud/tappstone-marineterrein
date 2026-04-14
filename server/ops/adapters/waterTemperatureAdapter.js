import pg from "pg";
import { getZoneById } from "../config/zones.js";
import { getOrSetCache } from "../lib/cache.js";
import { createUnifiedRecord } from "../lib/normalize.js";

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

function waterStatus(value) {
  if (value === null) return "unknown";
  if (value < 8 || value > 26) return "warning";
  return "ok";
}

function parseConfiguredValue(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWaterTemperature(html) {
  const candidates = [
    /watertemperatuur[\s\S]{0,120}?(\d{1,2}(?:[.,]\d)?)\s*[°Â]?\s*C/i,
    /(\d{1,2}(?:[.,]\d)?)\s*[°Â]?\s*C[\s\S]{0,80}?water/i,
    /(\d{1,2}(?:[.,]\d)?)\s*&deg;\s*C/i,
  ];

  for (const pattern of candidates) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const parsed = Number(match[1].replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function parseWaterTemperaturePayload(payload) {
  const candidates = [
    payload?.watertemperatuur,
    payload?.water_temperature,
    payload?.temperature,
    payload?.data?.watertemperatuur,
    payload?.data?.water_temperature,
  ];

  for (const candidate of candidates) {
    const parsed = parseConfiguredValue(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

async function readWaterTemperatureFromDatabase() {
  const db = getPool();
  if (!db) return null;

  const query = `
    select recorded_at, water_temperature, source_name
    from water_quality_observations
    where water_temperature is not null
    order by recorded_at desc
    limit 1
  `;

  const result = await db.query(query);
  if (!result.rows.length) return null;

  const row = result.rows[0];
  const value = Number(row.water_temperature);
  if (!Number.isFinite(value)) return null;

  return {
    value,
    observedAt: row.recorded_at,
    sourceName: row.source_name || "database",
  };
}

async function readWaterTemperatureStatsFromDatabase() {
  const db = getPool();
  if (!db) return null;

  const query = `
    select
      avg(case
        when recorded_at >= date_trunc('day', now() - interval '1 day')
         and recorded_at < date_trunc('day', now())
        then water_temperature
      end) as yesterday_avg,
      avg(case
        when recorded_at >= now() - interval '7 days'
        then water_temperature
      end) as trailing_week_avg,
      count(case
        when recorded_at >= date_trunc('day', now() - interval '1 day')
         and recorded_at < date_trunc('day', now())
        then 1
      end) as yesterday_samples,
      count(case
        when recorded_at >= now() - interval '7 days'
        then 1
      end) as trailing_week_samples
    from water_quality_observations
    where water_temperature is not null
  `;

  const result = await db.query(query);
  const row = result.rows[0];
  if (!row) return null;

  const yesterdayAvg = row.yesterday_avg === null ? null : Number(row.yesterday_avg);
  const trailingWeekAvg = row.trailing_week_avg === null ? null : Number(row.trailing_week_avg);

  return {
    yesterdayAvg: Number.isFinite(yesterdayAvg) ? yesterdayAvg : null,
    trailingWeekAvg: Number.isFinite(trailingWeekAvg) ? trailingWeekAvg : null,
    yesterdaySamples: Number(row.yesterday_samples || 0),
    trailingWeekSamples: Number(row.trailing_week_samples || 0),
  };
}

export async function getWaterTemperatureLiveData(env) {
  const fetchedAt = new Date().toISOString();
  const zone = getZoneById("swim-area");

  return getOrSetCache("ops:water-temperature", env.opsCacheTtlMs, async () => {
    try {
      const configured = parseConfiguredValue(env.waterTemperatureValue);
      if (configured !== null) {
        return {
          source: "water",
          status: waterStatus(configured),
          fetchedAt,
          lastSuccessAt: fetchedAt,
          records: [
            createUnifiedRecord({
              id: "water-temperature-binnenhaven",
              source: "water",
              category: "recreation",
              metric: "water_temperature_c",
              label: "Binnenhaven water temperature",
              value: configured,
              unit: "C",
              status: waterStatus(configured),
              confidence: "medium",
              observedAt: fetchedAt,
              fetchedAt,
              lat: zone.lat,
              lon: zone.lon,
              zoneId: zone.id,
              zone: zone.label,
              raw: { source: "env" },
            }),
          ],
          raw: { source: "env" },
          error: null,
        };
      }

      const [dbReading, dbStats] = await Promise.all([
        readWaterTemperatureFromDatabase().catch(() => null),
        readWaterTemperatureStatsFromDatabase().catch(() => null),
      ]);
      if (dbReading) {
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
                source: dbReading.sourceName || "database",
                history: dbStats,
              },
            }),
          ],
          raw: {
            source: dbReading.sourceName || "database",
            history: dbStats,
          },
          error: null,
        };
      }

      const response = await fetch(env.waterTemperatureUrl, {
        headers: { "User-Agent": "ops-dashboard/1.0" },
      });

      if (!response.ok) {
        throw new Error(`Water page request failed with ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      let temperature = null;

      if (contentType.includes("application/json")) {
        const payload = await response.json();
        temperature = parseWaterTemperaturePayload(payload);
      } else {
        const html = await response.text();
        temperature = parseWaterTemperature(html);
      }

      if (temperature === null) {
        return {
          source: "water",
          status: "unknown",
          fetchedAt,
          lastSuccessAt: null,
          records: [],
          raw: null,
          error:
            "No numeric water temperature was present in the public response. The adapter now checks configured values, database readings, and the Marineterrein sensors API before falling back.",
        };
      }

      return {
        source: "water",
        status: waterStatus(temperature),
        fetchedAt,
        lastSuccessAt: fetchedAt,
        records: [
          createUnifiedRecord({
            id: "water-temperature-binnenhaven",
            source: "water",
            category: "recreation",
            metric: "water_temperature_c",
            label: "Binnenhaven water temperature",
            value: temperature,
            unit: "C",
            status: waterStatus(temperature),
            confidence: "medium",
            observedAt: fetchedAt,
            fetchedAt,
            lat: zone.lat,
            lon: zone.lon,
            zoneId: zone.id,
            zone: zone.label,
            raw: { sourceUrl: env.waterTemperatureUrl },
          }),
        ],
        raw: { sourceUrl: env.waterTemperatureUrl },
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
