export type UnifiedLiveRecord = {
  id: string;
  source: "telraam" | "knmi" | "weather" | "husense" | "water";
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

export type HusenseHeatmapRequest = {
  range?: string;
  date?: string;
};

export async function fetchOpsOverview() {
  const response = await fetch("/api/ops/live/overview");
  if (!response.ok) {
    throw new Error("Failed to fetch /api/ops/live/overview");
  }

  return response.json() as Promise<OpsLiveOverviewResponse>;
}

export async function fetchOpsHealth() {
  const response = await fetch("/api/ops/health");
  const json = (await response.json()) as OpsHealthResponse;

  return {
    ok: response.ok,
    data: json,
  };
}

export async function fetchTelraamTrafficLatest() {
  const response = await fetch("/api/traffic/latest");
  if (!response.ok) {
    throw new Error("Failed to fetch /api/traffic/latest");
  }

  return response.json() as Promise<TelraamTrafficPoint[]>;
}

export async function fetchOpsAgenda(limit = 4) {
  const response = await fetch(`/api/ops/agenda?limit=${limit}`);
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
