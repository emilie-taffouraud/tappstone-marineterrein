export type EnvironmentThresholdStatus = "green" | "yellow" | "orange" | "red" | "darkRed" | "unavailable";

export type EnvironmentThresholdResult = {
  status: EnvironmentThresholdStatus;
  label: string;
  message: string;
};

export type EnvironmentMetricType =
  | "noise"
  | "sound"
  | "soundLevel"
  | "sound_level_db"
  | "no2"
  | "temperature"
  | "heat"
  | "temperature_c"
  | "co2"
  | "pm25"
  | "pm10"
  | "aqi"
  | "humidity";

type ThresholdBand = {
  max?: number;
  status: Exclude<EnvironmentThresholdStatus, "unavailable">;
  label: string;
  message: string;
};

const UNAVAILABLE_RESULT: EnvironmentThresholdResult = {
  status: "unavailable",
  label: "Data unavailable",
  message: "No recent sensor data available",
};

const THRESHOLDS: Partial<Record<EnvironmentMetricType, ThresholdBand[]>> = {
  noise: [
    { max: 45, status: "green", label: "Very good", message: "Outdoor acoustic quality is very good." },
    { max: 50, status: "green", label: "Good", message: "Outdoor acoustic quality is good." },
    { max: 55, status: "yellow", label: "Reasonable", message: "Sound levels are reasonable, but may be noticeable." },
    { max: 60, status: "orange", label: "Moderate", message: "Sound levels are moderate and may affect comfort." },
    { max: 65, status: "red", label: "Fairly poor", message: "Outdoor acoustic quality is fairly poor." },
    { max: 70, status: "darkRed", label: "Poor", message: "Outdoor acoustic quality is poor." },
    { status: "darkRed", label: "Very poor", message: "Outdoor acoustic quality is very poor." },
  ],
  no2: [
    { max: 40, status: "green", label: "Safe", message: "NO2 is within the pollutant-specific safe range." },
    { max: 80, status: "yellow", label: "Discomfort possible for sensitive groups", message: "NO2 may cause discomfort for sensitive groups." },
    { max: 150, status: "orange", label: "Risk for sensitive groups", message: "NO2 may pose a risk for sensitive groups." },
    { max: 200, status: "red", label: "High pollution", message: "NO2 pollution is high." },
    { status: "darkRed", label: "Health alert", message: "NO2 is above the health-alert threshold." },
  ],
  temperature: [
    { max: 26, status: "green", label: "Safe", message: "Heat conditions are within the safe range." },
    { max: 32, status: "yellow", label: "Caution", message: "Heat conditions call for caution." },
    { max: 40, status: "orange", label: "Extreme caution", message: "Heat conditions call for extreme caution." },
    { status: "darkRed", label: "Danger", message: "Heat conditions are dangerous." },
  ],
  aqi: [
    { max: 50, status: "green", label: "Good", message: "AQI is in the good band." },
    { max: 100, status: "yellow", label: "Moderate", message: "AQI is acceptable, with possible sensitivity for vulnerable groups." },
    { max: 150, status: "orange", label: "Unhealthy for sensitive groups", message: "AQI may affect sensitive groups." },
    { max: 200, status: "red", label: "Unhealthy", message: "AQI is unhealthy." },
    { status: "darkRed", label: "Very unhealthy", message: "AQI is in a health-alert band." },
  ],
  humidity: [
    { max: 30, status: "yellow", label: "Dry", message: "Humidity is lower than the comfortable outdoor context band." },
    { max: 60, status: "green", label: "Comfortable", message: "Humidity is within the comfortable context band." },
    { max: 80, status: "yellow", label: "Humid", message: "Humidity is elevated." },
    { status: "orange", label: "Very humid", message: "Humidity is very high." },
  ],
  pm25: [],
  pm10: [],
};

const ALIASES: Partial<Record<EnvironmentMetricType, keyof typeof THRESHOLDS | "co2">> = {
  sound: "noise",
  soundLevel: "noise",
  sound_level_db: "noise",
  heat: "temperature",
  temperature_c: "temperature",
  co2: "co2",
};

function normalizeMetricType(metricType: EnvironmentMetricType) {
  return ALIASES[metricType] || metricType;
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getEnvironmentThreshold(metricType: EnvironmentMetricType, value: unknown): EnvironmentThresholdResult {
  const numericValue = normalizeValue(value);
  if (numericValue === null) return UNAVAILABLE_RESULT;

  const normalizedMetric = normalizeMetricType(metricType);

  if (normalizedMetric === "co2") {
    return {
      status: "green",
      label: "Context only",
      message: "Outdoor CO2 is shown as contextual climate data; no indoor ventilation health threshold is applied.",
    };
  }

  const bands = THRESHOLDS[normalizedMetric];
  if (!bands?.length) return UNAVAILABLE_RESULT;

  return bands.find((band) => band.max === undefined || numericValue <= band.max) || UNAVAILABLE_RESULT;
}

export function isUnavailableEnvironmentValue(value: unknown) {
  return normalizeValue(value) === null;
}
