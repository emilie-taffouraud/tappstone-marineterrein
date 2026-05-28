# Tapp Marineterrein Operations Dashboard

Operations dashboard for Marineterrein Amsterdam. This project combines a Vite React frontend, an Express API server, PostgreSQL-backed historical data, and live integrations with mobility, weather, occupancy, sound, and water-temperature sources.

The dashboard is intended for operational monitoring: live site status, movement patterns, occupancy, environmental conditions, agenda context, and a map-based overview of sensors and zones.

This README expands the original repository README while keeping its existing setup notes, Vercel deployment notes, unified live-data documentation, and Telraam night-mode storage instructions.

## What This Project Includes

- React and TypeScript dashboard built with Vite
- Express API server in `server.js`
- PostgreSQL access for stored traffic and water-temperature data
- Unified live-data layer under `server/ops`
- Vercel deployment support through `api/index.js` and `vercel.json`
- Telraam sync script for storing recent traffic observations

## Main Data Sources

- Telraam traffic counts for pedestrians, bicycles, vehicles, and night-mode detections
- HuSense presence, classified gate counts, and heatmap data
- WeatherAPI current weather and forecast context
- KNMI warnings and radar WMS metadata through dedicated API routes
- Sound MQTT sensor data
- PostgreSQL water-temperature readings from `temperature_readings`
- Marineterrein agenda data
- Dutch public holidays from Nager.Date

Water temperature is read from the configured PostgreSQL database only. It is not fetched from the Marineterrein website or a direct sensor URL.

The unified live-data service currently aggregates Telraam, sound, WeatherAPI, and water-temperature records. KNMI support exists through its adapter and dedicated API routes; the KNMI adapter is not currently included in the `getUnifiedLiveData` source list.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Charts and maps: Recharts, Leaflet, React Leaflet
- Backend: Node.js, Express, PostgreSQL `pg`
- Deployment: Vercel

## Project Structure

```text
.
├── api/
│   └── index.js                    # Vercel API entrypoint that reuses server.js
├── docs/
│   └── live-data-layer.md           # Notes about the unified live-data layer
├── server/
│   └── ops/
│       ├── adapters/                # External data-source adapters
│       ├── config/                  # Environment and zone configuration
│       ├── lib/                     # Shared cache, HTTP, and normalization helpers
│       ├── migrations/              # Database migration scripts
│       ├── scripts/                 # Operational sync scripts
│       └── services/                # Aggregation and storage services
├── src/
│   ├── components/dashboard/         # Main operations dashboard UI
│   ├── hooks/                       # Frontend data-fetching hooks
│   ├── lib/                         # API client types and fetch helpers
│   └── App.tsx                      # Renders OperationsDashboard
├── server.js                        # Express server and API routes
├── vite.config.ts                   # Vite frontend config and local API proxy
└── vercel.json                      # Vercel rewrite rules
```

## Dashboard Sections

The frontend entrypoint is `src/App.tsx`, which renders `OperationsDashboard`.

The dashboard is organized around these operational areas:

- Overview: live summary cards, controls, and operational context
- Crowd: occupancy, movement mix, movement over time, historical movement summary, daily visitors, and expected-versus-measured views
- Environment: water, air, sound, and temperature context
- Events: Marineterrein agenda and Dutch public holidays
- Map: sensor locations, source health, zones, weather points, warnings, and labels

## Requirements

- Node.js
- npm
- PostgreSQL database access
- API credentials for the live sources you want to enable

The dashboard can still start without every integration configured, but live cards may show empty or degraded states when a required source is unavailable.

## Environment Variables

Create a local `.env` file from `.env.example`:

```sh
cp .env.example .env
```

Important variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
PORT=3000

KNMI_OPEN_DATA_API_KEY=your_knmi_open_data_key
WEATHER_API_KEY=your_weatherapi_key
WEATHER_API_LOCATION=Amsterdam

TELRAAM_API_KEY=your_telraam_api_key
TELRAAM_API_BASE_URL=https://telraam-api.net
TELRAAM_SEGMENT_ID=9000006266
TELRAAM_LOOKBACK_HOURS=12
TELRAAM_SYNC_LOOKBACK_HOURS=168

HUSENSE_API_URL=https://bff.husense.io
HUSENSE_JWT_TOKEN=
HUSENSE_HEATMAP_SPACE_ID=b9c17619-be37-4c6a-a1f3-45e08fd3466c
HUSENSE_HEATMAP_SPACE_NAME=Marineterrein Hoofdingang

SOUND_MQTT_HOST=sensemakersams.org
SOUND_MQTT_PORT=1883
SOUND_MQTT_USERNAME=SenseSound
SOUND_MQTT_PASSWORD=
SOUND_MQTT_TOPIC=pipeline/urbansounds/OE-007
SOUND_MQTT_ZONE_ID=general
SOUND_MQTT_STALE_AFTER_MS=600000

WATER_DATABASE_URL=
WATER_DB_HOST=
WATER_DB_PORT=5432
WATER_DB_NAME=
WATER_DB_USER=
WATER_DB_PASSWORD=
WATER_DB_SSL=false

OPS_CACHE_TTL_MS=300000
OPS_HTTP_TIMEOUT_MS=8000
KNMI_WARNING_DATASET=waarschuwingen_nederland_48h
KNMI_WARNING_VERSION=1.0
```

At minimum, live production data needs:

- `DATABASE_URL`
- `WEATHER_API_KEY`
- `TELRAAM_API_KEY`
- `HUSENSE_JWT_TOKEN` or `HUSENSE_API_TOKEN`
- `WATER_DATABASE_URL` or the separate `WATER_DB_*` values

## Run Locally

Install dependencies:

```sh
npm install
```

Start the backend:

```sh
npm run server
```

In a second terminal, start the frontend:

```sh
npm run dev
```

The Vite dev server proxies `/api/*` requests to the Express backend. The backend port is read from `PORT` and defaults to `3000`.

## Build

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Core API Routes

Unified live-data routes:

- `GET /api/ops/live/overview`
- `GET /api/ops/live/raw`
- `GET /api/ops/health`

Traffic and dashboard routes:

- `GET /api/traffic/latest`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/busiest-hour`

Weather and warning routes:

- `GET /api/weather`
- `GET /api/knmi/warnings`
- `GET /api/knmi/radar/wms-url`
- `GET /api/knmi/status`

HuSense routes:

- `GET /api/husense/presence`
- `GET /api/husense/gate-counts`
- `GET /api/husense/dashboard-summary`
- `GET /api/husense/heatmap`
- `GET /api/husense/image/:imageId`

Public-facing shared routes:

- `GET /api/public/weather`
- `GET /api/public/trends`
- `GET /api/public/best-time`
- `GET /api/ops/agenda`
- `GET /api/holidays`

## Unified Live Data

The backend modules under `server/ops` provide a local/dev-friendly live data layer. The service:

- Uses in-memory caching only
- Uses per-request timeouts
- Returns partial results when one source fails
- Keeps dashboard UI data sourced from backend endpoints, with empty or degraded states when a live source is unavailable

The main endpoints are:

- `GET /api/ops/live/overview`: normalized records, source health, and summary counts
- `GET /api/ops/live/raw`: same as overview plus raw upstream payloads when available
- `GET /api/ops/health`: lightweight health summary for the unified live layer

The backend normalizes live-source records into this common shape:

```ts
type UnifiedLiveRecord = {
  id: string;
  source: "telraam" | "knmi" | "weather" | "husense" | "sound" | "water";
  category: "mobility" | "weather" | "warning" | "sound" | "recreation";
  metric: string;
  label: string;
  value: number | string | boolean | null;
  unit: string | null;
  status: "ok" | "warning" | "critical" | "unknown";
  confidence: "high" | "medium" | "low";
  observedAt: string;
  fetchedAt: string;
  lat: number | null;
  lon: number | null;
  zoneId: string | null;
  zone: string | null;
  raw?: unknown;
};
```

The frontend reads this layer with `useOpsLiveData`, which refreshes the overview and health status every 30 seconds.

For local testing, start the backend and frontend, then open:

- `http://localhost:3000/api/ops/live/overview`
- `http://localhost:3000/api/ops/live/raw`
- `http://localhost:3000/api/ops/health`

## Telraam Night-Mode Storage

Telraam advanced traffic reports include `mode_night_lft` and `mode_night_rgt`. These values are stored as `night_count` so dark-hour movement does not appear as zero when Telraam cannot classify movement into pedestrian, bicycle, or vehicle types.

Run the migration once:

```sh
psql "$DATABASE_URL" -f server/ops/migrations/2026-05-24-add-telraam-night-count.sql
```

Then sync recent Telraam rows:

```sh
TELRAAM_SYNC_LOOKBACK_HOURS=168 npm run sync:telraam
```

## Deploy on Vercel

This project deploys as a Vite frontend plus a Vercel Node function for the Express API routes.

Recommended Vercel settings:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: copy the required values from `.env.example`

`vercel.json` rewrites `/api/*` requests to `api/index.js`, which passes requests through to the Express app from `server.js`. All other routes are rewritten to `index.html` for the Vite frontend.

## Useful Scripts

```sh
npm run server          # Start Express backend
npm run dev             # Start Vite frontend
npm run build           # Type-check and build frontend
npm run preview         # Preview production build
npm run sync:telraam    # Sync recent Telraam observations into PostgreSQL
```
