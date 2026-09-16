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
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
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
