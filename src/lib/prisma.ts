import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { Config } from "@libsql/client";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function libsqlConfig(): Config {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (raw.startsWith("file:") || (!raw.includes("://") && !raw.startsWith("libsql:"))) {
    const file = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
    const abs = path.isAbsolute(file)
      ? file
      : path.join(process.cwd(), file.replace(/^\.\//, ""));
    return { url: `file:${abs}` };
  }
  const authToken =
    process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;
  return authToken ? { url: raw, authToken } : { url: raw };
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaLibSql(libsqlConfig()),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
