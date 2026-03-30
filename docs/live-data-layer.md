# Local Unified Live Data Layer

## Connected APIs

- KNMI Open Data API for weather warnings
- Telraam API for traffic counts
- WeatherAPI for current weather and short forecast context

## Backend structure

- [server/ops/adapters](C:\Users\Admin\OneDrive\Desktop\UVA\yr3_sem6\ops-dashboard\ops-dashboard2\server\ops\adapters): one adapter per external source
- [server/ops/services/liveDataService.js](C:\Users\Admin\OneDrive\Desktop\UVA\yr3_sem6\ops-dashboard\ops-dashboard2\server\ops\services\liveDataService.js): unified aggregation and response shaping
- [server/ops/config/zones.js](C:\Users\Admin\OneDrive\Desktop\UVA\yr3_sem6\ops-dashboard\ops-dashboard2\server\ops\config\zones.js): expandable rough Marineterrein zone tagging
- [server/ops/lib](C:\Users\Admin\OneDrive\Desktop\UVA\yr3_sem6\ops-dashboard\ops-dashboard2\server\ops\lib): shared cache, HTTP, and normalization helpers

## Endpoints

- `GET /api/ops/live/overview`: normalized records, source health, summary counts
- `GET /api/ops/live/raw`: same as overview plus raw upstream payloads when available
- `GET /api/ops/health`: lightweight health summary for the unified live layer

## Local behavior

- Uses in-memory cache only
- Uses per-request timeouts
- Returns partial results when one source fails
- Keeps existing mock UI data separate from the new live backend layer

## Local testing

1. Add API keys to `.env`
2. Start the backend with `npm run server`
3. Start the frontend with `npm run dev`
4. Call the new endpoints locally:
   - `http://localhost:3000/api/ops/live/overview`
   - `http://localhost:3000/api/ops/live/raw`
   - `http://localhost:3000/api/ops/health`
