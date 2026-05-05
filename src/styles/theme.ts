/**
 * Centralized theme and styling for dashboard components.
 * Marineterrein-inspired tokens keep brand accents consistent and restrained.
 */

/* ============================================================================
   CORE COLORS
   ============================================================================ */

export const MAIN_COLORS = {
  aColorBlack: "#152326",
  aColorWhite: "#ffffff",
  aColorGray: "#60737a",
  aColor1: "#00ADEF",      // Marineterrein cyan
  aColor2: "#016991",      // Secondary blue
  aColor3: "#f6f9fb",      // Page background
  aColor4: "#1a4b58",      // Dark teal
  aColor5: "#f37158",      // Coral
} as const;

export const MT_COLORS = {
  cyan: "#00ADEF",
  teal: "#0d927a",
  darkTeal: "#1a4b58",
  blue: "#016991",
  green: "#93c148",
  yellow: "#ffe328",
  coral: "#f37158",
  paleBlue: "#b0c1d1",
  palePink: "#f6d4e5",
  burgundy: "#6a0e3f",
  page: "#f6f9fb",
  card: "#ffffff",
  border: "#d9e3ea",
  text: "#152326",
  muted: "#60737a",
} as const;

/* ============================================================================
   DASHBOARD HERO TYPOGRAPHY
   ============================================================================ */

export const DASHBOARD_HEADER_THEME = {
  title: {
    color: MT_COLORS.text,
    fontFamily: '"Overpass", "Segoe UI", sans-serif',
    fontWeight: 700,
    letterSpacing: "0",
  },
  subtitle: {
    color: MT_COLORS.muted,
    fontFamily: '"Overpass", "Segoe UI", sans-serif',
    fontWeight: 400,
    letterSpacing: "0",
  },
} as const;

/* ============================================================================
  DASHBOARD CARDS TITLE COLORS
  ============================================================================ */

export const DASHBOARD_CARD_TITLE_THEME = {
  sectionTitleColor: MAIN_COLORS.aColorBlack,
  sectionSubtitleColor: MAIN_COLORS.aColorGray,
  cardTitleColor: MAIN_COLORS.aColorBlack,
} as const;

/* ============================================================================
   TELRAAM LIVE CARD THEME
   ============================================================================ */

export const TELRAAM_LIVE_CARD_THEME = {
  icon: {
    width: "3.25rem",
    height: "3.25rem",
    objectFit: "contain" as const,
  },
  travelTypeLabelColors: {
    Pedestrians: "#016991",
    Bicycles: "#00ADEF",
    Cars: "#0f766e",
    Buses: "#f59e0b",
    "Light trucks": "#94a3b8",
    Motorcycles: "#ef4444",
    Trucks: "#22c55e",
    Trailers: "#f97316",
    Tractors: "#14b8a6",
    Strollers: "#64748b",
  },
  fallbackTravelTypeLabelColor: MAIN_COLORS.aColor1,
  inactiveTravelTypeLabelColor: MAIN_COLORS.aColorGray,
} as const;

/* ============================================================================
   COMPONENT STYLES
   ============================================================================ */

const BADGE_STYLES = {
  base: {
    border: `1px solid ${MT_COLORS.border}`,
    backgroundColor: MT_COLORS.card,
    color: MT_COLORS.text,
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    display: "inline-block" as const,
  },
  info: {
    border: `1px solid ${MT_COLORS.paleBlue}`,
    backgroundColor: "#eaf3f8",
    color: MT_COLORS.blue,
  },
  warning: {
    border: `1px solid ${MT_COLORS.yellow}`,
    backgroundColor: "#fff8bf",
    color: MT_COLORS.darkTeal,
  },
  critical: {
    border: `1px solid ${MT_COLORS.coral}80`,
    backgroundColor: "#fde6e1",
    color: "#9f2f25",
  },
  healthy: {
    border: `1px solid ${MT_COLORS.teal}55`,
    backgroundColor: "#e4f5f1",
    color: MT_COLORS.darkTeal,
  },
  degraded: {
    border: `1px solid ${MT_COLORS.yellow}`,
    backgroundColor: "#fff8bf",
    color: MT_COLORS.darkTeal,
  },
  offline: {
    border: `1px solid ${MT_COLORS.coral}66`,
    backgroundColor: "#fde6e1",
    color: "#9f2f25",
  },
} as const;

/* ============================================================================
   LIVE MAP LEGEND STYLES
   ============================================================================ */

export const LIVE_MAP_LEGEND_THEME = {
  panel: {
    border: `1px solid ${MT_COLORS.border}`,
    backgroundColor: "#f8fbfd",
  },
  text: {
    title: MAIN_COLORS.aColorBlack,
    detail: MAIN_COLORS.aColorGray,
  },
  layers: {
    zones: {
      accent: MT_COLORS.cyan,
    },
    sensors: {
      accent: MT_COLORS.darkTeal,
    },
    weather: {
      accent: MT_COLORS.green,
    },
    warnings: {
      accent: MT_COLORS.coral,
    },
  },
} as const;

/* ============================================================================
   LAYER TOGGLE STYLES
   ============================================================================ */

export const LAYER_TOGGLE_THEME = {
  active: {
    border: `1px solid ${MT_COLORS.cyan}80`,
    backgroundColor: "#ffffff",
    color: MT_COLORS.darkTeal,
    boxShadow: `inset 3px 0 0 ${MT_COLORS.cyan}`,
  },
  inactive: {
    border: `1px solid ${MT_COLORS.border}`,
    backgroundColor: "#f8fbfd",
    color: MT_COLORS.muted,
  },
} as const;

/* ============================================================================
   UTILITY FUNCTIONS
   ============================================================================ */

/**
 * Get badge styles based on severity level
 */
export function getBadgeStyle(severity: "info" | "warning" | "critical" | "healthy" | "degraded" | "offline") {
  return {
    ...BADGE_STYLES.base,
    ...BADGE_STYLES[severity],
  };
}

export function getDisplayStatusLabel(status: string | null | undefined) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "ok" || normalized === "healthy" || normalized === "live") return "Live";
  if (normalized === "warning" || normalized === "degraded") return "Partial data";
  if (normalized === "critical" || normalized === "error" || normalized === "offline") return "No data";
  if (normalized === "loading" || normalized === "pending" || normalized === "awaiting-data") return "Awaiting feed";
  return status || "Awaiting feed";
}
