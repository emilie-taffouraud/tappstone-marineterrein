import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip } from "react-leaflet";
import { MAP_CENTER, MAP_ZOOM } from "./mapConfig";
import type { LayerVisibility, WarningPoint, WeatherPoint, ZoneFeature } from "./types";
import type { SensorPoint } from "./sensorCatalog";

function sensorColor(state: SensorPoint["state"]) {
  if (state === "live") return "#059669";
  if (state === "awaiting-data") return "#d97706";
  if (state === "installed") return "#2563eb";
  return "#94a3b8";
}

function zoneColor(status: ZoneFeature["status"]) {
  if (status === "critical") return "#e11d48";
  if (status === "warning") return "#d97706";
  if (status === "ok") return "#0f766e";
  return "#94a3b8";
}

export function OperationsMapCanvas({
  visibility,
  zones,
  sensorPoints,
  weatherPoints,
  warningPoints,
}: {
  visibility: LayerVisibility;
  zones: ZoneFeature[];
  sensorPoints: SensorPoint[];
  weatherPoints: WeatherPoint[];
  warningPoints: WarningPoint[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#eff7f2_0%,#edf4ef_100%)] shadow-[0_18px_40px_rgba(21,128,61,0.08)]">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={15}
        maxZoom={19}
        scrollWheelZoom={false}
        className="h-[560px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibility.zones &&
          zones.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              pathOptions={{
                color: zoneColor(zone.status),
                weight: zone.id === "general" ? 1.5 : 2,
                fillColor: zoneColor(zone.status),
                fillOpacity: zone.id === "general" ? 0.06 : 0.12,
                dashArray: zone.id === "general" ? "6 6" : undefined,
              }}
            >
              {visibility.labels ? (
                <Tooltip permanent direction="center" className="zone-label-tooltip">
                  {zone.label}
                </Tooltip>
              ) : null}
              <Popup>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{zone.label}</p>
                  <p className="text-xs text-slate-600">
                    {zone.recordCount} live records, {zone.activeWarnings} warnings, gate flow score {zone.mobilityScore || 0}
                  </p>
                  <p className="text-xs text-slate-600">Context: {zone.weatherSummary || "No mapped weather note yet"}</p>
                </div>
              </Popup>
            </Polygon>
          ))}

        {visibility.sensors &&
          sensorPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={point.installState === "planned" ? 6 : 8}
              pathOptions={{
                color: sensorColor(point.state),
                fillColor: sensorColor(point.state),
                fillOpacity: 0.8,
                weight: 2,
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
                  <p className="text-xs text-slate-600">{point.availabilityLabel}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {visibility.weather &&
          weatherPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={6}
              pathOptions={{
                color: point.status === "warning" ? "#0284c7" : "#0ea5e9",
                fillColor: point.status === "warning" ? "#0284c7" : "#38bdf8",
                fillOpacity: 0.9,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{point.title}</p>
                  <p className="text-xs text-slate-600">{point.zone}</p>
                  <p className="text-xs text-slate-600">Value: {point.value}</p>
                  <p className="text-xs text-slate-600">Observed {new Date(point.observedAt).toLocaleString()}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {visibility.warnings &&
          warningPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={9}
              pathOptions={{
                color: point.status === "critical" ? "#be123c" : "#ea580c",
                fillColor: point.status === "critical" ? "#f43f5e" : "#fb923c",
                fillOpacity: 0.92,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{point.title}</p>
                  <p className="text-xs text-slate-600">{point.zone}</p>
                  <p className="text-xs text-slate-600">{point.detail}</p>
                  <p className="text-xs text-slate-600">
                    Source: KNMI, status {point.status}, observed {new Date(point.observedAt).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
