import { useEffect, useState } from "react";
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

type TravelTypeIconProps = {
  iconSrc?: string;
  color: string;
  opacity?: number;
};

function hexToRgb(color: string) {
  const normalized = color.trim().replace("#", "");
  const hex = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return { r: 1, g: 105, b: 145 };
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function TravelTypeIcon({ iconSrc, color, opacity = 1 }: TravelTypeIconProps) {
  const [symbolSrc, setSymbolSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!iconSrc) {
      setSymbolSrc(null);
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const { r: targetR, g: targetG, b: targetB } = hexToRgb(color);

      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha === 0) continue;

        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const brightness = (red + green + blue) / 3;
        const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
        const whiteness =
          clamp((brightness - 178) / 70, 0, 1) *
          clamp((82 - spread) / 82, 0, 1);

        if (whiteness <= 0.05) {
          pixels[index + 3] = 0;
          continue;
        }

        pixels[index] = targetR;
        pixels[index + 1] = targetG;
        pixels[index + 2] = targetB;
        pixels[index + 3] = Math.round(alpha * whiteness);
      }

      context.putImageData(imageData, 0, 0);
      setSymbolSrc(canvas.toDataURL("image/png"));
    };

    image.src = iconSrc;

    return () => {
      cancelled = true;
    };
  }, [iconSrc, color]);

  if (!iconSrc) return null;

  return symbolSrc ? (
    <img
      src={symbolSrc}
      alt=""
      aria-hidden="true"
      className="shrink-0"
      style={{
        ...TELRAAM_LIVE_CARD_THEME.icon,
        opacity,
      }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="shrink-0"
      style={{
        width: TELRAAM_LIVE_CARD_THEME.icon.width,
        height: TELRAAM_LIVE_CARD_THEME.icon.height,
        opacity: 0,
      }}
    />
  );
}

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

  function renderTravelTypeIcon(label: string, color: string, opacity = 1) {
    const iconSrc = getTravelTypeIconSrc(label);
    return <TravelTypeIcon iconSrc={iconSrc} color={color} opacity={opacity} />;
  }

  return (
    <Card className="min-h-[460px]">
      <CardHeader>
        <SectionTitle
          title="Live movement mix"
          subtitle="Travel-mode split from the live Telraam gate counter"
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
              {renderTravelTypeIcon("Total flow", MAIN_COLORS.aColor1)}
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
                {renderTravelTypeIcon(item.label, getTravelTypeLabelColor(item.label))}
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
                    {renderTravelTypeIcon(item.label, getTravelTypeLabelColor(item.label, true), 0.55)}
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
