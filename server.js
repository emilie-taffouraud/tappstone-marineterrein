import express from "express";
import cors from "cors";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { getUnifiedLiveData, getOpsHealth } from "./server/ops/services/liveDataService.js";
import { getAgendaFeed } from "./server/ops/services/agendaService.js";
import { getKnmiLiveData } from "./server/ops/adapters/knmiAdapter.js";
import { getWeatherLiveData } from "./server/ops/adapters/weatherAdapter.js";
import { getOpsEnv } from "./server/ops/config/env.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// UpCloud PostgreSQL connection
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

// Serve static dashboard files
app.use(express.static(path.join(__dirname, "public")));

const KNMI_OPEN_DATA_API_KEY = process.env.KNMI_OPEN_DATA_API_KEY;
const HUSENSE_DEFAULT_SPACES = [
  {
    id: "b9c17619-be37-4c6a-a1f3-45e08fd3466c",
    name: "Marineterrein Hoofd Ingang",
    capacity: 100,
  },
  {
    id: "5db05d88-7833-440a-9c3e-24c93fb08406",
    name: "UvA Ingang Roetersstraat",
    capacity: 100,
  },
  {
    id: "9b4a6d95-b5dc-426f-a5ae-ea31200b09b5",
    name: "Marineterrein Commandantsbrug",
    capacity: 100,
  },
  {
    id: "781e09a4-b0b1-4bcb-ad7c-67dfc0182792",
    name: "Marineterrein Oude Poort",
    capacity: 100,
  },
];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeHusenseCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.spaces)) return payload.spaces;
  if (Array.isArray(payload?.zones)) return payload.zones;
  if (isObject(payload)) return [payload];
  return [];
}

function extractPresencePayload(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    return payload.find((item) => extractPresencePayload(item)) || null;
  }
  if (!isObject(payload)) return null;

  const nestedKeys = ["data", "result", "space", "zone", "presence", "occupancy", "live"];
  for (const key of nestedKeys) {
    const nested = extractPresencePayload(payload[key]);
    if (nested) return nested;
  }

  const presenceCount = firstFiniteNumber(
    payload.presenceCount,
    payload.currentPresence,
    payload.currentOccupancy,
    payload.occupancyCount,
    payload.peopleCount,
    payload.personCount,
    payload.count,
    payload.total,
    payload.value,
  );
  const capacity = firstFiniteNumber(payload.capacity, payload.maxCapacity, payload.limit);

  if (presenceCount !== null || capacity !== null) {
    return { presenceCount, capacity, raw: payload };
  }

  return null;
}

function normalizePresenceZones(payload, fallbackZones = HUSENSE_DEFAULT_SPACES) {
  const entries = normalizeHusenseCollection(payload);
  const normalized = entries
    .map((entry, index) => {
      const presence = extractPresencePayload(entry);
      return {
        id: firstText(entry?.id, entry?.spaceId, entry?.zoneId) || fallbackZones[index]?.id || `zone-${index + 1}`,
        name: firstText(entry?.name, entry?.label, entry?.spaceName, entry?.zoneName) || fallbackZones[index]?.name || `Zone ${index + 1}`,
        capacity:
          firstFiniteNumber(entry?.capacity, entry?.maxCapacity, presence?.capacity, fallbackZones[index]?.capacity) ??
          fallbackZones[index]?.capacity ??
          100,
        presenceCount:
          firstFiniteNumber(
            entry?.presenceCount,
            entry?.currentPresence,
            entry?.currentOccupancy,
            entry?.occupancyCount,
            entry?.peopleCount,
            entry?.personCount,
            entry?.count,
            presence?.presenceCount,
          ) ?? 0,
      };
    })
    .filter((entry) => entry.id);

  return normalized.length
    ? normalized
    : fallbackZones.map((zone) => ({
        ...zone,
        presenceCount: 0,
      }));
}

function extractHeatmapPayload(payload) {
  if (!payload) return null;

  if (
    isObject(payload) &&
    Array.isArray(payload.data) &&
    Number.isFinite(Number(payload.width)) &&
    Number.isFinite(Number(payload.height))
  ) {
    return {
      width: Number(payload.width),
      height: Number(payload.height),
      data: payload.data.map((value) => Number(value) || 0),
    };
  }

  const nestedKeys = ["data", "result", "heatmap", "payload"];
  for (const key of nestedKeys) {
    const nested = extractHeatmapPayload(payload[key]);
    if (nested) return nested;
  }

  return null;
}

async function fetchJsonOrThrow(url, headers) {
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Husense API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function fetchHusensePresenceForSpace(space, headers) {
  const candidateUrls = [
    `https://bff.husense.io/space/${space.id}/presence`,
    `https://bff.husense.io/space/${space.id}/occupancy`,
    `https://bff.husense.io/space/${space.id}/live`,
    `https://bff.husense.io/space/${space.id}`,
  ];

  let lastError = null;

  for (const url of candidateUrls) {
    try {
      const payload = await fetchJsonOrThrow(url, headers);
      const presence = extractPresencePayload(payload);
      if (presence) {
        return {
          id: space.id,
          name: space.name,
          capacity: presence.capacity ?? space.capacity,
          presenceCount: presence.presenceCount ?? 0,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;

  return {
    ...space,
    presenceCount: 0,
  };
}

// ---------- health ----------
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/ops/health", async (req, res) => {
  try {
    const health = await getOpsHealth();
    res.json(health);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/ops/live/overview", async (req, res) => {
  try {
    const liveData = await getUnifiedLiveData({ includeRaw: false });
    res.json(liveData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ops/live/raw", async (req, res) => {
  try {
    const liveData = await getUnifiedLiveData({ includeRaw: true });
    res.json(liveData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ops/agenda", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 4);
    const agenda = await getAgendaFeed({ limit });
    res.json(agenda);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      items: [],
      sourceUrl: "https://marineterrein.nl/wat-is-er-te-doen/agenda/",
      fetchedAt: new Date().toISOString(),
      error: "Unable to load Marineterrein agenda.",
      fallback: true,
    });
  }
});

// ---------- Telraam routes ----------
app.get("/api/traffic/latest", async (req, res) => {
  try {
    const segmentId = req.query.segment_id || 9000006266;

    const sql = `
      SELECT
        segment_id,
        recorded_at,
        pedestrian_count,
        bicycle_count,
        vehicle_count
      FROM traffic_observations
      WHERE segment_id = $1
      ORDER BY recorded_at DESC
      LIMIT 24
    `;

    const result = await pool.query(sql, [segmentId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const segmentId = req.query.segment_id || 9000006266;

    const sql = `
      SELECT
        COUNT(*) AS rows_loaded,
        COALESCE(SUM(pedestrian_count),0) AS total_pedestrians,
        COALESCE(SUM(bicycle_count),0) AS total_bicycles,
        COALESCE(SUM(vehicle_count),0) AS total_vehicles,
        COALESCE(MAX(recorded_at),NOW()) AS last_update
      FROM traffic_observations
      WHERE segment_id = $1
    `;

    const result = await pool.query(sql, [segmentId]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/busiest-hour", async (req, res) => {
  try {
    const segmentId = req.query.segment_id || 9000006266;

    const sql = `
      SELECT
        segment_id,
        recorded_at,
        pedestrian_count,
        bicycle_count,
        vehicle_count,
        (pedestrian_count + bicycle_count + vehicle_count) AS total_flow
      FROM traffic_observations
      WHERE segment_id = $1
      ORDER BY total_flow DESC
      LIMIT 1
    `;

    const result = await pool.query(sql, [segmentId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- KNMI routes ----------
app.get("/api/knmi/warnings", async (req, res) => {
  try {
    const knmi = await getKnmiLiveData(getOpsEnv());
    const warnings = knmi.raw?.warnings || [];
    const file = knmi.raw?.file || null;

    res.json({
      source: "KNMI",
      dataset: getOpsEnv().knmiDataset,
      filename: file?.filename || null,
      created: file?.created || null,
      lastModified: file?.lastModified || null,
      sourceStatus: knmi.status,
      data: {
        features: warnings.map((warning) => ({
          properties: {
            code: warning.id,
            headline: warning.headline,
            description: warning.description,
            areaDesc: warning.areaDesc,
            event: warning.event,
            severity: warning.severity,
            urgency: warning.urgency,
            effective: warning.effective,
            expires: warning.expires,
          },
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/knmi/radar/wms-url", async (req, res) => {
  try {
    const wmsBase =
      "https://anonymous.api.dataplatform.knmi.nl/wms/adaguc-server" +
      "?DATASET=radar_reflectivity_composites&SERVICE=WMS&REQUEST=GetMap" +
      "&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0" +
      "&LAYERS=radar_reflectivity_composites&CRS=EPSG:3857" +
      "&WIDTH=1024&HEIGHT=1024";

    res.json({
      source: "KNMI",
      note: "Use this as a WMS overlay in Leaflet/Mapbox/OpenLayers.",
      urlTemplate: wmsBase + "&BBOX={bbox-epsg-3857}",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/knmi/status", async (req, res) => {
  try {
    const knmi = await getKnmiLiveData(getOpsEnv());

    res.json({
      status: knmi.status,
      hasKey: Boolean(KNMI_OPEN_DATA_API_KEY),
      latestFile: knmi.raw?.file?.filename || null,
      created: knmi.raw?.file?.created || null,
      lastSuccessAt: knmi.lastSuccessAt,
      error: knmi.error,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      hasKey: Boolean(KNMI_OPEN_DATA_API_KEY),
      message: err.message,
    });
  }
});

// ---------- Weather API routes ----------
app.get("/api/weather", async (req, res) => {
  try {
    const weather = await getWeatherLiveData(getOpsEnv());
    if (!weather.raw) {
      return res.status(503).json({ error: weather.error || "Failed to fetch weather data" });
    }

    res.json(weather.raw);
  } catch (error) {
    console.error("Weather API server error:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// ---------- Husense API routes (Live Occupancy) ----------
app.get("/api/husense/presence", async (req, res) => {
  try {
    const bearerToken = process.env.HUSENSE_API_TOKEN || process.env.HUSENSE_JWT_TOKEN;
    const headers = {
      Accept: "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    };

    if (process.env.HUSENSE_API_URL) {
      const payload = await fetchJsonOrThrow(process.env.HUSENSE_API_URL, headers);
      return res.json(normalizePresenceZones(payload));
    }

    if (!bearerToken) {
      return res.status(500).json({ error: "Missing HUSENSE_API_URL or Husense bearer token." });
    }

    const zoneResults = await Promise.allSettled(
      HUSENSE_DEFAULT_SPACES.map((space) => fetchHusensePresenceForSpace(space, headers)),
    );

    const zones = zoneResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      const fallback = HUSENSE_DEFAULT_SPACES[index];
      console.warn(
        `Husense presence fetch failed for space ${fallback.id} (${fallback.name}):`,
        result.reason,
      );
      return {
        ...fallback,
        presenceCount: 0,
      };
    });

    res.json(zones);
  } catch (err) {
    console.error("Husense Live API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Husense Historical Heatmap Route ----------
app.get("/api/husense/historical", async (req, res) => {
  try {
    const jwtToken = process.env.HUSENSE_JWT_TOKEN || process.env.HUSENSE_API_TOKEN;
    if (!jwtToken) return res.status(500).json({ error: "Missing HUSENSE_JWT_TOKEN or HUSENSE_API_TOKEN" });

    const { spaceId, startTimestamp, endTimestamp } = req.query;
    if (!spaceId || !startTimestamp || !endTimestamp) {
      return res.status(400).json({ error: "spaceId, startTimestamp, and endTimestamp are required." });
    }
    
    const apiUrl = `https://bff.husense.io/space/${spaceId}/heatmap?startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`;

    console.log(`[Husense] Requesting real heatmap: ${apiUrl}`);

    const payload = await fetchJsonOrThrow(apiUrl, {
      Authorization: `Bearer ${jwtToken}`,
      Accept: "application/json",
    });

    const data = extractHeatmapPayload(payload);

    if (!data) {
      return res.status(502).json({ error: "Husense heatmap response did not include width, height, and data." });
    }
    res.json(data); // 把真实的 JSON 返回给前端

  } catch (err) {
    console.error("Historical API error:", err);
    res.status(500).json({ error: err.message });
  }
});



// ---------- Holidays API routes ----------
app.get("/api/holidays", async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    console.log("Fetching holidays for year:", year);

    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/NL`
    );

    if (!response.ok) {
      throw new Error(`Holiday API failed: ${response.status}`);
    }

    const data = await response.json();
    res.json({
      status: "ok",
      source: "Nager.Date",
      year,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Holiday API error:", err);
    res.status(500).json({
      status: "error",
      source: "Nager.Date",
      message: err.message,
    });
  }
});


// fallback route
app.get("/", (req, res) => {
  res.send("Telraam + KNMI + Calendar API running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
