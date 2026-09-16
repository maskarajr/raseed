import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Raseed Booker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Raseed",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B6E4F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function BookerLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pwa-root">
      {children}
      <ServiceWorkerRegister />
    </div>
  );
}
