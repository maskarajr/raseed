import { formatPKR } from "@/lib/money";

// Default: mono + tabular (tables). Hero: Georgia serif (KPI / Balance due / Review Total).
export function Money({
  value,
  className = "",
  variant = "default",
}: {
  value: number;
  className?: string;
  variant?: "default" | "hero";
}) {
  return (
    <span className={`${variant === "hero" ? "money-hero" : "tnum"} ${className}`}>
      {formatPKR(value)}
    </span>
  );
}
