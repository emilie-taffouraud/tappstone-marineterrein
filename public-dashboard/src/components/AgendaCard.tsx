import { Calendar, ExternalLink } from "lucide-react";
import { CARD_STYLE, MAIN_COLORS } from "../styles/theme";
import type { AgendaFeed } from "../types";
import type { Translations } from "../i18n";

interface Props {
  feed: AgendaFeed | null;
  loading: boolean;
  t: Translations;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-12 h-12 rounded-xl flex-shrink-0 animate-pulse" style={{ background: "rgba(100,116,139,0.1)" }} />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: "rgba(100,116,139,0.1)" }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: "rgba(100,116,139,0.07)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function AgendaCard({ feed, loading, t }: Props) {
  const items = feed?.items ?? [];

  return (
    <div style={CARD_STYLE} className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${MAIN_COLORS.aColor2}18`, color: MAIN_COLORS.aColor1 }}
          >
            <Calendar size={16} />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: MAIN_COLORS.aColorBlack, letterSpacing: "-0.01em" }}
          >
            {t.agenda}
          </h2>
        </div>
        <a
          href="https://marineterrein.nl/wat-is-er-te-doen/agenda/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: MAIN_COLORS.aColor1 }}
        >
          {t.viewMore}
          <ExternalLink size={11} />
        </a>
      </div>

      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
          {t.agendaEmpty}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item, idx) => (
            <a
              key={idx}
              href={item.url || "https://marineterrein.nl/wat-is-er-te-doen/agenda/"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
              style={{
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = `${MAIN_COLORS.aColor2}0d`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              {/* date box */}
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                style={{ background: `${MAIN_COLORS.aColor1}12`, border: `1px solid ${MAIN_COLORS.aColor1}20` }}
              >
                {item.date ? (
                  <>
                    <span className="text-[10px] uppercase font-bold" style={{ color: MAIN_COLORS.aColor1 }}>
                      {new Date(item.date).toLocaleDateString("nl-NL", { month: "short" })}
                    </span>
                    <span className="text-lg font-extrabold leading-none" style={{ color: MAIN_COLORS.aColorBlack }}>
                      {new Date(item.date).getDate()}
                    </span>
                  </>
                ) : (
                  <Calendar size={18} style={{ color: MAIN_COLORS.aColor1 }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: MAIN_COLORS.aColorBlack }}
                >
                  {item.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: MAIN_COLORS.aColorGray }}>
                  {item.date ? formatDate(item.date) : ""}
                  {item.time ? ` · ${item.time}` : ""}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
