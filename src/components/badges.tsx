// Single reusable status pill: colored chip + text label (never color-only).
// Handles order-lifecycle statuses, invoice payment statuses, and the
// "Return logged" state.

type PillStyle = { bg: string; fg: string; label: string };

const STYLES: Record<string, PillStyle> = {
  // Order lifecycle
  draft: { bg: "#EEF0F3", fg: "#5C6570", label: "Draft" },
  submitted: { bg: "#E6F4EF", fg: "#0B6E4F", label: "Submitted" },
  confirmed: { bg: "#E8F1FB", fg: "#175CD3", label: "Confirmed" },
  invoiced: { bg: "#EEF4FF", fg: "#3538CD", label: "Invoiced" },
  out_for_delivery: { bg: "#FFFAEB", fg: "#B54708", label: "Out for delivery" },
  delivered: { bg: "#E6F4EF", fg: "#067647", label: "Delivered" },
  settled: { bg: "#E6F4EF", fg: "#067647", label: "Settled" },
  cancelled: { bg: "#FEE4E2", fg: "#B42318", label: "Cancelled" },
  return_logged: { bg: "#FEF6EE", fg: "#C45C26", label: "Return logged" },
  // Invoice payment status
  unpaid: { bg: "#EEF0F3", fg: "#5C6570", label: "Unpaid" },
  partial: { bg: "#FDF0E6", fg: "#B54708", label: "Partial" },
  paid: { bg: "#E6F4EF", fg: "#067647", label: "Paid" },
};

export function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const s = STYLES[status] ?? {
    bg: "#EEF0F3",
    fg: "#5C6570",
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

// Backwards-compatible aliases (all render the same pill).
export const PayBadge = StatusPill;
export const StatusBadge = StatusPill;
