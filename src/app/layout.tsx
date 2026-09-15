import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/styles/raseed.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Raseed",
  description: "Wholesale distribution ops — Raseed",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-PK">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
