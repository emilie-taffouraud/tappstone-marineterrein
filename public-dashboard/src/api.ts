import type { CrowdZone, WeatherData, AgendaFeed, TrendsData, BestTimeData, TrendPeriod } from "./types";

const BASE = (import.meta.env.VITE_API_BASE as string) || "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const fetchCrowd = () => get<CrowdZone[]>("/api/husense/presence");

export const fetchWeather = () => get<WeatherData>("/api/weather");

export const fetchEvents = (limit = 8) =>
  get<AgendaFeed>(`/api/ops/agenda?limit=${limit}`);

export const fetchTrends = (period: TrendPeriod) => {
  const resolution = period === "30d" ? "daily" : "hourly";
  return get<TrendsData>(`/api/public/trends?period=${period}&resolution=${resolution}`);
};

export const fetchBestTime = () => get<BestTimeData>("/api/public/best-time");
