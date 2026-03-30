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

export type SourceHealth = {
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
  sources: Record<string, SourceHealth>;
  summary: {
    totalRecords: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  };
};

export type OpsHealthResponse = {
  status: "ok" | "degraded" | "error";
  generatedAt: string;
  sources: Record<string, SourceHealth>;
  summary: OpsLiveOverviewResponse["summary"];
};

export type LayerVisibility = {
  mobility: boolean;
  zones: boolean;
  weather: boolean;
  warnings: boolean;
  labels: boolean;
};

export type ZoneFeature = {
  id: string;
  label: string;
  center: [number, number];
  polygon: [number, number][];
  recordCount: number;
  activeWarnings: number;
  mobilityScore: number;
  weatherSummary: string | null;
  status: UnifiedLiveRecord["status"];
};

export type MobilityPoint = {
  id: string;
  zone: string;
  center: [number, number];
  totalFlow: number;
  pedestrians: number;
  bicycles: number;
  vehicles: number;
  status: UnifiedLiveRecord["status"];
  confidence: UnifiedLiveRecord["confidence"];
  observedAt: string;
};

export type WeatherPoint = {
  id: string;
  center: [number, number];
  zone: string;
  title: string;
  value: string;
  status: UnifiedLiveRecord["status"];
  observedAt: string;
};

export type WarningPoint = {
  id: string;
  center: [number, number];
  zone: string;
  title: string;
  detail: string;
  status: UnifiedLiveRecord["status"];
  observedAt: string;
};

export type SpatialSummary = {
  busiestArea: string;
  busiestFlow: number | null;
  currentWeather: string;
  warningCount: number;
  lastRefreshLabel: string;
};
