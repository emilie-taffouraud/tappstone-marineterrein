import type { ComponentType } from "react";
import { Activity, CloudSun, Radar, RefreshCw, ShieldAlert, TrafficCone } from "lucide-react";
import { Pill } from "../ui";
import { formatTimestamp, getStatusTone } from "./opsMapTransforms";
import type { OpsHealthResponse, SpatialSummary } from "./types";
import { MapLegend } from "./MapLegend";
import type { SensorPoint } from "./sensorCatalog";

function SummaryTile({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export function SpatialSummaryPanel({
  summary,
  health,
  sensorPoints,
  sourceHealthId,
  inventoryId,
}: {
  summary: SpatialSummary;
  health: OpsHealthResponse | null;
  sensorPoints: SensorPoint[];
  sourceHealthId?: string;
  inventoryId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile
          title="Telraam gate"
          value={summary.gateFlowLabel}
          helper={
            summary.gateFlow !== null
              ? `${summary.gateFlow} movements per hour from the Kattenburgerstraat 7 counter`
              : "Waiting for the single Telraam counter to report"
          }
          icon={TrafficCone}
        />
        <SummaryTile
          title="Sensor coverage"
          value={summary.sensorCoverage}
          helper={`${summary.liveSensors} live, ${summary.installedSensors - summary.liveSensors} installed without live data, ${summary.pendingSensors} to arrange`}
          icon={Radar}
        />
        <SummaryTile
          title="Current weather"
          value={summary.currentWeather}
          helper="Live weather context from the unified ops endpoint"
          icon={CloudSun}
        />
        <SummaryTile
          title="Active warnings"
          value={String(summary.warningCount)}
          helper="Warning markers currently available on the map"
          icon={ShieldAlert}
        />
        <SummaryTile
          title="Last refresh"
          value={summary.lastRefreshLabel}
          helper="Latest successful dashboard sync"
          icon={RefreshCw}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <MapLegend />

          <div
            id={sourceHealthId}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            style={sourceHealthId ? { scrollMarginTop: "2rem" } : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Source health</p>
                <p className="mt-1 text-xs text-slate-500">Broken sources should degrade gracefully, not break the map.</p>
              </div>
              <Pill tone={getStatusTone(health?.status || "error")}>{health?.status || "unknown"}</Pill>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {health ? (
                Object.entries(health.sources).map(([sourceName, source]) => (
                  <div key={sourceName} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize text-slate-900">{sourceName}</span>
                        <Pill tone={getStatusTone(source.status)}>{source.status}</Pill>
                      </div>
                      <p className="text-xs text-slate-500">
                        {source.recordCount} records, last success {formatTimestamp(source.lastSuccessAt)}
                      </p>
                      {source.error ? <p className="text-xs text-rose-600">{source.error}</p> : null}
                    </div>
                    <Activity className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Waiting for health data from the local backend.</p>
              )}
            </div>
          </div>
        </div>

        <div
          id={inventoryId}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          style={inventoryId ? { scrollMarginTop: "2rem" } : undefined}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Sensor inventory</p>
              <p className="mt-1 text-xs text-slate-500">Installed and planned locations from the Marineterrein sensor plan.</p>
            </div>
            <Pill tone="sky">{sensorPoints.length} listed</Pill>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {sensorPoints.map((sensor) => (
              <div key={sensor.id} className="rounded-2xl bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sensor.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{sensor.category}</p>
                    <p className="mt-1 text-xs text-slate-500">{sensor.availabilityLabel}</p>
                  </div>
                  <Pill tone={sensor.state === "live" ? "emerald" : sensor.state === "awaiting-data" ? "amber" : "slate"}>
                    {sensor.stateLabel}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
