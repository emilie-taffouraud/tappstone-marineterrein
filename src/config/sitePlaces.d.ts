export type LatLngTuple = [number, number];

export type PointGeometry = {
  type: "point";
  coordinates: LatLngTuple;
};

export type PolygonGeometry = {
  type: "polygon";
  coordinates: LatLngTuple[];
};

export type SitePlace = {
  id: string;
  displayName: string;
  shortName: string;
  description: string;
  geometry: PointGeometry | PolygonGeometry;
  labelPosition: LatLngTuple;
  lookupKeys: string[];
};

export const SITE_PLACES: SitePlace[];

export function getSitePlaceById(id: string | null | undefined): SitePlace | null;
export function getSitePlaceByDisplayName(displayName: string | null | undefined): SitePlace | null;
export function getSitePlaceByLookupKey(key: string | null | undefined): SitePlace | null;
export function getSitePlaceGeometryCenter(place: SitePlace): LatLngTuple;
export function getDefaultSitePlace(): SitePlace | null;
