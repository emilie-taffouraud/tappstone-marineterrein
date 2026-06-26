function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value !== "string") return fallback;
  return ["true", "1", "yes", "require"].includes(value.trim().toLowerCase());
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
    soundClassificationApiUrl: process.env.SOUND_CLASSIFICATION_API_URL || "",
    soundClassificationApiToken: process.env.SOUND_CLASSIFICATION_API_TOKEN || "",
    soundMqttHost: cleanText(process.env.SOUND_MQTT_HOST, "sensemakersams.org"),
    soundMqttPort: toNumber(process.env.SOUND_MQTT_PORT, 1883),
    soundMqttUsername: cleanText(process.env.SOUND_MQTT_USERNAME, "SenseSound"),
    soundMqttPassword: cleanText(process.env.SOUND_MQTT_PASSWORD),
    soundMqttTopic: cleanText(process.env.SOUND_MQTT_TOPIC, "pipeline/urbansounds/OE-007"),
    soundMqttZoneId: cleanText(process.env.SOUND_MQTT_ZONE_ID, "general"),
    soundMqttStaleAfterMs: toNumber(process.env.SOUND_MQTT_STALE_AFTER_MS, 10 * 60 * 1000),
    waterDatabaseUrl: process.env.WATER_DATABASE_URL || "",
    waterDbHost: process.env.WATER_DB_HOST || "",
    waterDbPort: toNumber(process.env.WATER_DB_PORT, 5432),
    waterDbName: process.env.WATER_DB_NAME || "",
    waterDbUser: process.env.WATER_DB_USER || "",
    waterDbPassword: process.env.WATER_DB_PASSWORD || "",
    waterDbSsl: toBoolean(process.env.WATER_DB_SSL),
    waterTemperatureApiUrl: process.env.WATER_TEMPERATURE_API_URL || "",
    waterTemperatureApiKey: process.env.WATER_TEMPERATURE_API_KEY || "",
    airQualityDatabaseUrl: cleanText(process.env.AIR_QUALITY_DATABASE_URL || process.env.AIR_QUALITY_DB_URL),
    airQualityDbHost: cleanText(process.env.AIR_QUALITY_DB_HOST),
    airQualityDbPort: toNumber(process.env.AIR_QUALITY_DB_PORT, 5432),
    airQualityDbName: cleanText(process.env.AIR_QUALITY_DB_NAME),
    airQualityDbUser: cleanText(process.env.AIR_QUALITY_DB_USER),
    airQualityDbPassword: process.env.AIR_QUALITY_DB_PASSWORD || "",
    airQualityDbSsl: toBoolean(process.env.AIR_QUALITY_DB_SSL),
    airQualityMqttTable: cleanText(process.env.AIR_QUALITY_MQTT_TABLE || process.env.MQTT_AIR_QUALITY_TABLE),
    airQualityDevicePrefix: cleanText(process.env.AIR_QUALITY_DEVICE_PREFIX),
    airQualityLookbackRows: toNumber(process.env.AIR_QUALITY_LOOKBACK_ROWS, 5000),
    opsCacheTtlMs: toNumber(process.env.OPS_CACHE_TTL_MS, 300000),
    opsHttpTimeoutMs: toNumber(process.env.OPS_HTTP_TIMEOUT_MS, 8000),
    knmiDataset: process.env.KNMI_WARNING_DATASET || "waarschuwingen_nederland_48h",
    knmiDatasetVersion: process.env.KNMI_WARNING_VERSION || "1.0",
  };
}
