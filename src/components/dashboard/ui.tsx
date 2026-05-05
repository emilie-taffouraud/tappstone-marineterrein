import React from "react";
import { DASHBOARD_CARD_TITLE_THEME, MAIN_COLORS, MT_COLORS, getDisplayStatusLabel } from "../../styles/theme";

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
      className={`rounded-[18px] bg-white ${className}`}
      style={{
        border: `1px solid ${MT_COLORS.border}`,
        background: MT_COLORS.card,
        boxShadow: "0 8px 24px rgba(26, 75, 88, 0.06)",
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
      borderColor: MT_COLORS.paleBlue,
      backgroundColor: "#edf4f8",
      color: MT_COLORS.blue,
    },
    sky: {
      borderColor: `${MT_COLORS.cyan}66`,
      backgroundColor: "#e7f7fd",
      color: MT_COLORS.blue,
    },
    emerald: {
      borderColor: `${MT_COLORS.teal}55`,
      backgroundColor: "#e4f5f1",
      color: MT_COLORS.darkTeal,
    },
    amber: {
      borderColor: MT_COLORS.yellow,
      backgroundColor: "#fff8bf",
      color: MT_COLORS.darkTeal,
    },
    rose: {
      borderColor: `${MT_COLORS.coral}66`,
      backgroundColor: "#fde6e1",
      color: "#9f2f25",
    },
  };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={tones[tone]}
    >
      {typeof children === "string" ? getDisplayStatusLabel(children) : children}
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
      <div className="relative pl-3">
        <span
          aria-hidden="true"
          className="absolute left-0 top-1 h-8 w-1 rounded-full"
          style={{ backgroundColor: MT_COLORS.cyan }}
        />
        <h2 className="text-[1.15rem] font-semibold tracking-normal" style={{ color: DASHBOARD_CARD_TITLE_THEME.sectionTitleColor }}>
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
        style={{ color: dark ? MT_COLORS.darkTeal : MAIN_COLORS.aColorGray }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[18px] border px-3 py-2.5 text-sm outline-none ring-0 transition"
        style={{
          borderColor: dark ? `${MT_COLORS.cyan}55` : `${MAIN_COLORS.aColorGray}33`,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          color: MAIN_COLORS.aColorBlack,
          boxShadow: dark ? "0 8px 20px rgba(26, 75, 88, 0.06)" : "none",
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
