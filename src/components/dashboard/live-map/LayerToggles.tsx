import { Layers3, MapPinned, Radar, TriangleAlert, Umbrella } from "lucide-react";
import { LAYER_TOGGLE_THEME } from "../../../styles/theme";
import type { LayerVisibility } from "./types";

const toggleMeta = [
  { key: "sensors", label: "Sensors", icon: Radar },
  { key: "zones", label: "Zones", icon: MapPinned },
  { key: "weather", label: "Weather", icon: Umbrella },
  { key: "warnings", label: "Warnings", icon: TriangleAlert },
  { key: "labels", label: "Labels", icon: Layers3 },
] as const;

export function LayerToggles({
  visibility,
  onChange,
}: {
  visibility: LayerVisibility;
  onChange: (key: keyof LayerVisibility) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {toggleMeta.map((toggle) => {
        const active = visibility[toggle.key];
        const Icon = toggle.icon;

        return (
          <button
            key={toggle.key}
            type="button"
            onClick={() => onChange(toggle.key)}
            style={active ? LAYER_TOGGLE_THEME.active : LAYER_TOGGLE_THEME.inactive}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition"
          >
            <Icon className="h-4 w-4" />
            {toggle.label}
          </button>
        );
      })}
    </div>
  );
}
