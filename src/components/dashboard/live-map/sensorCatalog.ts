import type { OpsHealthResponse } from "./types";

type SensorSeed = {
  id: string;
  name: string;
  category: string;
  center: [number, number];
  backendSource?: "telraam" | "weather" | "husense" | "water" | "knmi";
  installState: "installed" | "planned";
};

export type SensorPoint = {
  id: string;
  name: string;
  category: string;
  center: [number, number];
  installState: "installed" | "planned";
  state: "live" | "awaiting-data" | "installed" | "planned";
  stateLabel: string;
  availabilityLabel: string;
};

const SENSOR_SEEDS: SensorSeed[] = [
  { id: "mmwave-hoofdingang", name: "MMwave - Hoofdingang", category: "Mobility & Access", center: [52.372558, 4.917779], installState: "installed" },
  { id: "mmwave-commandantsbrug", name: "MMwave - Commandantsbrug", category: "Mobility & Access", center: [52.37564677, 4.914343403], installState: "installed" },
  { id: "mmwave-oude-poort", name: "MMwave - Oude poort", category: "Mobility & Access", center: [52.37184678, 4.916340498], installState: "installed" },
  { id: "vehicle-classification", name: "Vehicle Classification", category: "Mobility & Access", center: [52.37312298, 4.916791023], installState: "installed" },
  { id: "busyness-terrace", name: "Busyness Monitor - Terrace", category: "Crowd & Presence", center: [52.373141, 4.91674], installState: "installed" },
  { id: "busyness-swimming", name: "Busyness Monitor - Swimming", category: "Crowd & Presence", center: [52.372524, 4.915365], installState: "installed" },
  { id: "busyness-voorwerf", name: "Busyness Monitor - Voorwerf", category: "Crowd & Presence", center: [52.372866, 4.916744], installState: "installed" },
  { id: "water-temperature", name: "Water Temperature Sensor", category: "Recreation & Water", center: [52.37323, 4.914612], backendSource: "water", installState: "installed" },
  { id: "air-quality", name: "Air Quality Sensor", category: "Environmental Conditions", center: [52.37243443, 4.917521035], installState: "installed" },
  { id: "water-quality", name: "Water Quality", category: "Recreation & Water", center: [52.37298, 4.91495], installState: "planned" },
  { id: "soil-moisture", name: "Soil Moisture", category: "Environmental Conditions", center: [52.37274, 4.91589], installState: "planned" },
  { id: "busyness-ams-inst", name: "Busyness Monitor - AMS-Inst", category: "Crowd & Presence", center: [52.37295, 4.91592], installState: "planned" },
];

export function getSensorPoints(health: OpsHealthResponse | null): SensorPoint[] {
  return SENSOR_SEEDS.map((sensor) => {
    if (sensor.installState === "planned") {
      return {
        ...sensor,
        state: "planned",
        stateLabel: "to arrange",
        availabilityLabel: "Not installed yet",
      };
    }

    if (!sensor.backendSource) {
      return {
        ...sensor,
        state: "installed",
        stateLabel: "installed",
        availabilityLabel: "Installed location, backend feed not connected in this dashboard yet",
      };
    }

    const source = health?.sources[sensor.backendSource];

    if (source?.status === "ok") {
      return {
        ...sensor,
        state: "live",
        stateLabel: "live",
        availabilityLabel: `${source.recordCount} records available`,
      };
    }

    return {
      ...sensor,
      state: "awaiting-data",
      stateLabel: "awaiting data",
      availabilityLabel: source?.error || "Sensor is placed, but live data is not available yet",
    };
  });
}

export function summarizeSensorPoints(points: SensorPoint[]) {
  return {
    installed: points.filter((point) => point.installState === "installed").length,
    live: points.filter((point) => point.state === "live").length,
    pending: points.filter((point) => point.state === "planned").length,
  };
}

export function summarizeSensorCategories(points: SensorPoint[]) {
  const grouped = new Map<string, number>();
  for (const point of points) {
    grouped.set(point.category, (grouped.get(point.category) || 0) + 1);
  }

  return [...grouped.entries()].map(([label, value]) => ({ label, value }));
}

export function summarizeSensorStates(points: SensorPoint[]) {
  const grouped = new Map<string, number>();
  for (const point of points) {
    grouped.set(point.stateLabel, (grouped.get(point.stateLabel) || 0) + 1);
  }

  return [...grouped.entries()].map(([label, value]) => ({ label, value }));
}
