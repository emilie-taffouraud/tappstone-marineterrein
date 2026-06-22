const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export type UnifiedLiveRecord = {
  id: string;
  source: "telraam" | "knmi" | "weather" | "husense" | "sound" | "water" | "air";
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

export type OpsSourceHealth = {
  status: "ok" | "warning" | "critical" | "unknown";
  fetchedAt: string;
  lastSuccessAt: string | null;
  recordCount: number;
  cache: {
    hit: boolean;
    key: string;
    expiresAt: string;
  } | null;
  error: string | null;
};

export type OpsLiveOverviewResponse = {
  schemaVersion: string;
  generatedAt: string;
  records: UnifiedLiveRecord[];
  sources: Record<string, OpsSourceHealth>;
  summary: {
    totalRecords: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  };
};

export type OpsHealthResponse = {
  status: "ok" | "degraded" | "error";
  generatedAt: string;
  sources: Record<string, OpsSourceHealth>;
  summary: OpsLiveOverviewResponse["summary"];
};

export type TelraamTrafficPoint = {
  segment_id: string | number;
  recorded_at: string;
  pedestrian_count: number;
  bicycle_count: number;
  vehicle_count: number;
  night_count: number;
  car_count?: number | null;
  bus_count?: number | null;
  light_truck_count?: number | null;
  truck_count?: number | null;
  motorcycle_count?: number | null;
  tractor_count?: number | null;
  trailer_count?: number | null;
};

export type TrafficRangeRequest = {
  lookbackHours?: number;
  start?: string;
  end?: string;
};

export type SoundHourlyPoint = {
  bucket: string;
  averageSoundLevelDb: number | null;
  minSoundLevelDb: number | null;
  maxSoundLevelDb: number | null;
  sampleCount: number;
};

export type VisitorHistoryPoint = {
  bucket: string;
  visitors: number;
};

export type VisitorHistoryResponse = {
  period: "7d" | "30d";
  resolution: "daily";
  source: "telraam" | "husense" | null;
  rows: VisitorHistoryPoint[];
};

export type AgendaItem = {
  id: string;
  title: string;
  dateLabel: string;
  venue: string | null;
  detailUrl: string;
  imageUrl: string | null;
  summary: string | null;
};

export type OpsAgendaResponse = {
  items: AgendaItem[];
  sourceUrl: string;
  fetchedAt: string;
  error: string | null;
  fallback: boolean;
};

export type HusenseHeatmapResponse = {
  spaceId: string;
  spaceName: string;
  timeRangeLabel: string;
  imageId: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  width: number;
  height: number;
  data: number[];
  range: unknown;
};

export type HusenseDashboardSummary = {
  spaceId: string;
  spaceName: string;
  currentPresence: number;
  observedAt: string | null;
  activeGateCount: number;
  totals: {
    unclassified?: number;
    person?: number;
    runner?: number;
    bike?: number;
    car?: number;
    bus?: number;
  };
  gates: Array<{
    id: string;
    spaceId?: string;
    spaceName?: string;
    gateName: string;
    totalCount: number;
    arrivals: number;
    departures: number;
    observedAt: string | null;
    modeCounts?: Record<
      string,
      {
        arrivals?: number;
        departures?: number;
        total?: number;
      }
    >;
  }>;
};

export type HusenseHeatmapRequest = {
  range?: string;
  date?: string;
};

export async function fetchOpsOverview() {
  const response = await fetch(`${API_BASE}/api/ops/live/overview`);
  if (!response.ok) {
    throw new Error("Failed to fetch /api/ops/live/overview");
  }

  return response.json() as Promise<OpsLiveOverviewResponse>;
}

export async function fetchOpsHealth() {
  const response = await fetch(`${API_BASE}/api/ops/health`);
  const json = (await response.json()) as OpsHealthResponse;

  return {
    ok: response.ok,
    data: json,
  };
}

export async function fetchTelraamTrafficLatest(request: number | TrafficRangeRequest = 2) {
  const normalized = typeof request === "number" ? { lookbackHours: request } : request;
  const params = new URLSearchParams();
  if (normalized.lookbackHours !== undefined) params.set("lookback_hours", String(normalized.lookbackHours));
  if (normalized.start) params.set("start", normalized.start);
  if (normalized.end) params.set("end", normalized.end);

  const response = await fetch(`${API_BASE}/api/traffic/latest?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch /api/traffic/latest");
  }

  return response.json() as Promise<TelraamTrafficPoint[]>;
}

export async function fetchSoundHourly(sinceHours = 24) {
  const params = new URLSearchParams({
    since_hours: String(sinceHours),
  });
  const response = await fetch(`${API_BASE}/api/sound/hourly?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch /api/sound/hourly");
  }

  const payload = (await response.json()) as { rows?: SoundHourlyPoint[] };
  return Array.isArray(payload.rows) ? payload.rows : [];
}

export async function fetchVisitorHistory(period: "7d" | "30d" = "7d") {
  const params = new URLSearchParams({ period });
  const response = await fetch(`${API_BASE}/api/ops/visitors/history?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch /api/ops/visitors/history");
  }

  return response.json() as Promise<VisitorHistoryResponse>;
}

export async function fetchHusenseDashboardSummary() {
  const response = await fetch(`${API_BASE}/api/husense/dashboard-summary`);
  if (!response.ok) {
    throw new Error("Failed to fetch /api/husense/dashboard-summary");
  }

  return response.json() as Promise<HusenseDashboardSummary>;
}

export async function fetchOpsAgenda(limit = 4) {
  const response = await fetch(`${API_BASE}/api/ops/agenda?limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to fetch /api/ops/agenda");
  }

  return response.json() as Promise<OpsAgendaResponse>;
}

export async function fetchHusenseHeatmap(request: string | HusenseHeatmapRequest) {
  const params = new URLSearchParams();

  if (typeof request === "string") {
    params.set("range", request);
  } else {
    if (request.range) params.set("range", request.range);
    if (request.date) params.set("date", request.date);
  }

  const query = params.toString();
  const response = await fetch(`/api/husense/heatmap${query ? `?${query}` : ""}`);

  if (!response.ok) {
    let detail = "Failed to fetch /api/husense/heatmap";

    try {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        detail = payload.error;
      }
    } catch {
      // Fall back to the generic error when the response is not JSON.
    }

    throw new Error(detail);
  }

  return response.json() as Promise<HusenseHeatmapResponse>;
}
