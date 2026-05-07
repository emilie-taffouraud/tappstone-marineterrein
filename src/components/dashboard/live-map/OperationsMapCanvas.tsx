import { Fragment } from "react";
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip } from "react-leaflet";
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

function zoneColor(status: ZoneFeature["status"]) {
  if (status === "critical") return MT_COLORS.coral;
  if (status === "warning") return MT_COLORS.yellow;
  if (status === "ok") return MT_COLORS.teal;
  return MT_COLORS.paleBlue;
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

        {visibility.zones &&
          zones.map((zone) => (
            <Fragment key={zone.id}>
              {zone.geometry.type === "polygon" ? (
                <Polygon
                  key={`${zone.id}-shape`}
                  positions={zone.geometry.coordinates as [number, number][]}
                  pathOptions={{
                    color: zoneColor(zone.status),
                    weight: zone.id === "general" ? 1.5 : 2,
                    fillColor: zoneColor(zone.status),
                    fillOpacity: zone.id === "general" ? 0.14 : 0.22,
                  }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{zone.displayName}</p>
                      <p className="text-xs text-slate-600">
                        {zone.recordCount} data points, {zone.activeWarnings} warnings, gate flow score {zone.mobilityScore || 0}
                      </p>
                      <p className="text-xs text-slate-600">Context: {zone.weatherSummary || "No mapped weather note yet"}</p>
                    </div>
                  </Popup>
                </Polygon>
              ) : (
                <CircleMarker
                  key={`${zone.id}-shape`}
                  center={zone.center}
                  radius={zone.id === "general" ? 9 : 11}
                  pathOptions={{
                    color: zoneColor(zone.status),
                    weight: zone.id === "general" ? 1.5 : 2,
                    fillColor: zoneColor(zone.status),
                    fillOpacity: zone.id === "general" ? 0.14 : 0.22,
                  }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{zone.displayName}</p>
                      <p className="text-xs text-slate-600">
                        {zone.recordCount} data points, {zone.activeWarnings} warnings, gate flow score {zone.mobilityScore || 0}
                      </p>
                      <p className="text-xs text-slate-600">Context: {zone.weatherSummary || "No mapped weather note yet"}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {visibility.labels ? (
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
              ) : null}
            </Fragment>
          ))}

        {visibility.sensors &&
          sensorPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={point.installState === "planned" ? 6 : 9}
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

        {visibility.weather &&
          weatherPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={6}
              pathOptions={{
                color: point.status === "warning" ? MT_COLORS.green : MT_COLORS.teal,
                fillColor: point.status === "warning" ? MT_COLORS.green : MT_COLORS.cyan,
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
                color: point.status === "critical" ? MT_COLORS.coral : MT_COLORS.darkTeal,
                fillColor: point.status === "critical" ? MT_COLORS.coral : MT_COLORS.yellow,
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
