import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      walkTsx(p, acc);
    } else if (/\.(tsx|ts|css)$/.test(name.name)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("VISUAL-v3 office chrome", () => {
  it("uses a ~56px icon rail that expands to at least 180px on hover/focus", () => {
    const shell = read("src/components/OfficeShell.tsx");
    assert.match(shell, /w-14|w-\[56px\]/);
    assert.match(shell, /min-w-\[180px\]|w-\[1[89]\dpx\]/);
    assert.match(shell, /group-hover|focus-within|hover:/);
    assert.doesNotMatch(shell, /w-\[220px\]/);
    assert.match(shell, /Find/i);
    assert.doesNotMatch(shell, /max-w-6xl/);
  });

  it("office layout mounts the icon-rail shell, not a labeled 200px aside", () => {
    const layout = read("src/app/office/layout.tsx");
    assert.match(layout, /OfficeShell/);
    assert.doesNotMatch(layout, /w-\[220px\]/);
  });

  it("office home KPI cards use serif money heroes and 1px unshadowed borders", () => {
    const home = read("src/app/office/page.tsx");
    const kpi = read("src/components/KpiCard.tsx");
    assert.match(home, /Booked today/);
    assert.match(home, /Outstanding/);
    assert.match(home, /Awaiting confirm/);
    assert.match(home, /Low stock/);
    assert.match(kpi, /font-serif/);
    assert.match(kpi, /border/);
    assert.doesNotMatch(kpi, /shadow-(sm|md|lg|xl)/);
  });

  it("office invoices uses KPI strip, search, full-width table, document slide-over", () => {
    const invoices = read("src/app/office/invoices/page.tsx");
    assert.match(invoices, /Search invoices/);
    assert.match(invoices, /KpiCard/);
    assert.match(invoices, /label="Open"/);
    assert.match(invoices, /Outstanding/);
    assert.match(invoices, /InvoiceDocument/);
    assert.match(invoices, /StatusPill/);
    assert.doesNotMatch(invoices, /create.?invoice/i);
    assert.doesNotMatch(invoices, /New invoice/);
  });

  it("office orders search like invoices and open a document slide-over", () => {
    const orders = read("src/app/office/orders/page.tsx");
    assert.match(orders, /Search Orders/);
    assert.match(orders, /Today/);
    assert.match(orders, /DocumentSheet|OrderDocument/);
    assert.match(orders, /KpiCard/);
  });

  it("invoice document chrome uses paper slide-over with SKU line headers", () => {
    const doc = read("src/components/InvoiceDocument.tsx");
    const actions = read("src/components/InvoiceActions.tsx");
    assert.match(doc, /Balance due/);
    assert.match(doc, /SKU/);
    assert.match(doc, /Desc/);
    assert.match(doc, /Unit Rs/);
    assert.match(doc, /Line Rs/);
    assert.match(doc, /Record payment/);
    assert.match(doc, /Log return/);
    assert.match(doc, /Print/);
    assert.match(actions, /\/api\/payments/);
    assert.match(actions, /\/api\/returns/);
  });

  it("nests PaymentSheet inside DocumentSheet so Radix modal pointer-events reach the cash form", () => {
    const doc = read("src/components/InvoiceDocument.tsx");
    const pay = doc.indexOf("<PaymentSheet");
    const ret = doc.indexOf("<ReturnSheet");
    const lastSheetClose = doc.lastIndexOf("</DocumentSheet>");
    assert.ok(pay > -1, "InvoiceDocument mounts PaymentSheet");
    assert.ok(ret > -1, "InvoiceDocument mounts ReturnSheet");
    assert.match(doc, /overlay=\{action\}/);
    assert.ok(
      pay < lastSheetClose && ret < lastSheetClose,
      "Payment/Return sheets must be inside DocumentSheet, not siblings outside the Radix dialog",
    );
    assert.match(
      doc,
      /<button\s+type="button"\s+className="btn-primary"[\s\S]*Record payment/,
    );
  });
});

describe("VISUAL-v3 booker chrome", () => {
  it("keeps thumb-first bottom nav Home · Orders · Account", () => {
    const nav = read("src/components/BookerNav.tsx");
    assert.match(nav, /Home/);
    assert.match(nav, /Orders/);
    assert.match(nav, /Account/);
    assert.match(nav, /fixed/);
    assert.match(nav, /bottom-0/);
    assert.doesNotMatch(nav, /\/office/);
  });

  it("booker layout does not mount the office icon rail", () => {
    const layout = read("src/app/booker/layout.tsx");
    assert.doesNotMatch(layout, /OfficeShell|OfficeNav/);
    assert.match(layout, /BookerNav/);
  });

  it("booker home KPI cells and review total use serif heroes", () => {
    const home = read("src/app/booker/page.tsx");
    const review = read("src/app/booker/orders/new/page.tsx");
    assert.match(home, /font-serif/);
    assert.match(review, /font-serif/);
    assert.match(review, /Total/);
  });
});

describe("VISUAL-v3 locks", () => {
  it("keeps English PKR Rs and deep green accent", () => {
    const css = read("src/app/globals.css");
    const money = read("src/lib/money.ts");
    assert.match(css, /#0[Bb]6[Ee]4[Ff]/);
    assert.match(money, /Rs /);
    assert.doesNotMatch(css, /gradient/i);
  });

  it("does not ship dashboard-4 chart or pie files", () => {
    const src = join(root, "src");
    const files = walkTsx(src).map((p) => p.replace(root + "/", ""));
    const banned = files.filter((f) =>
      /chart|pie|revenue-chart|category-rank|refund-return/i.test(f),
    );
    assert.deepEqual(banned, []);
  });

  it("does not change prisma schema", () => {
    assert.ok(existsSync(join(root, "prisma/schema.prisma")));
  });
});
