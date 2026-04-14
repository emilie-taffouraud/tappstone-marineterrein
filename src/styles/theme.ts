/**
 * Centralized theme and styling for dashboard components
 * Uses only the 7 core colors from MAIN_COLORS
 */

/* ============================================================================
   CORE COLORS
   ============================================================================ */

export const MAIN_COLORS = {
  aColorBlack: "#000000",
  aColorWhite: "#ffffff",
  aColorGray: "#6c6c6c",
  aColor1: "#016991",      // Primary accent (teal)
  aColor2: "#00ADEF",      // Secondary accent (blue)
  aColor3: "#fcfcfcec",    // Light background
  aColor4: "#0e1124ec",    // Dark blue overlay
  aColor5: "#f37158",      // Additional accent color(coral)
} as const;

/* ============================================================================
   DASHBOARD HERO TYPOGRAPHY
   ============================================================================ */

export const DASHBOARD_HEADER_THEME = {
  title: {
    color: MAIN_COLORS.aColorWhite,
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    fontWeight: 700,
    letterSpacing: "-0.025em",
  },
  subtitle: {
    color: MAIN_COLORS.aColor3,
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    fontWeight: 400,
    letterSpacing: "0.005em",
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
    border: `1px solid ${MAIN_COLORS.aColor1}40`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColor1,
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    display: "inline-block" as const,
  },
  info: {
    border: `1px solid ${MAIN_COLORS.aColor2}66`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColor2,
  },
  warning: {
    border: "1px solid rgba(245, 158, 11, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    color: "#b45309",
  },
  critical: {
    border: "1px solid rgba(220, 38, 38, 0.4)",
    backgroundColor: "rgba(220, 38, 38, 0.12)",
    color: "#b91c1c",
  },
  healthy: {
    border: `1px solid ${MAIN_COLORS.aColor2}66`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColor2,
  },
  degraded: {
    border: `1px solid ${MAIN_COLORS.aColor1}4d`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColor1,
  },
  offline: {
    border: `1px solid ${MAIN_COLORS.aColorBlack}33`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColorGray,
  },
} as const;

/* ============================================================================
   LIVE MAP LEGEND STYLES
   ============================================================================ */

export const LIVE_MAP_LEGEND_THEME = {
  panel: {
    border: `1px solid ${MAIN_COLORS.aColorGray}33`,
    backgroundColor: `${MAIN_COLORS.aColor3}d1`,
  },
  text: {
    title: MAIN_COLORS.aColorBlack,
    detail: MAIN_COLORS.aColorGray,
  },
  layers: {
    zones: {
      accent: "#16a34a",
    },
    sensors: {
      accent: "#3a1575",
    },
    weather: {
      accent: "#0284c7",
    },
    warnings: {
      accent: "#dc2626",
    },
  },
} as const;

/* ============================================================================
   LAYER TOGGLE STYLES
   ============================================================================ */

export const LAYER_TOGGLE_THEME = {
  active: {
    border: `1px solid ${MAIN_COLORS.aColor2}99`,
    backgroundColor: `${MAIN_COLORS.aColor2}18`,
    color: MAIN_COLORS.aColor1,
  },
  inactive: {
    border: `1px solid ${MAIN_COLORS.aColorGray}44`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColorGray,
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
