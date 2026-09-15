export type PillTone = "ok" | "info" | "warn" | "bad" | "neu";

type StatusUi = { label: string; tone: PillTone };

/** DB / domain status → locked StatusPill copy + tone. */
const BY_KEY: Record<string, StatusUi> = {
  draft: { label: "Draft", tone: "neu" },
  submitted: { label: "Awaiting confirm", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "ok" },
  invoiced: { label: "Invoiced", tone: "info" },
  scheduled: { label: "Scheduled", tone: "info" },
  out_for_delivery: { label: "Not shipped", tone: "neu" },
  delivered: { label: "Delivered", tone: "ok" },
  settled: { label: "Collected", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "bad" },
  unpaid: { label: "To collect", tone: "warn" },
  partial: { label: "To collect", tone: "warn" },
  paid: { label: "Paid", tone: "ok" },
  active: { label: "Active", tone: "ok" },
  inactive: { label: "Inactive", tone: "neu" },
  low: { label: "Low", tone: "warn" },
  out: { label: "Out", tone: "bad" },
  "in stock": { label: "In stock", tone: "ok" },
};

export function statusUi(status: string): StatusUi {
  const key = status.trim().toLowerCase().replace(/_/g, " ");
  return (
    BY_KEY[status] ??
    BY_KEY[key] ??
    BY_KEY[status.toLowerCase()] ?? {
      label: status.replace(/_/g, " "),
      tone: "neu",
    }
  );
}

export function stockTone(qty: number, reorder: number | null): StatusUi {
  if (qty <= 0) return { label: "Out", tone: "bad" };
  if (reorder != null && qty <= reorder) return { label: "Low", tone: "warn" };
  return { label: "In stock", tone: "ok" };
}
