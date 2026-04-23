import { useState, useEffect } from "react";
import { fetchTrends, fetchBestTime } from "../api";
import type { TrendsData, BestTimeData, TrendPeriod } from "../types";

export function useTrends(period: TrendPeriod) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTrends(period)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [period]);

  return { data, loading, error };
}

export function useBestTime() {
  const [data, setData] = useState<BestTimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBestTime()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
