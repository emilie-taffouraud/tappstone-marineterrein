import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Map, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "../ui";
import { LayerToggles } from "./LayerToggles";
import { OperationsMapCanvas } from "./OperationsMapCanvas";
import { SpatialSummaryPanel } from "./SpatialSummaryPanel";
import {
  buildMobilityPoints,
  buildSpatialSummary,
  buildWarningPoints,
  buildWeatherPoints,
  buildZoneFeatures,
  getStatusTone,
} from "./opsMapTransforms";
import type { LayerVisibility, OpsHealthResponse, OpsLiveOverviewResponse } from "./types";

const DEFAULT_VISIBILITY: LayerVisibility = {
  mobility: true,
  zones: true,
  weather: true,
  warnings: true,
  labels: true,
};

const EMPTY_OVERVIEW: OpsLiveOverviewResponse = {
  schemaVersion: "ops-live-v1",
  generatedAt: new Date(0).toISOString(),
  records: [],
  sources: {},
  summary: {
    totalRecords: 0,
    bySource: {},
    byCategory: {},
  },
};

export function LiveOperationsMapSection() {
  const [overview, setOverview] = useState<OpsLiveOverviewResponse>(EMPTY_OVERVIEW);
  const [health, setHealth] = useState<OpsHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<LayerVisibility>(DEFAULT_VISIBILITY);

  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      try {
        setLoading(true);
        setError(null);

        const [overviewRes, healthRes] = await Promise.all([
          fetch("/api/ops/live/overview"),
          fetch("/api/ops/health"),
        ]);

        if (!overviewRes.ok) {
          throw new Error("Failed to fetch live ops overview data");
        }

        const [overviewJson, healthJson] = await Promise.all([
          overviewRes.json() as Promise<OpsLiveOverviewResponse>,
          healthRes.json() as Promise<OpsHealthResponse>,
        ]);

        if (!cancelled) {
          setOverview(overviewJson);
          setHealth(healthJson);
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setError("Live map data is temporarily unavailable. Zone structure is still shown so the dashboard stays usable.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMapData();
    const intervalId = window.setInterval(loadMapData, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const zones = useMemo(() => buildZoneFeatures(overview.records), [overview.records]);
  const mobilityPoints = useMemo(() => buildMobilityPoints(overview.records), [overview.records]);
  const weatherPoints = useMemo(() => buildWeatherPoints(overview.records), [overview.records]);
  const warningPoints = useMemo(() => buildWarningPoints(overview.records), [overview.records]);
  const spatialSummary = useMemo(() => buildSpatialSummary(overview), [overview]);

  function toggleLayer(key: keyof LayerVisibility) {
    setVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const hasLiveData = overview.records.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionTitle
            title="Live operations map"
            subtitle="Spatial view of Marineterrein mobility, operational zones, and environmental context from the unified ops backend."
          />

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={getStatusTone(health?.status || "error")}>{health?.status || "loading"}</Pill>
            <Pill tone={hasLiveData ? "emerald" : "slate"}>
              {hasLiveData ? `${overview.records.length} live records` : "No live records yet"}
            </Pill>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              <RefreshCw className="h-3.5 w-3.5" />
              refresh every 5 min
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <LayerToggles visibility={visibility} onChange={toggleLayer} />
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-sm text-emerald-900">
            <Map className="h-4 w-4" />
            Marineterrein map foundation ready for alerts, anomalies, and prediction overlays later
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="space-y-3">
          {loading ? (
            <div className="flex h-[560px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 text-slate-500">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading live map layers...
              </div>
            </div>
          ) : (
            <OperationsMapCanvas
              visibility={visibility}
              zones={zones}
              mobilityPoints={mobilityPoints}
              weatherPoints={weatherPoints}
              warningPoints={warningPoints}
            />
          )}

          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}
        </div>

        <SpatialSummaryPanel summary={spatialSummary} health={health} />
      </CardContent>
    </Card>
  );
}
