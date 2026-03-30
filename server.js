import express from "express";
import cors from "cors";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { getUnifiedLiveData, getOpsHealth } from "./server/ops/services/liveDataService.js";
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

// fallback route
app.get("/", (req, res) => {
  res.send("Telraam + KNMI API running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
