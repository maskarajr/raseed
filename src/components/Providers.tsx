"use client";

import type { ReactNode } from "react";
import { AliveMotion } from "@/components/AliveMotion";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ServiceWorkerRegister />
      <AliveMotion />
      {children}
    </ToastProvider>
  );
}
