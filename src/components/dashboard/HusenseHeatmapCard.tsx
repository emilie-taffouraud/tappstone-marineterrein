import { useEffect, useRef, useState } from "react";
import { CircleMarker, ImageOverlay, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "./ui";
import { MAIN_COLORS } from "../../styles/theme";
import { MAP_CENTER, MAP_ZOOM } from "./live-map/mapConfig";

type HeatmapSummary = {
  activeCellCount: number;
  averageActiveValue: number;
  coverageRatio: number;
  limitedSignal: boolean;
  maxValue: number;
};

const spaceId = "b9c17619-be37-4c6a-a1f3-45e08fd3466c";

const HEATMAP_IMAGE_BOUNDS: [[number, number], [number, number]] = [
  [52.3717, 4.9134],
  [52.3741, 4.9182],
];

const HEATMAP_REFERENCE_MARKERS = [
  { label: "Portiersloge", center: [52.37248, 4.91749] as [number, number] },
  { label: "Main entrance", center: [52.37256, 4.91778] as [number, number] },
  { label: "TAPP", center: [52.3737, 4.91542] as [number, number] },
  { label: "CODAM side", center: [52.37354, 4.91485] as [number, number] },
];

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function buildHeatmapSummary(dataArray: number[]): HeatmapSummary {
  const activeValues = dataArray.filter((value) => value > 0);
  const activeCellCount = activeValues.length;
  const maxValue = activeValues.length ? Math.max(...activeValues) : 0;
  const averageActiveValue =
    activeValues.length > 0
      ? activeValues.reduce((total, value) => total + value, 0) / activeValues.length
      : 0;
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

function getHeatColor(intensity: number) {
  if (intensity >= 0.72) {
    return `rgba(243, 113, 88, ${0.68 + intensity * 0.32})`;
  }

  if (intensity >= 0.36) {
    return `rgba(0, 173, 239, ${0.5 + intensity * 0.34})`;
  }

  return `rgba(1, 105, 145, ${0.34 + intensity * 0.4})`;
}

export default function HusenseHeatmapCard() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<HeatmapSummary | null>(null);
  const [heatmapImage, setHeatmapImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRealHeatmap = async () => {
      setLoading(true);
      setError(null);

      try {
        const dateObj = new Date(`${selectedDate}T00:00:00`);
        const startTimestamp = dateObj.getTime();
        const endTimestamp = startTimestamp + 86400000;

        const response = await fetch(
          `/api/husense/historical?spaceId=${spaceId}&startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`,
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();

        if (
          isMounted &&
          data &&
          Number.isFinite(data.width) &&
          Number.isFinite(data.height) &&
          Array.isArray(data.data)
        ) {
          const nextSummary = buildHeatmapSummary(data.data);
          setSummary(nextSummary);
          drawHeatmap(data.width, data.height, data.data);
        } else if (isMounted) {
          throw new Error("Invalid heatmap data format received.");
        }
      } catch (err: any) {
        console.error("Heatmap rendering error:", err);
        if (isMounted) {
          setSummary(null);
          setHeatmapImage(null);
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRealHeatmap();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const drawHeatmap = (width: number, height: number, dataArray: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...dataArray, 1);

    for (let i = 0; i < dataArray.length; i += 1) {
      const value = dataArray[i];
      if (value === 0) continue;

      const x = i % width;
      const y = Math.floor(i / width);
      const intensity = value / maxVal;

      ctx.fillStyle = getHeatColor(intensity);
      ctx.fillRect(x, y, 1, 1);
    }

    setHeatmapImage(canvas.toDataURL("image/png"));
  };

  return (
    <Card className="mt-5">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <SectionTitle
            title="Radar Movement Heatmap"
            subtitle="This view shows where movement was most concentrated across the selected day around the Marineterrein main entrance."
          />

          <div className="flex min-w-[240px] flex-col items-start gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: `${MAIN_COLORS.aColor1}44`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                color: MAIN_COLORS.aColorBlack,
              }}
            />
            <p className="text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
              Select a day to view historical movement concentration.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="sky">Historical movement intensity</Pill>
          <Pill tone="slate">Area shown: Marineterrein main entrance corridor</Pill>
          <span className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
            Showing {formatSelectedDate(selectedDate)}
          </span>
        </div>

        <div
          className="relative h-[400px] w-full overflow-hidden rounded-2xl"
          style={{
            border: `1px solid ${MAIN_COLORS.aColor1}26`,
            background:
              "linear-gradient(180deg, rgba(248,252,253,0.96) 0%, rgba(240,247,249,0.98) 100%)",
          }}
        >
          <div className="absolute inset-0">
            <MapContainer
              center={MAP_CENTER}
              zoom={MAP_ZOOM}
              minZoom={15}
              maxZoom={19}
              zoomControl={false}
              attributionControl={false}
              dragging={false}
              doubleClickZoom={false}
              boxZoom={false}
              keyboard={false}
              scrollWheelZoom={false}
              touchZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                opacity={0.7}
              />

              {heatmapImage ? (
                <ImageOverlay
                  url={heatmapImage}
                  bounds={HEATMAP_IMAGE_BOUNDS}
                  opacity={0.92}
                />
              ) : null}

              {HEATMAP_REFERENCE_MARKERS.map((marker) => (
                <CircleMarker
                  key={marker.label}
                  center={marker.center}
                  radius={1}
                  pathOptions={{
                    color: "transparent",
                    weight: 0,
                    fillColor: "transparent",
                    fillOpacity: 0,
                  }}
                >
                  <Tooltip permanent direction="center" offset={[0, 0]} className="zone-label-tooltip heatmap-label-tooltip">
                    {marker.label}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="absolute left-4 top-4 z-10 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ borderColor: `${MAIN_COLORS.aColor1}2e`, backgroundColor: `${MAIN_COLORS.aColorWhite}cc`, color: MAIN_COLORS.aColorGray }}>
            Shared site basemap
          </div>

          <div
            className="absolute right-4 top-4 z-10 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              borderColor: `${MAIN_COLORS.aColor1}22`,
              backgroundColor: `${MAIN_COLORS.aColorWhite}d9`,
              color: MAIN_COLORS.aColor1,
            }}
          >
            N
          </div>

          {loading && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/65 text-sm font-medium backdrop-blur-sm"
              style={{ color: MAIN_COLORS.aColor1 }}
            >
              Rendering movement intensity map...
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center text-sm text-red-500">
              <div>
                Failed to load the historical movement map for this date.
                <div className="mt-2 text-xs opacity-70">Error: {error}</div>
              </div>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-px w-px opacity-0"
                style={{
                  imageRendering: "auto",
                  filter: "contrast(1.12) saturate(1.05) blur(0.15px)",
                }}
              />

              {summary?.limitedSignal ? (
                <div
                  className="absolute left-4 bottom-4 z-10 rounded-2xl border px-3 py-2 text-xs font-medium"
                  style={{
                    borderColor: "rgba(245, 158, 11, 0.34)",
                    backgroundColor: "rgba(255, 251, 235, 0.9)",
                    color: "#9a6700",
                  }}
                >
                  Limited movement data for this date.
                </div>
              ) : null}
            </>
          )}
        </div>

        {!error ? (
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
                  <span>Low movement</span>
                  <span>Medium</span>
                  <span>High movement</span>
                </div>
              </div>

              <div className="max-w-sm text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                Stronger color shows denser movement or spatial use across the day. This view reflects activity, not risk.
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
