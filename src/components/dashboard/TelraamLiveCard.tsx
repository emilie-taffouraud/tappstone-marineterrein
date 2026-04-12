import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { MAIN_COLORS, TELRAAM_LIVE_CARD_THEME } from "../../styles/theme";
import type { BreakdownChartPoint } from "./opsLiveViewModel";
import { Card, CardContent, CardHeader, SectionTitle } from "./ui";

const TELRAAM_TRAVEL_TYPE_ICON_FILES: Partial<Record<string, string>> = {
  "Pedestrians": "People - Crossing - Color@2x.png",
  "Bicycles": "People - Bike - Color.png",
  "Cars": "Car - Clolor@2x.png",
  "Total flow": "img_Total.png",
  "Buses": "Bus - Color.png",
  "Light trucks": "img_LightTruck.png",
  "Motorcycles": "img_Motorcycle.png",
  "Trucks": "img_Truck.png",
  "Trailers": "img_Trailer.png",
  "Tractors": "img_Tractor.png",
  "Strollers": "img_Stroller.png",
};

const assetModules = import.meta.glob("../../assets/*.{png,jpg,jpeg,svg,webp,gif,avif}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const assetUrlByFileName = Object.fromEntries(
  Object.entries(assetModules)
    .map(([path, assetUrl]) => {
      const fileName = path.split("/").pop();
      return fileName ? [fileName, assetUrl] : null;
    })
    .filter((entry): entry is [string, string] => Boolean(entry)),
);

type TelraamLiveCardProps = {
  data: BreakdownChartPoint[];
  chartPalette: string[];
};

export default function TelraamLiveCard({
  data,
  chartPalette,
}: TelraamLiveCardProps) {
  const [showAllTypes, setShowAllTypes] = useState(false);
  const activeTypes = data.filter((item) => item.value > 0);
  const inactiveTypes = data.filter((item) => item.value <= 0);
  const chartData = activeTypes.length ? (showAllTypes ? data : activeTypes) : data;
  const visibleTypes = activeTypes.length ? activeTypes : data;
  const totalFlow = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  function getTravelTypeIconSrc(label: string) {
    const fileName = TELRAAM_TRAVEL_TYPE_ICON_FILES[label];
    return fileName ? assetUrlByFileName[fileName] : undefined;
  }

  function getTravelTypeLabelColor(label: string, isInactive = false) {
    if (isInactive) {
      return TELRAAM_LIVE_CARD_THEME.inactiveTravelTypeLabelColor;
    }

    return (
      TELRAAM_LIVE_CARD_THEME.travelTypeLabelColors[
        label as keyof typeof TELRAAM_LIVE_CARD_THEME.travelTypeLabelColors
      ] || TELRAAM_LIVE_CARD_THEME.fallbackTravelTypeLabelColor
    );
  }

  return (
    <Card className="min-h-[460px]">
      <CardHeader>
        <SectionTitle
          title="Live Telraam Data"
          subtitle="Counts by travel mode"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-stretch">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={46} outerRadius={88} paddingAngle={4}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.label} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            className="rounded-2xl border p-4 md:self-start"
            style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                Total flow
              </p>
              {getTravelTypeIconSrc("Total flow") ? (
                <img
                  src={getTravelTypeIconSrc("Total flow")}
                  alt=""
                  aria-hidden="true"
                  className="shrink-0"
                  style={TELRAAM_LIVE_CARD_THEME.icon}
                />
              ) : null}
            </div>
            <p className="mt-2 text-3xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
              {totalFlow}
            </p>
            <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
              Sum of all travel modes in this live snapshot
            </p>
          </div>
        </div>

        <div
          className="flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
          style={{
            borderColor: `${MAIN_COLORS.aColor1}26`,
            backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
          }}
        >
          <div>
            <p className="font-medium" style={{ color: MAIN_COLORS.aColorBlack }}>
              {activeTypes.length
                ? `${activeTypes.length} active modes`
                : "No active modes"}
            </p>
            {inactiveTypes.length ? (
              <p style={{ color: MAIN_COLORS.aColorGray }}>
                {showAllTypes
                  ? `${inactiveTypes.length} at zero`
                  : `${inactiveTypes.length} hidden`}
              </p>
            ) : (
              <p style={{ color: MAIN_COLORS.aColorGray }}>All shown</p>
            )}
          </div>

          {inactiveTypes.length ? (
            <button
              type="button"
              onClick={() => setShowAllTypes((value) => !value)}
              className="rounded-full border px-4 py-2 text-sm font-medium transition"
              style={{
                borderColor: `${MAIN_COLORS.aColor1}44`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}d8`,
                color: MAIN_COLORS.aColor1,
              }}
            >
              {showAllTypes ? "Show active travel modes only" : `Show all travel modes (${data.length})`}
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTypes.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border p-4"
              style={{ borderColor: `${MAIN_COLORS.aColor1}26`, backgroundColor: `${MAIN_COLORS.aColorWhite}b8` }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm" style={{ color: getTravelTypeLabelColor(item.label) }}>
                  {item.label}
                </p>
                {getTravelTypeIconSrc(item.label) ? (
                  <img
                    src={getTravelTypeIconSrc(item.label)}
                    alt=""
                    aria-hidden="true"
                    className="shrink-0"
                    style={TELRAAM_LIVE_CARD_THEME.icon}
                  />
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {showAllTypes && inactiveTypes.length ? (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: MAIN_COLORS.aColorGray }}>
              Currently at zero
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inactiveTypes.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${MAIN_COLORS.aColorGray}22`,
                    backgroundColor: `${MAIN_COLORS.aColorWhite}8f`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm" style={{ color: getTravelTypeLabelColor(item.label, true) }}>
                      {item.label}
                    </p>
                    {getTravelTypeIconSrc(item.label) ? (
                      <img
                        src={getTravelTypeIconSrc(item.label)}
                        alt=""
                        aria-hidden="true"
                        className="shrink-0"
                        style={{
                          ...TELRAAM_LIVE_CARD_THEME.icon,
                          filter: "grayscale(100%) saturate(0%)",
                          opacity: 0.55,
                        }}
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-2xl font-semibold" style={{ color: MAIN_COLORS.aColorGray }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}