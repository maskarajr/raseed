"use client";

import { useEffect, useRef, useState } from "react";
import { Money } from "@/components/Money";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * v3 · ALIVE count-up. Animates a number 0 → value on mount and
 * old → new when the value changes, matching the board's 850 ms
 * cubic ease-out. Renders through Money for currency values so the
 * "Money component everywhere" rule holds. Reduced motion: no animation.
 */
export function CountUp({
  value,
  money = false,
  prefix = "",
  duration = 850,
}: {
  value: number;
  money?: boolean;
  prefix?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (reduce) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = mountedRef.current ? fromRef.current : 0;
    mountedRef.current = true;
    if (from === value) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (value - from) * e);
      setDisplay(cur);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);

  if (money) return <Money value={display} />;
  return (
    <span className="num">
      {prefix}
      {display.toLocaleString("en-PK")}
    </span>
  );
}
