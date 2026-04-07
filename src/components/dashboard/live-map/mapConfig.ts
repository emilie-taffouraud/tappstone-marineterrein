type ZoneConfig = {
  id: string;
  label: string;
  center: [number, number];
  polygon: [number, number][];
  description: string;
};

function rectangleAround(
  center: [number, number],
  latOffset: number,
  lonOffset: number,
): [number, number][] {
  const [lat, lon] = center;
  return [
    [lat + latOffset, lon - lonOffset],
    [lat + latOffset, lon + lonOffset],
    [lat - latOffset, lon + lonOffset],
    [lat - latOffset, lon - lonOffset],
  ];
}

export const MAP_CENTER: [number, number] = [52.37278, 4.91535];
export const MAP_ZOOM = 17;

export const zoneConfigs: ZoneConfig[] = [
  {
    id: "tapp",
    label: "TAPP",
    center: [52.37256, 4.91499],
    polygon: rectangleAround([52.37256, 4.91499], 0.00022, 0.00032),
    description: "Food and gathering area with midday crowd pressure.",
  },
  {
    id: "codam",
    label: "CODAM",
    center: [52.37297, 4.91661],
    polygon: rectangleAround([52.37297, 4.91661], 0.0002, 0.0003),
    description: "Education and event activity zone with environmental sensitivity.",
  },
  {
    id: "ahk-makerspace",
    label: "AHK MakerSpace",
    center: [52.37234, 4.91567],
    polygon: rectangleAround([52.37234, 4.91567], 0.00018, 0.00025),
    description: "Creative production zone and monitoring point.",
  },
  {
    id: "portiersloge",
    label: "Portiersloge",
    center: [52.3737, 4.91412],
    polygon: rectangleAround([52.3737, 4.91412], 0.00026, 0.00028),
    description: "Primary gate and access corridor for arrivals.",
  },
  {
    id: "swim-area",
    label: "Swim area",
    center: [52.37208, 4.91693],
    polygon: rectangleAround([52.37208, 4.91693], 0.00024, 0.00036),
    description: "Waterfront recreation area and weather-sensitive zone.",
  },
  {
    id: "general",
    label: "General Marineterrein",
    center: [52.3728, 4.9154],
    polygon: rectangleAround([52.3728, 4.9154], 0.00075, 0.00105),
    description: "Fallback site-wide zone when source data is not mapped more precisely.",
  },
];
