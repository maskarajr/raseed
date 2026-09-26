"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * v3 · ALIVE entrance choreography.
 *
 * Adds `.is-live` to each app scroll container (.content / .pbody) when it
 * enters the viewport, and stamps the board's `--i` stagger index on its
 * children. All entrance CSS is gated behind `.is-live`, so if this component
 * never runs (JS failure) content stays fully visible — it just doesn't animate.
 * A MutationObserver re-sweeps indices while pages load data asynchronously.
 */
const CONTAINERS = ".content,.pbody";
const NESTED = ".kpis > *,.pstats > *";
const MARKS = ".tl-dot";

function setIndex(el: Element, i: number, max: number) {
  (el as HTMLElement).style.setProperty("--i", String(Math.min(i, max)));
}

function indexSweep(root: Element) {
  Array.from(root.children).forEach((el, i) => setIndex(el, i, 9));
  root.querySelectorAll(NESTED).forEach((el, i) => setIndex(el, i, 9));
  root.querySelectorAll(MARKS).forEach((el, i) => setIndex(el, i, 11));
}

export function AliveMotion() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    const containers = Array.from(document.querySelectorAll(CONTAINERS));
    if (containers.length === 0) return;

    const observers: MutationObserver[] = [];
    let sweepTimer: ReturnType<typeof setTimeout> | null = null;

    const goLive = (el: Element) => {
      el.classList.add("is-live");
      indexSweep(el);
      // Data arrives after first paint on most routes; re-index (debounced)
      // so late-rendered children still stagger instead of piling at --i:0.
      // Also covers client navigations that reuse the same container node.
      const mo = new MutationObserver(() => {
        if (sweepTimer) clearTimeout(sweepTimer);
        sweepTimer = setTimeout(() => indexSweep(el), 120);
      });
      mo.observe(el, { childList: true, subtree: true });
      observers.push(mo);
    };

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && !reduce) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              goLive(en.target);
              io?.unobserve(en.target);
            }
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -6% 0px" },
      );
      containers.forEach((c) =>
        c.classList.contains("is-live") ? goLive(c) : io?.observe(c),
      );
    } else {
      containers.forEach(goLive);
    }

    return () => {
      io?.disconnect();
      observers.forEach((o) => o.disconnect());
      if (sweepTimer) clearTimeout(sweepTimer);
    };
  }, [pathname, reduce]);

  return null;
}
