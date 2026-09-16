import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sqliteUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const file = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  const abs = path.isAbsolute(file)
    ? file
    : path.join(process.cwd(), file.replace(/^\.\//, ""));
  return `file:${abs}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: sqliteUrl() }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
