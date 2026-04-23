import { useState, useEffect } from "react";
import { fetchEvents } from "../api";
import type { AgendaFeed } from "../types";

export function useEvents(limit = 8) {
  const [data, setData] = useState<AgendaFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents(limit)
      .then((feed) => {
        setData(feed);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [limit]);

  return { data, loading, error };
}
