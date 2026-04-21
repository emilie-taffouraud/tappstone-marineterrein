import { Cloud, CloudRain, Sun, Wind } from "lucide-react";
import { Pill } from "./ui";
import { MAIN_COLORS } from "../../styles/theme";

type WeatherWidgetModel = {
  statusTone: "slate" | "emerald" | "amber" | "rose";
  headline: string;
  temperature: string;
  location: string;
  condition: string;
  metrics: { label: string; value: string }[];
};

const iconToneStyle: Record<WeatherWidgetModel["statusTone"], { backgroundColor: string; color: string }> = {
  slate:   { backgroundColor: "rgba(241, 245, 249, 0.92)", color: "#475569" },
  emerald: { backgroundColor: "rgba(22, 163, 74, 0.12)", color: "#166534" },
  amber:   { backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#b45309" },
  rose:    { backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#b91c1c" },
};

function WeatherGlyph({
  tone,
  condition,
}: {
  tone: WeatherWidgetModel["statusTone"];
  condition: string;
}) {
  const normalizedCondition = condition.toLowerCase();
  const Icon = normalizedCondition.includes("sunny") || normalizedCondition.includes("clear")
    ? Sun
    : normalizedCondition.includes("rain") || normalizedCondition.includes("shower")
      ? CloudRain
      : Cloud;

  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-[1.5rem]"
      style={iconToneStyle[tone]}
    >
      <Icon className="h-10 w-10" />
    </div>
  );
}

const WeatherWidget = ({ model }: { model: WeatherWidgetModel }) => {
  return (
    <div
      className="rounded-[2rem] p-5 backdrop-blur-sm md:p-6"
      style={{
        border: "1px solid rgba(226, 232, 240, 0.92)",
        background:
          "linear-gradient(135deg, rgba(250, 252, 253, 0.98) 0%, rgba(240, 246, 250, 0.96) 52%, rgba(247, 250, 252, 0.98) 100%)",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
      }}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div
          className="flex items-center gap-4 md:gap-5 md:pr-10"
          style={{ borderRight: "1px solid rgba(203, 213, 225, 0.72)" }}
        >
          <WeatherGlyph tone={model.statusTone} condition={model.condition} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em]" style={{ color: MAIN_COLORS.aColorBlack }}>{model.location}</h2>
              <Pill tone={model.statusTone}>{model.headline}</Pill>
            </div>
            <p className="mt-1 text-sm capitalize" style={{ color: "#52667c" }}>{model.condition}</p>
            <div className="mt-2 text-[2.45rem] font-semibold tracking-[-0.04em]" style={{ color: MAIN_COLORS.aColorBlack }}>{model.temperature}</div>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl p-4"
              style={{
                border: "1px solid rgba(203, 213, 225, 0.85)",
                backgroundColor: "rgba(255, 255, 255, 0.86)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MAIN_COLORS.aColorGray }}>{metric.label}</p>
                <Wind className="h-4 w-4" style={{ color: "#7b8da3" }} />
              </div>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em]" style={{ color: MAIN_COLORS.aColorBlack }}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
