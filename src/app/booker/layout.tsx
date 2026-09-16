import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { BookerNav } from "@/components/BookerNav";
import { BrandMark } from "@/components/BrandMark";
import { PwaShell } from "@/components/PwaShell";
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
  viewportFit: "cover",
};

export default async function BookerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "booker") redirect("/office");

  return (
    <PwaShell>
      <div className="pwa">
        <div className="pstatus">
          <span className="row" style={{ gap: 6 }}>
            <BrandMark compact className="rmark rmark-sm" />
            Raseed
          </span>
          <span>Booker</span>
        </div>
        {children}
        <BookerNav />
      </div>
      <ServiceWorkerRegister />
    </PwaShell>
  );
}
