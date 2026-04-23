import { useState, useRef } from "react";
import { translations } from "./i18n";
import type { Lang, Translations } from "./i18n";
import type { TrendPeriod } from "./types";
import { useCrowd } from "./hooks/useCrowd";
import { useWeather } from "./hooks/useWeather";
import { useEvents } from "./hooks/useEvents";
import { useTrends, useBestTime } from "./hooks/useTrends";
import { HeroSection } from "./components/HeroSection";
import { WeatherKpi, CrowdKpi, BestTimeKpi } from "./components/KpiCards";
import { AgendaCard } from "./components/AgendaCard";
import { TrendsCard } from "./components/TrendsCard";

export default function App() {
  const [lang, setLang] = useState<Lang>("nl");
  const [period, setPeriod] = useState<TrendPeriod>("7d");
  const lastUpdatedRef = useRef<Date>(new Date());

  const t: Translations = translations[lang];

  const { data: crowd, loading: crowdLoading } = useCrowd(60_000);
  const { data: weather } = useWeather(300_000);
  const { data: events, loading: eventsLoading } = useEvents(8);
  const { data: trends, loading: trendsLoading } = useTrends(period);
  const { data: bestTime } = useBestTime();

  if (crowd) lastUpdatedRef.current = new Date();

  function toggleLang() {
    setLang((l) => (l === "nl" ? "en" : "nl"));
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 flex flex-col gap-5">
        {/* Hero */}
        <HeroSection
          crowd={crowd}
          weather={weather}
          crowdLoading={crowdLoading}
          lang={lang}
          t={t}
          onToggleLang={toggleLang}
          lastUpdated={lastUpdatedRef.current}
        />

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <WeatherKpi weather={weather} t={t} />
          <CrowdKpi crowd={crowd} t={t} />
          <BestTimeKpi bestTime={bestTime} t={t} />
        </div>

        {/* Agenda + Trends */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <AgendaCard feed={events} loading={eventsLoading} t={t} />
          <TrendsCard
            data={trends}
            loading={trendsLoading}
            period={period}
            onPeriodChange={setPeriod}
            t={t}
          />
        </div>

        {/* footer */}
        <footer className="text-center pb-4">
          <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
            © {new Date().getFullYear()} Marineterrein Amsterdam · Tappstone
          </p>
        </footer>
      </main>
    </div>
  );
}
