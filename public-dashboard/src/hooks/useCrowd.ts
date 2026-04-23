import { useState, useEffect, useCallback } from "react";
import { fetchCrowd } from "../api";
import type { CrowdSummary, CrowdZone } from "../types";

function summarize(zones: CrowdZone[]): CrowdSummary {
  const total = zones.reduce((s, z) => s + z.presenceCount, 0);
  const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
  const densityPct = totalCapacity > 0 ? Math.round((total / totalCapacity) * 100) : 0;
  const level = densityPct >= 70 ? "high" : densityPct >= 35 ? "medium" : "low";
  return { zones, total, totalCapacity, densityPct, level };
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
