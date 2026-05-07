import { Activity } from "lucide-react";
import { Pill } from "../ui";
import { MT_COLORS, getDisplayStatusLabel } from "../../../styles/theme";
import type { OpsHealthResponse, SpatialSummary } from "./types";
import { MapLegend } from "./MapLegend";
import type { SensorPoint } from "./sensorCatalog";

export function SpatialSummaryPanel({
  summary,
  health,
  sensorPoints,
  sourceHealthId,
}: {
  summary: SpatialSummary;
  health: OpsHealthResponse | null;
  sensorPoints: SensorPoint[];
  sourceHealthId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <MapLegend />
        <div
          id={sourceHealthId}
          className="rounded-2xl border bg-[#f8fbfd] p-4"
          style={{ borderColor: MT_COLORS.border, ...(sourceHealthId ? { scrollMarginTop: "2rem" } : {}) }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: MT_COLORS.text }}>Sensor health</p>
              <p className="mt-1 text-xs" style={{ color: MT_COLORS.muted }}>
                All mapped sensor locations and their current data state.
              </p>
            </div>
            <Pill tone={health?.status === "ok" ? "emerald" : health?.status === "degraded" ? "amber" : "rose"}>
              {getDisplayStatusLabel(health?.status || "unknown")}
            </Pill>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {sensorPoints.map((sensor) => (
              <div key={sensor.id} className="rounded-xl border bg-white px-3 py-2.5" style={{ borderColor: MT_COLORS.border }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{sensor.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{sensor.category}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{sensor.availabilityLabel}</p>
                  </div>
                  <Pill tone={sensor.state === "live" ? "emerald" : sensor.state === "broken" ? "rose" : "amber"}>
                    {sensor.state === "live" ? "Active" : sensor.state === "broken" ? "Not connected" : "Missing"}
                  </Pill>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Activity className="h-3.5 w-3.5" />
                  {sensor.stateLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
