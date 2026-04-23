export const MAIN_COLORS = {
  aColorBlack: "#10233a",
  aColorWhite: "#ffffff",
  aColorGray: "#64748b",
  aColor1: "#1f5f86",
  aColor2: "#78a9c6",
  aColor3: "#f7fafc",
  aColor4: "#08192bd9",
  aColor5: "#c98369",
} as const;

export const CROWD_LEVEL_STYLES = {
  low: {
    label: { nl: "Rustig", en: "Quiet" },
    border: "1px solid rgba(22, 163, 74, 0.28)",
    background: "rgba(22, 163, 74, 0.08)",
    color: "#166534",
    dot: "#16a34a",
  },
  medium: {
    label: { nl: "Matig druk", en: "Moderate" },
    border: "1px solid rgba(245, 158, 11, 0.45)",
    background: "rgba(245, 158, 11, 0.12)",
    color: "#b45309",
    dot: "#f59e0b",
  },
  high: {
    label: { nl: "Druk", en: "Busy" },
    border: "1px solid rgba(220, 38, 38, 0.4)",
    background: "rgba(220, 38, 38, 0.12)",
    color: "#b91c1c",
    dot: "#dc2626",
  },
} as const;

export const CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,251,253,0.94) 100%)",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  borderRadius: "1.5rem",
  boxShadow: "0 16px 36px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
};

export const HERO_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(8,25,43,0.96) 0%, rgba(14,37,60,0.94) 56%, rgba(20,50,80,0.92) 100%)",
  borderRadius: "2rem",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 22px 48px rgba(8, 15, 27, 0.18)",
};

export const TREND_COLORS = {
  pedestrians: "#016991",
  bicycles: "#00ADEF",
  vehicles: "#0f766e",
} as const;

export const LAYER_TOGGLE_THEME = {
  active: {
    border: `1px solid rgba(120, 169, 198, 0.53)`,
    backgroundColor: `rgba(120, 169, 198, 0.078)`,
    color: "#1f5f86",
    cursor: "pointer" as const,
  },
  inactive: {
    border: `1px solid rgba(100, 116, 139, 0.27)`,
    backgroundColor: "#f7fafc",
    color: "#64748b",
    cursor: "pointer" as const,
  },
} as const;
