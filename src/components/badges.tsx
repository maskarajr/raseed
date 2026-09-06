export function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    draft: "bg-slate-200 text-slate-600",
    submitted: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    invoiced: "bg-indigo-100 text-indigo-700",
    out_for_delivery: "bg-purple-100 text-purple-700",
    delivered: "bg-teal-100 text-teal-700",
    settled: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${color[status] ?? "bg-slate-100"}`}
    >
      {status}
    </span>
  );
}

export function PayBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${color[status] ?? ""}`}>
      {status}
    </span>
  );
}
