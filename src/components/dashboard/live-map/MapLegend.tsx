import { Radar } from "lucide-react";
import { LIVE_MAP_LEGEND_THEME } from "../../../styles/theme";

const legendItems = [
  {
    color: "#2f9e44",
    label: "Green",
    detail: "Sensor is active and data is available",
  },
  {
    color: "#f59e0b",
    label: "Orange",
    detail: "Sensor exists but data is missing or delayed",
  },
  {
    color: "#dc2626",
    label: "Red",
    detail: "Sensor is not connected or not working",
  },
] as const;

export function MapLegend() {
  return (
    <div className="rounded-2xl p-4" style={LIVE_MAP_LEGEND_THEME.panel}>
      <p className="text-sm font-medium" style={{ color: LIVE_MAP_LEGEND_THEME.text.title }}>Map legend</p>
      <p className="mt-1 text-xs" style={{ color: LIVE_MAP_LEGEND_THEME.text.detail }}>
        Sensor marker states on the map.
      </p>

      <div className="mt-4 space-y-3">
        {legendItems.map((item) => {
          return (
            <div key={item.label} className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-white" style={{ backgroundColor: item.color }}>
                <Radar className="h-3 w-3 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: item.color }}>{item.label}</p>
                </div>
                <p className="mt-1 text-xs leading-5" style={{ color: LIVE_MAP_LEGEND_THEME.text.detail }}>
                  {item.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
