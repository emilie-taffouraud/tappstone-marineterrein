import { useEffect, useState } from "react";
import { fetchTelraamTrafficLatest, type TelraamTrafficPoint, type TrafficRangeRequest } from "../lib/opsLiveClient";

export function useTelraamTraffic(request: number | TrafficRangeRequest = 2, refreshMs = 5 * 60 * 1000) {
  const [points, setPoints] = useState<TelraamTrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTelraamTrafficLatest(request);
        if (!cancelled) {
          setPoints(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setError("Unable to load Telraam history from the local backend.");
          setPoints([]);
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
  }, [requestKey, refreshMs]);

  return { points, loading, error };
}
