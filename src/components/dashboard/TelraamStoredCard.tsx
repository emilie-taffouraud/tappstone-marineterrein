import { useEffect, useMemo, useState } from "react";
import type { TelraamTrafficPoint } from "../../lib/opsLiveClient";
import { MAIN_COLORS } from "../../styles/theme";
import { deriveTelraamHistorySummary } from "./opsLiveViewModel";
import { Card, CardContent, CardHeader, Pill, SectionTitle } from "./ui";

type TelraamStoredCardProps = {
  points: TelraamTrafficPoint[];
  error?: string | null;
  anomalyThreshold?: number;
};

const VEHICLE_COLOR = "#0f766e";

function formatLocalDateTime(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCompactNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function formatSignedNumber(value: number) {
  const formatted = formatCompactNumber(Math.abs(value), 0);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function formatSignedPercent(value: number) {
  const formatted = formatCompactNumber(Math.abs(value), 1);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

function getToneColor(tone: "slate" | "sky" | "emerald" | "amber" | "rose") {
  if (tone === "rose") return "#b91c1c";
  if (tone === "amber") return "#b45309";
  if (tone === "sky") return "#2f6f92";
  if (tone === "emerald") return "#166534";
  return "#475569";
}

function getPlainStatusLabel(label: string) {
  if (label === "Elevated") return "Higher than usual";
  if (label === "Unusually high") return "Unusually high";
  if (label === "Below normal") return "Lower than usual";
  if (label === "Unusually low") return "Much lower than usual";
  if (label === "Awaiting baseline") return "Usual level not ready";
  return "Normal";
}

function getComparisonLabel(id: string) {
  if (id === "expected-pattern") return "Usual pattern";
  if (id === "loaded-window-average") return "Average in this view";
  return "Usual pattern";
}

function getComparisonHelper(id: string) {
  if (id === "expected-pattern") return "Based on the time range currently shown.";
  if (id === "loaded-window-average") return "Average across the time range currently shown.";
  return "Based on the time range currently shown.";
}

function getDifferenceSummary(delta: number) {
  if (delta > 0) return `${formatCompactNumber(delta)} more than usual`;
  if (delta < 0) return `${formatCompactNumber(Math.abs(delta))} fewer than usual`;
  return "About the same as usual";
}

function getMainMovementText(label: string) {
  if (label === "No dominant mode") return "No single movement type stands out right now.";
  return `${label} are the main movement type right now.`;
}

function buildBriefingSentence(summary: ReturnType<typeof deriveTelraamHistorySummary>, plainStatusLabel: string) {
  if (summary.latestFlow <= 0) {
    return "Movement is very quiet right now, and no single movement type stands out in the latest update.";
  }

  const driverText = summary.currentDominantMode.value > 0
    ? `${summary.currentDominantMode.label.toLowerCase()} make up the largest share right now.`
    : "No single movement type is standing out right now.";

  if (plainStatusLabel === "Unusually high") {
    return `Movement is unusually high right now, and ${driverText}`;
  }

  if (plainStatusLabel === "Higher than usual") {
    return `Movement is higher than usual right now, and ${driverText}`;
  }

  if (plainStatusLabel === "Much lower than usual") {
    return `Movement is much lower than usual right now, and ${driverText}`;
  }

  if (plainStatusLabel === "Lower than usual") {
    return `Movement is lower than usual right now, and ${driverText}`;
  }

  if (plainStatusLabel === "Usual level not ready") {
    return `Movement is visible now, and ${driverText}`;
  }

  return `Movement is within the usual range right now, and ${driverText}`;
}

export default function TelraamStoredCard({
  points,
  error,
  anomalyThreshold = 20,
}: TelraamStoredCardProps) {
  const summary = useMemo(() => deriveTelraamHistorySummary(points, anomalyThreshold), [points, anomalyThreshold]);
  const [selectedComparisonId, setSelectedComparisonId] = useState<string>("");
  const plainStatusLabel = getPlainStatusLabel(summary.statusLabel);
  const briefingSentence = buildBriefingSentence(summary, plainStatusLabel);
  const cardStyle = {
    borderColor: `${MAIN_COLORS.aColor1}26`,
    backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
  } as const;

  useEffect(() => {
    setSelectedComparisonId((current) =>
      summary.comparisonOptions.some((option) => option.id === current)
        ? current
        : (summary.comparisonOptions[0]?.id ?? ""),
    );
  }, [summary.comparisonOptions]);

  const selectedComparison =
    summary.comparisonOptions.find((option) => option.id === selectedComparisonId) ?? summary.comparisonOptions[0] ?? null;
  const modeRows = [
    {
      label: "Pedestrians",
      value: summary.latestModeCounts.pedestrians,
      share: summary.latestModeSharePct.pedestrians,
      color: MAIN_COLORS.aColor1,
    },
    {
      label: "Bicycles",
      value: summary.latestModeCounts.bicycles,
      share: summary.latestModeSharePct.bicycles,
      color: MAIN_COLORS.aColor2,
    },
    {
      label: "Vehicles",
      value: summary.latestModeCounts.vehicles,
      share: summary.latestModeSharePct.vehicles,
      color: VEHICLE_COLOR,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title="Movement summary"
          subtitle="Quick overview of what is happening now, how it compares with the usual level, and what type of movement is driving it."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {points.length ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[0.8fr_1fr_1fr]">
              <div className="h-full rounded-2xl border p-4" style={cardStyle}>
                <div className="flex h-full flex-col justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                      Movement now
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <p className="text-[2rem] font-semibold tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {formatCompactNumber(summary.latestFlow)}
                      </p>
                      <Pill tone={summary.statusTone}>{plainStatusLabel}</Pill>
                    </div>
                  </div>

                  <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
                    Latest update {formatLocalDateTime(summary.latestRecordedAt)}
                  </p>
                </div>
              </div>

              <div className="h-full rounded-2xl border p-4" style={cardStyle}>
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                        Compared with usual
                      </p>
                      <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {selectedComparison ? getComparisonHelper(selectedComparison.id) : "Based on the time range currently shown."}
                      </p>
                    </div>

                    {selectedComparison ? (
                      summary.comparisonOptions.length > 1 ? (
                        <select
                          value={selectedComparison.id}
                          onChange={(event) => setSelectedComparisonId(event.target.value)}
                          aria-label="Compared with"
                          className="min-w-[150px] rounded-[14px] border px-3 py-2 text-sm outline-none"
                          style={{
                            borderColor: `${MAIN_COLORS.aColorGray}33`,
                            backgroundColor: "rgba(255, 255, 255, 0.94)",
                            color: MAIN_COLORS.aColorBlack,
                          }}
                        >
                          {summary.comparisonOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {getComparisonLabel(option.id)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Pill tone="slate">{getComparisonLabel(selectedComparison.id)}</Pill>
                      )
                    ) : null}
                  </div>

                  {selectedComparison ? (
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div
                        className="rounded-2xl border p-3.5"
                        style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, backgroundColor: "rgba(255, 255, 255, 0.76)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: MAIN_COLORS.aColorGray }}>
                          Usual level
                        </p>
                        <p className="mt-2 text-xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                          {formatCompactNumber(selectedComparison.value, 1)}
                        </p>
                      </div>

                      <div
                        className="rounded-2xl border p-3.5"
                        style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, backgroundColor: "rgba(255, 255, 255, 0.76)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: MAIN_COLORS.aColorGray }}>
                          Difference
                        </p>
                        <p className="mt-2 text-base font-semibold leading-6" style={{ color: getToneColor(summary.statusTone) }}>
                          {getDifferenceSummary(selectedComparison.delta)}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                          {formatSignedPercent(selectedComparison.deltaPct)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border p-3.5 text-sm" style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, backgroundColor: "rgba(255, 255, 255, 0.76)", color: MAIN_COLORS.aColorGray }}>
                      A usual level is not available yet for this view.
                    </div>
                  )}
                </div>
              </div>

              <div className="h-full rounded-2xl border p-4" style={cardStyle}>
                <div className="flex h-full flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                        Main movement type
                      </p>
                      <p className="mt-2 text-base font-semibold leading-6" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {getMainMovementText(summary.currentDominantMode.label)}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {summary.currentDominantMode.value > 0
                          ? `${formatCompactNumber(summary.currentDominantMode.value)} movements, ${formatCompactNumber(summary.currentDominantMode.sharePct, 1)}% of the total now.`
                          : "No clear main movement type in the latest update."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MAIN_COLORS.aColorGray }}>
                        Highest point in this view
                      </p>
                      <p className="mt-2 text-base font-semibold leading-6" style={{ color: MAIN_COLORS.aColorBlack }}>
                        {summary.peakFlow > 0
                          ? `Highest point so far: ${formatCompactNumber(summary.peakFlow)} at ${formatLocalDateTime(summary.peakRecordedAt)}`
                          : "No high point is available yet in this view."}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                        {summary.peakFlow > 0
                          ? `Movement now is ${formatCompactNumber(summary.currentVsPeakPct, 0)}% of that highest point.`
                          : "This updates as more movement appears in the current view."}
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border px-3.5 py-3 text-sm leading-6"
                    style={{
                      borderColor: `${MAIN_COLORS.aColor1}20`,
                      backgroundColor: "rgba(120, 169, 198, 0.09)",
                      color: MAIN_COLORS.aColorBlack,
                    }}
                  >
                    {briefingSentence}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={cardStyle}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                    Current movement mix
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: MAIN_COLORS.aColorGray }}>
                    How the current total is split between pedestrians, bicycles, and vehicles
                  </p>
                </div>

                <div className="text-xs sm:text-right" style={{ color: MAIN_COLORS.aColorGray }}>
                  <p>Based on {formatCompactNumber(summary.storedRows)} updates</p>
                  <p>{formatCompactNumber(summary.historySpanHours, 1)} hours in the current view</p>
                </div>
              </div>

              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200/70">
                {modeRows.map((row) => (
                  <div
                    key={row.label}
                    className="h-full transition-all duration-500"
                    style={{ width: `${row.share}%`, backgroundColor: row.color }}
                  />
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {modeRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border p-3.5"
                    style={{ borderColor: `${MAIN_COLORS.aColor1}1f`, backgroundColor: "rgba(255, 255, 255, 0.76)" }}
                  >
                    <p className="text-sm" style={{ color: row.color }}>
                      {row.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
                      {formatCompactNumber(row.value)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
                      {formatCompactNumber(row.share, 1)}% of movement now
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{
              borderColor: `${MAIN_COLORS.aColor1}26`,
              backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
              color: MAIN_COLORS.aColorGray,
            }}
          >
            {error || "No traffic rows are currently available from the database."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
