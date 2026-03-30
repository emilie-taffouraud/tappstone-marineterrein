import { useEffect, useState } from "react";
import {
  fetchOpsHealth,
  fetchOpsOverview,
  type OpsHealthResponse,
  type OpsLiveOverviewResponse,
} from "../lib/opsLiveClient";

const EMPTY_OVERVIEW: OpsLiveOverviewResponse = {
  schemaVersion: "ops-live-v1",
  generatedAt: "",
  records: [],
  sources: {},
  summary: {
    totalRecords: 0,
    bySource: {},
    byCategory: {},
  },
};

export function useOpsLiveData(refreshMs = 5 * 60 * 1000) {
  const [overview, setOverview] = useState<OpsLiveOverviewResponse>(EMPTY_OVERVIEW);
  const [health, setHealth] = useState<OpsHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [overviewResult, healthResult] = await Promise.allSettled([
          fetchOpsOverview(),
          fetchOpsHealth(),
        ]);

        if (overviewResult.status !== "fulfilled") {
          throw overviewResult.reason;
        }

        if (!cancelled) {
          setOverview(overviewResult.value);

          if (healthResult.status === "fulfilled") {
            setHealth(healthResult.value.data);

            if (!healthResult.value.ok) {
              setError("Live data is available but one or more sources are degraded.");
            }
          } else {
            setHealth(null);
            setError("Live overview loaded, but source-health details are temporarily unavailable.");
          }
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setError("Unable to load live ops data from the local backend.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    const intervalId = window.setInterval(load, refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [refreshMs]);

  return {
    overview,
    health,
    loading,
    error,
    hasLiveData: overview.records.length > 0,
  };
}
