/**
 * @typedef {[number, number]} LatLngTuple
 *
 * @typedef {{
 *   type: "point";
 *   coordinates: LatLngTuple;
 * }} PointGeometry
 *
 * @typedef {{
 *   type: "polygon";
 *   coordinates: LatLngTuple[];
 * }} PolygonGeometry
 *
 * @typedef {{
 *   id: string;
 *   displayName: string;
 *   shortName: string;
 *   description: string;
 *   geometry: PointGeometry | PolygonGeometry;
 *   labelPosition: LatLngTuple;
 *   lookupKeys: string[];
 * }} SitePlace
 */

/**
 * Canonical source of truth for all named Marineterrein map places.
 * Labels, geometry, and label anchors must come from this registry only.
 *
 * @type {SitePlace[]}
 */
export const SITE_PLACES = [
  {
    id: "tapp",
    displayName: "TAPP",
    shortName: "TAPP",
    description: "Food and gathering area with midday crowd pressure.",
    geometry: {
      type: "point",
      coordinates: [52.37358, 4.91456],
    },
    labelPosition: [52.37358, 4.91456],
    lookupKeys: ["tapp", "027 e"],
  },
  {
    id: "codam",
    displayName: "CODAM",
    shortName: "CODAM",
    description: "Education and event activity zone with environmental sensitivity.",
    geometry: {
      type: "point",
      coordinates: [52.37312, 4.91628],
    },
    labelPosition: [52.37312, 4.91628],
    lookupKeys: ["codam", "039"],
  },
  {
    id: "ahk-makerspace",
    displayName: "AHK MakerSpace",
    shortName: "AHK MakerSpace",
    description: "Creative production zone and monitoring point.",
    geometry: {
      type: "point",
      coordinates: [52.37336, 4.91477],
    },
    labelPosition: [52.37336, 4.91477],
    lookupKeys: ["ahk makerspace", "makerspace", "027 n"],
  },
  {
    id: "portiersloge",
    displayName: "Portiersloge",
    shortName: "Portiersloge",
    description: "Primary gate and access corridor for arrivals.",
    geometry: {
      type: "point",
      coordinates: [52.37352, 4.91409],
    },
    labelPosition: [52.37352, 4.91409],
    lookupKeys: ["portiersloge", "polo", "gate"],
  },
  {
    id: "swim-area",
    displayName: "Swim area",
    shortName: "Swim area",
    description: "Waterfront recreation area and weather-sensitive zone.",
    geometry: {
      type: "point",
      coordinates: [52.37217, 4.91622],
    },
    labelPosition: [52.37217, 4.91622],
    lookupKeys: ["swim area", "swim", "water", "shore"],
  },
  {
    id: "general",
    displayName: "General Marineterrein",
    shortName: "General Marineterrein",
    description: "Fallback site-wide zone when source data is not mapped more precisely.",
    geometry: {
      type: "point",
      coordinates: [52.3728, 4.9154],
    },
    labelPosition: [52.3728, 4.9154],
    lookupKeys: ["general marineterrein", "marineterrein", "general", "unknown"],
  },
];

const SITE_PLACE_BY_ID = new Map(SITE_PLACES.map((place) => [place.id, place]));
const SITE_PLACE_BY_NAME = new Map(
  SITE_PLACES.map((place) => [place.displayName.toLowerCase(), place]),
);
const SITE_PLACE_BY_LOOKUP_KEY = new Map(
  SITE_PLACES.flatMap((place) => place.lookupKeys.map((key) => [key.toLowerCase(), place])),
);

export function getSitePlaceById(id) {
  return SITE_PLACE_BY_ID.get(id) ?? null;
}

export function getSitePlaceByDisplayName(displayName) {
  if (!displayName) return null;
  return SITE_PLACE_BY_NAME.get(String(displayName).trim().toLowerCase()) ?? null;
}

export function getSitePlaceByLookupKey(key) {
  if (!key) return null;
  return SITE_PLACE_BY_LOOKUP_KEY.get(String(key).trim().toLowerCase()) ?? null;
}

export function getSitePlaceGeometryCenter(place) {
  if (place.geometry.type === "point") {
    return place.geometry.coordinates;
  }

  const [firstCoordinate] = place.geometry.coordinates;
  return firstCoordinate ?? place.labelPosition;
}

export function getDefaultSitePlace() {
  return getSitePlaceById("general") ?? SITE_PLACES[0] ?? null;
}
