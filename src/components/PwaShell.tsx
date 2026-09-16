"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Pin the Booker shell to the visual viewport so Android system nav doesn't hide tabs. */
export function PwaShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const vv = window.visualViewport;
      const h = Math.round(vv?.height ?? window.innerHeight);
      el.style.height = `${h}px`;
      el.style.maxHeight = `${h}px`;
    };

    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div className="pwa-root" ref={ref}>
      {children}
    </div>
  );
}
