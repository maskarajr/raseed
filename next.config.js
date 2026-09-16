/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@libsql/client",
      "@libsql/win32-x64-msvc",
      "@prisma/adapter-libsql",
    ],
  },
};

module.exports = nextConfig;
