import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, SectionTitle } from "./ui";
import type { AgendaItem } from "../../lib/opsLiveClient";

type HolidayItem = {
  date: string;
  localName: string;
  name?: string;
  global?: boolean;
  fixed?: boolean;
  launchYear?: number | null;
  types?: string[];
};

type UpcomingAgendaCardProps = {
  loading: boolean;
  error: string | null;
  items: AgendaItem[];
  holidaysLoading: boolean;
  holidays: HolidayItem[];
  eventsId?: string;
  holidaysId?: string;
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

export default function UpcomingAgendaCard({
  loading,
  error,
  items,
  holidaysLoading,
  holidays,
  eventsId,
  holidaysId,
}: UpcomingAgendaCardProps) {
  const normalizedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingHolidays = normalizedHolidays.filter((holiday) => {
    const diff = dayDiffFromTodayUtc(holiday.date);
    return diff !== null && diff >= 0;
  });
  const visibleHolidays = (upcomingHolidays.length ? upcomingHolidays : normalizedHolidays).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <SectionTitle title="Upcoming agenda" subtitle="Site events and public holidays for planning context" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div id={eventsId} className="space-y-3" style={eventsId ? { scrollMarginTop: "2rem" } : undefined}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Site events</p>
            <a
              href="https://marineterrein.nl/wat-is-er-te-doen/agenda/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-4"
            >
              View source
            </a>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading Marineterrein events...</p>
          ) : error ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              <p className="font-medium text-slate-700">Marineterrein agenda is temporarily unavailable.</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          ) : items.length ? (
            items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-semibold leading-5 text-slate-900"
                      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{item.dateLabel}</p>
                    {item.venue ? <p className="mt-1 text-xs text-slate-600">{item.venue}</p> : null}
                  </div>

                  <a
                    href={item.detailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Open
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              No upcoming Marineterrein events are listed right now.
            </div>
          )}
        </div>

        <div
          id={holidaysId}
          className="space-y-3 border-t border-slate-200 pt-4"
          style={holidaysId ? { scrollMarginTop: "2rem" } : undefined}
        >
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Public holidays</p>

          {holidaysLoading ? (
            <p className="text-sm text-slate-500">Loading holidays...</p>
          ) : visibleHolidays.length ? (
            visibleHolidays.map((holiday) => {
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
        </div>
      </CardContent>
    </Card>
  );
}
