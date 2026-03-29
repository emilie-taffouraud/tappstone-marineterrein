import React from "react";
import { MAIN_COLORS, CARD_STYLES, PILL_STYLES, SECTION_TITLE_STYLES, INPUT_STYLES } from "./theme";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
        className={`rounded-3xl backdrop-blur ${className}`}
    style={CARD_STYLES}
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
  return <div className={`p-5 pb-3 ${className}`}>{children}</div>;
}

export function CardTitle({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={`text-sm font-semibold tracking-tight text-slate-900 ${className}`}>
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
  const current = PILL_STYLES[tone];

  return (
    <span
      style={{
        border: `1px solid ${current.border}`,
        backgroundColor: current.backgroundColor,
        color: current.color,
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 500,
        display: "inline-block",
      }}
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
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 style={{ color: SECTION_TITLE_STYLES.title }} className="text-base font-semibold">{title}</h2>
        {subtitle ? <p style={{ color: SECTION_TITLE_STYLES.subtitle }} className="mt-1 text-sm">{subtitle}</p> : null}
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
  <label className="flex min-w-[150px] flex-col gap-1.5">
    <span
      className="text-xs font-medium uppercase tracking-[0.14em]"
      style={{
        color: dark ? MAIN_COLORS.aColor2 : MAIN_COLORS.aColorGray,
      }}
    >
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-2xl px-3 py-2.5 text-sm outline-none ring-0 transition"
      style={{
        border: INPUT_STYLES.border,
        backgroundColor: INPUT_STYLES.backgroundColor,
        color: dark ? MAIN_COLORS.aColor4 : INPUT_STYLES.color,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = INPUT_STYLES.focusBorder;
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