import type { ComponentType } from "react";
import { Activity, CloudSun, RefreshCw, ShieldAlert, TrafficCone } from "lucide-react";
import { Pill } from "../ui";
import { formatTimestamp, getStatusTone } from "./opsMapTransforms";
import type { OpsHealthResponse, SpatialSummary } from "./types";

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
}: {
  summary: SpatialSummary;
  health: OpsHealthResponse | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <SummaryTile
          title="Busiest visible area"
          value={summary.busiestArea}
          helper={
            summary.busiestFlow !== null
              ? `${summary.busiestFlow} mapped movements per hour`
              : "Waiting for Telraam mobility data"
          }
          icon={TrafficCone}
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Source health</p>
            <p className="mt-1 text-xs text-slate-500">Broken sources should degrade gracefully, not break the map.</p>
          </div>
          <Pill tone={getStatusTone(health?.status || "error")}>{health?.status || "unknown"}</Pill>
        </div>

        <div className="mt-4 space-y-3">
          {health ? (
            Object.entries(health.sources).map(([sourceName, source]) => (
              <div key={sourceName} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize text-slate-900">{sourceName}</span>
                    <Pill tone={getStatusTone(source.status)}>{source.status}</Pill>
                  </div>
                  <p className="text-xs text-slate-500">
                    {source.recordCount} records • last success {formatTimestamp(source.lastSuccessAt)}
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
  );
}
