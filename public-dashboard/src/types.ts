export interface CrowdZone {
  id: string;
  name: string;
  capacity: number;
  presenceCount: number;
}

export type CrowdLevel = "low" | "medium" | "high";

export interface CrowdSummary {
  zones: CrowdZone[];
  total: number;
  totalCapacity: number;
  densityPct: number;
  level: CrowdLevel;
}

export interface WeatherData {
  current: {
    temp_c: number;
    feelslike_c: number;
    wind_kph: number;
    precip_mm: number;
    condition: { text: string; icon: string };
    humidity: number;
  };
}

export interface AgendaItem {
  title: string;
  date: string;
  time?: string;
  url?: string;
  imageUrl?: string;
  location?: string;
}

export interface AgendaFeed {
  items: AgendaItem[];
  fetchedAt: string;
  error?: string;
}

export interface TrendRow {
  bucket: string;
  pedestrians: number;
  bicycles: number;
  vehicles: number;
}

export interface TrendsData {
  period: "7d" | "30d";
  resolution: "hourly" | "daily";
  rows: TrendRow[];
}

export interface BestTimeData {
  bestHour: number | null;
  avgFootTraffic: number | null;
}

export type TrendPeriod = "7d" | "30d";
