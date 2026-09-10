// Quiet StatusPill: faint/near-mono bg + semantic dot + text label (never color-only).

type PillStyle = { bg: string; fg: string; label: string };

const STYLES: Record<string, PillStyle> = {
  draft: { bg: "#F5F5F5", fg: "#737373", label: "Draft" },
  submitted: { bg: "#F3F7F5", fg: "#0B6E4F", label: "Submitted" },
  confirmed: { bg: "#F5F7FA", fg: "#175CD3", label: "Confirmed" },
  invoiced: { bg: "#F5F6FA", fg: "#3538CD", label: "Invoiced" },
  out_for_delivery: { bg: "#FAF8F4", fg: "#B54708", label: "Out for delivery" },
  delivered: { bg: "#F3F7F5", fg: "#067647", label: "Delivered" },
  settled: { bg: "#F3F7F5", fg: "#067647", label: "Settled" },
  cancelled: { bg: "#F7F5F5", fg: "#B42318", label: "Cancelled" },
  return_logged: { bg: "#F7F5F3", fg: "#C45C26", label: "Return logged" },
  unpaid: { bg: "#F5F5F5", fg: "#737373", label: "Unpaid" },
  partial: { bg: "#FAF8F4", fg: "#B54708", label: "Partial" },
  paid: { bg: "#F3F7F5", fg: "#067647", label: "Paid" },
};

export function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const s = STYLES[status] ?? {
    bg: "#F5F5F5",
    fg: "#737373",
    label: status,
  };
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.fg }}
        aria-hidden
      />
      {label ?? s.label}
    </span>
  );
}

export const PayBadge = StatusPill;
export const StatusBadge = StatusPill;
