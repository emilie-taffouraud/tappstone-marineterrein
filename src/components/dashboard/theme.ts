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
  aColor3: "#f2f2f2ec",    // Light background
  aColor4: "#0e1124ec",    // Dark blue overlay
} as const;

/* ============================================================================
   DERIVED COLOR PALETTE
   ============================================================================ */



/* ============================================================================
   COMPONENT STYLES
   ============================================================================ */

export const COMPONENT_STYLES = {
  // Card styling
  card: {
    border: `1px solid ${MAIN_COLORS.aColorWhite}99`,
    backgroundColor: MAIN_COLORS.aColor3,
    boxShadow: `0 12px 35px ${MAIN_COLORS.aColorBlack}20`,
  },

  // Badge/Pill styling (alert severity)
  badge: {
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
    // Severity-based badges
    info: {
      border: `1px solid ${MAIN_COLORS.aColor2}66`,
      backgroundColor: MAIN_COLORS.aColor3,
      color: MAIN_COLORS.aColor2,
    },
    warning: {
      border: `1px solid ${MAIN_COLORS.aColor1}66`,
      backgroundColor: MAIN_COLORS.aColor3,
      color: MAIN_COLORS.aColor1,
    },
    critical: {
      border: `1px solid ${MAIN_COLORS.aColorBlack}4d`,
      backgroundColor: MAIN_COLORS.aColor3,
      color: MAIN_COLORS.aColorBlack,
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
  },

  // Chart styling
  chart: {
    grid: MAIN_COLORS.aColorBlack,
    axis: MAIN_COLORS.aColor1,
    tooltip: {
      backgroundColor: MAIN_COLORS.aColorBlack,
      border: `1px solid ${MAIN_COLORS.aColor1}`,
      color: MAIN_COLORS.aColorWhite,
    },
  },

  // Form styling
  input: {
    border: `1px solid ${MAIN_COLORS.aColor1}`,
    backgroundColor: MAIN_COLORS.aColorWhite,
    color: MAIN_COLORS.aColorBlack,
    focusBorder: MAIN_COLORS.aColor2,
    focusShadow: `0 0 0 3px ${MAIN_COLORS.aColor2}1a`,
  },

  // Header styling
  header: {
    backgroundColor: MAIN_COLORS.aColorBlack,
    color: MAIN_COLORS.aColor2,
    subtitle: MAIN_COLORS.aColorWhite,
    gradient: `linear-gradient(${MAIN_COLORS.aColor4}, ${MAIN_COLORS.aColor4})`,
  },

  // Section title styling
  sectionTitle: {
    title: MAIN_COLORS.aColorBlack,
    subtitle: MAIN_COLORS.aColorGray,
    fontSize: "1rem",
    fontWeight: 600,
  },

  // Pill (status indicator) styling
  pill: {
    slate: {
      border: `1px solid ${MAIN_COLORS.aColorGray}4d`,
      backgroundColor: `${MAIN_COLORS.aColorGray}10`,
      color: MAIN_COLORS.aColorGray,
    },
    sky: {
      border: `1px solid ${MAIN_COLORS.aColor2}4d`,
      backgroundColor: `${MAIN_COLORS.aColor2}10`,
      color: MAIN_COLORS.aColor2,
    },
    emerald: {
      border: `1px solid ${MAIN_COLORS.aColor1}4d`,
      backgroundColor: `${MAIN_COLORS.aColor1}10`,
      color: MAIN_COLORS.aColor1,
    },
    amber: {
      border: `1px solid ${MAIN_COLORS.aColor1}66`,
      backgroundColor: `${MAIN_COLORS.aColor1}26`,
      color: MAIN_COLORS.aColor1,
    },
    rose: {
      border: `1px solid ${MAIN_COLORS.aColor1}80`,
      backgroundColor: `${MAIN_COLORS.aColor1}33`,
      color: MAIN_COLORS.aColor1,
    },
  },

  // Page-level layouts
  pageContainer: {
    backgroundColor: MAIN_COLORS.aColorWhite,
    color: MAIN_COLORS.aColorBlack,
  },

  pageHeader: {
    backgroundColor: MAIN_COLORS.aColorBlack,
    border: `1px solid ${MAIN_COLORS.aColorWhite}99`,
    titleColor: MAIN_COLORS.aColor2,
    descriptionColor: MAIN_COLORS.aColorWhite,
    boxShadow: `0 12px 35px ${MAIN_COLORS.aColorBlack}20`,
    // Typography
    titleFontSize: "2.5rem",      // Larger for impact
    titleLineHeight: "1.2",       // Tighter line height for elegance
    titleLetterSpacing: "-0.02em", // Slight negative spacing for sophistication
    subtitleFontSize: "1rem",
    subtitleLineHeight: "1.6",    // Better readability
    subtitleLetterSpacing: "0.3px", // Slight letter spacing
    subtitleOpacity: 0.95,        // Slightly less white for sophistication
  },

  filterControls: {
    backgroundColor: MAIN_COLORS.aColorBlack,
    labelColor: MAIN_COLORS.aColor1,
    titleColor: MAIN_COLORS.aColor1,
    descriptionColor: MAIN_COLORS.aColorBlack,
    boxShadow: `0 18px 45px ${MAIN_COLORS.aColorBlack}20`,
  },

  viewStatus: {
    border: `1px solid ${MAIN_COLORS.aColor1}40`,
    backgroundColor: MAIN_COLORS.aColor3,
    color: MAIN_COLORS.aColorBlack,
  },

  crowdZone: {
    border: `1px solid ${MAIN_COLORS.aColorGray}33`,
    backgroundColor: `${MAIN_COLORS.aColorGray}08`,
    color: MAIN_COLORS.aColorBlack,
  },

  alert: {
    border: `1px solid ${MAIN_COLORS.aColorGray}33`,
    backgroundColor: `${MAIN_COLORS.aColorGray}08`,
    color: MAIN_COLORS.aColorBlack,
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
    ...COMPONENT_STYLES.badge.base,
    ...COMPONENT_STYLES.badge[severity],
  };
}

/**
 * Get pill styles based on tone
 */
export function getPillStyle(tone: "slate" | "sky" | "emerald" | "amber" | "rose") {
  return {
    border: `1px solid ${COMPONENT_STYLES.pill[tone].border}`,
    backgroundColor: COMPONENT_STYLES.pill[tone].backgroundColor,
    color: COMPONENT_STYLES.pill[tone].color,
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    display: "inline-block" as const,
  };
}

/**
 * Create an opacity-adjusted color
 */
export function withOpacity(color: string, opacity: number): string {
  if (!color.startsWith("#")) return color;
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}

/* ============================================================================
   EXPORT CONVENIENCE OBJECTS
   ============================================================================ */

// For easy spreading in component styles
export const CARD_STYLES = COMPONENT_STYLES.card;
export const CHART_STYLES = COMPONENT_STYLES.chart;
export const INPUT_STYLES = COMPONENT_STYLES.input;
export const HEADER_STYLES = COMPONENT_STYLES.header;
export const SECTION_TITLE_STYLES = COMPONENT_STYLES.sectionTitle;
export const PILL_STYLES = COMPONENT_STYLES.pill;

// Page layout styles
export const PAGE_CONTAINER = COMPONENT_STYLES.pageContainer;
export const PAGE_HEADER = COMPONENT_STYLES.pageHeader;
export const FILTER_CONTROLS = COMPONENT_STYLES.filterControls;
export const VIEW_STATUS = COMPONENT_STYLES.viewStatus;
export const CROWD_ZONE = COMPONENT_STYLES.crowdZone;
export const ALERT_BOX = COMPONENT_STYLES.alert;
