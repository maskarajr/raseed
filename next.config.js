/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Isolate the durable preview build from the dev server so `npm run dev`
  // (which rewrites .next) can never clobber the files a running
  // `npm run preview` (next start) is serving. The preview script sets
  // RASEED_DIST_DIR=.next-preview for both its build and its start.
  distDir: process.env.RASEED_DIST_DIR || ".next",
  experimental: {
    serverComponentsExternalPackages: [
      "@libsql/client",
      "@libsql/win32-x64-msvc",
      "@prisma/adapter-libsql",
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
