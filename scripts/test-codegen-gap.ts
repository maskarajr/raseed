/**
 * Code-generator gap test (the demo 500-on-submit regression).
 *
 * nextOrderCode/nextInvoiceCode must sequence from MAX(parsed suffix)+1, never
 * row count: after deletes, count+1 re-mints a retired code and every create
 * 500s on the unique constraint. Reproduces the exact demo shape (27 orders,
 * max ORD-00029, gaps at 25/27) on a throwaway file: SQLite DB — never touches
 * Turso. The full e2e suite seeds QA rows, so it must not run against demo;
 * this script is safe to run anywhere.
 *
 * Usage:  npx tsx scripts/test-codegen-gap.ts
 */
import { spawnSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const tmp = path.resolve(process.cwd(), "tmp-codegen-gap.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const p = tmp + suffix;
  if (existsSync(p)) rmSync(p);
}

let pass = 0;
let fail = 0;
function check(ok: boolean, name: string) {
  if (ok) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}`);
  }
}

async function main() {
  // 1) Schema onto the throwaway DB (absolute file: URL, same normalization as src/lib/prisma).
  const env = { ...process.env, DATABASE_URL: `file:${tmp}` };
  const push = spawnSync("npx", ["prisma", "db", "push"], {
    env,
    stdio: "pipe",
    shell: true,
    encoding: "utf8",
  });
  if (push.status !== 0) {
    console.error(push.stdout, push.stderr);
    throw new Error("prisma db push failed on temp DB");
  }

  // 2) Client bound to the temp DB (fresh instance; do NOT import @/lib/prisma).
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  const { PrismaClient } = await import("@/generated/prisma/client");
  const prisma = new PrismaClient({
    adapter: new PrismaLibSql({ url: `file:${tmp}` }),
  });
  const { nextOrderCode, nextInvoiceCode } = await import(
    "@/server/services/codes"
  );

  const seedOrder = async (code: string) => {
    const cid = `cust-${code}`;
    await prisma.customer.create({
      data: { id: cid, name: `C ${code}`, phone: "0", createdBy: "user-test" },
    });
    await prisma.order.create({
      data: {
        code,
        bookerId: "user-test",
        customerId: cid,
        status: "settled",
        subtotal: 100,
      },
    });
  };

  // 3) Fixture: user + the demo's gapped shape.
  await prisma.user.create({
    data: {
      id: "user-test",
      name: "Gap Tester",
      email: "gap@test.local",
      passwordHash: "x",
      role: "booker",
    },
  });
  const demoCodes = [
    ...Array.from({ length: 24 }, (_, i) => `ORD-${String(i + 1).padStart(5, "0")}`),
    "ORD-00026",
    "ORD-00028",
    "ORD-00029",
  ]; // 27 rows, max 29 — count+1 would emit the EXISTING ORD-00028.
  for (const code of demoCodes) await seedOrder(code);

  console.log("empty DB:");
  const invFirst = await nextInvoiceCode(prisma);
  check(invFirst === "INV-00001", `empty invoice table -> INV-00001 (got ${invFirst})`);

  console.log("gapped demo shape (27 orders, max ORD-00029):");
  const nxt = await nextOrderCode(prisma);
  check(nxt === "ORD-00030", `nextOrderCode -> ORD-00030, resuming past the max (got ${nxt})`);
  // Old count-based generator: 27+1 = ORD-00028 -> collides with a live row.
  const countBased = `ORD-${String((await prisma.order.count()) + 1).padStart(5, "0")}`;
  check(countBased === "ORD-00028", `count-based would re-mint ORD-00028 (got ${countBased})`);
  await assert.rejects(
    (async () => {
      await prisma.customer.create({
        data: { id: "cust-dup-probe", name: "Dup Probe", phone: "0", createdBy: "user-test" },
      });
      return prisma.order.create({
        data: { code: "ORD-00028", bookerId: "user-test", customerId: "cust-dup-probe", status: "settled", subtotal: 1 },
      });
    })(),
    (e) => (e as Error).message.toLowerCase().includes("unique"),
    "re-minting ORD-00028 hits the unique constraint (the 500)",
  );
  check(true, "duplicate code rejected by unique constraint");

  console.log("after landing ORD-00030:");
  await seedOrder("ORD-00030");
  const nxt2 = await nextOrderCode(prisma);
  check(nxt2 === "ORD-00031", `monotonic: next -> ORD-00031 (got ${nxt2})`);

  console.log("non-sequence codes ignored:");
  await seedOrder("ORD-VIXEN");
  const nxt3 = await nextOrderCode(prisma);
  check(nxt3 === "ORD-00031", `junk code skipped, next stays ORD-00031 (got ${nxt3})`);

  console.log("invoice gaps (INV-00001..16 + INV-00020 over orders):");
  const invDemo = [
    ...Array.from({ length: 16 }, (_, i) => `INV-${String(i + 1).padStart(5, "0")}`),
    "INV-00020",
  ];
  for (let i = 0; i < invDemo.length; i++) {
    const code = demoCodes[i] ?? "ORD-00030";
    const oid = (await prisma.order.findFirst({ where: { code } }))!.id;
    await prisma.invoice.create({
      data: {
        code: invDemo[i],
        orderId: oid,
        customerId: `cust-${code}`,
        total: 100,
        balance: 100,
      },
    });
  }
  const invNxt = await nextInvoiceCode(prisma);
  check(invNxt === "INV-00021", `nextInvoiceCode -> INV-00021, past max not count (got ${invNxt})`);
  const invCount = `INV-${String((await prisma.invoice.count()) + 1).padStart(5, "0")}`;
  check(invCount === "INV-00018", `count-based would mint the retired INV-00018 (got ${invCount})`);

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log(`\ncodegen gap test: ${pass} passed, ${fail} failed`);
    if (fail > 0) process.exitCode = 1;
  })
  .catch((e) => {
    console.error("TEST CRASHED:", e);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        rmSync(tmp + suffix, { force: true });
      } catch {
        /* windows lock */
      }
    }
  });
