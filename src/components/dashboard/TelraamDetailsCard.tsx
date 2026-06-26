import type { TelraamTrafficPoint } from "../../lib/opsLiveClient";
import { MAIN_COLORS } from "../../styles/theme";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "./ui";

const EMPTY_RANGE_MESSAGE = "No data available for the selected time range.";

type TelraamDetailsCardProps = {
  points: TelraamTrafficPoint[];
  rangeLabel: string;
  error?: string | null;
};

function asNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sumTrafficField(points: TelraamTrafficPoint[], metric: keyof TelraamTrafficPoint) {
  return points.reduce((sum, point) => sum + (asNumber(point[metric]) ?? 0), 0);
}

export default function TelraamDetailsCard({ points, rangeLabel, error }: TelraamDetailsCardProps) {
  const hasTelraamRecords = points.length > 0;
  const pedestrians = hasTelraamRecords ? sumTrafficField(points, "pedestrian_count") : null;
  const bicycles = hasTelraamRecords ? sumTrafficField(points, "bicycle_count") : null;
  const vehicles = hasTelraamRecords ? sumTrafficField(points, "vehicle_count") : null;
  const night = hasTelraamRecords ? sumTrafficField(points, "night_count") : null;
  const totalFlow = hasTelraamRecords ? (pedestrians ?? 0) + (bicycles ?? 0) + (vehicles ?? 0) + (night ?? 0) : null;

  const topStats = [
    { label: "Pedestrians", value: pedestrians, helper: "foot detections" },
    { label: "Bicycles", value: bicycles, helper: "bike detections" },
    { label: "Vehicles", value: vehicles, helper: "vehicle detections" },
    { label: "Night mode", value: night, helper: "unclassified dark-hour flow" },
    { label: "Total flow", value: totalFlow, helper: "combined selected-range count" },
  ];

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Gate flow snapshot"
          subtitle={`Telraam counter totals for ${rangeLabel.toLowerCase()} at Kattenburgerstraat 7.`}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {hasTelraamRecords ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">Kattenburgerstraat 7</Pill>
              {totalFlow !== null ? (
                <Pill tone={totalFlow > 140 ? "amber" : "emerald"}>{totalFlow > 140 ? "busy edge" : "steady edge"}</Pill>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {topStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${MAIN_COLORS.aColor1}26`,
                    backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                    {item.value === null ? "Unavailable" : item.value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
              This counter helps operators compare movement at the site edge inside the selected time range.
            </p>
          </>
        ) : (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8`, color: MAIN_COLORS.aColorGray }}
          >
            <p className="font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
              Gate flow snapshot not available
            </p>
            <p className="mt-2 leading-6">{EMPTY_RANGE_MESSAGE}</p>
            {error ? <p className="mt-1 text-xs leading-5">{error}</p> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
