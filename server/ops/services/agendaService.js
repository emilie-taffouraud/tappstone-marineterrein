import { getOrSetCache } from "../lib/cache.js";
import { fetchText } from "../lib/http.js";

const MARINETERREIN_AGENDA_URL = "https://marineterrein.nl/wat-is-er-te-doen/agenda/";
const CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 4;

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value) {
  return decodeHtmlEntities(stripTags(value)).replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(value) {
  if (!value) return null;

  try {
    return new URL(value, MARINETERREIN_AGENDA_URL).toString();
  } catch {
    return null;
  }
}

function buildAgendaId(detailUrl, fallbackIndex) {
  try {
    const pathname = new URL(detailUrl).pathname.replace(/\/$/, "");
    const slug = pathname.split("/").filter(Boolean).pop();
    return slug || `agenda-${fallbackIndex + 1}`;
  } catch {
    return `agenda-${fallbackIndex + 1}`;
  }
}

function extractMatch(input, expression) {
  const match = input.match(expression);
  return match?.[1] ? normalizeWhitespace(match[1]) : null;
}

function parseOverviewAgendaItems(html) {
  const anchorPattern = /<a href="([^"]*\/agenda\/[^"]+)" class="link">([\s\S]*?)<\/a>/gi;
  const items = [];
  const seenIds = new Set();
  let match;

  while ((match = anchorPattern.exec(html))) {
    const detailUrl = toAbsoluteUrl(match[1]);
    const block = match[2];

    if (!detailUrl) continue;

    const id = buildAgendaId(detailUrl, items.length);
    if (seenIds.has(id)) continue;

    const title = extractMatch(block, /<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!title) continue;

    const dateLabel =
      extractMatch(block, /<span class="date[^"]*">([\s\S]*?)<\/span>/i) ||
      extractMatch(block, /<time[^>]*>([\s\S]*?)<\/time>/i) ||
      "Date tbc";
    const venue = extractMatch(block, /<span class="label-01 label">([\s\S]*?)<\/span>/i);
    const imageUrl = toAbsoluteUrl(extractMatch(block, /<img[^>]+src="([^"]+)"/i));

    seenIds.add(id);
    items.push({
      id,
      title,
      dateLabel,
      venue,
      detailUrl,
      imageUrl,
      summary: null,
    });
  }

  return items;
}

function extractDetailSummary(html) {
  return (
    extractMatch(html, /<meta property="og:description" content="([^"]+)"/i) ||
    extractMatch(html, /<p class="intro[^"]*">([\s\S]*?)<\/p>/i)
  );
}

function extractDetailVenue(html) {
  return extractMatch(html, /<span class="label-01 label">([\s\S]*?)<\/span>/i);
}

function extractDetailImage(html) {
  return (
    toAbsoluteUrl(extractMatch(html, /<meta property="og:image" content="([^"]+)"/i)) ||
    toAbsoluteUrl(extractMatch(html, /<img[^>]+src="([^"]+)"/i))
  );
}

async function enrichAgendaItem(item) {
  try {
    const html = await fetchText(item.detailUrl, {
      timeoutMs: 8000,
      headers: {
        "User-Agent": "ops-dashboard/agenda-scraper",
      },
    });

    return {
      ...item,
      venue: item.venue || extractDetailVenue(html),
      imageUrl: item.imageUrl || extractDetailImage(html),
      summary: extractDetailSummary(html),
    };
  } catch {
    return item;
  }
}

export async function getAgendaFeed({ limit = DEFAULT_LIMIT } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 3), 6);

  return getOrSetCache(`ops:agenda:${safeLimit}`, CACHE_TTL_MS, async () => {
    const fetchedAt = new Date().toISOString();

    try {
      const html = await fetchText(MARINETERREIN_AGENDA_URL, {
        timeoutMs: 10000,
        headers: {
          "User-Agent": "ops-dashboard/agenda-scraper",
        },
      });

      const overviewItems = parseOverviewAgendaItems(html).slice(0, safeLimit);

      if (!overviewItems.length) {
        return {
          items: [],
          sourceUrl: MARINETERREIN_AGENDA_URL,
          fetchedAt,
          error: "No Marineterrein agenda items could be parsed from the overview page.",
          fallback: true,
        };
      }

      const items = await Promise.all(overviewItems.map((item) => enrichAgendaItem(item)));

      return {
        items,
        sourceUrl: MARINETERREIN_AGENDA_URL,
        fetchedAt,
        error: null,
        fallback: false,
      };
    } catch (error) {
      return {
        items: [],
        sourceUrl: MARINETERREIN_AGENDA_URL,
        fetchedAt,
        error: error instanceof Error ? error.message : "Unable to load Marineterrein agenda.",
        fallback: true,
      };
    }
  });
}
