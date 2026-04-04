import { Card, CardContent, CardHeader, SectionTitle } from "./ui";

type HolidayItem = {
  date: string;
  localName: string;
  name?: string;
  countryCode?: string;
  fixed?: boolean;
  global?: boolean;
  counties?: string[] | null;
  launchYear?: number | null;
  types?: string[];
};

type PublicHolidaysCardProps = {
  holidaysLoading: boolean;
  holidays: HolidayItem[];
};

function formatUtcDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function startOfTodayUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function dayDiffFromTodayUtc(value: string) {
  const holidayUtc = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(holidayUtc)) return null;

  return Math.ceil((holidayUtc - startOfTodayUtc()) / (24 * 60 * 60 * 1000));
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default function PublicHolidaysCard({ holidaysLoading, holidays }: PublicHolidaysCardProps) {
  const normalized = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = normalized.filter((holiday) => {
    const diff = dayDiffFromTodayUtc(holiday.date);
    return diff !== null && diff >= 0;
  });
  const visible = (upcoming.length ? upcoming : normalized).slice(0, 6);
  const nextHoliday = upcoming[0] || null;
  const nextHolidayDays = nextHoliday ? dayDiffFromTodayUtc(nextHoliday.date) : null;

  const nationalCount = normalized.filter((holiday) => holiday.global !== false).length;
  const regionalCount = normalized.filter((holiday) => holiday.global === false).length;
  const totalRegionalAreas = new Set(
    normalized
      .flatMap((holiday) => holiday.counties || [])
      .filter((county): county is string => typeof county === "string"),
  ).size;

  return (
    <Card>
      <CardHeader>
        <SectionTitle title="Public Holidays" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Next holiday</p>
            <p className="mt-2 min-h-[40px] text-sm font-semibold leading-5 text-slate-900">
              {nextHoliday?.name || nextHoliday?.localName || "Not available"}
            </p>
          </div>

          <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Days remaining</p>
            <p className="mt-2 min-h-[40px] text-sm font-semibold leading-5 text-slate-900">
              {nextHolidayDays === null
                ? "-"
                : nextHolidayDays === 0
                  ? "Today"
                  : pluralize(nextHolidayDays, "day", "days")}
            </p>
          </div>

          <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">National holidays</p>
            <p className="mt-2 min-h-[40px] text-sm font-semibold leading-5 text-slate-900">
              {pluralize(nationalCount, "holiday", "holidays")}
            </p>
          </div>

          <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Regional coverage</p>
            <p className="mt-2 min-h-[40px] text-sm font-semibold leading-5 text-slate-900">
              {pluralize(regionalCount, "holiday", "holidays")} • {pluralize(totalRegionalAreas, "area", "areas")}
            </p>
          </div>
        </div>

        {holidaysLoading ? (
          <p className="text-sm text-slate-500">Loading holidays...</p>
        ) : visible.length ? (
          visible.map((holiday) => {
            const days = dayDiffFromTodayUtc(holiday.date);
            const primaryType = holiday.types?.[0] || "Public";

            return (
            <div key={`${holiday.date}-${holiday.name || holiday.localName}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{holiday.name || holiday.localName}</p>
                  <p className="text-xs text-slate-500">{formatUtcDate(holiday.date)}</p>
                </div>
                <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {days === null ? "-" : days === 0 ? "Today" : `In ${days}d`}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-600">
                  {holiday.global === false ? "Regional" : "National"}
                </span>
                <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-600">
                  {primaryType}
                </span>
                {holiday.fixed ? (
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-600">Fixed date</span>
                ) : null}
                {holiday.launchYear ? (
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-600">Since {holiday.launchYear}</span>
                ) : null}
              </div>
            </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">No holiday data available.</p>
        )}
      </CardContent>
    </Card>
  );
}
