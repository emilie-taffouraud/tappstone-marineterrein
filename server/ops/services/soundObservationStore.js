import { Pool } from "pg";

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = process.env.DATABASE_URL
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

  return pool;
}

export async function persistSoundObservation(observation) {
  if (!observation?.observedAt || !observation?.deviceId) return;

  const sql = `
    INSERT INTO sound_observations (
      device_id,
      topic,
      observed_at,
      received_at,
      sound_level_db,
      dominant_classification,
      dominant_classification_score,
      classification_scores,
      raw_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
    ON CONFLICT (device_id, observed_at) DO UPDATE SET
      topic = EXCLUDED.topic,
      received_at = EXCLUDED.received_at,
      sound_level_db = EXCLUDED.sound_level_db,
      dominant_classification = EXCLUDED.dominant_classification,
      dominant_classification_score = EXCLUDED.dominant_classification_score,
      classification_scores = EXCLUDED.classification_scores,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = now()
  `;

  await getPool().query(sql, [
    observation.deviceId,
    observation.topic,
    observation.observedAt,
    observation.receivedAt,
    observation.soundLevel,
    observation.soundClass,
    observation.soundClassScore,
    JSON.stringify(observation.classScores || {}),
    JSON.stringify(observation.raw || {}),
  ]);
}

export async function getSoundObservationSummary({ deviceId, sinceHours = 24 * 7 } = {}) {
  const params = [sinceHours];
  const deviceFilter = deviceId ? "AND device_id = $2" : "";
  if (deviceId) params.push(deviceId);

  const summarySql = `
    SELECT
      COUNT(*)::int AS sample_count,
      AVG(sound_level_db)::float AS average_sound_level_db,
      MIN(sound_level_db)::float AS min_sound_level_db,
      MAX(sound_level_db)::float AS max_sound_level_db,
      MAX(observed_at) AS latest_observed_at
    FROM sound_observations
    WHERE observed_at >= now() - ($1::int * interval '1 hour')
      AND sound_level_db IS NOT NULL
      ${deviceFilter}
  `;
  const classesSql = `
    SELECT
      dominant_classification,
      COUNT(*)::int AS sample_count,
      AVG(dominant_classification_score)::float AS average_score
    FROM sound_observations
    WHERE observed_at >= now() - ($1::int * interval '1 hour')
      AND dominant_classification IS NOT NULL
      ${deviceFilter}
    GROUP BY dominant_classification
    ORDER BY sample_count DESC, average_score DESC NULLS LAST
    LIMIT 5
  `;

  const [summaryResult, classesResult] = await Promise.all([
    getPool().query(summarySql, params),
    getPool().query(classesSql, params),
  ]);
  const summary = summaryResult.rows[0] || {};

  return {
    sampleCount: summary.sample_count || 0,
    averageSoundLevelDb: summary.average_sound_level_db ?? null,
    minSoundLevelDb: summary.min_sound_level_db ?? null,
    maxSoundLevelDb: summary.max_sound_level_db ?? null,
    latestObservedAt: summary.latest_observed_at ?? null,
    dominantClassifications: classesResult.rows.map((row) => ({
      label: row.dominant_classification,
      sampleCount: row.sample_count,
      averageScore: row.average_score,
    })),
  };
}

export async function getLatestSoundObservation({ deviceId } = {}) {
  const params = [];
  const deviceFilter = deviceId ? "WHERE device_id = $1" : "";
  if (deviceId) params.push(deviceId);

  const sql = `
    SELECT
      device_id,
      topic,
      observed_at,
      received_at,
      sound_level_db,
      dominant_classification,
      dominant_classification_score,
      classification_scores,
      raw_payload
    FROM sound_observations
    ${deviceFilter}
    ORDER BY received_at DESC, observed_at DESC
    LIMIT 1
  `;

  const result = await getPool().query(sql, params);
  const row = result.rows[0];
  if (!row) return null;

  return {
    topic: row.topic,
    deviceId: row.device_id,
    soundLevel: row.sound_level_db === null ? null : Number(row.sound_level_db),
    soundClass: row.dominant_classification || "Unclassified",
    soundClassScore: row.dominant_classification_score === null ? null : Number(row.dominant_classification_score),
    classScores: row.classification_scores || {},
    observedAt: row.observed_at instanceof Date ? row.observed_at.toISOString() : new Date(row.observed_at).toISOString(),
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : new Date(row.received_at).toISOString(),
    raw: row.raw_payload || {},
  };
}
