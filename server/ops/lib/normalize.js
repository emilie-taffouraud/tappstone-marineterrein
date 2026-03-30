import { inferZoneFromText } from "../config/zones.js";

export function isoOrNow(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function clampConfidence(value = "medium") {
  return ["high", "medium", "low"].includes(value) ? value : "medium";
}

export function clampStatus(value = "unknown") {
  return ["ok", "warning", "critical", "unknown"].includes(value) ? value : "unknown";
}

export function createUnifiedRecord({
  id,
  source,
  category,
  metric,
  label,
  value,
  unit = null,
  status = "unknown",
  confidence = "medium",
  observedAt,
  fetchedAt,
  lat = null,
  lon = null,
  zone = null,
  raw,
}) {
  return {
    id,
    source,
    category,
    metric,
    label,
    value: value ?? null,
    unit,
    status: clampStatus(status),
    confidence: clampConfidence(confidence),
    observedAt: isoOrNow(observedAt),
    fetchedAt: isoOrNow(fetchedAt),
    lat,
    lon,
    zone,
    raw,
  };
}

export function zoneFieldsFromText(text) {
  const zone = inferZoneFromText(text);
  return {
    zone: zone.label,
    lat: zone.lat,
    lon: zone.lon,
  };
}

export function summarizeRecords(records) {
  const grouped = {
    totalRecords: records.length,
    bySource: {},
    byCategory: {},
  };

  for (const record of records) {
    grouped.bySource[record.source] = (grouped.bySource[record.source] || 0) + 1;
    grouped.byCategory[record.category] = (grouped.byCategory[record.category] || 0) + 1;
  }

  return grouped;
}
