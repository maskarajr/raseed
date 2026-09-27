/**
 * Raseed seed.
 *
 * Two layers:
 *  1. Identity + catalogue (users, products, shops) — upserted, safe to re-run.
 *  2. A rolling 7-day demo scenario (orders, invoices, payments, returns and a
 *     stock ledger) tagged with DEMO_TAG, so every v3 board frame renders real
 *     shapes: pipeline stages, 7-day booked/collected series, shop-owes,
 *     low/out-of-stock attention rows, and a booker-scoped shop list.
 *
 * Data integrity rules this file upholds (the app's invariants, mirrored — it
 * writes rows directly because it must backdate them):
 *   - order.subtotal === sum(items qty * unitPrice)
 *   - invoice.total/amountPaid/balance/paymentStatus via deriveInvoiceState
 *   - one Return reduces invoice.total and re-derives balance, like the service
 *   - a zero-balance invoice settles its order (mirrors settleOrderIfPaid)
 *   - every StockLedger row chains balanceAfter from the product's live qty, so
 *     no seeded row goes negative unless a real sale already drove it there
 *
 * Commands:
 *   npm run seed                     idempotent; skips the demo block if present
 *   SEED_DEMO_RESET=1 npm run seed   deletes only DEMO_TAG rows, then re-seeds
 *
 * Money is whole PKR everywhere, per the schema note.
 */
import { prisma } from "../src/lib/prisma";
import { deriveInvoiceState } from "../src/server/services/invoiceMath";
import { startOfTodayKarachi } from "../src/lib/day";
import type { OrderStatus, PaymentMode, StockReason } from "../src/lib/enums";
import bcrypt from "bcryptjs";

const DEMO_TAG = "seed:v32";
// Where the pre-demo stock snapshot lives, so a reset can restore product
// quantities before replaying the scenario. Without it, re-seeding compounds the
// previous run's sales and the ledger chain dips below zero.
const STOCK_BASELINE_KEY = "seed:v32:stock-baseline";

const OWNER = {
  name: "Agency Owner",
  email: "owner@raseed.local",
  password: "owner123",
};

const BOOKERS = [
  {
    name: "Bilal Booker",
    email: "bilal@raseed.local",
    password: "booker123",
    phone: "0301 7654321",
    route: "1",
  },
  {
    name: "Sana Salesman",
    email: "sana@raseed.local",
    password: "booker123",
    phone: "0301 9988776",
    route: "5",
  },
];

// Realistic Pakistani FMCG / grocery wholesale items. Prices in whole PKR.
const PRODUCTS = [
  { sku: "SKU-SUGAR-1", name: "Sugar 1kg", category: "Grocery", unit: "pcs", price: 150, stockQty: 500, reorderLevel: 50 },
  { sku: "SKU-FLOUR-10", name: "Wheat Flour (Atta) 10kg", category: "Grocery", unit: "bag", price: 1250, stockQty: 200, reorderLevel: 20 },
  { sku: "SKU-OIL-5", name: "Cooking Oil 5L", category: "Grocery", unit: "tin", price: 2800, stockQty: 120, reorderLevel: 15 },
  { sku: "SKU-TEA-950", name: "Tapal Danedar Tea 950g", category: "Beverages", unit: "pack", price: 1450, stockQty: 90, reorderLevel: 10 },
  { sku: "SKU-RICE-5", name: "Basmati Rice 5kg", category: "Grocery", unit: "bag", price: 2100, stockQty: 80, reorderLevel: 10 },
  { sku: "SKU-SOAP-6", name: "Lifebuoy Soap (6-pack)", category: "Personal Care", unit: "pack", price: 540, stockQty: 300, reorderLevel: 30 },
  { sku: "SKU-BISC-24", name: "Sooper Biscuits (24 ticky)", category: "Snacks", unit: "carton", price: 720, stockQty: 60, reorderLevel: 8 },
  { sku: "SKU-MILK-12", name: "Olpers Milk 1L (12-pack)", category: "Dairy", unit: "carton", price: 2640, stockQty: 40, reorderLevel: 6 },
];

// `booker` is the owning salesman for the shop. One shop is deliberately left
// unassigned so the office list still has an "unassigned" case to render.
const CUSTOMERS = [
  { name: "Al-Madina Kiryana Store", phone: "0300-1234567", address: "Shop 4, Main Bazaar", area: "Gulberg", route: "1", booker: "bilal@raseed.local" },
  { name: "New Sabzi Mandi Store", phone: "0321-2223344", address: "Stall 12, Vegetable Market", area: "Johar Town", route: "1", booker: "bilal@raseed.local" },
  { name: "Bismillah General Store", phone: "0333-9988776", address: "Block C, Model Town", area: "Model Town", route: "3", booker: "sana@raseed.local" },
  { name: "Rehman Karyana", phone: "0345-5566778", address: "Street 8, Township", area: "Township", route: "3", booker: "sana@raseed.local" },
  { name: "City Mart", phone: "0301-4455667", address: "Plaza 2, Main Boulevard", area: "DHA", route: "5", booker: "sana@raseed.local" },
  // Shops created through the app during design QA; adopted into the scenario.
  { name: "Raza mart", phone: "0300-7011223", address: "Shop 9, Gulshan Anwar", area: "Gulshan Anwar", route: "5", booker: "bilal@raseed.local" },
  { name: "B. M k store", phone: "0300-4455123", address: "Darbar Plaza", area: "Darbar e Kareemi", route: null, booker: null },
];

type Stage =
  | "draft"
  | "submitted"
  | "confirmed"
  | "invoiced"
  | "out_for_delivery"
  | "delivered"
  | "settled"
  | "cancelled";

type PaySpec = { amount?: number; full?: boolean; mode: PaymentMode; day: number };

type OrderSpec = {
  /** 0 = today, 6 = six Karachi days ago. */
  day: number;
  hour: number;
  booker: string;
  shop: string;
  items: { sku: string; qty: number }[];
  stage: Stage;
  pays?: PaySpec[];
  /** Invoice is dated this many days after the order (0 = same day). */
  invoiceDay?: number;
  notes?: string;
};

// The scenario: enough volume in every stage that the board's composition
// (hero number, 7-day series, pipeline, needs-attention, stops, shop-owes)
// shows real, non-empty shapes for both bookers.
const ORDER_SPECS: OrderSpec[] = [
  // ── 6 days ago
  { day: 6, hour: 10, booker: "bilal@raseed.local", shop: "Al-Madina Kiryana Store", items: [{ sku: "SKU-SUGAR-1", qty: 6 }, { sku: "SKU-RICE-5", qty: 2 }], stage: "settled", pays: [{ full: true, mode: "cash", day: 6 }] },
  { day: 6, hour: 13, booker: "sana@raseed.local", shop: "Rehman Karyana", items: [{ sku: "SKU-BISC-24", qty: 4 }], stage: "cancelled", notes: "Shop closed for the day, order cancelled" },
  // ── 5 days ago
  { day: 5, hour: 11, booker: "bilal@raseed.local", shop: "New Sabzi Mandi Store", items: [{ sku: "SKU-FLOUR-10", qty: 5 }, { sku: "SKU-OIL-5", qty: 3 }], stage: "settled", pays: [{ full: true, mode: "bank", day: 5 }] },
  { day: 5, hour: 16, booker: "sana@raseed.local", shop: "City Mart", items: [{ sku: "SKU-TEA-950", qty: 4 }, { sku: "SKU-SOAP-6", qty: 6 }], stage: "delivered", pays: [{ amount: 3000, mode: "cash", day: 4 }] },
  // ── 4 days ago
  { day: 4, hour: 9, booker: "bilal@raseed.local", shop: "Raza mart", items: [{ sku: "SKU-MILK-12", qty: 3 }], stage: "out_for_delivery", pays: [] },
  { day: 4, hour: 15, booker: "sana@raseed.local", shop: "Bismillah General Store", items: [{ sku: "SKU-RICE-5", qty: 3 }, { sku: "SKU-SUGAR-1", qty: 8 }], stage: "confirmed" },
  // ── 3 days ago
  { day: 3, hour: 10, booker: "sana@raseed.local", shop: "Rehman Karyana", items: [{ sku: "SKU-OIL-5", qty: 4 }], stage: "invoiced", pays: [] },
  { day: 3, hour: 12, booker: "bilal@raseed.local", shop: "Al-Madina Kiryana Store", items: [{ sku: "SKU-BISC-24", qty: 6 }, { sku: "SKU-TEA-950", qty: 2 }], stage: "settled", pays: [{ full: true, mode: "cash", day: 3 }] },
  // ── 2 days ago
  { day: 2, hour: 9, booker: "bilal@raseed.local", shop: "New Sabzi Mandi Store", items: [{ sku: "SKU-FLOUR-10", qty: 4 }], stage: "submitted", notes: "Oldest order awaiting confirmation" },
  { day: 2, hour: 14, booker: "sana@raseed.local", shop: "City Mart", items: [{ sku: "SKU-SOAP-6", qty: 10 }, { sku: "SKU-MILK-12", qty: 2 }], stage: "settled", pays: [{ full: true, mode: "bank", day: 2 }] },
  // ── yesterday
  { day: 1, hour: 11, booker: "bilal@raseed.local", shop: "Raza mart", items: [{ sku: "SKU-RICE-5", qty: 4 }, { sku: "SKU-SUGAR-1", qty: 10 }], stage: "delivered", pays: [{ amount: 5000, mode: "cash", day: 1 }] },
  { day: 1, hour: 17, booker: "sana@raseed.local", shop: "Bismillah General Store", items: [{ sku: "SKU-TEA-950", qty: 3 }], stage: "settled", pays: [{ full: true, mode: "cash", day: 1 }] },
  // ── today
  { day: 0, hour: 9, booker: "bilal@raseed.local", shop: "Al-Madina Kiryana Store", items: [{ sku: "SKU-OIL-5", qty: 2 }, { sku: "SKU-BISC-24", qty: 3 }], stage: "settled", pays: [{ full: true, mode: "cash", day: 0 }] },
  { day: 0, hour: 10, booker: "bilal@raseed.local", shop: "Raza mart", items: [{ sku: "SKU-FLOUR-10", qty: 3 }], stage: "submitted" },
  { day: 0, hour: 11, booker: "sana@raseed.local", shop: "Rehman Karyana", items: [{ sku: "SKU-SOAP-6", qty: 5 }, { sku: "SKU-SUGAR-1", qty: 5 }], stage: "confirmed" },
  { day: 0, hour: 12, booker: "sana@raseed.local", shop: "Bismillah General Store", items: [{ sku: "SKU-MILK-12", qty: 2 }], stage: "draft" },
];

// Non-order stock events, so the movements feed shows inward and adjustment
// traffic and not only sales. `day`/`hour` are Karachi-local.
const STOCK_EVENTS: { day: number; hour: number; sku: string; delta: number; reason: StockReason; note: string }[] = [
  { day: 6, hour: 8, sku: "SKU-SUGAR-1", delta: 100, reason: "purchase", note: "Morning inward from mill" },
  { day: 4, hour: 8, sku: "SKU-MILK-12", delta: 12, reason: "purchase", note: "Daily dairy replenishment" },
  { day: 2, hour: 8, sku: "SKU-FLOUR-10", delta: 40, reason: "purchase", note: "Weekly atta consignment" },
  { day: 1, hour: 18, sku: "SKU-BISC-24", delta: -3, reason: "adjustment", note: "Crushed cartons written off" },
];

// One product return against an already-invoiced order: restocks the item and
// reduces the invoice, exactly like the returns service does.
const RETURN_SPEC = { day: 1, hour: 16, shop: "City Mart", sku: "SKU-SOAP-6", qty: 2 };

// A stock-take correction that leaves one SKU below its reorder point and one
// at zero, so the low-stock / out-of-stock states are always demonstrable
// regardless of how much live stock the target database happens to hold.
const ATTENTION_SKUS = [
  { sku: "SKU-MILK-12", target: "below-reorder" as const },
  { sku: "SKU-TEA-950", target: "zero" as const },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_INVOICE_STAGES: Stage[] = ["invoiced", "out_for_delivery", "delivered", "settled"];

function khiDay(day: number, hour: number, minute = 0): Date {
  const base = startOfTodayKarachi().getTime() - day * DAY_MS;
  // Karachi is UTC+5 fixed, so the UTC instant of local midnight is the window
  // start; add the local wall-clock hour on top of it.
  return new Date(base + hour * 60 * 60 * 1000 + minute * 60 * 1000);
}

async function resetDemoRows(): Promise<Record<string, number>> {
  const baseline = await prisma.appSetting.findUnique({
    where: { key: STOCK_BASELINE_KEY },
  });
  if (baseline) {
    const map = JSON.parse(baseline.value) as Record<string, number>;
    for (const [productId, stockQty] of Object.entries(map)) {
      await prisma.product.update({ where: { id: productId }, data: { stockQty } });
    }
    console.log(
      `  restored ${Object.keys(map).length} product stock levels from the pre-demo snapshot`,
    );
  } else {
    console.warn(
      "  no pre-demo stock snapshot found; product quantities will carry forward",
    );
  }

  const tagged = await prisma.order.findMany({
    where: { notes: { contains: DEMO_TAG } },
    select: { id: true },
  });
  const ids = tagged.map((o) => o.id);
  if (ids.length === 0) return { orders: 0 };

  const invoices = await prisma.invoice.findMany({
    where: { orderId: { in: ids } },
    select: { id: true },
  });
  const invoiceIds = invoices.map((i) => i.id);

  const ledger = await prisma.stockLedger.findMany({
    where: { OR: [{ refId: { in: invoiceIds } }, { refType: "seed" }] },
    select: { id: true },
  });

  // Child rows first; OrderItem cascades with the order in SQLite here, but the
  // explicit delete keeps the intent readable and adapter-independent.
  await prisma.return.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await prisma.stockLedger.deleteMany({ where: { id: { in: ledger.map((l) => l.id) } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.invoice.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });

  return {
    orders: ids.length,
    invoices: invoiceIds.length,
    ledgerRows: ledger.length,
  };
}

async function nextCodes(): Promise<{ orderStart: number; invoiceStart: number }> {
  const [orderRows, invoiceRows] = await Promise.all([
    prisma.order.findMany({ select: { code: true } }),
    prisma.invoice.findMany({ select: { code: true } }),
  ]);
  const maxOf = (rows: { code: string }[], prefix: string) =>
    rows.reduce((max, r) => {
      if (!r.code.startsWith(prefix)) return max;
      const n = Number.parseInt(r.code.slice(prefix.length), 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
  return {
    orderStart: maxOf(orderRows, "ORD-") + 1,
    invoiceStart: maxOf(invoiceRows, "INV-") + 1,
  };
}

async function main() {
  // ── layer 1: identities ────────────────────────────────────────────────
  const ownerHash = await bcrypt.hash(OWNER.password, 10);
  const owner = await prisma.user.upsert({
    where: { email: OWNER.email },
    update: { name: OWNER.name, role: "owner", passwordHash: ownerHash, active: true },
    create: { name: OWNER.name, email: OWNER.email, passwordHash: ownerHash, role: "owner" },
  });

  const bookersByEmail = new Map<string, { id: string; name: string }>();
  for (const b of BOOKERS) {
    const hash = await bcrypt.hash(b.password, 10);
    const booker = await prisma.user.upsert({
      where: { email: b.email },
      update: { name: b.name, role: "booker", passwordHash: hash, active: true, phone: b.phone, route: b.route },
      create: { name: b.name, email: b.email, passwordHash: hash, role: "booker", phone: b.phone, route: b.route },
    });
    bookersByEmail.set(b.email, booker);
  }

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, category: p.category, unit: p.unit, price: p.price, reorderLevel: p.reorderLevel },
      create: p,
    });
  }

  const shopsByName = new Map<string, { id: string }>();
  for (const c of CUSTOMERS) {
    const bookerEmail = c.booker;
    const data = {
      name: c.name,
      phone: c.phone,
      address: c.address,
      area: c.area,
      route: c.route,
      bookerId: bookerEmail ? bookersByEmail.get(bookerEmail)?.id ?? null : null,
    };
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    const row = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data })
      : await prisma.customer.create({
          data: { ...data, active: true, createdBy: bookerIdOrOwner(data.bookerId, owner.id) },
        });
    shopsByName.set(c.name, row);
  }

  const productsBySku = new Map(
    (await prisma.product.findMany()).map((p) => [p.sku, p]),
  );

  // ── layer 2: demo scenario ─────────────────────────────────────────────
  const existingDemo = await prisma.order.count({ where: { notes: { contains: DEMO_TAG } } });
  if (existingDemo > 0 && process.env.SEED_DEMO_RESET !== "1") {
    console.log(
      `\nDemo scenario already present (${existingDemo} tagged orders) — skipping. ` +
        `Run SEED_DEMO_RESET=1 npm run seed to rebuild it.`,
    );
  } else {
    if (existingDemo > 0) {
      const cleared = await resetDemoRows();
      console.log(`\nReset demo scenario: ${JSON.stringify(cleared)}`);
    }
    await seedScenario({ owner, bookersByEmail, shopsByName, productsBySku });
  }

  await report();
}

function bookerIdOrOwner(bookerId: string | null | undefined, ownerId: string): string {
  return bookerId ?? ownerId;
}

// The running stock per product, so every ledger row we write chains from the
// value the product actually holds at that moment.
type StockChain = Map<string, { qty: number }>;

async function buildStockChain(): Promise<StockChain> {
  const products = await prisma.product.findMany();
  return new Map(products.map((p) => [p.id, { qty: p.stockQty }]));
}

async function appendLedger(
  chain: StockChain,
  input: {
    productId: string;
    delta: number;
    reason: StockReason;
    createdBy: string;
    at: Date;
    refType?: string;
    refId?: string;
  },
): Promise<number> {
  const state = chain.get(input.productId);
  const current = state?.qty ?? 0;
  const balanceAfter = current + input.delta;
  if (state) state.qty = balanceAfter;

  await prisma.stockLedger.create({
    data: {
      productId: input.productId,
      delta: input.delta,
      reason: input.reason,
      refType: input.refType ?? "seed",
      refId: input.refId ?? null,
      balanceAfter,
      createdBy: input.createdBy,
      createdAt: input.at,
    },
  });
  await prisma.product.update({
    where: { id: input.productId },
    data: { stockQty: balanceAfter },
  });
  return balanceAfter;
}

async function seedScenario(ctx: {
  owner: { id: string };
  bookersByEmail: Map<string, { id: string; name: string }>;
  shopsByName: Map<string, { id: string }>;
  productsBySku: Map<string, { id: string; price: number; sku: string; reorderLevel: number | null; name: string }>;
}) {
  const { owner, bookersByEmail, shopsByName, productsBySku } = ctx;
  const chain = await buildStockChain();
  if (!(await prisma.appSetting.findUnique({ where: { key: STOCK_BASELINE_KEY } }))) {
    await prisma.appSetting.create({
      data: {
        key: STOCK_BASELINE_KEY,
        value: JSON.stringify(
          Object.fromEntries(
            Array.from(chain.entries()).map(([id, s]) => [id, s.qty]),
          ),
        ),
      },
    });
  }
  const codes = await nextCodes();
  let orderSeq = codes.orderStart;
  let invoiceSeq = codes.invoiceStart;

  const created: { code: string; stage: Stage; shop: string; booker: string; subtotal: number; at: Date }[] = [];

  for (const spec of [...ORDER_SPECS].sort((a, b) => a.day - b.day || a.hour - b.hour)) {
    const shop = shopsByName.get(spec.shop);
    const booker = bookersByEmail.get(spec.booker);
    if (!shop || !booker) {
      console.warn(`  skip ${spec.shop}/${spec.booker}: not resolvable`);
      continue;
    }
    const orderedAt = khiDay(spec.day, spec.hour);
    const items = spec.items
      .map((i) => ({ product: productsBySku.get(i.sku), qty: i.qty }))
      .filter((i): i is { product: { id: string; price: number; sku: string; reorderLevel: number | null; name: string }; qty: number } => Boolean(i.product));
    if (items.length === 0) continue;
    const subtotal = items.reduce((s, i) => s + i.qty * i.product.price, 0);

    const code = `ORD-${String(orderSeq++).padStart(5, "0")}`;
    const order = await prisma.order.create({
      data: {
        code,
        bookerId: booker.id,
        customerId: shop.id,
        status: spec.stage,
        notes: `${DEMO_TAG} ${spec.notes ?? ""}`.trim(),
        subtotal,
        advance: 0,
        createdAt: orderedAt,
        items: {
          create: items.map((i) => ({
            productId: i.product.id,
            qty: i.qty,
            unitPrice: i.product.price,
          })),
        },
      },
      include: { items: true },
    });
    created.push({ code, stage: spec.stage, shop: spec.shop, booker: booker.name, subtotal, at: orderedAt });

    if (!DEMO_INVOICE_STAGES.includes(spec.stage)) continue;

    // Invoicing: one invoice, then the payments that settle (or partly settle) it.
    const invoiceAt = khiDay(spec.invoiceDay ?? spec.day, spec.hour + 1 > 23 ? 23 : spec.hour + 1);
    const invoiceCode = `INV-${String(invoiceSeq++).padStart(5, "0")}`;
    const invoice = await prisma.invoice.create({
      data: {
        code: invoiceCode,
        orderId: order.id,
        customerId: shop.id,
        total: subtotal,
        amountPaid: 0,
        balance: subtotal,
        paymentStatus: "unpaid",
        createdAt: invoiceAt,
      },
    });

    for (const item of order.items) {
      await appendLedger(chain, {
        productId: item.productId,
        delta: -item.qty,
        reason: "sale",
        createdBy: booker.id,
        at: invoiceAt,
        refType: "invoice",
        refId: invoice.id,
      });
    }

    let amountPaid = 0;
    for (const pay of spec.pays ?? []) {
      const state = deriveInvoiceState(invoice.total, amountPaid);
      if (state.balance <= 0) break;
      const amount = pay.full ? state.balance : Math.min(pay.amount ?? 0, state.balance);
      if (amount < 1) continue;
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          mode: pay.mode,
          kind: amount === state.balance ? "full" : "part",
          createdBy: booker.id,
          createdAt: khiDay(pay.day, 15),
        },
      });
      amountPaid += amount;
    }

    const derived = deriveInvoiceState(invoice.total, amountPaid);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid, balance: derived.balance, paymentStatus: derived.paymentStatus },
    });

    const finalStatus: Stage =
      derived.balance === 0 && spec.stage !== "invoiced" ? "settled" : spec.stage;
    await prisma.order.update({ where: { id: order.id }, data: { status: finalStatus } });
  }

  // Stock events that are not tied to an order (inward, write-offs).
  for (const ev of [...STOCK_EVENTS].sort((a, b) => a.day - b.day || a.hour - b.hour)) {
    const product = productsBySku.get(ev.sku);
    if (!product) continue;
    await appendLedger(chain, {
      productId: product.id,
      delta: ev.delta,
      reason: ev.reason,
      createdBy: owner.id,
      at: khiDay(ev.day, ev.hour),
      refType: "seed",
    });
  }

  // Return against City Mart's settled invoice (day 5 order), restocking and
  // reducing the invoice exactly like the returns service.
  const returnProduct = productsBySku.get(RETURN_SPEC.sku);
  const returnShop = shopsByName.get(RETURN_SPEC.shop);
  if (returnProduct && returnShop) {
    const target = await prisma.invoice.findFirst({
      where: { customerId: returnShop.id, order: { status: "settled" } },
      include: { order: { include: { items: true } } },
      orderBy: { createdAt: "asc" },
    });
    const line = target?.order.items.find((i) => i.productId === returnProduct.id);
    if (target && line) {
      const amount = RETURN_SPEC.qty * line.unitPrice;
      await appendLedger(chain, {
        productId: returnProduct.id,
        delta: RETURN_SPEC.qty,
        reason: "return",
        createdBy: owner.id,
        at: khiDay(RETURN_SPEC.day, RETURN_SPEC.hour),
        refType: "invoice",
        refId: target.id,
      });
      const newTotal = target.total - amount;
      const derived = deriveInvoiceState(newTotal, target.amountPaid);
      await prisma.invoice.update({
        where: { id: target.id },
        data: { total: newTotal, balance: derived.balance, paymentStatus: derived.paymentStatus },
      });
      await prisma.return.create({
        data: {
          invoiceId: target.id,
          productId: returnProduct.id,
          qty: RETURN_SPEC.qty,
          amount,
          createdBy: owner.id,
          createdAt: khiDay(RETURN_SPEC.day, RETURN_SPEC.hour),
        },
      });
    }
  }

  // Guarantee the attention states (low stock + out of stock) with a stock-take
  // correction sized against whatever the database currently holds.
  for (const att of ATTENTION_SKUS) {
    const product = productsBySku.get(att.sku);
    if (!product) continue;
    const state = chain.get(product.id);
    const current = state?.qty ?? 0;
    const target =
      att.target === "zero"
        ? 0
        : Math.max(0, (product.reorderLevel ?? 5) - 2);
    const delta = target - current;
    if (delta === 0) continue;
    await appendLedger(chain, {
      productId: product.id,
      delta,
      reason: "correction",
      createdBy: owner.id,
      at: khiDay(0, 18),
      refType: "seed",
    });
  }

  console.log(`\nDemo scenario created: ${created.length} tagged orders across 7 Karachi days.`);
}

async function report() {
  const [orders, invoices, payments, ledgerRows, shops, openBal] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, _sum: { subtotal: true } }),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.stockLedger.count(),
    prisma.customer.groupBy({ by: ["bookerId"], _count: { _all: true } }),
    prisma.invoice.aggregate({ where: { balance: { gt: 0 } }, _sum: { balance: true } }),
  ]);
  console.log("\n=== Raseed seed complete ===");
  console.log(`Pipeline: ${orders.map((o) => `${o.status}=${o._count._all}`).join(", ")}`);
  console.log(`Invoices: ${invoices}, payments: ${payments}, ledger rows: ${ledgerRows}`);
  console.log(`Shops by booker: ${shops.map((s) => `${s.bookerId ?? "unassigned"}=${s._count._all}`).join(", ")}`);
  console.log(`Open balance across all invoices: PKR ${openBal._sum.balance ?? 0}`);

  const low = await prisma.product.findMany({
    where: { active: true },
    select: { sku: true, name: true, stockQty: true, reorderLevel: true },
  });
  console.log(
    `Stock: ${low.filter((p) => p.reorderLevel != null && p.stockQty <= p.reorderLevel).length} at/below reorder, ` +
      `${low.filter((p) => p.stockQty <= 0).length} out of stock (of ${low.length} active SKUs)`,
  );

  console.log("\nSeeded login credentials (Currency: PKR, Language: English):");
  console.log("--------------------------------------------------------");
  console.log(`OWNER  (office): ${OWNER.email} / ${OWNER.password}`);
  for (const b of BOOKERS) {
    console.log(`BOOKER (PWA)   : ${b.email} / ${b.password}`);
  }
  console.log("--------------------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
