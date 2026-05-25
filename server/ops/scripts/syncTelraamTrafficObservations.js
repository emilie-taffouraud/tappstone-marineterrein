import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const TELRAAM_COLUMNS = [
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

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
    });

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumFields(row, fields) {
  return fields.reduce((sum, field) => sum + asNumber(row?.[field]), 0);
}

function normalizeTrafficRows(rawJson) {
  if (Array.isArray(rawJson?.report)) return rawJson.report;
  if (Array.isArray(rawJson?.results)) return rawJson.results;
  if (Array.isArray(rawJson?.data)) return rawJson.data;
  return [];
}

function toRecordedAtTimestamp(value) {
  if (!value) return null;

  const text = String(value).trim();
  const dateTimeMatch = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  if (dateTimeMatch) {
    const [, date, time] = dateTimeMatch;
    return `${date} ${time.length === 5 ? `${time}:00` : time}`;
  }

  const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) return `${dateMatch[1]} 00:00:00`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function buildCounts(row) {
  const vehicleBreakdown = {
    bus: sumFields(row, ["mode_bus_lft", "mode_bus_rgt"]),
    car: sumFields(row, ["mode_car_lft", "mode_car_rgt"]),
    lightTruck: sumFields(row, ["mode_lighttruck_lft", "mode_lighttruck_rgt"]),
    motorcycle: sumFields(row, ["mode_motorcycle_lft", "mode_motorcycle_rgt"]),
    tractor: sumFields(row, ["mode_tractor_lft", "mode_tractor_rgt"]),
    trailer: sumFields(row, ["mode_trailer_lft", "mode_trailer_rgt"]),
    truck: sumFields(row, ["mode_truck_lft", "mode_truck_rgt"]),
    stroller: sumFields(row, ["mode_stroller_lft", "mode_stroller_rgt"]),
    night: sumFields(row, ["mode_night_lft", "mode_night_rgt"]),
  };

  return {
    pedestrianCount: sumFields(row, ["mode_pedestrian_lft", "mode_pedestrian_rgt"]),
    bicycleCount: sumFields(row, ["mode_bicycle_lft", "mode_bicycle_rgt"]),
    vehicleCount:
      vehicleBreakdown.bus +
      vehicleBreakdown.car +
      vehicleBreakdown.lightTruck +
      vehicleBreakdown.motorcycle +
      vehicleBreakdown.tractor +
      vehicleBreakdown.trailer +
      vehicleBreakdown.truck,
    nightCount: vehicleBreakdown.night,
    vehicleBreakdown,
  };
}

async function fetchTelraamRows() {
  const apiKey = process.env.TELRAAM_API_KEY;
  if (!apiKey) throw new Error("TELRAAM_API_KEY is required.");

  const baseUrl = (process.env.TELRAAM_API_BASE_URL || "https://telraam-api.net").replace(/\/$/, "");
  const segmentId = String(process.env.TELRAAM_SEGMENT_ID || "9000006266");
  const lookbackHours = Number(process.env.TELRAAM_SYNC_LOOKBACK_HOURS || process.env.TELRAAM_LOOKBACK_HOURS || 48);
  const dateEnd = new Date();
  const dateStart = new Date(dateEnd.getTime() - lookbackHours * 60 * 60 * 1000);

  const response = await fetch(`${baseUrl}/advanced/reports/traffic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      level: "segments",
      format: "per-hour",
      id: segmentId,
      time_start: dateStart.toISOString(),
      time_end: dateEnd.toISOString(),
      columns: TELRAAM_COLUMNS.join(","),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telraam API error ${response.status}: ${await response.text()}`);
  }

  return {
    segmentId,
    rows: normalizeTrafficRows(await response.json()),
  };
}

async function ensureNightCountSchema(client) {
  await client.query(`
    ALTER TABLE public.traffic_observations
      ADD COLUMN IF NOT EXISTS night_count integer DEFAULT 0
  `);
  await client.query(`
    INSERT INTO public.metrics (metric_name, display_name, unit, category, description)
    VALUES (
      'night_count',
      'Night Mode Count',
      'counts',
      'traffic',
      'Telraam night-mode detections when travel mode cannot be classified'
    )
    ON CONFLICT (metric_name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        unit = EXCLUDED.unit,
        category = EXCLUDED.category,
        description = EXCLUDED.description
  `);
}

async function upsertTrafficRow(client, row, segmentId) {
  const recordedAt = toRecordedAtTimestamp(row.date || row.recorded_at || row.time || row.timestamp);
  if (!recordedAt) return "skipped";

  const counts = buildCounts(row);
  const zoneId = Number(process.env.TELRAAM_ZONE_ID || 1);
  const uptime = row.uptime === undefined || row.uptime === null ? null : asNumber(row.uptime);
  const params = [
    zoneId,
    recordedAt,
    counts.pedestrianCount,
    counts.bicycleCount,
    counts.vehicleCount,
    counts.nightCount,
    JSON.stringify(counts.vehicleBreakdown),
    "Telraam",
    Number(row.segment_id || segmentId),
    uptime,
  ];

  const update = await client.query(
    `
      UPDATE public.traffic_observations
      SET zone_id = $1,
          pedestrian_count = $3,
          bicycle_count = $4,
          vehicle_count = $5,
          night_count = $6,
          vehicle_type_breakdown = $7::jsonb,
          source_name = $8,
          uptime = $10
      WHERE segment_id = $9
        AND recorded_at = $2
    `,
    params,
  );

  if (update.rowCount > 0) return "updated";

  await client.query(
    `
      INSERT INTO public.traffic_observations (
        zone_id,
        recorded_at,
        pedestrian_count,
        bicycle_count,
        vehicle_count,
        night_count,
        vehicle_type_breakdown,
        source_name,
        segment_id,
        uptime
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
    `,
    params,
  );

  return "inserted";
}

async function main() {
  const { segmentId, rows } = await fetchTelraamRows();
  const client = await pool.connect();
  const totals = { inserted: 0, updated: 0, skipped: 0 };

  try {
    await client.query("BEGIN");
    await ensureNightCountSchema(client);

    for (const row of rows) {
      const result = await upsertTrafficRow(client, row, segmentId);
      totals[result] += 1;
    }

    await client.query("COMMIT");
    console.log(`Synced ${rows.length} Telraam rows for segment ${segmentId}.`);
    console.log(`Inserted: ${totals.inserted}, updated: ${totals.updated}, skipped: ${totals.skipped}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
