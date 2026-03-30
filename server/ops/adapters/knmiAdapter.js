import { getOrSetCache } from "../lib/cache.js";
import { fetchJson, fetchText } from "../lib/http.js";
import { createUnifiedRecord, zoneFieldsFromText } from "../lib/normalize.js";

const KNMI_OPEN_DATA_BASE = "https://api.dataplatform.knmi.nl/open-data/v1";

function mapKnmiSeverity(severity) {
  const normalized = String(severity || "").toLowerCase();
  if (normalized.includes("extreme") || normalized.includes("severe")) return "critical";
  if (normalized.includes("moderate")) return "warning";
  return "ok";
}

function extractTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}

function parseKnmiWarnings(xmlText) {
  const infoBlocks = xmlText.match(/<info\b[\s\S]*?<\/info>/gi) || [];

  return infoBlocks.map((block, index) => {
    const headline = extractTag(block, "headline");
    const description = extractTag(block, "description");
    const areaDesc = extractTag(block, "areaDesc");
    const severity = extractTag(block, "severity");
    const event = extractTag(block, "event");
    const effective = extractTag(block, "effective");
    const expires = extractTag(block, "expires");
    const urgency = extractTag(block, "urgency");

    return {
      id: `warning-${index + 1}`,
      headline,
      description,
      areaDesc,
      severity,
      event,
      effective,
      expires,
      urgency,
    };
  });
}

async function getLatestKnmiFile({ apiKey, dataset, version, timeoutMs }) {
  const listUrl =
    `${KNMI_OPEN_DATA_BASE}/datasets/${dataset}/versions/${version}/files` +
    "?maxKeys=1&orderBy=created&sorting=desc";

  const listJson = await fetchJson(listUrl, {
    timeoutMs,
    headers: { Authorization: apiKey },
  });

  const latestFile = listJson?.files?.[0];
  if (!latestFile?.filename) {
    throw new Error(`No files returned for KNMI dataset ${dataset}`);
  }

  const fileUrl = `${KNMI_OPEN_DATA_BASE}/datasets/${dataset}/versions/${version}/files/${latestFile.filename}/url`;
  const urlJson = await fetchJson(fileUrl, {
    timeoutMs,
    headers: { Authorization: apiKey },
  });

  return {
    filename: latestFile.filename,
    created: latestFile.created,
    lastModified: latestFile.lastModified,
    temporaryDownloadUrl: urlJson.temporaryDownloadUrl,
  };
}

export async function getKnmiLiveData(env) {
  const fetchedAt = new Date().toISOString();

  if (!env.knmiOpenDataApiKey) {
    return {
      source: "knmi",
      status: "unknown",
      fetchedAt,
      lastSuccessAt: null,
      records: [],
      raw: null,
      error: "Missing KNMI_OPEN_DATA_API_KEY",
    };
  }

  return getOrSetCache("ops:knmi", env.opsCacheTtlMs, async () => {
    try {
      const latest = await getLatestKnmiFile({
        apiKey: env.knmiOpenDataApiKey,
        dataset: env.knmiDataset,
        version: env.knmiDatasetVersion,
        timeoutMs: env.opsHttpTimeoutMs,
      });

      const rawXml = await fetchText(latest.temporaryDownloadUrl, {
        timeoutMs: env.opsHttpTimeoutMs,
      });
      const warnings = parseKnmiWarnings(rawXml);

      const records = warnings.map((warning) => {
        const zoneFields = zoneFieldsFromText(warning.areaDesc || "Marineterrein");
        return createUnifiedRecord({
          id: `knmi-${warning.id}`,
          source: "knmi",
          category: "warning",
          metric: "weather_warning",
          label: warning.headline || warning.event || "KNMI weather warning",
          value: warning.event || warning.severity || "warning",
          unit: null,
          status: mapKnmiSeverity(warning.severity),
          confidence: "high",
          observedAt: warning.effective || latest.created,
          fetchedAt,
          ...zoneFields,
          raw: warning,
        });
      });

      return {
        source: "knmi",
        status: records.some((record) => record.status === "critical")
          ? "critical"
          : records.length
            ? "ok"
            : "unknown",
        fetchedAt,
        lastSuccessAt: fetchedAt,
        records,
        raw: {
          file: latest,
          warnings,
        },
        error: null,
      };
    } catch (error) {
      return {
        source: "knmi",
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
