import type { OpsLiveOverviewResponse } from "../../lib/opsLiveClient";
import { MAIN_COLORS } from "../../styles/theme";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "./ui";

type TelraamDetailsCardProps = {
  overview: OpsLiveOverviewResponse;
};

function asNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function metricValue(overview: OpsLiveOverviewResponse, metric: string) {
  return asNumber(overview.records.find((record) => record.source === "telraam" && record.metric === metric)?.value) ?? 0;
}

export default function TelraamDetailsCard({ overview }: TelraamDetailsCardProps) {
  const pedestrians = metricValue(overview, "pedestrian_count");
  const bicycles = metricValue(overview, "bicycle_count");
  const vehicles = metricValue(overview, "vehicle_count");
  const totalFlow = metricValue(overview, "total_flow") || pedestrians + bicycles + vehicles;

  const topStats = [
    { label: "Pedestrians", value: pedestrians, helper: "foot arrivals" },
    { label: "Bicycles", value: bicycles, helper: "bike arrivals" },
    { label: "Vehicles", value: vehicles, helper: "vehicle arrivals" },
    { label: "Total flow", value: totalFlow, helper: "combined hourly count" },
  ];

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Telraam gate snapshot"
          subtitle="Single traffic counter at Kattenburgerstraat 7. This is best used as an arrival-pressure signal, not a full site map layer."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Pill tone="sky">Kattenburgerstraat 7</Pill>
          <Pill tone={totalFlow > 140 ? "amber" : "emerald"}>{totalFlow > 140 ? "busy edge" : "steady edge"}</Pill>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                {item.value}
              </p>
              <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                {item.helper}
              </p>
            </div>
          ))}
        </div>

        <p className="text-sm leading-6" style={{ color: MAIN_COLORS.aColorGray }}>
          This counter helps operators see whether the site edge is getting busier and whether incoming bikes or foot
          traffic are changing the mix before that pressure shows up elsewhere on site.
        </p>
      </CardContent>
    </Card>
  );
}
