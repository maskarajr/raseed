export const OTHERS_CATEGORY = "Others";

const MIN_INSIDE_LABEL_SHARE = 6;

/** SKU-like tokens must never appear in the donut legend. */
export function isRawSkuLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return true;
  if (/^e2e-/i.test(t)) return true;
  if (/^sku-/i.test(t)) return true;
  if (/^[A-Za-z0-9]+-[A-Za-z0-9]+-\d{6,}$/.test(t)) return true;
  return false;
}

export function friendlyCategoryLabel(
  raw: string | null | undefined,
): string {
  const t = raw?.trim() ?? "";
  if (!t || isRawSkuLabel(t)) return OTHERS_CATEGORY;
  return t;
}

export function formatSharePercent(n: number): string {
  if (!Number.isFinite(n)) return "";
  const tenths = Math.round(n * 10);
  if (tenths % 10 === 0) return `${tenths / 10}%`;
  return `${(tenths / 10).toFixed(1)}%`;
}

export function shareLabelInsideSlice(n: number): string {
  if (!Number.isFinite(n) || n < MIN_INSIDE_LABEL_SHARE) return "";
  return formatSharePercent(n);
}

export function aggregateCategoryRevenue(
  rows: readonly { label: string; revenue: number }[],
): { category: string; share: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const category = friendlyCategoryLabel(row.label);
    map.set(category, (map.get(category) ?? 0) + row.revenue);
  }
  const total = Array.from(map.values()).reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];
  return Array.from(map.entries())
    .map(([category, revenue]) => ({
      category,
      share: Math.round((revenue / total) * 1000) / 10,
    }))
    .sort((a, b) => b.share - a.share);
}
