import type { OpsLiveOverviewResponse } from "../../lib/opsLiveClient";
import { MAIN_COLORS } from "../../styles/theme";
import { Card, CardContent, CardHeader, SectionTitle } from "./ui";

import img_people from "../../assets/People - Crossing - Color@2x.png";
import img_bike from "../../assets/People - Bike - Color.png";
import img_car from "../../assets/Car - Clolor@2x.png";
import img_total from "../../assets/People - CrowdSize - Color.png";

type TelraamDetailsCardProps = {
  overview: OpsLiveOverviewResponse;
};

function asNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default function TelraamDetailsCard({ overview }: TelraamDetailsCardProps) {
  const telraamRecords = overview.records.filter((record) => record.source === "telraam");
  const totalFlowRecord = telraamRecords.find((record) => record.metric === "total_flow");

  const pedestrians = asNumber(
    telraamRecords.find((record) => record.metric === "pedestrian_count")?.value,
  ) ?? 0;
  const bicycles = asNumber(
    telraamRecords.find((record) => record.metric === "bicycle_count")?.value,
  ) ?? 0;
  const vehicles = asNumber(
    telraamRecords.find((record) => record.metric === "vehicle_count")?.value,
  ) ?? 0;
  const totalFlow = asNumber(totalFlowRecord?.value) ?? pedestrians + bicycles + vehicles;

  const topStats = [
    { label: "Pedestrians", value: pedestrians, icon: img_people, iconLabel: "Pedestrian" },
    { label: "Bicycles", value: bicycles, icon: img_bike, iconLabel: "Bike" },
    { label: "Vehicles", value: vehicles, icon: img_car, iconLabel: "Vehicle" },
    { label: "Total flow", value: totalFlow, icon: img_total, iconLabel: "Total flow" },
  ];

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Telraam Live Details"
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {topStats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${MAIN_COLORS.aColorGray}44`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}cc`,
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                  {item.label}
                </p>
                <img src={item.icon} alt={`${item.iconLabel} icon`} className="h-16 w-16 object-contain" />
              </div>
              <p className="text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                {item.value}
              </p>
              <p className="text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                count/hour
              </p>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
