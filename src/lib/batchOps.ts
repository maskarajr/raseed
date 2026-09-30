"use client";

import { api } from "@/lib/client";

// Batch lifecycle actions for the office queue. Reuses the single-order
// services behind POST /api/orders/batch (confirm -> transitionOrder,
// invoice -> generateInvoice); the UI adds no money logic and never bypasses
// per-order transactions. See Breevie's route for the server contract.
export type BatchAction = "confirm" | "invoice";

export type BatchResult = {
  ok: { id: string }[];
  failed: { id: string; code: string; reason: string }[];
};

// The list endpoint caps at 200 rows across ALL statuses. To act on the full
// population of a single status band (owner seq18: "all rows, not just the
// visible page"), fetch that status explicitly so Confirm/Invoice All never
// misses rows dropped by the mixed-list cap.
export async function fetchIdsByStatus(
  status: "submitted" | "confirmed",
): Promise<string[]> {
  const { orders } = await api<{ orders: { id: string }[] }>(
    `/api/orders?status=${status}`,
  );
  return orders.map((o) => o.id);
}

export async function runBatch(
  action: BatchAction,
  ids: string[],
): Promise<BatchResult> {
  return api<BatchResult>("/api/orders/batch", {
    method: "POST",
    body: JSON.stringify({ action, ids }),
  });
}

// Shared summary line so both surfaces phrase the ok/failed split identically.
export function batchSummary(
  action: BatchAction,
  ok: number,
  failed: number,
): string {
  const verb = action === "confirm" ? "Confirmed" : "Invoiced";
  if (ok === 0)
    return failed > 0
      ? `Nothing processed · ${failed} ${failed === 1 ? "order" : "orders"} skipped`
      : "Nothing to process";
  return failed > 0
    ? `${verb} ${ok} · ${failed} skipped`
    : `${verb} ${ok} ${ok === 1 ? "order" : "orders"}`;
}
