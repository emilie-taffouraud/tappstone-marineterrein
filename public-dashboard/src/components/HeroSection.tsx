import { RefreshCw } from "lucide-react";
import { CROWD_LEVEL_STYLES, HERO_STYLE } from "../styles/theme";
import type { CrowdSummary, WeatherData } from "../types";
import type { Lang, Translations } from "../i18n";

interface Props {
  crowd: CrowdSummary | null;
  weather: WeatherData | null;
  crowdLoading: boolean;
  lang: Lang;
  t: Translations;
  onToggleLang: () => void;
  lastUpdated: Date | null;
}

export function HeroSection({ crowd, weather, crowdLoading, lang, t, onToggleLang, lastUpdated }: Props) {
  const level = crowd?.level ?? "low";
  const style = CROWD_LEVEL_STYLES[level];

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString(lang === "nl" ? "nl-NL" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div style={HERO_STYLE} className="px-6 py-8 md:px-10 md:py-10 relative overflow-hidden">
      {/* subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(120,169,198,0.12) 0%, transparent 50%)",
        }}
      />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* left: title + crowd badge */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(120,169,198,0.9)" }}
            >
              Marineterrein Amsterdam
            </span>
          </div>

          <h1
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            style={{ color: "#ffffff", letterSpacing: "-0.025em" }}
          >
            {t.heroQuestion}
          </h1>

          <p
            className="text-sm font-normal"
            style={{ color: "rgba(241,245,249,0.7)" }}
          >
            {t.heroSub}
          </p>

          {/* crowd status pill */}
          <div className="flex items-center gap-3 mt-1">
            {crowdLoading ? (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  border: "1px solid rgba(100,116,139,0.3)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(241,245,249,0.5)",
                }}
              >
                <RefreshCw size={14} className="animate-spin" />
                {t.loading}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  border: style.border,
                  background: style.background,
                  color: style.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: style.dot }}
                />
                {style.label[lang]}
                {crowd && (
                  <span className="font-normal opacity-80 ml-1">
                    — {crowd.total} {t.totalVisitors}
                  </span>
                )}
              </div>
            )}
          </div>

          {formattedTime && (
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>
              {t.lastUpdate} {formattedTime}
            </p>
          )}
        </div>

        {/* right: weather + lang toggle */}
        <div className="flex flex-col items-start md:items-end gap-3">
          {/* lang toggle */}
          <button
            onClick={onToggleLang}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              border: "1px solid rgba(120,169,198,0.4)",
              background: "rgba(120,169,198,0.08)",
              color: "rgba(120,169,198,0.9)",
              cursor: "pointer",
            }}
          >
            {lang === "nl" ? "🇬🇧 EN" : "🇳🇱 NL"}
          </button>

          {/* weather snapshot */}
          {weather && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <img
                src={`https:${weather.current.condition.icon}`}
                alt={weather.current.condition.text}
                className="w-10 h-10"
              />
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "#fff", letterSpacing: "-0.02em" }}
                >
                  {Math.round(weather.current.temp_c)}°C
                </div>
                <div className="text-xs" style={{ color: "rgba(148,163,184,0.8)" }}>
                  {weather.current.condition.text}
                </div>
              </div>
              <div
                className="ml-2 pl-3 flex flex-col gap-0.5 text-xs"
                style={{
                  borderLeft: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(148,163,184,0.8)",
                }}
              >
                <span>💨 {Math.round(weather.current.wind_kph)} km/h</span>
                <span>🌧 {weather.current.precip_mm} mm</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
