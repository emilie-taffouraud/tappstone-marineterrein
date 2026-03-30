import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip } from "react-leaflet";
import { MAP_CENTER, MAP_ZOOM } from "./mapConfig";
import type { LayerVisibility, MobilityPoint, WarningPoint, WeatherPoint, ZoneFeature } from "./types";

function mobilityColor(totalFlow: number) {
  if (totalFlow >= 300) return "#dc2626";
  if (totalFlow >= 180) return "#d97706";
  if (totalFlow > 0) return "#059669";
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
  mobilityPoints,
  weatherPoints,
  warningPoints,
}: {
  visibility: LayerVisibility;
  zones: ZoneFeature[];
  mobilityPoints: MobilityPoint[];
  weatherPoints: WeatherPoint[];
  warningPoints: WarningPoint[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[#eef5f0]">
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
                    {zone.recordCount} live records • {zone.activeWarnings} warnings • mobility score {zone.mobilityScore || 0}
                  </p>
                  <p className="text-xs text-slate-600">
                    Weather: {zone.weatherSummary || "No mapped weather record yet"}
                  </p>
                </div>
              </Popup>
            </Polygon>
          ))}

        {visibility.mobility &&
          mobilityPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.center}
              radius={Math.max(8, Math.min(20, 8 + point.totalFlow / 20))}
              pathOptions={{
                color: mobilityColor(point.totalFlow),
                fillColor: mobilityColor(point.totalFlow),
                fillOpacity: 0.75,
                weight: 2,
              }}
            >
              {visibility.labels ? (
                <Tooltip direction="top" offset={[0, -6]}>
                  {point.zone}
                </Tooltip>
              ) : null}
              <Popup>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{point.zone}</p>
                  <p className="text-xs text-slate-600">Source: Telraam mobility layer</p>
                  <p className="text-xs text-slate-600">Total flow: {point.totalFlow}</p>
                  <p className="text-xs text-slate-600">
                    Pedestrians {point.pedestrians} • Bicycles {point.bicycles} • Vehicles {point.vehicles}
                  </p>
                  <p className="text-xs text-slate-600">
                    Status {point.status} • confidence {point.confidence} • observed {new Date(point.observedAt).toLocaleString()}
                  </p>
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
                    Source: KNMI • status {point.status} • observed {new Date(point.observedAt).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
