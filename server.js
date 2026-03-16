import express from "express";
import cors from "cors";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

console.log("USING THE NEW KNMI SERVER FILE");

const app = express();
app.use(cors());
app.use(express.json());

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Serve static dashboard files
app.use(express.static(path.join(__dirname, "public")));

const KNMI_OPEN_DATA_API_KEY = process.env.KNMI_OPEN_DATA_API_KEY;
const KNMI_OPEN_DATA_BASE = "https://api.dataplatform.knmi.nl/open-data/v1";

// ---------- helpers ----------
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`KNMI request failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function getLatestKnmiFile(datasetName, version = "1.0") {
  if (!KNMI_OPEN_DATA_API_KEY) {
    throw new Error("Missing KNMI_OPEN_DATA_API_KEY in .env");
  }

  const listUrl =
    `${KNMI_OPEN_DATA_BASE}/datasets/${datasetName}/versions/${version}/files` +
    `?maxKeys=1&orderBy=created&sorting=desc`;

  const listJson = await fetchJson(listUrl, {
    headers: {
      Authorization: KNMI_OPEN_DATA_API_KEY,
    },
  });

  const latestFile = listJson?.files?.[0];

  if (!latestFile?.filename) {
    throw new Error(`No files returned for KNMI dataset: ${datasetName}`);
  }

  const fileUrl = `${KNMI_OPEN_DATA_BASE}/datasets/${datasetName}/versions/${version}/files/${latestFile.filename}/url`;

  const urlJson = await fetchJson(fileUrl, {
    headers: {
      Authorization: KNMI_OPEN_DATA_API_KEY,
    },
  });

  return {
    filename: latestFile.filename,
    created: latestFile.created,
    lastModified: latestFile.lastModified,
    temporaryDownloadUrl: urlJson.temporaryDownloadUrl,
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

// live-ish KNMI weather warnings
app.get("/api/knmi/warnings", async (req, res) => {
  try {
    const latest = await getLatestKnmiFile("waarschuwingen_nederland_48h", "1.0");

    const warningJson = await fetchJson(latest.temporaryDownloadUrl);

    res.json({
      source: "KNMI",
      dataset: "waarschuwingen_nederland_48h",
      filename: latest.filename,
      created: latest.created,
      lastModified: latest.lastModified,
      data: warningJson,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// give frontend a ready-made WMS URL for radar overlay
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

// simple endpoint to verify KNMI connectivity in browser
app.get("/api/knmi/status", async (req, res) => {
  try {
    const latest = await getLatestKnmiFile("waarschuwingen_nederland_48h", "1.0");

    res.json({
      status: "ok",
      hasKey: Boolean(KNMI_OPEN_DATA_API_KEY),
      latestFile: latest.filename,
      created: latest.created,
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


// fallback route
app.get("/", (req, res) => {
  res.send("Telraam + KNMI API running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});