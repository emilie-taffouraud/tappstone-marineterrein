import { CloudRain, MapPinned, Radar, TriangleAlert } from "lucide-react";
import { LIVE_MAP_LEGEND_THEME } from "../../../styles/theme";

const legendItems = [
  {
    key: "zones",
    label: "Zones",
    detail: "Approximate Marineterrein operational areas",
    icon: MapPinned,
  },
  {
    key: "sensors",
    label: "Sensors",
    detail: "Installed and planned sensor locations with current availability state",
    icon: Radar,
  },
  {
    key: "weather",
    label: "Weather",
    detail: "Live weather context markers from the unified feed",
    icon: CloudRain,
  },
  {
    key: "warnings",
    label: "Warnings",
    detail: "KNMI-derived warning signals and severity",
    icon: TriangleAlert,
  },
] as const;

export function MapLegend() {
  return (
    <div className="rounded-2xl p-4" style={LIVE_MAP_LEGEND_THEME.panel}>
      <p className="text-sm font-medium" style={{ color: LIVE_MAP_LEGEND_THEME.text.title }}>Map legend</p>
      <p className="mt-1 text-xs" style={{ color: LIVE_MAP_LEGEND_THEME.text.detail }}>
        Live layers are modular so later steps can add anomalies and predictions cleanly.
      </p>

      <div className="mt-4 space-y-3">
        {legendItems.map((item) => {
          const Icon = item.icon;
          const accentColor = LIVE_MAP_LEGEND_THEME.layers[item.key].accent;

          return (
            <div key={item.label} className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: accentColor }} />
                  <p className="text-sm font-medium" style={{ color: accentColor }}>{item.label}</p>
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
