import { CloudRain, Wind } from "lucide-react";
import { Pill } from "./ui";

type WeatherWidgetModel = {
  statusTone: "slate" | "emerald" | "amber" | "rose";
  headline: string;
  temperature: string;
  location: string;
  condition: string;
  metrics: { label: string; value: string }[];
  helper: string;
};

const iconTone: Record<WeatherWidgetModel["statusTone"], string> = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
};

function WeatherGlyph({ tone }: { tone: WeatherWidgetModel["statusTone"] }) {
  return (
    <div className={`flex h-20 w-20 items-center justify-center rounded-[1.5rem] ${iconTone[tone]}`}>
      <CloudRain className="h-10 w-10" />
    </div>
  );
}

const WeatherWidget = ({ model }: { model: WeatherWidgetModel }) => {
  return (
    <div className="rounded-[2rem] bg-white p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5 md:pr-10 md:border-r md:border-gray-100">
          <WeatherGlyph tone={model.statusTone} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{model.location}</h2>
              <Pill tone={model.statusTone}>{model.headline}</Pill>
            </div>
            <p className="mt-1 text-sm capitalize text-gray-500">{model.condition}</p>
            <div className="mt-2 text-4xl font-black text-gray-900">{model.temperature}</div>
            <p className="mt-2 max-w-xl text-sm text-slate-500">{model.helper}</p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                <Wind className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-950">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
