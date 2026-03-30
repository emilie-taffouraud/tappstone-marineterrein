import React from "react";
import { MAIN_COLORS } from "./theme";

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
      style={{
        border: `1px solid ${MAIN_COLORS.aColorWhite}cc`,
        backgroundColor: `${MAIN_COLORS.aColor3}`,
        boxShadow: `0 12px 35px ${MAIN_COLORS.aColorBlack}14`,
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
    <h3 className={`text-sm font-semibold tracking-tight ${className}`} style={{ color: MAIN_COLORS.aColorBlack }}>
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
      borderColor: `${MAIN_COLORS.aColorGray}4d`,
      backgroundColor: `${MAIN_COLORS.aColorGray}14`,
      color: MAIN_COLORS.aColorGray,
    },
    sky: {
      borderColor: `${MAIN_COLORS.aColor2}66`,
      backgroundColor: `${MAIN_COLORS.aColor2}1a`,
      color: MAIN_COLORS.aColor2,
    },
    emerald: {
      borderColor: `${MAIN_COLORS.aColor1}66`,
      backgroundColor: `${MAIN_COLORS.aColor1}1a`,
      color: MAIN_COLORS.aColor1,
    },
    amber: {
      borderColor: `${MAIN_COLORS.aColor1}99`,
      backgroundColor: `${MAIN_COLORS.aColor1}26`,
      color: MAIN_COLORS.aColor1,
    },
    rose: {
      borderColor: `${MAIN_COLORS.aColorBlack}66`,
      backgroundColor: `${MAIN_COLORS.aColorBlack}12`,
      color: MAIN_COLORS.aColorBlack,
    },
  };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
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
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold" style={{ color: MAIN_COLORS.aColorBlack }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm" style={{ color: MAIN_COLORS.aColorGray }}>
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
    <label className="flex min-w-[150px] flex-col gap-1.5">
      <span
        className="text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: dark ? MAIN_COLORS.aColor1 : MAIN_COLORS.aColorGray }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border px-3 py-2.5 text-sm outline-none ring-0 transition"
        style={{
          borderColor: dark ? `${MAIN_COLORS.aColor1}66` : `${MAIN_COLORS.aColorGray}4d`,
          backgroundColor: MAIN_COLORS.aColorWhite,
          color: MAIN_COLORS.aColorBlack,
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