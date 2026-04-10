import {
  SITE_PLACES,
  getDefaultSitePlace,
  getSitePlaceByDisplayName,
  getSitePlaceById,
  getSitePlaceByLookupKey,
  getSitePlaceGeometryCenter,
} from "../../../src/config/sitePlaces.js";

export const marineterreinZones = SITE_PLACES.map((place) => {
  const [lat, lon] = getSitePlaceGeometryCenter(place);
  return {
    id: place.id,
    label: place.displayName,
    lat,
    lon,
    labelPosition: place.labelPosition,
    geometry: place.geometry,
    lookupKeys: place.lookupKeys,
  };
});

export const telraamSegmentZoneMap = {
  "9000006266": "portiersloge",
};

export function getZoneById(zoneId) {
  return getSitePlaceById(zoneId) ?? getDefaultSitePlace();
}

export function getZoneByDisplayName(displayName) {
  return getSitePlaceByDisplayName(displayName) ?? getDefaultSitePlace();
}

export function getZoneByLookupKey(key) {
  return getSitePlaceByLookupKey(key) ?? getDefaultSitePlace();
}

export function getTelraamZone(segmentId) {
  const mappedZoneId = telraamSegmentZoneMap[String(segmentId)] || "general";
  return getZoneById(mappedZoneId);
}
