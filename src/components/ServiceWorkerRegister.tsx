"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/pwaInstall";

export function ServiceWorkerRegister() {
  useEffect(() => {
    const stop = captureInstallPrompt();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal for this online-only app.
      });
    }
    return stop;
  }, []);
  return null;
}
