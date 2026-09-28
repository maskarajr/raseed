"use client";

import { useEffect, useState } from "react";

/**
 * Spec D rev 2 §5 — in-flight button rules:
 * - BUSY_MIN_MS: a 300ms response still shows >=450ms of ring+rail+label,
 *   so the state never renders for 2 frames and reads as a glitch. It is a
 *   display floor, never fake latency past the real response.
 * - BUSY_LONG_MS: past 4s the label switches to "Still working…" — no fake
 *   percentages; ring + rail keep running.
 * - Width lock: min-width is pinned to the pre-press button width so the
 *   label swap can never change the box.
 */
export const BUSY_MIN_MS = 450;
export const BUSY_LONG_MS = 4000;

export function busyStart(): number {
  const t0 = performance.now();
  return t0;
}

export async function busyEnd(t0: number): Promise<void> {
  const left = Math.max(0, BUSY_MIN_MS - (performance.now() - t0));
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}

export function lockButtonWidth(el: HTMLElement | null): void {
  if (!el) return;
  const b = el as HTMLElement;
  if (!b.style.minWidth) b.style.minWidth = `${b.offsetWidth}px`;
}

/** true once the current busy stretch has passed BUSY_LONG_MS */
export function useBusyLong(busy: boolean): boolean {
  const [long, setLong] = useState(false);
  useEffect(() => {
    if (!busy) {
      setLong(false);
      return;
    }
    const t = setTimeout(() => setLong(true), BUSY_LONG_MS);
    return () => clearTimeout(t);
  }, [busy]);
  return long;
}
