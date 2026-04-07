import { useEffect, useState } from "react";
import { fetchTelraamTrafficLatest, type TelraamTrafficPoint } from "../lib/opsLiveClient";

export function useTelraamTraffic(refreshMs = 5 * 60 * 1000) {
  const [points, setPoints] = useState<TelraamTrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTelraamTrafficLatest();
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
  }, [refreshMs]);

  return { points, loading, error };
}
