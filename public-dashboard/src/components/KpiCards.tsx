import { Thermometer, Users, Clock } from "lucide-react";
import { CARD_STYLE, MAIN_COLORS, CROWD_LEVEL_STYLES } from "../styles/theme";
import type { CrowdSummary, WeatherData, BestTimeData } from "../types";
import type { Translations } from "../i18n";

interface Props {
  crowd: CrowdSummary | null;
  weather: WeatherData | null;
  bestTime: BestTimeData | null;
  t: Translations;
}

function KpiCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={CARD_STYLE} className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${MAIN_COLORS.aColor2}18`, color: MAIN_COLORS.aColor1 }}
        >
          {icon}
        </div>
        <h2
          className="text-sm font-semibold"
          style={{ color: MAIN_COLORS.aColorBlack, letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "rgba(100,116,139,0.1)" }} />
      <div className="h-4 w-36 rounded-lg animate-pulse" style={{ background: "rgba(100,116,139,0.07)" }} />
    </div>
  );
}

export function WeatherKpi({ weather, t }: { weather: WeatherData | null; t: Translations }) {
  return (
    <KpiCard icon={<Thermometer size={16} />} title={t.weather}>
      {!weather ? (
        <Skeleton />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <span
              className="text-4xl font-extrabold"
              style={{ color: MAIN_COLORS.aColorBlack, letterSpacing: "-0.04em" }}
            >
              {Math.round(weather.current.temp_c)}°
            </span>
            <span className="text-sm pb-1.5" style={{ color: MAIN_COLORS.aColorGray }}>
              {t.feelsLike} {Math.round(weather.current.feelslike_c)}°
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: t.wind, value: `${Math.round(weather.current.wind_kph)} km/h` },
              { label: t.rain, value: `${weather.current.precip_mm} mm` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="px-3 py-2 rounded-xl"
                style={{ background: `${MAIN_COLORS.aColor2}0f`, border: `1px solid ${MAIN_COLORS.aColor2}22` }}
              >
                <div className="text-[10px] uppercase tracking-[0.1em] font-semibold" style={{ color: MAIN_COLORS.aColorGray }}>
                  {label}
                </div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: MAIN_COLORS.aColorBlack }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </KpiCard>
  );
}

export function CrowdKpi({ crowd, t }: { crowd: CrowdSummary | null; t: Translations }) {
  const level = crowd?.level ?? "low";
  const style = CROWD_LEVEL_STYLES[level];

  return (
    <KpiCard icon={<Users size={16} />} title={t.crowd}>
      {!crowd ? (
        <Skeleton />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <span
              className="text-4xl font-extrabold"
              style={{ color: MAIN_COLORS.aColorBlack, letterSpacing: "-0.04em" }}
            >
              {crowd.total}
            </span>
            <span className="text-sm pb-1.5" style={{ color: MAIN_COLORS.aColorGray }}>
              {t.totalVisitors}
            </span>
          </div>

          {/* density bar */}
          <div className="flex flex-col gap-1.5">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(100,116,139,0.12)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(crowd.densityPct, 100)}%`,
                  background: style.dot,
                }}
              />
            </div>
            <div className="flex justify-between text-xs" style={{ color: MAIN_COLORS.aColorGray }}>
              <span
                className="font-semibold px-2 py-0.5 rounded-full"
                style={{ border: style.border, background: style.background, color: style.color }}
              >
                {style.label["nl"]} / {style.label["en"]}
              </span>
              <span>{crowd.densityPct}% {t.capacity}</span>
            </div>
          </div>
        </div>
      )}
    </KpiCard>
  );
}

export function BestTimeKpi({ bestTime, t }: { bestTime: BestTimeData | null; t: Translations }) {
  return (
    <KpiCard icon={<Clock size={16} />} title={t.bestTime}>
      {!bestTime ? (
        <Skeleton />
      ) : bestTime.bestHour === null ? (
        <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>{t.noData}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <span
              className="text-4xl font-extrabold"
              style={{ color: MAIN_COLORS.aColorBlack, letterSpacing: "-0.04em" }}
            >
              {String(bestTime.bestHour).padStart(2, "0")}:00
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
              {t.bestTimeDesc}
            </p>
            {bestTime.avgFootTraffic !== null && (
              <p className="text-xs" style={{ color: `${MAIN_COLORS.aColorGray}99` }}>
                ~{bestTime.avgFootTraffic} {t.avgFlow}
              </p>
            )}
          </div>
        </div>
      )}
    </KpiCard>
  );
}
