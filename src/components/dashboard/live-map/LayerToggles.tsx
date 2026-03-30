import { Layers3, MapPinned, TriangleAlert, Umbrella, Waypoints } from "lucide-react";
import type { LayerVisibility } from "./types";

const toggleMeta = [
  { key: "mobility", label: "Mobility", icon: Waypoints },
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
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
              active
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {toggle.label}
          </button>
        );
      })}
    </div>
  );
}
