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

function firstPositiveNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
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
      imageId: firstText(payload.imageId, payload.imageID, payload.image_id, payload.backgroundImageId),
      width: Number(payload.width),
      height: Number(payload.height),
      data: payload.data.map((value) => Number(value) || 0),
      range: payload.range ?? null,
    };
  }

  const nestedKeys = ["data", "result", "heatmap", "payload"];
  for (const key of nestedKeys) {
    const nested = extractHeatmapPayload(payload[key]);
    if (nested) return nested;
  }

  return null;
}

function buildHusenseApiBaseUrl() {
  return (process.env.HUSENSE_API_URL || "https://bff.husense.io").replace(/\/+$/, "");
}

function buildHusensePresenceApiBaseUrl() {
  return (process.env.HUSENSE_REST_API_URL || "https://api.husense.io/api/v1").replace(/\/+$/, "");
}

function getHusenseBearerToken() {
  return process.env.HUSENSE_JWT_TOKEN || process.env.HUSENSE_API_TOKEN || null;
}

function looksLikeUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getHusenseHeatmapSpace() {
  const fallbackSpace = HUSENSE_DEFAULT_SPACES[0];
  const configuredId = process.env.HUSENSE_HEATMAP_SPACE_ID || fallbackSpace?.id;

  if (!looksLikeUuid(configuredId)) {
    throw new Error("HUSENSE_HEATMAP_SPACE_ID must be set to a valid Husense space UUID.");
  }

  return {
    id: configuredId,
    name: process.env.HUSENSE_HEATMAP_SPACE_NAME || fallbackSpace?.name || "Configured Husense space",
  };
}

function resolveHusenseHeatmapWindow(rangeLabel) {
  const now = new Date();
  const normalizedLabel = typeof rangeLabel === "string" && rangeLabel.trim() ? rangeLabel.trim() : "Last 2 hrs";

  if (normalizedLabel === "Last 30 min") {
    return {
      label: normalizedLabel,
      startTimestamp: now.getTime() - 30 * 60 * 1000,
      endTimestamp: now.getTime(),
    };
  }

  if (normalizedLabel === "Today") {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    return {
      label: normalizedLabel,
      startTimestamp: startOfDay.getTime(),
      endTimestamp: now.getTime(),
    };
  }

  return {
    label: "Last 2 hrs",
    startTimestamp: now.getTime() - 2 * 60 * 60 * 1000,
    endTimestamp: now.getTime(),
  };
}

function formatHusenseDateLabel(value) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function resolveHusenseHeatmapRequest(query) {
  if (typeof query?.date === "string" && query.date.trim()) {
    const dateValue = query.date.trim();
    const dayStart = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(dayStart.getTime())) {
      throw new Error("Invalid Husense heatmap date. Use YYYY-MM-DD.");
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setMilliseconds(dayEnd.getMilliseconds() - 1);

    return {
      label: formatHusenseDateLabel(dateValue),
      startTimestamp: dayStart.getTime(),
      endTimestamp: dayEnd.getTime(),
      date: dateValue,
    };
  }

  return resolveHusenseHeatmapWindow(query?.range);
}

function extractHusenseImageMetadata(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const imageUrl = firstText(payload.url, payload.imageUrl, payload.uri, payload.href);
  if (!imageUrl) return null;

  return {
    url: imageUrl,
    width: firstFiniteNumber(payload.width, payload.imageWidth),
    height: firstFiniteNumber(payload.height, payload.imageHeight),
  };
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

function summarizeHusensePresenceZones(payload) {
  if (!isObject(payload)) {
    const presence = extractPresencePayload(payload);
    return {
      presenceCount: presence?.presenceCount ?? 0,
      observedAt: null,
    };
  }

  const zoneEntries = Object.entries(payload).filter(([, value]) => isObject(value));
  if (!zoneEntries.length) {
    const presence = extractPresencePayload(payload);
    return {
      presenceCount: presence?.presenceCount ?? 0,
      observedAt: null,
    };
  }

  let presenceCount = 0;
  let latestTimestamp = null;

  for (const [, value] of zoneEntries) {
    const personCount = firstFiniteNumber(value.person, value.persons) ?? 0;
    const runnerCount = firstFiniteNumber(value.runner) ?? 0;
    const bicycleCount = firstFiniteNumber(value.bike) ?? 0;
    const timestamp = firstFiniteNumber(value.time_stamp, value.timestamp);

    presenceCount += personCount + runnerCount + bicycleCount;

    if (timestamp !== null && (latestTimestamp === null || timestamp > latestTimestamp)) {
      latestTimestamp = timestamp;
    }
  }

  return {
    presenceCount,
    observedAt: latestTimestamp === null ? null : new Date(latestTimestamp).toISOString(),
  };
}

async function fetchHusensePresenceForSpace(space, headers) {
  const apiBaseUrl = buildHusensePresenceApiBaseUrl();
  const [spaceResult, presenceResult] = await Promise.allSettled([
    fetchJsonOrThrow(`${apiBaseUrl}/Spaces/${space.id}`, headers),
    fetchJsonOrThrow(`${apiBaseUrl}/Spaces/${space.id}/PresenceZones/_/LatestData`, headers),
  ]);

  if (spaceResult.status === "rejected" && presenceResult.status === "rejected") {
    throw presenceResult.reason || spaceResult.reason;
  }

  const metadata = spaceResult.status === "fulfilled" && isObject(spaceResult.value) ? spaceResult.value : null;
  const presenceSummary =
    presenceResult.status === "fulfilled" ? summarizeHusensePresenceZones(presenceResult.value) : null;

  return {
    id: firstText(metadata?.identifier, metadata?.id, space.id) || space.id,
    name: firstText(metadata?.name, space.name) || space.name,
    capacity: firstPositiveNumber(metadata?.capacity, metadata?.maxCapacity, space.capacity) ?? space.capacity,
    presenceCount: presenceSummary?.presenceCount ?? 0,
    currentPresence: presenceSummary?.presenceCount ?? 0,
    count: presenceSummary?.presenceCount ?? 0,
    observedAt: presenceSummary?.observedAt ?? null,
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
    const bearerToken = getHusenseBearerToken();
    const headers = {
      Accept: "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    };

    if (process.env.HUSENSE_PRESENCE_API_URL) {
      const payload = await fetchJsonOrThrow(process.env.HUSENSE_PRESENCE_API_URL, headers);
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
    const jwtToken = getHusenseBearerToken();
    if (!jwtToken) return res.status(500).json({ error: "Missing HUSENSE_JWT_TOKEN or HUSENSE_API_TOKEN" });

    const { spaceId, startTimestamp, endTimestamp } = req.query;
    if (!spaceId || !startTimestamp || !endTimestamp) {
      return res.status(400).json({ error: "spaceId, startTimestamp, and endTimestamp are required." });
    }

    const apiUrl = `${buildHusenseApiBaseUrl()}/space/${spaceId}/heatmap?startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`;

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

app.get("/api/husense/heatmap", async (req, res) => {
  try {
    const jwtToken = getHusenseBearerToken();
    if (!jwtToken) {
      return res.status(500).json({ error: "Missing HUSENSE_JWT_TOKEN or HUSENSE_API_TOKEN" });
    }

    const heatmapSpace = getHusenseHeatmapSpace();
    const window = resolveHusenseHeatmapRequest(req.query);
    const apiUrl =
      `${buildHusenseApiBaseUrl()}/space/${heatmapSpace.id}/heatmap` +
      `?startTimestamp=${window.startTimestamp}&endTimestamp=${window.endTimestamp}`;

    const payload = await fetchJsonOrThrow(apiUrl, {
      Authorization: `Bearer ${jwtToken}`,
      Accept: "application/json",
    });

    const data = extractHeatmapPayload(payload);

    if (!data) {
      return res.status(502).json({
        error: "Husense heatmap response did not include the expected image and grid payload.",
      });
    }

    let imageMetadata = null;
    if (data.imageId) {
      const imagePayload = await fetchJsonOrThrow(
        `${buildHusenseApiBaseUrl()}/image/${encodeURIComponent(data.imageId)}`,
        {
          Authorization: `Bearer ${jwtToken}`,
          Accept: "application/json",
        },
      );
      imageMetadata = extractHusenseImageMetadata(imagePayload);
    }

    res.json({
      spaceId: heatmapSpace.id,
      spaceName: heatmapSpace.name,
      timeRangeLabel: window.label,
      imageId: data.imageId || null,
      imageUrl: imageMetadata?.url || (data.imageId ? `/api/husense/image/${encodeURIComponent(data.imageId)}` : null),
      imageWidth: imageMetadata?.width ?? null,
      imageHeight: imageMetadata?.height ?? null,
      width: data.width,
      height: data.height,
      data: data.data,
      range: data.range,
    });
  } catch (err) {
    console.error("Husense heatmap API error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/husense/image/:imageId", async (req, res) => {
  try {
    const jwtToken = getHusenseBearerToken();
    if (!jwtToken) {
      return res.status(500).json({ error: "Missing HUSENSE_JWT_TOKEN or HUSENSE_API_TOKEN" });
    }

    const { imageId } = req.params;
    if (!imageId) {
      return res.status(400).json({ error: "imageId is required." });
    }

    const imagePayload = await fetchJsonOrThrow(
      `${buildHusenseApiBaseUrl()}/image/${encodeURIComponent(imageId)}`,
      {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/json",
      },
    );

    const imageMetadata = extractHusenseImageMetadata(imagePayload);
    if (!imageMetadata?.url) {
      throw new Error("Husense image metadata did not include a usable image URL.");
    }

    res.redirect(imageMetadata.url);
  } catch (err) {
    console.error("Husense image proxy error:", err);
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


// ---------- Public API routes ----------

// Flattened weather endpoint – returns { current: {...} } with standard WeatherAPI fields
app.get("/api/public/weather", async (req, res) => {
  try {
    const weather = await getWeatherLiveData(getOpsEnv());
    // adapter stores raw as { current: fullAPIResponse, weeklyRange }
    // fullAPIResponse.current is the actual conditions object
    const current = weather.raw?.current?.current;
    if (!current) {
      return res.status(503).json({ error: weather.error || "Weather unavailable" });
    }
    res.json({ current });
  } catch (err) {
    console.error("Public weather error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Historical visitor trends with period + resolution support
// ?period=7d&resolution=hourly (default) | ?period=30d&resolution=daily
app.get("/api/public/trends", async (req, res) => {
  try {
    const segmentId = req.query.segment_id || 9000006266;
    const period = req.query.period === "30d" ? "30d" : "7d";
    const resolution = req.query.resolution === "daily" ? "daily" : "hourly";

    const interval = period === "30d" ? "30 days" : "7 days";
    const truncUnit = resolution === "daily" ? "day" : "hour";

    const sql = `
      SELECT
        date_trunc('${truncUnit}', recorded_at) AS bucket,
        COALESCE(SUM(pedestrian_count), 0)::int AS pedestrians,
        COALESCE(SUM(bicycle_count), 0)::int    AS bicycles,
        COALESCE(SUM(vehicle_count), 0)::int    AS vehicles
      FROM traffic_observations
      WHERE segment_id = $1
        AND recorded_at >= NOW() - INTERVAL '${interval}'
      GROUP BY date_trunc('${truncUnit}', recorded_at)
      ORDER BY 1 ASC
    `;

    const result = await pool.query(sql, [segmentId]);
    res.json({
      period,
      resolution,
      rows: result.rows,
    });
  } catch (err) {
    console.error("Public trends error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Best upcoming hour to visit today (lowest avg foot traffic)
app.get("/api/public/best-time", async (req, res) => {
  try {
    const segmentId = req.query.segment_id || 9000006266;
    const currentHour = new Date().getHours();

    const sql = `
      SELECT
        EXTRACT(HOUR FROM recorded_at)::int AS hour_of_day,
        AVG(pedestrian_count + bicycle_count)::int AS avg_foot_traffic
      FROM traffic_observations
      WHERE segment_id = $1
        AND recorded_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM recorded_at)
      ORDER BY avg_foot_traffic ASC
    `;

    const result = await pool.query(sql, [segmentId]);

    // Pick the quietest hour that is still upcoming today
    const upcoming = result.rows.find((r) => r.hour_of_day > currentHour);
    const best = upcoming || result.rows[0] || null;

    res.json({
      bestHour: best ? best.hour_of_day : null,
      avgFootTraffic: best ? best.avg_foot_traffic : null,
      allHours: result.rows,
    });
  } catch (err) {
    console.error("Public best-time error:", err);
    res.status(500).json({ error: err.message });
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
