import { getKnmiLiveData } from "../adapters/knmiAdapter.js";
import { getTelraamLiveData } from "../adapters/telraamAdapter.js";
import { getWeatherLiveData } from "../adapters/weatherAdapter.js";
import { getOpsEnv } from "../config/env.js";
import { summarizeRecords } from "../lib/normalize.js";

export async function getUnifiedLiveData({ includeRaw = false } = {}) {
  const env = getOpsEnv();

  const sources = await Promise.all([
    getTelraamLiveData(env),
    getKnmiLiveData(env),
    getWeatherLiveData(env),
  ]);

  const records = sources.flatMap((source) => source.records);
  const summary = summarizeRecords(records);
  const sourceHealth = Object.fromEntries(
    sources.map((source) => [
      source.source,
      {
        status: source.status,
        fetchedAt: source.fetchedAt,
        lastSuccessAt: source.lastSuccessAt,
        recordCount: source.records.length,
        cache: source.cache || null,
        error: source.error,
      },
    ]),
  );

  const response = {
    schemaVersion: "ops-live-v1",
    generatedAt: new Date().toISOString(),
    records,
    sources: sourceHealth,
    summary,
  };

  if (includeRaw) {
    response.raw = Object.fromEntries(sources.map((source) => [source.source, source.raw]));
  }

  return response;
}

export async function getOpsHealth() {
  const liveData = await getUnifiedLiveData({ includeRaw: false });
  const statuses = Object.values(liveData.sources).map((source) => source.status);

  return {
    status: statuses.every((status) => status === "ok")
      ? "ok"
      : statuses.some((status) => status === "ok" || status === "warning" || status === "critical")
        ? "degraded"
        : "error",
    generatedAt: liveData.generatedAt,
    sources: liveData.sources,
    summary: liveData.summary,
  };
}
