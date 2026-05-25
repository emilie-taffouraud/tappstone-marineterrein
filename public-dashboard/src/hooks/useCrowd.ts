import { useState, useEffect, useCallback } from "react";
import { fetchCrowd } from "../api";
import type { CrowdSummary, CrowdZone } from "../types";

const HUSENSE_MARINETERREIN_SPACE_IDS = new Set([
  "b9c17619-be37-4c6a-a1f3-45e08fd3466c",
  "9b4a6d95-b5dc-426f-a5ae-ea31200b09b5",
  "781e09a4-b0b1-4bcb-ad7c-67dfc0182792",
]);

function summarize(zones: CrowdZone[]): CrowdSummary {
  const marineterreinZones = zones.filter((zone) => HUSENSE_MARINETERREIN_SPACE_IDS.has(String(zone.id)));
  const total = marineterreinZones.reduce((s, z) => s + z.presenceCount, 0);
  const totalCapacity = marineterreinZones.reduce((s, z) => s + z.capacity, 0);
  const densityPct = totalCapacity > 0 ? Math.round((total / totalCapacity) * 100) : 0;
  const level = densityPct >= 70 ? "high" : densityPct >= 35 ? "medium" : "low";
  return { zones: marineterreinZones, total, totalCapacity, densityPct, level };
}

export function useCrowd(intervalMs = 60_000) {
  const [data, setData] = useState<CrowdSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const zones = await fetchCrowd();
      setData(summarize(zones));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return { data, loading, error, refresh: load };
}
