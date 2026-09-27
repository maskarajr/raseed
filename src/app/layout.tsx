import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "@/styles/raseed.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Raseed",
  description: "Wholesale distribution ops — Raseed",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Raseed",
  },
  other: {
    "interactive-widget": "resizes-content",
  },
};

export const viewport: Viewport = {
  // Single source of truth with manifest.webmanifest theme_color (#F4F5F7 =
  // --bg, the first painted screen). viewport-fit=cover makes the existing
  // env(safe-area-inset-*) padding in raseed.css take effect.
  themeColor: "#F4F5F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-PK">
      <body>
        <Script
          id="raseed-pwa-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__raseedInstall=e;});if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js");}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
