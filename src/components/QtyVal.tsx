"use client";

import { useEffect, useRef } from "react";

/** v3 · ALIVE: the qty value pops when the count changes. */
export function QtyVal({ n }: { n: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(n);

  useEffect(() => {
    if (prev.current === n) return;
    prev.current = n;
    const el = ref.current;
    if (!el) return;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
    const t = setTimeout(() => el.classList.remove("pop"), 320);
    return () => clearTimeout(t);
  }, [n]);

  return (
    <span ref={ref} className="qty-val">
      {n}
    </span>
  );
}
