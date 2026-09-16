import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { BookerNav } from "@/components/BookerNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import type { Metadata, Viewport } from "next";

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

export default async function BookerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) return children;
  if (session.role !== "booker") redirect("/office");

  return (
    <div className="pwa-root">
      <div className="pwa">
        <div className="pstatus">
          <span>Raseed</span>
          <span>Booker</span>
        </div>
        {children}
        <BookerNav />
      </div>
      <ServiceWorkerRegister />
    </div>
  );
}
