import { formatPKR } from "@/lib/money";

export const DASHBOARD_LOCALE = "en-GB";

/** Noon anchor avoids off-by-one labels around timezone boundaries for ISO date strings. */
export function parseIsoCalendarDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

export type DashboardDateStyle = "month" | "day-month" | "full";

export function formatDate(isoDate: string, style: DashboardDateStyle): string {
  const date = parseIsoCalendarDate(isoDate);
  if (style === "month") {
    return date.toLocaleDateString(DASHBOARD_LOCALE, { month: "short" });
  }
  if (style === "day-month") {
    return date.toLocaleDateString(DASHBOARD_LOCALE, {
      day: "numeric",
      month: "short",
    });
  }
  return date.toLocaleDateString(DASHBOARD_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** X-axis for range charts: weekday when showing ~a week, otherwise month + day. */
export function formatChartAxisTick(
  isoDate: string,
  periodDays: number,
): string {
  const date = parseIsoCalendarDate(isoDate);
  if (periodDays <= 7) {
    return date.toLocaleDateString(DASHBOARD_LOCALE, { weekday: "short" });
  }
  return formatDate(isoDate, "day-month");
}

export type ChartTooltipWeekdayStyle = "short" | "long";

/** Tooltip label for a chart point (weekday + month + day). */
export function formatChartTooltipDate(
  isoDate: string,
  weekdayStyle: ChartTooltipWeekdayStyle = "short",
): string {
  const date = parseIsoCalendarDate(isoDate);
  return date.toLocaleDateString(DASHBOARD_LOCALE, {
    weekday: weekdayStyle,
    day: "numeric",
    month: "short",
  });
}

export function formatCurrency(value: number) {
  return formatPKR(value);
}

export function formatCompactCurrency(
  value: number,
  options?: { maximumFractionDigits?: number },
) {
  const { maximumFractionDigits = 0 } = options ?? {};
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    notation: "compact",
  }).format(value);
}

export function formatFullCurrency(value: number) {
  return formatPKR(Math.round(value));
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits)}%`;
}
