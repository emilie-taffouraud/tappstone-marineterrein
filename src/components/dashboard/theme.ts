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
