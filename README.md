# Tapp Marineterrein Operations Dashboard

## Run locally

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env` and add the required API keys
3. Start the backend with `npm run server`
4. Start the frontend with `npm run dev`

The Vite dev server proxies `/api/*` requests to `http://localhost:3000`.

## Unified live ops data layer

This repo now includes a lightweight local/dev-friendly live data backend for:

- KNMI Open Data warnings
- Telraam traffic data
- WeatherAPI current/forecast data

The backend modules live under [server/ops](C:\Users\Admin\OneDrive\Desktop\UVA\yr3_sem6\ops-dashboard\ops-dashboard2\server\ops).

### New endpoints

- `GET /api/ops/live/overview`
- `GET /api/ops/live/raw`
- `GET /api/ops/health`

### Unified schema

The unified records are normalized into this internal shape:

```ts
type UnifiedLiveRecord = {
  id: string
  source: 'telraam' | 'knmi' | 'weather'
  category: 'mobility' | 'weather' | 'warning'
  metric: string
  label: string
  value: number | string | boolean | null
  unit: string | null
  status: 'ok' | 'warning' | 'critical' | 'unknown'
  confidence: 'high' | 'medium' | 'low'
  observedAt: string
  fetchedAt: string
  lat: number | null
  lon: number | null
  zone: string | null
  raw?: unknown
}
```

### Notes

- The new live layer uses simple in-memory caching and request timeouts only.
- Source failures are isolated, so one broken upstream should not break the whole `/api/ops/live/*` response.
- Existing mock dashboard data remains in [src/data/mockDashboardData.ts](C:\Users\Admin\OneDrive\Desktop\UVA\yr3_sem6\ops-dashboard\ops-dashboard2\src\data\mockDashboardData.ts) and is still separate from the new backend live-data contract.
