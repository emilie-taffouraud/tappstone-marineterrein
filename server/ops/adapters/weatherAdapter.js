import { getOrSetCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { createUnifiedRecord, zoneFieldsFromText } from "../lib/normalize.js";

function toStatusFromWeather(current) {
  const gust = Number(current?.gust_kph || 0);
  const precip = Number(current?.precip_mm || 0);
  if (gust >= 60 || precip >= 15) return "warning";
  return "ok";
}

export async function getWeatherLiveData(env) {
  const fetchedAt = new Date().toISOString();

  if (!env.weatherApiKey) {
    return {
      source: "weather",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error: "Missing WEATHER_API_KEY",
    };
  }

  return getOrSetCache("ops:weather", env.opsCacheTtlMs, async () => {
    try {
      const url =
        `https://api.weatherapi.com/v1/forecast.json?key=${env.weatherApiKey}` +
        `&q=${encodeURIComponent(env.weatherLocation)}&days=2&aqi=no&alerts=yes`;
      const data = await fetchJson(url, { timeoutMs: env.opsHttpTimeoutMs });
      const current = data?.current || {};
      const locationName = data?.location?.name || env.weatherLocation;
      const zoneFields = zoneFieldsFromText(locationName);
      const observedAt = current.last_updated || fetchedAt;
      const baseStatus = toStatusFromWeather(current);

      const records = [
        createUnifiedRecord({
          id: "weather-current-temp",
          source: "weather",
          category: "weather",
          metric: "temperature_c",
          label: "Air temperature",
          value: current.temp_c ?? null,
          unit: "C",
          status: baseStatus,
          confidence: "high",
          observedAt,
          fetchedAt,
          ...zoneFields,
          raw: current,
        }),
        createUnifiedRecord({
          id: "weather-feels-like",
          source: "weather",
          category: "weather",
          metric: "feelslike_c",
          label: "Feels like temperature",
          value: current.feelslike_c ?? null,
          unit: "C",
          status: baseStatus,
          confidence: "medium",
          observedAt,
          fetchedAt,
          ...zoneFields,
          raw: current,
        }),
        createUnifiedRecord({
          id: "weather-wind-kph",
          source: "weather",
          category: "weather",
          metric: "wind_kph",
          label: "Wind speed",
          value: current.wind_kph ?? null,
          unit: "kph",
          status: Number(current.wind_kph || 0) >= 40 ? "warning" : "ok",
          confidence: "high",
          observedAt,
          fetchedAt,
          ...zoneFields,
          raw: current,
        }),
        createUnifiedRecord({
          id: "weather-precip-mm",
          source: "weather",
          category: "weather",
          metric: "precip_mm",
          label: "Precipitation",
          value: current.precip_mm ?? null,
          unit: "mm",
          status: Number(current.precip_mm || 0) >= 10 ? "warning" : "ok",
          confidence: "medium",
          observedAt,
          fetchedAt,
          ...zoneFields,
          raw: current,
        }),
        createUnifiedRecord({
          id: "weather-condition",
          source: "weather",
          category: "weather",
          metric: "condition_text",
          label: "Current weather condition",
          value: current?.condition?.text ?? null,
          unit: null,
          status: baseStatus,
          confidence: "medium",
          observedAt,
          fetchedAt,
          ...zoneFields,
          raw: current,
        }),
      ];

      return {
        source: "weather",
        status: baseStatus,
        fetchedAt,
        lastSuccessAt: fetchedAt,
        records,
        raw: data,
        error: null,
      };
    } catch (error) {
      return {
        source: "weather",
        status: "unknown",
        fetchedAt,
        lastSuccessAt: null,
        records: [],
        raw: null,
        error: error.message,
      };
    }
  });
}
