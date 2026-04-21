import React from "react";
import { DASHBOARD_CARD_TITLE_THEME, MAIN_COLORS } from "../../styles/theme";

export function Card({
  className = "",
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[26px] backdrop-blur-sm ${className}`}
      style={{
        border: `1px solid rgba(214, 224, 234, 0.96)`,
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.985) 0%, rgba(247, 250, 253, 0.955) 100%)",
        boxShadow: "0 18px 36px rgba(15, 23, 42, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.82)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`p-5 pb-2 ${className}`}>{children}</div>;
}

export function CardTitle({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={`text-sm font-semibold tracking-tight ${className}`}
      style={{ color: DASHBOARD_CARD_TITLE_THEME.cardTitleColor }}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "sky" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, React.CSSProperties> = {
    slate: {
      borderColor: `${MAIN_COLORS.aColorGray}40`,
      backgroundColor: "rgba(248, 250, 252, 0.88)",
      color: "#475569",
    },
    sky: {
      borderColor: `${MAIN_COLORS.aColor2}66`,
      backgroundColor: `${MAIN_COLORS.aColor2}14`,
      color: "#2f6f92",
    },
    emerald: {
      borderColor: "rgba(22, 163, 74, 0.28)",
      backgroundColor: "rgba(22, 163, 74, 0.08)",
      color: "#166534",
    },
    amber: {
      borderColor: "rgba(245, 158, 11, 0.34)",
      backgroundColor: "rgba(245, 158, 11, 0.1)",
      color: "#b45309",
    },
    rose: {
      borderColor: "rgba(220, 38, 38, 0.25)",
      backgroundColor: "rgba(220, 38, 38, 0.08)",
      color: "#b91c1c",
    },
  };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={tones[tone]}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[1.08rem] font-semibold tracking-[-0.03em]" style={{ color: DASHBOARD_CARD_TITLE_THEME.sectionTitleColor }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 max-w-4xl text-[0.94rem] leading-6" style={{ color: DASHBOARD_CARD_TITLE_THEME.sectionSubtitleColor }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SelectLike({
  label,
  value,
  onChange,
  options,
  dark = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  dark?: boolean;
}) {
  return (
    <label className="flex min-w-[150px] flex-col gap-2">
      <span
        className="text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: dark ? "#36546f" : MAIN_COLORS.aColorGray }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[18px] border px-3 py-2.5 text-sm outline-none ring-0 transition"
        style={{
          borderColor: dark ? "rgba(120, 169, 198, 0.45)" : `${MAIN_COLORS.aColorGray}33`,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          color: MAIN_COLORS.aColorBlack,
          boxShadow: dark ? "0 8px 20px rgba(15, 23, 42, 0.06)" : "none",
        }}
      >
        {options.map((opt) => (
          <option key={opt} style={{ color: MAIN_COLORS.aColorBlack }}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
