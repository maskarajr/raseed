import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  children,
  hint,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-line bg-surface shadow-none",
        compact ? "rounded-md p-3" : "rounded-lg p-4",
      )}
    >
      <p className={cn("text-muted", compact ? "text-[11px] leading-tight" : "text-sm")}>
        {label}
      </p>
      <div
        className={cn(
          "mt-1 font-serif font-semibold tracking-tight text-ink",
          compact ? "text-lg" : "text-3xl",
        )}
      >
        {children}
      </div>
      {hint != null && hint !== "" ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
