import React from "react";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border border-emerald-100/80 bg-white/90 shadow-[0_12px_35px_rgba(21,128,61,0.08)] backdrop-blur ${className}`}
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
  const tones: Record<string, string> = {
    slate: "border-stone-200 bg-stone-50 text-stone-700",
    sky: "border-teal-200 bg-teal-50 text-teal-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
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
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
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
        className={`text-xs font-medium uppercase tracking-[0.14em] ${
          dark ? "text-emerald-800" : "text-slate-500"
        }`}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-2xl px-3 py-2.5 text-sm outline-none ring-0 transition ${
          dark
            ? "border border-emerald-200 bg-white text-emerald-950 focus:border-emerald-500"
            : "border border-slate-200 bg-white text-slate-800 focus:border-emerald-500"
        }`}
      >
        {options.map((opt) => (
          <option key={opt} className="text-slate-900">
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}