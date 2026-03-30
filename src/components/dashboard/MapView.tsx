import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

// Fix Leaflet's broken default icon paths when bundled with Vite.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Types ────────────────────────────────────────────────────────────────────

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Optional description shown in the popup. */
  description?: string;
};

type MapViewProps = {
  /** Geographic centre of the map on first render. */
  center?: [lat: number, lng: number];
  /** Initial zoom level (1–18). */
  zoom?: number;
  /** Height of the map container. Any valid CSS value. */
  height?: string;
  /** Markers to plot on the map. */
  markers?: MapMarker[];
  /** Called when the user clicks a marker. */
  onMarkerClick?: (marker: MapMarker) => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Programmatically fly to a new centre + zoom whenever props change. */
function FlyToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [map, center, zoom]);

  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

// Marineterrein Amsterdam coordinates used as the default centre.
const DEFAULT_CENTER: [number, number] = [52.373922, 4.917409];
const DEFAULT_ZOOM = 17;

// Hard bounds so the map stays focused on Marineterrein only.
const MARINETERREIN_BOUNDS: [[number, number], [number, number]] = [
  [52.3717, 4.9147],
  [52.3762, 4.9194],
];
const MARINETERREIN_MIN_ZOOM = 16;
const MARINETERREIN_MAX_ZOOM = 19;

export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = "420px",
  markers = [],
  onMarkerClick,
}: MapViewProps) {
  return (
    <div style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        minZoom={MARINETERREIN_MIN_ZOOM}
        maxZoom={MARINETERREIN_MAX_ZOOM}
        maxBounds={MARINETERREIN_BOUNDS}
        maxBoundsViscosity={0.20}
      >
        {/* OpenStreetMap tile layer*/}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Fly to new centre whenever the prop changes */}
        <FlyToCenter center={center} zoom={zoom} />

        {/* Markers */}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            eventHandlers={{
              click: () => onMarkerClick?.(m),
            }}
          >
            <Popup>
              <strong>{m.label}</strong>
              {m.description && <p style={{ margin: "4px 0 0" }}>{m.description}</p>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
