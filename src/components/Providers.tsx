"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ServiceWorkerRegister />
      {children}
    </ToastProvider>
  );
}
