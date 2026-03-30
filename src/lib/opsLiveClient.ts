export type UnifiedLiveRecord = {
  id: string;
  source: "telraam" | "knmi" | "weather";
  category: "mobility" | "weather" | "warning";
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
