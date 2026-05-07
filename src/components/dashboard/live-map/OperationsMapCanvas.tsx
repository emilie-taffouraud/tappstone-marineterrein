import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { MT_COLORS } from "../../../styles/theme";
import { MAP_CENTER, MAP_ZOOM } from "./mapConfig";
import type { LayerVisibility, WarningPoint, WeatherPoint, ZoneFeature } from "./types";
import type { SensorPoint } from "./sensorCatalog";

function sensorColor(state: SensorPoint["state"]) {
  if (state === "live") return "#2f9e44";
  if (state === "broken") return "#dc2626";
  return "#f59e0b";
}

function sensorPopupMessage(point: SensorPoint) {
  if (point.state === "live") return point.availabilityLabel;
  if (point.state === "broken") return "This sensor is not working.";
  return point.availabilityLabel || "Data not available.";
}

export function OperationsMapCanvas({
  visibility,
  sensorPoints,
  zones: _zones,
  weatherPoints: _weatherPoints,
  warningPoints: _warningPoints,
}: {
  visibility: LayerVisibility;
  zones: ZoneFeature[];
  sensorPoints: SensorPoint[];
  weatherPoints: WeatherPoint[];
  warningPoints: WarningPoint[];
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border bg-[#eef2f4] shadow-[0_8px_24px_rgba(26,75,88,0.06)]" style={{ borderColor: MT_COLORS.border }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={15}
        maxZoom={19}
        scrollWheelZoom={false}
        className="h-[560px] w-full"
      >
        <TileLayer
          className="ops-map-muted-tiles"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibility.labels &&
          _zones.filter((zone) => zone.id !== "general").map((zone) => (
            <CircleMarker
              key={`${zone.id}-label`}
              center={zone.labelPosition}
              radius={1}
              pathOptions={{
                opacity: 0,
                fillOpacity: 0,
                stroke: false,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -12]} className="zone-label-tooltip">
                {zone.displayName}
              </Tooltip>
            </CircleMarker>
          ))}

        {visibility.sensors &&
          sensorPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                fillColor: sensorColor(point.state),
                fillOpacity: 0.94,
                weight: 3,
              }}
            >
              {visibility.labels ? (
                <Tooltip direction="top" offset={[0, -6]}>
                  {point.name}
                </Tooltip>
              ) : null}
              <Popup>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{point.name}</p>
                  <p className="text-xs text-slate-600">{point.category}</p>
                  <p className="text-xs text-slate-600">State: {point.stateLabel}</p>
                  <p className="text-xs text-slate-600">
                    {point.state === "live" ? "Data available" : point.state === "broken" ? "Data not available" : "Data not found"}
                  </p>
                  <p className="text-xs text-slate-600">{sensorPopupMessage(point)}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
