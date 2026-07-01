function normalizeCameraLabel(camera) {
  return String(camera || "")
    .replace(/^MT[-_\s]*/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toIsoOrNull(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

export async function getBusynessMqttSnapshot(env) {
  const fetchedAt = new Date().toISOString();
  const sourceUrl = env.busynessMqttUrl;

  if (!sourceUrl) {
    return {
      source: "metabase-public-mqtt",
      status: "disabled",
      fetchedAt,
      totalCount: 0,
      rows: [],
      error: "Busyness MQTT URL is not configured.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.opsHttpTimeoutMs || 8000);

  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Busyness MQTT request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rows = (Array.isArray(payload?.data?.rows) ? payload.data.rows : [])
      .map((row, index) => {
        const camera = String(row?.[0] || "").trim();
        const count = Number(row?.[1]);
        const observedAt = toIsoOrNull(row?.[2]);

        return {
          id: camera || `busyness-camera-${index + 1}`,
          camera,
          label: normalizeCameraLabel(camera || `Camera ${index + 1}`),
          count: Number.isFinite(count) ? Math.round(count) : null,
          observedAt,
        };
      })
      .filter((row) => row.camera && row.count !== null)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

    return {
      source: "metabase-public-mqtt",
      status: rows.length ? "ok" : "empty",
      fetchedAt,
      totalCount: rows.reduce((sum, row) => sum + row.count, 0),
      rows,
      error: rows.length ? null : "Busyness MQTT endpoint returned no camera rows.",
    };
  } catch (error) {
    return {
      source: "metabase-public-mqtt",
      status: "error",
      fetchedAt,
      totalCount: 0,
      rows: [],
      error: error instanceof Error ? error.message : "Unable to fetch busyness MQTT data.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
