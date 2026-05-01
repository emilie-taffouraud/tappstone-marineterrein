import type { LucideIcon } from "lucide-react";

export type Severity = "info" | "warning" | "critical";
export type SensorStatus = "healthy" | "degraded" | "offline";

export type Kpi = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  helper: string;
  icon: string | LucideIcon;
  iconSize?: string;
};

export type AlertItem = {
  id: number;
  severity: Severity;
  title: string;
  zone: string;
  source: string;
  time: string;
  detail: string;
};

export type CrowdZone = {
  zone: string;
  visitors: number;
  density: number;
  status: "calm" | "stable" | "watch" | "busy";
};

export type TrendPoint = {
  time: string;
  flow: number;
  crowd: number;
  sound: number;
};

export type ModalityPoint = {
  name: string;
  value: number;
};

export type AccessPoint = {
  time: string;
  access: number;
  vehicles: number;
};

export type SensorHealthItem = {
  sensor: string;
  category: string;
  status: SensorStatus;
  zone: string;
};

export type DailyTrendPoint = {
  day: string;
  visitors: number;
  alerts: number;
  avgNoise: number;
  terraceVisitors?: number;
  boardwalkVisitors?: number;
  picnicLawnVisitors?: number;
  swimAreaVisitors?: number;
  isToday?: boolean;
};

export type InfrastructureItem = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
};

export type AnomalyItem = {
  title: string;
  description: string;
  confidence: "low" | "moderate" | "high";
};
