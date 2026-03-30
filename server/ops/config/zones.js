export const marineterreinZones = [
  {
    id: "tapp",
    label: "TAPP",
    lat: 52.37256,
    lon: 4.91499,
    aliases: ["tapp", "027 e"],
  },
  {
    id: "codam",
    label: "CODAM",
    lat: 52.37297,
    lon: 4.91661,
    aliases: ["codam", "039"],
  },
  {
    id: "ahk-makerspace",
    label: "AHK MakerSpace",
    lat: 52.37234,
    lon: 4.91567,
    aliases: ["ahk makerspace", "makerspace", "027 n"],
  },
  {
    id: "portiersloge",
    label: "Portiersloge",
    lat: 52.3737,
    lon: 4.91412,
    aliases: ["portiersloge", "polo", "gate"],
  },
  {
    id: "swim-area",
    label: "Swim area",
    lat: 52.37208,
    lon: 4.91693,
    aliases: ["swim", "swim area", "water", "shore"],
  },
  {
    id: "general",
    label: "General Marineterrein / unknown",
    lat: 52.3728,
    lon: 4.9154,
    aliases: ["marineterrein", "amsterdam", "general", "unknown"],
  },
];

export const telraamSegmentZoneMap = {
  "9000006266": "portiersloge",
};

export function getZoneById(zoneId) {
  return marineterreinZones.find((zone) => zone.id === zoneId) || marineterreinZones.at(-1);
}

export function inferZoneFromText(text) {
  if (!text) {
    return getZoneById("general");
  }

  const normalized = String(text).toLowerCase();
  return (
    marineterreinZones.find((zone) =>
      zone.aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    ) || getZoneById("general")
  );
}

export function getTelraamZone(segmentId) {
  const mappedZoneId = telraamSegmentZoneMap[String(segmentId)] || "general";
  return getZoneById(mappedZoneId);
}
