import { formatPKR } from "@/lib/money";

// Single money renderer used everywhere money appears. Always shows grouped
// thousands (e.g. `Rs 12,450`) with tabular figures so columns align.
export function Money({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return <span className={`tnum ${className}`}>{formatPKR(value)}</span>;
}
