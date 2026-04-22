import { useEffect, useMemo, useRef, useState } from "react";
import { fetchHusenseHeatmap, type HusenseHeatmapRequest, type HusenseHeatmapResponse } from "../../lib/opsLiveClient";
import { MAIN_COLORS } from "../../styles/theme";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "./ui";

type HusenseHeatmapCardProps = {
  selectedRange: string;
};

const HEATMAP_PRESET_OPTIONS = ["Last 30 min", "Last 2 hrs", "Today"] as const;
const DATE_LOOKBACK_DAYS = 10;

type HeatmapSummary = {
  activeCellCount: number;
  averageActiveValue: number;
  coverageRatio: number;
  limitedSignal: boolean;
  maxValue: number;
};

type HeatmapTimeframeOption = {
  key: string;
  label: string;
  helper: string;
  request: HusenseHeatmapRequest;
  activeCellCount: number;
  kind: "preset" | "date";
};

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return null;
}

function buildHeatmapSummary(dataArray: number[]): HeatmapSummary {
  const activeValues = dataArray.filter((value) => Number.isFinite(value) && value > 0);
  const activeCellCount = activeValues.length;
  const maxValue = activeValues.length ? Math.max(...activeValues) : 0;
  const averageActiveValue =
    activeValues.length > 0 ? activeValues.reduce((total, value) => total + value, 0) / activeValues.length : 0;
  const coverageRatio = dataArray.length > 0 ? activeCellCount / dataArray.length : 0;
  const limitedSignal =
    activeCellCount === 0 ||
    maxValue <= 1 ||
    coverageRatio < 0.015 ||
    averageActiveValue < 1.5;

  return {
    activeCellCount,
    averageActiveValue,
    coverageRatio,
    limitedSignal,
    maxValue,
  };
}

function countActiveCells(dataArray: number[]) {
  return dataArray.filter((value) => Number.isFinite(value) && value > 0).length;
}

function resolveRangeBounds(rangePayload: unknown, dataArray: number[]) {
  const activeValues = dataArray.filter((value) => Number.isFinite(value) && value > 0);
  const fallbackMin = activeValues.length ? Math.min(...activeValues) : 0;
  const fallbackMax = activeValues.length ? Math.max(...activeValues) : 1;

  if (Array.isArray(rangePayload) && rangePayload.length >= 2) {
    const min = firstFiniteNumber(rangePayload[0], fallbackMin) ?? fallbackMin;
    const max = firstFiniteNumber(rangePayload[1], fallbackMax) ?? fallbackMax;
    return max > min ? { min, max } : { min: 0, max: max > 0 ? max : 1 };
  }

  if (rangePayload && typeof rangePayload === "object") {
    const rangeRecord = rangePayload as Record<string, unknown>;
    const min = firstFiniteNumber(rangeRecord.min, rangeRecord.low, rangeRecord.lower, rangeRecord.start, fallbackMin) ?? fallbackMin;
    const max = firstFiniteNumber(rangeRecord.max, rangeRecord.high, rangeRecord.upper, rangeRecord.end, fallbackMax) ?? fallbackMax;
    return max > min ? { min, max } : { min: 0, max: max > 0 ? max : 1 };
  }

  return { min: fallbackMin, max: fallbackMax > fallbackMin ? fallbackMax : Math.max(1, fallbackMax) };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeIntensity(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (max <= min) return 1;
  return clamp((value - min) / (max - min), 0, 1);
}

function getHeatColor(intensity: number) {
  if (intensity >= 0.72) {
    return `rgba(243, 113, 88, ${0.68 + intensity * 0.28})`;
  }

  if (intensity >= 0.36) {
    return `rgba(0, 173, 239, ${0.44 + intensity * 0.34})`;
  }

  return `rgba(1, 105, 145, ${0.22 + intensity * 0.28})`;
}

function drawHeatmapOverlay(canvas: HTMLCanvasElement, payload: HusenseHeatmapResponse) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height, data, range } = payload;
  const { min, max } = resolveRangeBounds(range, data);

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  for (let index = 0; index < data.length; index += 1) {
    const value = Number(data[index]) || 0;
    if (value <= 0) continue;

    const x = index % width;
    const y = Math.floor(index / width);
    const intensity = normalizeIntensity(value, min, max);

    ctx.fillStyle = getHeatColor(intensity);
    ctx.fillRect(x, y, 1, 1);
  }
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function buildRecentDateStrings(days: number) {
  const dates: string[] = [];
  const today = new Date();

  for (let offset = 1; offset <= days; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(candidate.getDate() - offset);
    const year = candidate.getFullYear();
    const month = `${candidate.getMonth() + 1}`.padStart(2, "0");
    const day = `${candidate.getDate()}`.padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

function getTimeframeKey(request: HusenseHeatmapRequest) {
  return request.date ? `date:${request.date}` : `preset:${request.range || "Last 2 hrs"}`;
}

function buildPresetOption(range: string, payload: HusenseHeatmapResponse): HeatmapTimeframeOption {
  const activeCellCount = countActiveCells(Array.isArray(payload.data) ? payload.data : []);

  return {
    key: getTimeframeKey({ range }),
    label: range,
    helper: `${activeCellCount} active cells`,
    request: { range },
    activeCellCount,
    kind: "preset",
  };
}

function buildDateOption(date: string, payload: HusenseHeatmapResponse): HeatmapTimeframeOption {
  const activeCellCount = countActiveCells(Array.isArray(payload.data) ? payload.data : []);

  return {
    key: getTimeframeKey({ date }),
    label: formatDateLabel(date),
    helper: `${activeCellCount} active cells`,
    request: { date },
    activeCellCount,
    kind: "date",
  };
}

export default function HusenseHeatmapCard({ selectedRange }: HusenseHeatmapCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const payloadCacheRef = useRef<Record<string, HusenseHeatmapResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [resolvedImageSize, setResolvedImageSize] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });
  const [heatmap, setHeatmap] = useState<HusenseHeatmapResponse | null>(null);
  const [timeframeOptions, setTimeframeOptions] = useState<HeatmapTimeframeOption[]>([]);
  const [timeframeSummary, setTimeframeSummary] = useState("Checking available Husense heatmap windows...");
  const [selectedTimeframeKey, setSelectedTimeframeKey] = useState(
    getTimeframeKey({
      range: HEATMAP_PRESET_OPTIONS.includes(selectedRange as (typeof HEATMAP_PRESET_OPTIONS)[number]) ? selectedRange : "Today",
    }),
  );

  useEffect(() => {
    let cancelled = false;

    async function discoverAvailableTimeframes() {
      setTimeframeSummary("Checking available Husense heatmap windows...");

      const presetResults = await Promise.allSettled(
        HEATMAP_PRESET_OPTIONS.map((range) => fetchHusenseHeatmap({ range })),
      );
      if (cancelled) return;

      const availablePresetOptions = HEATMAP_PRESET_OPTIONS.map((range, index) => {
        const result = presetResults[index];
        if (result.status !== "fulfilled") return null;

        const option = buildPresetOption(range, result.value);
        payloadCacheRef.current[option.key] = result.value;
        return option.activeCellCount > 0 ? option : null;
      }).filter((option): option is HeatmapTimeframeOption => Boolean(option));

      const todayOption = availablePresetOptions.find((option) => option.label === "Today");

      if (todayOption) {
        setTimeframeOptions(availablePresetOptions);
        setTimeframeSummary(
          availablePresetOptions.length > 1
            ? `${availablePresetOptions.map((option) => option.label).join(", ")} currently available.`
            : `${todayOption.label} currently available.`,
        );
        setSelectedTimeframeKey((current) =>
          availablePresetOptions.some((option) => option.key === current) ? current : todayOption.key,
        );
        return;
      }

      const recentDates = buildRecentDateStrings(DATE_LOOKBACK_DAYS);
      const dateResults = await Promise.allSettled(recentDates.map((date) => fetchHusenseHeatmap({ date })));
      if (cancelled) return;

      const availableDateOptions = recentDates
        .map((date, index) => {
          const result = dateResults[index];
          if (result.status !== "fulfilled") return null;

          const option = buildDateOption(date, result.value);
          payloadCacheRef.current[option.key] = result.value;
          return option.activeCellCount > 0 ? option : null;
        })
        .filter((option): option is HeatmapTimeframeOption => Boolean(option));

      if (availableDateOptions.length) {
        setTimeframeOptions(availableDateOptions);
        setTimeframeSummary("Today has no heatmap data right now, so the dropdown shows recent dates with activity.");
        setSelectedTimeframeKey((current) =>
          availableDateOptions.some((option) => option.key === current) ? current : availableDateOptions[0].key,
        );
        return;
      }

      setTimeframeOptions([]);
      setTimeframeSummary("No Husense heatmap data with movement was found for today or the recent date lookback.");
    }

    discoverAvailableTimeframes();

    return () => {
      cancelled = true;
    };
  }, [selectedRange]);

  useEffect(() => {
    let cancelled = false;

    async function loadHeatmap() {
      const selectedOption = timeframeOptions.find((option) => option.key === selectedTimeframeKey);
      if (!selectedOption) {
        setHeatmap(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const cached = payloadCacheRef.current[selectedOption.key];
        if (cached) {
          if (!cancelled) {
            setHeatmap(cached);
          }
          return;
        }

        const payload = await fetchHusenseHeatmap(selectedOption.request);
        payloadCacheRef.current[selectedOption.key] = payload;

        if (!cancelled) {
          setHeatmap(payload);
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setHeatmap(null);
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load Husense movement intensity.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHeatmap();

    return () => {
      cancelled = true;
    };
  }, [selectedTimeframeKey, timeframeOptions]);

  useEffect(() => {
    setImageFailed(false);
  }, [heatmap?.imageUrl]);

  useEffect(() => {
    let cancelled = false;

    async function resolveImageSource() {
      if (!heatmap?.imageUrl) {
        setResolvedImageUrl(null);
        setResolvedImageSize({ width: null, height: null });
        return;
      }

      if (heatmap.imageUrl.startsWith("http")) {
        setResolvedImageUrl(heatmap.imageUrl);
        setResolvedImageSize({
          width: heatmap.imageWidth ?? null,
          height: heatmap.imageHeight ?? null,
        });
        return;
      }

      try {
        const response = await fetch(heatmap.imageUrl, {
          headers: {
            Accept: "application/json,image/*",
          },
        });

        if (!response.ok) {
          throw new Error(`Image metadata request failed (${response.status}).`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as {
            url?: string;
            width?: number;
            height?: number;
          };

          if (cancelled) return;

          if (typeof payload?.url === "string" && payload.url.trim()) {
            setResolvedImageUrl(payload.url);
            setResolvedImageSize({
              width: Number.isFinite(Number(payload.width)) ? Number(payload.width) : heatmap.imageWidth ?? null,
              height: Number.isFinite(Number(payload.height)) ? Number(payload.height) : heatmap.imageHeight ?? null,
            });
            return;
          }
        }

        if (!cancelled) {
          setResolvedImageUrl(heatmap.imageUrl);
          setResolvedImageSize({
            width: heatmap.imageWidth ?? null,
            height: heatmap.imageHeight ?? null,
          });
        }
      } catch (resolutionError) {
        console.error(resolutionError);
        if (!cancelled) {
          setResolvedImageUrl(heatmap.imageUrl);
          setResolvedImageSize({
            width: heatmap.imageWidth ?? null,
            height: heatmap.imageHeight ?? null,
          });
        }
      }
    }

    resolveImageSource();

    return () => {
      cancelled = true;
    };
  }, [heatmap?.imageUrl, heatmap?.imageWidth, heatmap?.imageHeight]);

  useEffect(() => {
    if (!heatmap || !canvasRef.current) return;
    if (heatmap.width <= 0 || heatmap.height <= 0) return;
    if (!Array.isArray(heatmap.data) || heatmap.data.length !== heatmap.width * heatmap.height) return;

    drawHeatmapOverlay(canvasRef.current, heatmap);
  }, [heatmap]);

  const selectedOption = timeframeOptions.find((option) => option.key === selectedTimeframeKey) || null;
  const hasGridData =
    Boolean(heatmap) &&
    Number.isFinite(heatmap?.width) &&
    Number.isFinite(heatmap?.height) &&
    (heatmap?.width ?? 0) > 0 &&
    (heatmap?.height ?? 0) > 0 &&
    Array.isArray(heatmap?.data) &&
    heatmap.data.length === (heatmap?.width ?? 0) * (heatmap?.height ?? 0);

  const hasBackgroundImage = Boolean(resolvedImageUrl) && !imageFailed;
  const canRenderHeatmap = Boolean(hasGridData && hasBackgroundImage && heatmap);
  const summary = useMemo(() => (heatmap && hasGridData ? buildHeatmapSummary(heatmap.data) : null), [heatmap, hasGridData]);
  const panelAspectRatio =
    (resolvedImageSize.width ?? 0) > 0 && (resolvedImageSize.height ?? 0) > 0
      ? `${resolvedImageSize.width} / ${resolvedImageSize.height}`
      : heatmap && (heatmap.imageWidth ?? 0) > 0 && (heatmap.imageHeight ?? 0) > 0
        ? `${heatmap.imageWidth} / ${heatmap.imageHeight}`
      : heatmap && heatmap.width > 0 && heatmap.height > 0
        ? `${heatmap.width} / ${heatmap.height}`
        : "16 / 9";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <SectionTitle
            title="Movement intensity"
            subtitle="Husense movement intensity in the monitored space image for the selected time window."
          />

          <div
            className="min-w-[220px] rounded-[18px] border px-4 py-3"
            style={{
              borderColor: `${MAIN_COLORS.aColor1}22`,
              backgroundColor: "rgba(255, 255, 255, 0.88)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#5a748c" }}>
              Time window
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
              {heatmap?.timeRangeLabel || selectedOption?.label || "Awaiting heatmap window"}
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
              Window-based from start and end timestamps, then overlayed directly in Husense image coordinates.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className="rounded-[18px] border px-4 py-3"
          style={{
            borderColor: `${MAIN_COLORS.aColor1}22`,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
          }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#5a748c" }}>
                Heatmap timeframe
              </p>
              <p className="mt-1 text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
                The dropdown first uses working live windows. If today has no usable Husense heatmap data, it falls back to
                recent full-day dates where movement is available.
              </p>
              <p className="mt-1 text-xs leading-5" style={{ color: "#5a748c" }}>
                {timeframeSummary}
              </p>
            </div>

            <label className="flex min-w-[220px] flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#36546f" }}>
                Timeframe
              </span>
              <select
                value={selectedOption?.key || ""}
                onChange={(event) => setSelectedTimeframeKey(event.target.value)}
                disabled={!timeframeOptions.length}
                className="rounded-[18px] border px-3 py-2.5 text-sm outline-none ring-0 transition"
                style={{
                  borderColor: "rgba(120, 169, 198, 0.45)",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  color: MAIN_COLORS.aColorBlack,
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                }}
              >
                {!timeframeOptions.length ? <option value="">No available timeframe</option> : null}

                {timeframeOptions.some((option) => option.kind === "preset") ? (
                  <optgroup label="Live windows">
                    {timeframeOptions
                      .filter((option) => option.kind === "preset")
                      .map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label} · {option.helper}
                        </option>
                      ))}
                  </optgroup>
                ) : null}

                {timeframeOptions.some((option) => option.kind === "date") ? (
                  <optgroup label="Recent dates">
                    {timeframeOptions
                      .filter((option) => option.kind === "date")
                      .map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label} · {option.helper}
                        </option>
                      ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="sky">Monitored Husense space</Pill>
          <Pill tone="slate">{heatmap?.spaceName || "Configured Husense space"}</Pill>
          <Pill tone={canRenderHeatmap ? "emerald" : "amber"}>{canRenderHeatmap ? "Image-linked overlay" : "Awaiting image or grid"}</Pill>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-[22px]"
          style={{
            aspectRatio: panelAspectRatio,
            minHeight: canRenderHeatmap ? undefined : "340px",
            border: `1px solid ${MAIN_COLORS.aColor1}26`,
            background: "linear-gradient(180deg, rgba(248, 252, 253, 0.96) 0%, rgba(240, 247, 249, 0.98) 100%)",
          }}
        >
          {canRenderHeatmap ? (
            <>
              <img
                src={resolvedImageUrl || ""}
                alt={`${heatmap?.spaceName || "Husense space"} background`}
                className="absolute inset-0 h-full w-full object-fill"
                onError={() => setImageFailed(true)}
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: 0.9,
                  mixBlendMode: "normal",
                }}
              />

              <div
                className="absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em]"
                style={{
                  borderColor: `${MAIN_COLORS.aColor1}2e`,
                  backgroundColor: `${MAIN_COLORS.aColorWhite}d8`,
                  color: MAIN_COLORS.aColorGray,
                }}
              >
                Husense space image
              </div>

              <div
                className="absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-medium"
                style={{
                  borderColor: `${MAIN_COLORS.aColor1}2e`,
                  backgroundColor: `${MAIN_COLORS.aColorWhite}d8`,
                  color: MAIN_COLORS.aColor1,
                }}
              >
                {heatmap?.spaceName}
              </div>

              {summary?.limitedSignal ? (
                <div
                  className="absolute left-4 bottom-4 rounded-2xl border px-3 py-2 text-xs font-medium"
                  style={{
                    borderColor: "rgba(245, 158, 11, 0.34)",
                    backgroundColor: "rgba(255, 251, 235, 0.9)",
                    color: "#9a6700",
                  }}
                >
                  {summary.activeCellCount > 0
                    ? "Low movement intensity captured in this time window."
                    : "No movement cells are currently returned for this time window."}
                </div>
              ) : null}
            </>
          ) : null}

          {loading ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/65 px-6 text-center text-sm font-medium backdrop-blur-sm"
              style={{ color: MAIN_COLORS.aColor1 }}
            >
              Loading Husense movement intensity...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center text-sm text-red-500">
              <div>
                Failed to load Husense movement intensity for the monitored space.
                <div className="mt-2 text-xs opacity-70">{error}</div>
              </div>
            </div>
          ) : null}

          {!loading && !error && !canRenderHeatmap ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center"
              style={{ color: MAIN_COLORS.aColorGray }}
            >
              <div className="max-w-md space-y-2">
                <p className="text-sm font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {hasGridData && !hasBackgroundImage
                    ? "The Husense background image could not be loaded for this timeframe."
                    : "No Husense image or movement intensity grid is available for this monitored space right now."}
                </p>
                <p className="text-sm leading-6">
                  {hasGridData && !hasBackgroundImage
                    ? "The heatmap grid is present, but the linked background image did not resolve successfully."
                    : "This panel only renders when Husense returns both an image and a valid heatmap grid for the selected time window."}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {!error && canRenderHeatmap && summary ? (
          <>
            <div
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: `${MAIN_COLORS.aColor1}22`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}`,
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                    Movement intensity
                  </div>
                  <div
                    className="h-2.5 w-full rounded-full sm:w-56"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(1,105,145,0.35) 0%, rgba(0,173,239,0.56) 50%, rgba(243,113,88,0.88) 100%)",
                    }}
                  />
                  <div className="flex items-center justify-between text-[11px]" style={{ color: MAIN_COLORS.aColorGray }}>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="max-w-sm text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                  Intensity is normalized from the returned Husense range and drawn in the same image coordinate space as the
                  monitored background image.
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
              >
                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                  Active cells
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {summary.activeCellCount}
                </p>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
              >
                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                  Coverage
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {formatPercent(summary.coverageRatio)}
                </p>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
              >
                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                  Average active value
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {formatAverage(summary.averageActiveValue)}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
