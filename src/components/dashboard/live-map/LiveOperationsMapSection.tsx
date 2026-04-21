import { useMemo, useState } from "react";
import { DatabaseZap, LoaderCircle, Map, RefreshCw } from "lucide-react";
import { MAIN_COLORS } from "../../../styles/theme";
import { useOpsLiveData } from "../../../hooks/useOpsLiveData";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "../ui";
import { LayerToggles } from "./LayerToggles";
import { OperationsMapCanvas } from "./OperationsMapCanvas";
import { SpatialSummaryPanel } from "./SpatialSummaryPanel";
import { getSensorPoints } from "./sensorCatalog";
import {
  buildSpatialSummary,
  buildWarningPoints,
  buildWeatherPoints,
  buildZoneFeatures,
  formatTimestamp,
  getStatusTone,
} from "./opsMapTransforms";
import type { LayerVisibility } from "./types";

const DEFAULT_VISIBILITY: LayerVisibility = {
  sensors: true,
  zones: true,
  weather: true,
  warnings: true,
  labels: true,
};

export function LiveOperationsMapSection({
  sourceHealthId,
  inventoryId,
}: {
  sourceHealthId?: string;
  inventoryId?: string;
}) {
  const [visibility, setVisibility] = useState<LayerVisibility>(DEFAULT_VISIBILITY);
  const { overview, health, loading, error } = useOpsLiveData();

  const zones = useMemo(() => buildZoneFeatures(overview.records), [overview.records]);
  const sensorPoints = useMemo(() => getSensorPoints(health), [health]);
  const weatherPoints = useMemo(() => buildWeatherPoints(overview.records), [overview.records]);
  const warningPoints = useMemo(() => buildWarningPoints(overview.records), [overview.records]);
  const spatialSummary = useMemo(() => buildSpatialSummary(overview, health), [overview, health]);

  if (typeof window !== "undefined") {
    const debugPayload = {
      mapComponent: "LiveOperationsMapSection",
      zoneLabels: zones.map((zone) => ({
        labelText: zone.displayName,
        sourceId: zone.id,
        sourceType: "canonical-site-place",
        sourceFile: "src/config/sitePlaces.js",
        renderedMarkerCoordinates: zone.center,
        renderedLabelCoordinates: zone.labelPosition,
        geometryType: zone.geometry.type,
      })),
      sensorLabels: sensorPoints.map((point) => ({
        labelText: point.name,
        sourceId: point.id,
        sourceType: "sensor-seed",
        sourceFile: "src/components/dashboard/live-map/sensorCatalog.ts",
        renderedMarkerCoordinates: point.center,
        renderedLabelCoordinates: point.center,
      })),
    };

    console.log("[ops-map-debug]", debugPayload);
  }

  function toggleLayer(key: keyof LayerVisibility) {
    setVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const hasLiveData = overview.records.length > 0;
  const sourceChips = health ? Object.entries(health.sources) : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionTitle
            title="Sensor network overview"
            subtitle="Installed and planned sensor locations across Marineterrein, with live availability shown where this dashboard already has a connected feed."
          />

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={getStatusTone(health?.status || "error")}>{health?.status || "loading"}</Pill>
            <Pill tone={hasLiveData ? "emerald" : "slate"}>
              {hasLiveData ? `${overview.records.length} live records` : "No live records yet"}
            </Pill>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs"
              style={{
                border: `1px solid ${MAIN_COLORS.aColorGray}44`,
                backgroundColor: MAIN_COLORS.aColor3,
                color: MAIN_COLORS.aColorGray,
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              refresh every 5 min
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-start">
          <div className="space-y-3">
            <LayerToggles visibility={visibility} onChange={toggleLayer} />
            <div className="flex flex-wrap gap-2">
              {sourceChips.map(([sourceName, source]) => (
                <span
                  key={sourceName}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs"
                  style={{
                    border: `1px solid ${MAIN_COLORS.aColorGray}33`,
                    backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                    color: MAIN_COLORS.aColorGray,
                  }}
                >
                  <DatabaseZap className="h-3.5 w-3.5" />
                  <span className="capitalize">{sourceName}</span>
                  <Pill tone={getStatusTone(source.status)}>{source.status}</Pill>
                  <span>{source.recordCount} records</span>
                </span>
              ))}
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm"
            style={{
              border: `1px solid ${MAIN_COLORS.aColor1}55`,
              backgroundColor: `${MAIN_COLORS.aColor1}11`,
              color: MAIN_COLORS.aColor1,
            }}
          >
            <Map className="h-4 w-4" />
            Spatial overview synced {formatTimestamp(overview.generatedAt || null)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <OperationsMapCanvas
            visibility={visibility}
            zones={zones}
            sensorPoints={sensorPoints}
            weatherPoints={weatherPoints}
            warningPoints={warningPoints}
          />

          {loading ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[28px] backdrop-blur-[2px]"
              style={{ backgroundColor: "rgba(252,252,252,0.35)" }}
            >
              <div
                className="flex items-center gap-3 rounded-full px-4 py-3 text-sm"
                style={{
                  border: `1px solid ${MAIN_COLORS.aColorGray}33`,
                  backgroundColor: `${MAIN_COLORS.aColorWhite}e6`,
                  color: MAIN_COLORS.aColorGray,
                  boxShadow: `0 2px 8px ${MAIN_COLORS.aColorBlack}10`,
                }}
              >
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading live map layers...
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              border: `1px solid ${MAIN_COLORS.aColorBlack}33`,
              backgroundColor: MAIN_COLORS.aColor3,
              color: MAIN_COLORS.aColorBlack,
            }}
          >
            {error}
          </div>
        ) : !hasLiveData ? (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              border: `1px solid ${MAIN_COLORS.aColorGray}33`,
              backgroundColor: `${MAIN_COLORS.aColor3}d1`,
              color: MAIN_COLORS.aColorGray,
            }}
          >
            Live records are currently empty, so the map is showing Marineterrein zones and source health while upstream
            feeds recover or new sensors come online.
          </div>
        ) : null}

        <SpatialSummaryPanel
          summary={spatialSummary}
          health={health}
          sensorPoints={sensorPoints}
          sourceHealthId={sourceHealthId}
          inventoryId={inventoryId}
        />
      </CardContent>
    </Card>
  );
}
