"use client";

import { useEffect } from "react";
import {
  captureInstallPrompt,
  registerBookerServiceWorker,
} from "@/lib/pwaInstall";

export function ServiceWorkerRegister() {
  useEffect(() => {
    const stop = captureInstallPrompt();
    void registerBookerServiceWorker();
    return stop;
  }, []);
  return null;
}
