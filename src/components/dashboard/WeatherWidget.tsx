import { CloudRain, Wind } from "lucide-react";
import { Pill } from "./ui";
import { MAIN_COLORS } from "../../styles/theme";

type WeatherWidgetModel = {
  statusTone: "slate" | "emerald" | "amber" | "rose";
  headline: string;
  temperature: string;
  location: string;
  condition: string;
  metrics: { label: string; value: string }[];
  helper: string;
};

const iconToneStyle: Record<WeatherWidgetModel["statusTone"], { backgroundColor: string; color: string }> = {
  slate:   { backgroundColor: `${MAIN_COLORS.aColorGray}22`,  color: MAIN_COLORS.aColorGray },
  emerald: { backgroundColor: `${MAIN_COLORS.aColor1}22`,     color: MAIN_COLORS.aColor1 },
  amber:   { backgroundColor: `${MAIN_COLORS.aColor2}22`,     color: MAIN_COLORS.aColor2 },
  rose:    { backgroundColor: `${MAIN_COLORS.aColorBlack}22`, color: MAIN_COLORS.aColorBlack },
};

function WeatherGlyph({ tone }: { tone: WeatherWidgetModel["statusTone"] }) {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-[1.5rem]"
      style={iconToneStyle[tone]}
    >
      <CloudRain className="h-10 w-10" />
    </div>
  );
}

const WeatherWidget = ({ model }: { model: WeatherWidgetModel }) => {
  return (
    <div
      className="rounded-[2rem] p-5 backdrop-blur md:p-6"
      style={{
        border: `1px solid ${MAIN_COLORS.aColorWhite}b3`,
        background: `linear-gradient(135deg, #edf5fa, ${MAIN_COLORS.aColor3}cc)`,
        boxShadow: `0 12px 30px ${MAIN_COLORS.aColorBlack}10`,
      }}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div
          className="flex items-center gap-5 md:pr-10"
          style={{ borderRight: `1px solid ${MAIN_COLORS.aColorWhite}80` }}
        >
          <WeatherGlyph tone={model.statusTone} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>{model.location}</h2>
              <Pill tone={model.statusTone}>{model.headline}</Pill>
            </div>
            <p className="mt-1 text-sm capitalize" style={{ color: MAIN_COLORS.aColorGray }}>{model.condition}</p>
            <div className="mt-2 text-[2.6rem] font-semibold tracking-tight" style={{ color: MAIN_COLORS.aColorBlack }}>{model.temperature}</div>
            <p className="mt-2 max-w-xl text-sm" style={{ color: MAIN_COLORS.aColorGray }}>{model.helper}</p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl p-4"
              style={{
                border: `1px solid ${MAIN_COLORS.aColor1}33`,
                backgroundColor: `${MAIN_COLORS.aColorWhite}ad`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: MAIN_COLORS.aColorGray }}>{metric.label}</p>
                <Wind className="h-4 w-4" style={{ color: MAIN_COLORS.aColorGray }} />
              </div>
              <p className="mt-3 text-lg font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
