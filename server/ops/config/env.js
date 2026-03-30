function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getOpsEnv() {
  return {
    knmiOpenDataApiKey: process.env.KNMI_OPEN_DATA_API_KEY || "",
    weatherApiKey: process.env.WEATHER_API_KEY || "",
    weatherLocation: process.env.WEATHER_API_LOCATION || "Amsterdam",
    telraamApiKey: process.env.TELRAAM_API_KEY || "",
    telraamBaseUrl: process.env.TELRAAM_API_BASE_URL || "https://telraam-api.net",
    telraamSegmentId: process.env.TELRAAM_SEGMENT_ID || "9000006266",
    telraamLookbackHours: toNumber(process.env.TELRAAM_LOOKBACK_HOURS, 12),
    opsCacheTtlMs: toNumber(process.env.OPS_CACHE_TTL_MS, 300000),
    opsHttpTimeoutMs: toNumber(process.env.OPS_HTTP_TIMEOUT_MS, 8000),
    knmiDataset: process.env.KNMI_WARNING_DATASET || "waarschuwingen_nederland_48h",
    knmiDatasetVersion: process.env.KNMI_WARNING_VERSION || "1.0",
  };
}
