/**
 * End-to-end vertical-slice test for Raseed.
 *
 * Exercises the full happy path against the REAL running HTTP API:
 *   office login -> create 2 test products
 *   booker login -> create customer -> create+submit order (with a
 *     soft-stock-warning line) -> office confirm -> office invoice
 *     (assert stock deducted) -> office return (assert restock + invoice
 *     balance reduced + ledger row) -> payments (assert balance/status).
 *
 * Run with:  npm run e2e     (requires the app running, default :3000)
 *   Override target:  APP_URL=http://localhost:3100 npm run e2e
 */

const BASE = process.env.APP_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;

function check(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log(`  PASS: ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL: ${msg}`);
  }
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

// Minimal cookie-jar HTTP client.
function makeClient() {
  let cookie = "";
  return {
    async req<T = any>(
      method: string,
      path: string,
      body?: unknown,
    ): Promise<{ status: number; data: T }> {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookies = res.headers.getSetCookie?.() ?? [];
      for (const c of setCookies) {
        const pair = c.split(";")[0];
        if (pair.startsWith("raseed_session=")) cookie = pair;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      return { status: res.status, data };
    },
  };
}

async function getProduct(client: ReturnType<typeof makeClient>, id: string) {
  const { data } = await client.req<{ product: { stockQty: number } }>(
    "GET",
    `/api/products/${id}`,
  );
  return data.product;
}

async function main() {
  console.log(`Raseed E2E — target ${BASE}`);
  const stamp = Date.now();

  const office = makeClient();
  const booker = makeClient();

  // ---------------------------------------------------------------
  section("1. Office login (owner)");
  {
    const { status, data } = await office.req("POST", "/api/auth/login", {
      email: "owner@raseed.local",
      password: "owner123",
    });
    check(status === 200, `owner login returns 200 (got ${status})`);
    check(data?.user?.role === "owner", "owner session role is 'owner'");
  }

  // ---------------------------------------------------------------
  section("2. Office creates two test products");
  let prodA = "";
  let prodB = "";
  const priceA = 100;
  const priceB = 50;
  {
    const a = await office.req<{ product: { id: string } }>(
      "POST",
      "/api/products",
      {
        sku: `E2E-A-${stamp}`,
        name: "E2E Product A",
        price: priceA,
        stockQty: 8,
        reorderLevel: 3,
      },
    );
    const b = await office.req<{ product: { id: string } }>(
      "POST",
      "/api/products",
      {
        sku: `E2E-B-${stamp}`,
        name: "E2E Product B",
        price: priceB,
        stockQty: 2,
        reorderLevel: 1,
      },
    );
    check(a.status === 201 && !!a.data.product.id, "product A created");
    check(b.status === 201 && !!b.data.product.id, "product B created");
    prodA = a.data.product.id;
    prodB = b.data.product.id;
  }

  // ---------------------------------------------------------------
  section("3. Booker login");
  {
    const { status, data } = await booker.req("POST", "/api/auth/login", {
      email: "bilal@raseed.local",
      password: "booker123",
    });
    check(status === 200, `booker login returns 200 (got ${status})`);
    check(data?.user?.role === "booker", "booker session role is 'booker'");
  }

  // Booker must not be able to create products (role gate).
  {
    const { status } = await booker.req("POST", "/api/products", {
      sku: `X-${stamp}`,
      name: "nope",
      price: 1,
    });
    check(status === 403, `booker blocked from creating products (got ${status})`);
  }

  // ---------------------------------------------------------------
  section("4. Booker creates a customer");
  let customerId = "";
  {
    const { status, data } = await booker.req<{ customer: { id: string } }>(
      "POST",
      "/api/customers",
      {
        name: `E2E Shop ${stamp}`,
        phone: "0300-0000000",
        area: "Test Area",
      },
    );
    check(status === 201 && !!data.customer.id, "customer created by booker");
    customerId = data.customer.id;
  }

  // ---------------------------------------------------------------
  section("5. Booker creates + submits order (with soft-stock-warning line)");
  let orderId = "";
  {
    // Regression guard (demo 500-on-submit): after deletes leave gaps, the
    // count-based generator re-minted an EXISTING code -> unique violation.
    // Capture max existing suffix BEFORE creating; the new order's code must
    // be max+1, never count+1. (Gapped after the R1 wipe; trivially equal on
    // a contiguous fresh seed — the standalone scripts/test-codegen-gap.ts
    // forces the gapped shape deterministically.)
    const ordSuffix = (code: string) => Number(code.slice(4));
    const before = await office.req<{ orders: { code: string }[] }>(
      "GET",
      "/api/orders",
    );
    const codesBefore = before.data.orders.map((o) => o.code);
    const m0 = Math.max(0, ...codesBefore.map(ordSuffix));
    // A: qty 3 (<= stock 8, no warning). B: qty 5 (> stock 2, warning).
    const { status, data } = await booker.req<{
      order: { id: string; code: string; status: string; subtotal: number };
      warnings: { productId: string; requested: number; available: number }[];
    }>("POST", "/api/orders", {
      customerId,
      submit: true,
      items: [
        { productId: prodA, qty: 3, unitPrice: priceA },
        { productId: prodB, qty: 5, unitPrice: priceB },
      ],
    });
    check(status === 201, `order created (got ${status})`);
    check(
      ordSuffix(data.order?.code ?? "") === m0 + 1,
      `order code ORD-${String(m0 + 1).padStart(5, "0")} = max(suffix)+1, not count+1 (got ${data.order?.code})`,
    );
    check(data.order.status === "submitted", "order status is 'submitted'");
    check(
      data.order.subtotal === 3 * priceA + 5 * priceB,
      `order subtotal = ${3 * priceA + 5 * priceB} (got ${data.order.subtotal})`,
    );
    check(
      data.warnings.some((w) => w.productId === prodB),
      "soft stock warning returned for over-stock line (product B)",
    );
    check(
      data.warnings.length === 1,
      `exactly one warning (in-stock line produced none) (got ${data.warnings.length})`,
    );
    orderId = data.order.id;
  }

  // Booker scoping: second booker cannot see this order.
  {
    const other = makeClient();
    const login = await other.req("POST", "/api/auth/login", {
      email: "sana@raseed.local",
      password: "booker123",
    });
    check(login.status === 200, `sana login returns 200 (got ${login.status})`);
    check(login.data?.user?.role === "booker", "sana session role is 'booker'");
    const { status } = await other.req("GET", `/api/orders/${orderId}`);
    check(
      status === 404,
      `other booker's read of this order returns 404, not 403 (no existence leak) (got ${status})`,
    );
  }

  // ---------------------------------------------------------------
  section("6. Office confirms order");
  {
    const { status, data } = await office.req<{ order: { status: string } }>(
      "POST",
      `/api/orders/${orderId}/confirm`,
    );
    check(status === 200, `confirm returns 200 (got ${status})`);
    check(data.order.status === "confirmed", "order status is 'confirmed'");
  }

  // ---------------------------------------------------------------
  section("7. Office invoices order (stock must deduct)");
  let invoiceId = "";
  let invoiceTotal = 0;
  {
    const beforeA = (await getProduct(office, prodA)).stockQty;
    const beforeB = (await getProduct(office, prodB)).stockQty;

    const { status, data } = await office.req<{
      invoice: { id: string; total: number; balance: number; paymentStatus: string };
    }>("POST", `/api/orders/${orderId}/invoice`);
    check(status === 201, `invoice created (got ${status})`);
    invoiceId = data.invoice.id;
    invoiceTotal = data.invoice.total;

    const afterA = (await getProduct(office, prodA)).stockQty;
    const afterB = (await getProduct(office, prodB)).stockQty;
    check(afterA === beforeA - 3, `product A stock deducted by 3 (${beforeA} -> ${afterA})`);
    check(afterB === beforeB - 5, `product B stock deducted by 5 (${beforeB} -> ${afterB})`);
    check(
      data.invoice.total === 3 * priceA + 5 * priceB,
      `invoice total = ${3 * priceA + 5 * priceB} (got ${data.invoice.total})`,
    );
    check(data.invoice.balance === invoiceTotal, "invoice balance equals total (unpaid)");
    check(data.invoice.paymentStatus === "unpaid", "invoice starts 'unpaid'");

    // Refactor guard: the batched invoice stock write must emit exactly one
    // 'sale' ledger row PER LINE, linked to the invoice, with delta == -qty.
    const ledA = (
      await office.req<{
        entries: { reason: string; refId: string | null; delta: number }[];
      }>("GET", `/api/stock/ledger?productId=${prodA}`)
    ).data.entries.filter((e) => e.reason === "sale" && e.refId === invoiceId);
    const ledB = (
      await office.req<{
        entries: { reason: string; refId: string | null; delta: number }[];
      }>("GET", `/api/stock/ledger?productId=${prodB}`)
    ).data.entries.filter((e) => e.reason === "sale" && e.refId === invoiceId);
    check(
      ledA.length === 1 && ledB.length === 1,
      `one 'sale' ledger row per invoiced line, linked to invoice (A:${ledA.length} B:${ledB.length})`,
    );
    check(
      ledA[0]?.delta === -3 && ledB[0]?.delta === -5,
      `sale ledger deltas reflect line quantities (A ${ledA[0]?.delta}, B ${ledB[0]?.delta})`,
    );
  }

  // Re-invoicing must be rejected.
  {
    const { status } = await office.req("POST", `/api/orders/${orderId}/invoice`);
    check(status === 409, `re-invoicing rejected with 409 (got ${status})`);
  }

  // ---------------------------------------------------------------
  section("8. Office logs a return (restock + invoice adjust + 'Return restock' ledger)");
  {
    const beforeB = (await getProduct(office, prodB)).stockQty;
    const ledgerBefore = await office.req<{ entries: unknown[] }>(
      "GET",
      `/api/stock/ledger?productId=${prodB}`,
    );

    // Return 1 of B (before any payment).
    const { status, data } = await office.req<{
      invoice: { total: number; balance: number; paymentStatus: string };
      return: { amount: number };
    }>("POST", "/api/returns", { invoiceId, productId: prodB, qty: 1 });
    check(status === 201, `return logged (got ${status})`);

    const afterB = (await getProduct(office, prodB)).stockQty;
    check(afterB === beforeB + 1, `product B restocked by 1 (${beforeB} -> ${afterB})`);
    check(
      data.invoice.total === invoiceTotal - priceB,
      `invoice total reduced by ${priceB} (${invoiceTotal} -> ${data.invoice.total})`,
    );
    check(data.return.amount === priceB, `return amount = ${priceB}`);
    check(
      data.invoice.balance === invoiceTotal - priceB,
      `balance follows total with no payment yet (got ${data.invoice.balance})`,
    );

    const ledgerAfter = await office.req<{
      entries: { reason: string; refId: string | null }[];
    }>("GET", `/api/stock/ledger?productId=${prodB}`);
    check(
      ledgerAfter.data.entries.length === ledgerBefore.data.entries.length + 1,
      "one new ledger row recorded for the return",
    );
    check(
      ledgerAfter.data.entries.some(
        (e) => e.reason === "return" && e.refId === invoiceId,
      ),
      "'Return restock' ledger row (reason 'return') linked to the invoice",
    );

    // Gate 32: the booker's own order GET must now expose the returns the
    // detail card renders — same shape the office invoice endpoint serves.
    const bookerRead = await booker.req<{
      order: {
        invoice: {
          total: number;
          returns?: {
            qty: number;
            amount: number;
            product?: { sku?: string; name?: string };
          }[];
        } | null;
      };
    }>("GET", `/api/orders/${orderId}`);
    const bRets = bookerRead.data.order?.invoice?.returns;
    check(
      bookerRead.status === 200 && Array.isArray(bRets) && bRets.length === 1,
      `booker order GET carries invoice.returns (status ${bookerRead.status}, ${Array.isArray(bRets) ? bRets.length : "none"} rows)`,
    );
    check(
      !!bRets?.[0] &&
        bRets[0].qty === 1 &&
        bRets[0].amount === priceB &&
        bRets[0].product?.sku === `E2E-B-${stamp}`,
      `return row readable by booker: 1 x Rs ${priceB}, product labelled (got ${JSON.stringify(bRets?.[0])})`,
    );
    // Cross-tenant negative (Privy seq496): another booker must NOT be able to
    // fetch this order (and thus never sees the returns payload) — the
    // identical 404, no existence leak, unchanged by the include widening.
    const sanaG32 = makeClient();
    await sanaG32.req("POST", "/api/auth/login", {
      email: "sana@raseed.local",
      password: "booker123",
    });
    const crossG32 = await sanaG32.req("GET", `/api/orders/${orderId}`);
    check(
      crossG32.status === 404,
      `cross-booker fetch of the returns-carrying order returns 404 (got ${crossG32.status})`,
    );

    invoiceTotal = data.invoice.total; // now 500
  }

  // ---------------------------------------------------------------
  section("9. Payments + return-after-payment + balance-driven settle");
  {
    // 9a. Partial payment -> status 'partial', balance > 0, order NOT settled.
    const partialAmt = 200;
    const p1 = await office.req<{
      invoice: { balance: number; paymentStatus: string; amountPaid: number };
      order: { status: string };
    }>("POST", "/api/payments", { invoiceId, amount: partialAmt, mode: "cash" });
    check(p1.status === 201, `partial payment accepted (got ${p1.status})`);
    check(
      p1.data.invoice.paymentStatus === "partial",
      `status 'partial' after partial pay (got ${p1.data.invoice.paymentStatus})`,
    );
    check(
      p1.data.invoice.balance === invoiceTotal - partialAmt,
      `balance > 0 = ${invoiceTotal - partialAmt} (got ${p1.data.invoice.balance})`,
    );
    check(
      p1.data.order.status === "invoiced",
      `order NOT yet settled while balance > 0 (got ${p1.data.order.status})`,
    );

    // 9b. Return AFTER a payment must recalc balance = (total - returns) - paid.
    const beforeA = (await getProduct(office, prodA)).stockQty;
    const r2 = await office.req<{
      invoice: { total: number; balance: number; amountPaid: number };
    }>("POST", "/api/returns", { invoiceId, productId: prodA, qty: 1 });
    check(r2.status === 201, `return-after-payment accepted (got ${r2.status})`);
    const afterA = (await getProduct(office, prodA)).stockQty;
    check(afterA === beforeA + 1, `product A restocked by 1 (${beforeA} -> ${afterA})`);
    const expectedTotal = invoiceTotal - priceA; // 500 - 100 = 400
    check(
      r2.data.invoice.total === expectedTotal,
      `invoice total now ${expectedTotal} (got ${r2.data.invoice.total})`,
    );
    check(
      r2.data.invoice.amountPaid === partialAmt,
      `payments preserved through return (paid ${partialAmt}, got ${r2.data.invoice.amountPaid})`,
    );
    check(
      r2.data.invoice.balance === expectedTotal - partialAmt,
      `balance recalculated after return-with-payment = ${expectedTotal - partialAmt} (got ${r2.data.invoice.balance})`,
    );

    // 9c. Final payment clears balance -> 'paid' -> order auto-settled.
    const remaining = r2.data.invoice.balance;
    const p2 = await office.req<{
      invoice: { balance: number; paymentStatus: string };
      order: { status: string };
    }>("POST", "/api/payments", { invoiceId, amount: remaining, mode: "cash" });
    check(p2.status === 201, `final payment accepted (got ${p2.status})`);
    check(p2.data.invoice.balance === 0, "balance is 0 after full payment");
    check(
      p2.data.invoice.paymentStatus === "paid",
      `invoice 'paid' (got ${p2.data.invoice.paymentStatus})`,
    );
    check(
      p2.data.order.status === "settled",
      `order auto-settled when balance hit 0 (got ${p2.data.order.status})`,
    );

    // Confirm settle persisted on the order record itself.
    const ord = await office.req<{ order: { status: string } }>(
      "GET",
      `/api/orders/${orderId}`,
    );
    check(
      ord.data.order.status === "settled",
      `order record persists 'settled' (got ${ord.data.order.status})`,
    );

    // Overpayment must be rejected.
    const over = await office.req("POST", "/api/payments", {
      invoiceId,
      amount: 1,
      mode: "cash",
    });
    check(over.status === 400, `overpayment rejected with 400 (got ${over.status})`);
  }

  // ---------------------------------------------------------------
  section("10. Auth gate sanity");
  {
    const anon = makeClient();
    const { status } = await anon.req("GET", "/api/invoices");
    check(status === 401, `unauthenticated request rejected with 401 (got ${status})`);
  }

  // ---------------------------------------------------------------
  section("11. v3.2 API contracts + booker scoping");
  {
    const bilal = makeClient();
    const sana = makeClient();
    await bilal.req("POST", "/api/auth/login", {
      email: "bilal@raseed.local",
      password: "booker123",
    });
    const sanaLogin = await sana.req<{ user: { id: string } }>(
      "POST",
      "/api/auth/login",
      { email: "sana@raseed.local", password: "booker123" },
    );
    const sanaId = sanaLogin.data.user.id;

    type ShopRow = { id: string; name: string; bookerId: string | null };

    // GET /api/customers is scoped to the calling booker's own shops.
    const mine = await bilal.req<{ customers: ShopRow[] }>("GET", "/api/customers");
    check(mine.status === 200, `booker customers call succeeds (got ${mine.status})`);
    const foreignShops = mine.data.customers.filter(
      (c) => c.bookerId !== mine.data.customers[0]?.bookerId,
    );
    check(
      mine.data.customers.length > 0 && foreignShops.length === 0,
      `every shop a booker sees belongs to them (${mine.data.customers.length} rows, ${foreignShops.length} foreign)`,
    );

    const theirs = await sana.req<{ customers: ShopRow[] }>("GET", "/api/customers");
    const shared = theirs.data.customers.filter((c) =>
      mine.data.customers.some((m) => m.id === c.id),
    );
    check(
      shared.length === 0,
      `two bookers' shop lists do not overlap (${shared.length} shared)`,
    );

    // Office still sees everything, unassigned shops included.
    const allShops = await office.req<{
      customers: { bookerId: string | null }[];
    }>("GET", "/api/customers");
    check(
      allShops.data.customers.length >=
        mine.data.customers.length + theirs.data.customers.length,
      `office sees at least the union of both bookers' shops (${
        allShops.data.customers.length
      } vs ${mine.data.customers.length}+${theirs.data.customers.length})`,
    );
    check(
      allShops.data.customers.some((c) => c.bookerId === null),
      "an unassigned shop is still visible to office",
    );

    // A booker capturing a shop cannot hand it to a colleague.
    const captured = await bilal.req<{
      customer: { id: string; bookerId: string | null };
    }>("POST", "/api/customers", {
      name: `E2E Captured ${stamp}`,
      phone: "0300-0000000",
      area: "E2E",
      route: "9",
      bookerId: sanaId,
    });
    check(
      captured.status === 201,
      `booker can capture a shop (got ${captured.status})`,
    );
    check(
      captured.data.customer.bookerId !== sanaId,
      "a captured shop is not assignable to another booker",
    );

    // A booker cannot raise an order against a colleague's shop.
    const sanaShop = theirs.data.customers.find((c) => c.bookerId === sanaId);
    if (sanaShop) {
      const cross = await bilal.req("POST", "/api/orders", {
        customerId: sanaShop.id,
        items: [{ productId: prodA, qty: 1, unitPrice: priceA }],
        submit: false,
      });
      check(
        cross.status === 403,
        `booking a colleague's shop is rejected with 403 (got ${cross.status})`,
      );
    } else {
      check(false, "sana has an assigned shop to test against");
    }

    // Repeating confirm must not move stock a second time.
    const stockBefore = (await getProduct(office, prodA)).stockQty;
    const again = await office.req("POST", `/api/orders/${orderId}/confirm`);
    check(
      again.status === 400,
      `repeat confirm rejected with 400 (got ${again.status})`,
    );
    const stockAfter = (await getProduct(office, prodA)).stockQty;
    check(
      stockAfter === stockBefore,
      `repeat confirm left stock untouched (${stockBefore} -> ${stockAfter})`,
    );

    // Lifecycle pipeline block for the office dashboard.
    const home = await office.req<{
      kpis: { bookedToday: number; collectedToday: number };
      pipeline: { status: string; count: number; value: number }[];
    }>("GET", "/api/office/home");
    check(
      Array.isArray(home.data.pipeline) && home.data.pipeline.length === 8,
      `pipeline carries all 8 stages (got ${home.data.pipeline?.length})`,
    );
    check(
      home.data.pipeline.every(
        (p) => typeof p.count === "number" && typeof p.value === "number",
      ),
      "pipeline entries carry numeric count and value",
    );
    check(
      home.data.pipeline.reduce((s, p) => s + p.count, 0) > 0,
      "pipeline is populated with real counts",
    );

    // 7-day booked/collected series behind the hero sparkline.
    const ranged = await office.req<{
      series?: { day: string; booked: number; collected: number; orders: number }[];
    }>("GET", "/api/reports?range=7d");
    const series = ranged.data.series ?? [];
    check(
      series.length === 7,
      `range=7d returns exactly 7 buckets (got ${series.length})`,
    );
    check(
      series.every(
        (d) =>
          /^\d{4}-\d{2}-\d{2}$/.test(d.day) &&
          typeof d.booked === "number" &&
          typeof d.collected === "number" &&
          typeof d.orders === "number",
      ),
      "series buckets carry an ISO day label plus numeric booked/collected/orders",
    );
    let ascending = series.length === 7;
    for (let i = 1; i < series.length; i++) {
      if (series[i].day <= series[i - 1].day) ascending = false;
    }
    check(ascending, "series buckets are strictly ascending (zero-filled, oldest first)");
    const today = series[series.length - 1];
    check(
      !!today && today.booked === home.data.kpis.bookedToday,
      `sparkline's last bucket equals bookedToday (${today?.booked} vs ${home.data.kpis.bookedToday})`,
    );
    check(
      !!today && today.collected === home.data.kpis.collectedToday,
      `sparkline's last bucket equals collectedToday (${today?.collected} vs ${home.data.kpis.collectedToday})`,
    );

    // Existing callers must not see a changed payload.
    const plain = await office.req<Record<string, unknown>>("GET", "/api/reports");
    check(
      !("series" in plain.data),
      "GET /api/reports without range keeps its original keys",
    );

    // Numbered route stops on the booker home need the shop route per order.
    const listed = await office.req<{
      orders: { customer: { route?: string | null } }[];
    }>("GET", "/api/orders");
    check(
      listed.data.orders.length > 0 &&
        listed.data.orders.every((o) => "route" in o.customer),
      "orders list carries customer.route",
    );
  }
  // ---------------------------------------------------------------
  section("12. v3 advance capture + print fields (C1/C2)");
  {
    const priceP = 1000;
    const prodP = (
      await office.req<{ product: { id: string } }>("POST", "/api/products", {
        sku: `E2E-P-${stamp}`,
        name: "E2E Advance Product",
        price: priceP,
        stockQty: 50,
        reorderLevel: 5,
      })
    ).data.product.id;

    // G2 print — customer NTN persists and reads back.
    const cust = await booker.req<{ customer: { id: string } }>(
      "POST",
      "/api/customers",
      {
        name: `E2E NTN Shop ${stamp}`,
        phone: "0300-1111111",
        area: "NTN",
        ntn: "1234567-8",
      },
    );
    check(cust.status === 201, `customer with NTN created (got ${cust.status})`);
    const custId = cust.data.customer.id;
    const custRead = await office.req<{ customer: { ntn: string | null } }>(
      "GET",
      `/api/customers/${custId}`,
    );
    check(
      custRead.data.customer.ntn === "1234567-8",
      `customer NTN persisted (got ${JSON.stringify(custRead.data.customer.ntn)})`,
    );

    // G2 print — issuer settings round-trip through the whitelist.
    const setPatch = await office.req<Record<string, string>>(
      "PATCH",
      "/api/settings",
      {
        issuerAddress: "12 Test Street, Karachi",
        issuerPhone: "021-111-2222",
        issuerNtn: "9988776-5",
        issuerStrn: "STRN-001",
      },
    );
    check(
      setPatch.status === 200,
      `issuer settings PATCH accepted (got ${setPatch.status})`,
    );
    const setRead = await office.req<Record<string, string>>(
      "GET",
      "/api/settings",
    );
    check(
      setRead.data.issuerAddress === "12 Test Street, Karachi" &&
        setRead.data.issuerNtn === "9988776-5" &&
        setRead.data.issuerStrn === "STRN-001",
      "issuer address/NTN/Strn read back from settings",
    );

    // C1 error — advance greater than the order total is rejected with 400.
    const badAdv = await booker.req<{ error?: string }>("POST", "/api/orders", {
      customerId: custId,
      submit: false,
      advance: 10 * priceP, // 10000 > subtotal 2000
      items: [{ productId: prodP, qty: 2, unitPrice: priceP }],
    });
    check(
      badAdv.status === 400,
      `advance > total rejected with 400 (got ${badAdv.status})`,
    );
    check(
      /exceeds order total/.test(badAdv.data?.error ?? ""),
      `400 copy names the overflow (got ${JSON.stringify(badAdv.data?.error)})`,
    );

    // C1 happy (partial advance) — persisted advance + server-computed balanceDue.
    const partAdv = 800;
    const oP = await booker.req<{
      order: { id: string; subtotal: number; advance: number };
      balanceDue: number;
    }>("POST", "/api/orders", {
      customerId: custId,
      submit: true,
      advance: partAdv,
      items: [{ productId: prodP, qty: 2, unitPrice: priceP }],
    });
    check(
      oP.status === 201,
      `partial-advance order created (got ${oP.status})`,
    );
    check(
      oP.data.order.subtotal === 2000 && oP.data.order.advance === partAdv,
      `partial order persists subtotal 2000 + advance ${partAdv}`,
    );
    check(
      oP.data.balanceDue === 2000 - partAdv,
      `server balanceDue = total - advance = ${2000 - partAdv} (got ${oP.data.balanceDue})`,
    );
    const oPid = oP.data.order.id;
    await office.req("POST", `/api/orders/${oPid}/confirm`);
    const invP = await office.req<{
      invoice: {
        id: string;
        amountPaid: number;
        balance: number;
        paymentStatus: string;
        deliveredAt: string | null;
      };
    }>("POST", `/api/orders/${oPid}/invoice`);
    check(
      invP.data.invoice.amountPaid === partAdv,
      `invoice.amountPaid seeded from advance (${partAdv}, got ${invP.data.invoice.amountPaid})`,
    );
    check(
      invP.data.invoice.balance === 2000 - partAdv &&
        invP.data.invoice.paymentStatus === "partial",
      `invoiced partial-advance: balance ${2000 - partAdv}, status partial (got ${invP.data.invoice.balance}/${invP.data.invoice.paymentStatus})`,
    );
    const ordP = await office.req<{ order: { status: string } }>(
      "GET",
      `/api/orders/${oPid}`,
    );
    check(
      ordP.data.order.status === "invoiced",
      `partial-advance order stays 'invoiced' (got ${ordP.data.order.status})`,
    );
    check(
      invP.data.invoice.deliveredAt === null,
      "deliveredAt is null before delivery",
    );

    // C1 — G9 cash-advance collection now posts (kind=advance accepted).
    const chipPay = await booker.req<{ invoice: { balance: number } }>(
      "POST",
      "/api/payments",
      {
        invoiceId: invP.data.invoice.id,
        amount: 300,
        mode: "cash",
        kind: "advance",
      },
    );
    check(
      chipPay.status === 201 &&
        chipPay.data.invoice.balance === 2000 - partAdv - 300,
      `cash-advance collection accepted, balance -> ${2000 - partAdv - 300} (got ${chipPay.status}/${chipPay.data?.invoice?.balance})`,
    );

    // G2 deliveredAt stamping is exercised on a NON-prepaid order (balance > 0),
    // so the delivered transition is tested without settle masking it.
    await office.req("POST", `/api/orders/${oPid}/status`, {
      status: "out_for_delivery",
    });
    const delivP = await office.req<{ order: { status: string } }>(
      "POST",
      `/api/orders/${oPid}/status`,
      { status: "delivered" },
    );
    check(
      delivP.data.order.status === "delivered",
      `balance>0 order reaches 'delivered' (not settled) (got ${delivP.data.order.status})`,
    );
    const invPRead = await office.req<{
      invoice: { deliveredAt: string | null };
    }>("GET", `/api/invoices/${invP.data.invoice.id}`);
    check(
      invPRead.data.invoice.deliveredAt !== null,
      `deliveredAt stamped on the delivered transition (got ${JSON.stringify(invPRead.data.invoice.deliveredAt)})`,
    );

    // Option A (owner seq176): a FULLY-PREPAID order must settle at INVOICE time
    // (read Collected immediately), not after delivery. Multi-line + a duplicate
    // product also exercises applyStockMovements' running-balance path.
    const fullAdv = 5000;
    const oF = await booker.req<{
      order: { id: string };
      balanceDue: number;
    }>("POST", "/api/orders", {
      customerId: custId,
      submit: true,
      advance: fullAdv,
      items: [
        { productId: prodP, qty: 3, unitPrice: priceP },
        { productId: prodP, qty: 2, unitPrice: priceP },
      ],
    });
    const oFid = oF.data.order.id;
    check(
      oF.data.balanceDue === 0,
      `fully-prepaid balanceDue = 0 (got ${oF.data.balanceDue})`,
    );
    await office.req("POST", `/api/orders/${oFid}/confirm`);
    const invF = await office.req<{
      invoice: {
        id: string;
        balance: number;
        paymentStatus: string;
        deliveredAt: string | null;
      };
    }>("POST", `/api/orders/${oFid}/invoice`);
    check(
      invF.data.invoice.balance === 0 &&
        invF.data.invoice.paymentStatus === "paid",
      `prepaid invoice: balance 0, status paid (got ${invF.data.invoice.balance}/${invF.data.invoice.paymentStatus})`,
    );
    const ordF1 = await office.req<{ order: { status: string } }>(
      "GET",
      `/api/orders/${oFid}`,
    );
    check(
      ordF1.data.order.status === "settled",
      `OPTION A: prepaid order lands 'settled' at invoice, not 'invoiced' (got ${ordF1.data.order.status})`,
    );
    // Honesty guard: settled is terminal — a settled prepaid order must not be
    // re-advanced through delivery (proves no double lifecycle).
    const reAdv = await office.req("POST", `/api/orders/${oFid}/status`, {
      status: "out_for_delivery",
    });
    check(
      reAdv.status === 400,
      `settled prepaid cannot be re-advanced to out_for_delivery (got ${reAdv.status})`,
    );
  }
  // ---------------------------------------------------------------
  section("13. Draft edit (PATCH /api/orders/[id])");
  {
    // A booker creates a DRAFT (submit:false): subtotal 150 (100+50), advance 50.
    const d1 = await booker.req<{
      order: { id: string; subtotal: number };
    }>("POST", "/api/orders", {
      customerId,
      submit: false,
      advance: 50,
      items: [
        { productId: prodA, qty: 1, unitPrice: priceA },
        { productId: prodB, qty: 1, unitPrice: priceB },
      ],
    });
    check(
      d1.status === 201 && d1.data.order.subtotal === 150,
      `draft created via submit:false (got ${d1.status}/${d1.data.order?.subtotal})`,
    );
    const draftId = d1.data.order.id;

    // Own-booker EDIT: wholesale-replace to 1 line (subtotal 200), set notes,
    // omit advance -> the draft's existing advance is preserved.
    const e1 = await booker.req<{
      order: {
        subtotal: number;
        advance: number;
        notes: string | null;
        status: string;
        items: unknown[];
      };
    }>("PATCH", `/api/orders/${draftId}`, {
      items: [{ productId: prodA, qty: 2, unitPrice: priceA }],
      notes: "edited by booker",
    });
    check(e1.status === 200, `draft edit returns 200 (got ${e1.status})`);
    check(
      e1.data.order.status === "draft",
      `edit keeps status 'draft' (got ${e1.data.order.status})`,
    );
    check(
      e1.data.order.subtotal === 200,
      `subtotal recomputed server-side 150->200 (got ${e1.data.order.subtotal})`,
    );
    check(
      Array.isArray(e1.data.order.items) && e1.data.order.items.length === 1,
      `items wholesale-replaced to 1 line (got ${e1.data.order.items?.length})`,
    );
    check(
      e1.data.order.advance === 50,
      `advance preserved when omitted (got ${e1.data.order.advance})`,
    );
    check(
      e1.data.order.notes === "edited by booker",
      `notes updated (got ${JSON.stringify(e1.data.order.notes)})`,
    );

    // Guard: advance > (new) subtotal rejected 400 (and rolled back).
    const badAdv = await booker.req("PATCH", `/api/orders/${draftId}`, {
      items: [{ productId: prodA, qty: 1, unitPrice: priceA }],
      advance: 99999,
    });
    check(
      badAdv.status === 400,
      `advance > subtotal rejected (got ${badAdv.status})`,
    );

    // Guard: non-draft orders are NOT editable (orderId is settled by now).
    const nonDraft = await office.req("PATCH", `/api/orders/${orderId}`, {
      items: [{ productId: prodA, qty: 1, unitPrice: priceA }],
    });
    check(
      nonDraft.status === 400,
      `non-draft edit rejected 400 (got ${nonDraft.status})`,
    );

    // Tenant guard: another booker editing this draft => 404 (no existence leak).
    const sana2 = makeClient();
    await sana2.req("POST", "/api/auth/login", {
      email: "sana@raseed.local",
      password: "booker123",
    });
    const cross = await sana2.req("PATCH", `/api/orders/${draftId}`, {
      items: [{ productId: prodA, qty: 1, unitPrice: priceA }],
    });
    check(
      cross.status === 404,
      `cross-booker draft edit returns 404 (got ${cross.status})`,
    );
  }
  // ---------------------------------------------------------------
  section("14. Office leaderboard: cancelled orders leave BOTH money columns");
  {
    // Regression (PR #17 class, server side): collected summed
    // invoice.amountPaid over ALL statuses, so cash on an order the office
    // later cancelled kept crediting the booker while salesValue dropped it.
    // Both columns must move together.
    type LbRow = { salesValue: number; collected: number };
    const lb = async (): Promise<LbRow> => {
      const r = await office.req<{
        bookers: { email: string; salesValue: number; collected: number }[];
      }>("GET", "/api/reports");
      const row = r.data.bookers.find(
        (b) => b.email === "bilal@raseed.local",
      );
      return row ?? { salesValue: -1, collected: -1 };
    };
    const base = await lb();
    const o = await booker.req<{ order: { id: string } }>(
      "POST",
      "/api/orders",
      {
        customerId,
        submit: true,
        items: [{ productId: prodA, qty: 2, unitPrice: priceA }],
      },
    );
    const oid = o.data.order.id;
    await office.req("POST", `/api/orders/${oid}/confirm`);
    const inv = await office.req<{ invoice: { id: string } }>(
      "POST",
      `/api/orders/${oid}/invoice`,
    );
    // Partial payment (150 of 200) so the order stays cancellable ('invoiced').
    await office.req("POST", "/api/payments", {
      invoiceId: inv.data.invoice.id,
      amount: 150,
      mode: "cash",
      kind: "part",
    });
    const paid = await lb();
    check(
      paid.salesValue === base.salesValue + 2 * priceA,
      `invoiced order adds Rs ${2 * priceA} to sales (got +${paid.salesValue - base.salesValue})`,
    );
    check(
      paid.collected === base.collected + 150,
      `partial payment adds Rs 150 to collected (got +${paid.collected - base.collected})`,
    );
    const cx = await office.req("POST", `/api/orders/${oid}/cancel`);
    check(
      cx.status === 200 || cx.status === 201,
      `office cancels the paid order (got ${cx.status})`,
    );
    const after = await lb();
    check(
      after.collected === base.collected,
      `cancelled order's Rs 150 no longer counts as collected (delta ${after.collected - base.collected})`,
    );
    check(
      after.salesValue === base.salesValue,
      `cancelled order excluded from sales too (delta ${after.salesValue - base.salesValue})`,
    );
  }
  // ---------------------------------------------------------------
  section("15. Batch confirm / invoice (POST /api/orders/batch)");
  {
    type BatchRes = {
      ok: { id: string; status: string }[];
      failed: { id: string; code: string; reason: string }[];
    };

    // Dedicated SKU with a known head of stock so the invoice-path stock
    // assertions below are exact regardless of what sections 5-14 consumed.
    const prodC = await office.req<{ product: { id: string } }>(
      "POST",
      "/api/products",
      {
        sku: `E2E-C-${stamp}`,
        name: "E2E Product C",
        price: 20,
        stockQty: 10,
        reorderLevel: 1,
      },
    );
    check(prodC.status === 201, "product C created for the batch scenarios");
    const cId = prodC.data.product.id;
    const stockBefore = (await getProduct(office, cId)).stockQty;

    const mkOrder = async (qty: number, submit = true) => {
      const r = await booker.req<{ order: { id: string } }>("POST", "/api/orders", {
        customerId,
        submit,
        items: [{ productId: cId, qty, unitPrice: 20 }],
      });
      return r.data.order.id;
    };
    const readOrder = async (id: string) =>
      (await office.req<{ order: { status: string } }>("GET", `/api/orders/${id}`))
        .data.order;

    const b1 = await mkOrder(1);
    const b2 = await mkOrder(2);
    const b3 = await mkOrder(3);
    const draft = await mkOrder(1, false);

    // --- AC-1/AC-3: mixed population -> exact ok/failed split, loop continues
    const mixed = await office.req<BatchRes>("POST", "/api/orders/batch", {
      action: "confirm",
      ids: [b1, b2, b3, draft, `nope-${stamp}`],
    });
    check(mixed.status === 200, `mixed batch returns 200, not an error status (got ${mixed.status})`);
    check(mixed.data.ok.length === 3, `3 valid submitted orders confirmed (got ${mixed.data.ok.length})`);
    check(
      mixed.data.ok.every((o) => o.status === "confirmed"),
      "every ok entry comes back already in 'confirmed'",
    );
    check(mixed.data.failed.length === 2, `draft + bogus id landed in failed (got ${mixed.data.failed.length})`);
    check(
      mixed.data.failed.find((f) => f.id === draft)?.code === "invalid_state",
      `draft rejection labelled invalid_state (got ${mixed.data.failed.find((f) => f.id === draft)?.code})`,
    );
    check(
      mixed.data.failed.find((f) => f.id === `nope-${stamp}`)?.code === "not_found",
      "unknown id becomes a failed entry, not a 500",
    );
    check((await readOrder(draft)).status === "draft", "failed order untouched by the batch");

    // --- AC-2 + AC-7: invoice batch keeps the per-order stock-deduct path
    const inv = await office.req<BatchRes>("POST", "/api/orders/batch", {
      action: "invoice",
      ids: [b1, b2],
    });
    check(inv.status === 200 && inv.data.ok.length === 2, `2 confirmed orders invoiced (got ${inv.status}/${inv.data.ok?.length})`);
    check(
      inv.data.ok.every((o) => o.status === "invoiced"),
      "ok entries report status 'invoiced'",
    );
    const stockAfter = (await getProduct(office, cId)).stockQty;
    check(
      stockAfter === stockBefore - 3,
      `stock deducted by the summed line qty (1+2): ${stockBefore} -> ${stockAfter}`,
    );

    // --- re-run safety: already-invoiced ids fail, they do not double-deduct
    const again = await office.req<BatchRes>("POST", "/api/orders/batch", {
      action: "invoice",
      ids: [b1, b1],
    });
    check(
      again.status === 200 && again.data.ok.length === 0 && again.data.failed.length === 2,
      `re-invoicing the same id fails per entry, no double write (ok ${again.data.ok?.length}, failed ${again.data.failed?.length})`,
    );
    check(
      again.data.failed.every((f) => f.code === "already_invoiced"),
      "already-invoiced ids labelled already_invoiced",
    );
    check(
      (await getProduct(office, cId)).stockQty === stockAfter,
      "failed invoice batch left stock unchanged",
    );
    // b3 stays confirmed and is still individually invoiceable (no state leak).
    check((await readOrder(b3)).status === "confirmed", "unrelated order unaffected by batch failures");

    // --- AC-4: booker may not batch at all, and nothing moves
    const sana = makeClient();
    const sanaLogin = await sana.req<{ user: { id: string } }>(
      "POST",
      "/api/auth/login",
      { email: "sana@raseed.local", password: "booker123" },
    );
    const sanaOrderRes = await office.req<{ order: { id: string } }>("POST", "/api/orders", {
      customerId,
      bookerId: sanaLogin.data.user.id,
      submit: true,
      items: [{ productId: cId, qty: 1, unitPrice: 20 }],
    });
    const sanaOrder = sanaOrderRes.data.order.id;
    const forbidden = await booker.req<BatchRes>("POST", "/api/orders/batch", {
      action: "confirm",
      ids: [b3, sanaOrder],
    });
    check(forbidden.status === 403, `booker batch rejected 403 (got ${forbidden.status})`);
    const sanaBatch = await sana.req("POST", "/api/orders/batch", {
      action: "confirm",
      ids: [b3],
    });
    check(
      sanaBatch.status === 403,
      `a second booker cannot batch another booker's order either (got ${sanaBatch.status})`,
    );
    check(
      (await readOrder(b3)).status === "confirmed" &&
        (await readOrder(sanaOrder)).status === "submitted",
      "role-gated batch wrote nothing, including the cross-booker id",
    );

    // --- AC-5: input bounds enforced before any write
    const empty = await office.req<BatchRes>("POST", "/api/orders/batch", {
      action: "confirm",
      ids: [],
    });
    check(empty.status === 400, `empty ids rejected 400 (got ${empty.status})`);
    const oversized = await office.req<BatchRes>("POST", "/api/orders/batch", {
      action: "confirm",
      ids: Array.from({ length: 201 }, (_, i) => `id-${i}`),
    });
    check(oversized.status === 400, `201 ids rejected 400 (got ${oversized.status})`);
    const badAction = await office.req<BatchRes>("POST", "/api/orders/batch", {
      action: "cancel",
      ids: [b3],
    });
    check(badAction.status === 400, `unknown action rejected 400 (got ${badAction.status})`);
    check(
      (await readOrder(b3)).status === "confirmed",
      "rejected requests performed no mutation",
    );

    // --- the batch surface stays consistent with the single-order route
    const single = await office.req<{ order: { status: string } }>(
      "POST",
      `/api/orders/${b3}/invoice`,
    );
    check(
      single.status === 201 && (await readOrder(b3)).status === "invoiced",
      "order handled by batch is identical to the single-order path",
    );
  }
  // ---------------------------------------------------------------
  console.log(`\n================ SUMMARY ================`);
  console.log(`  PASSED: ${pass}`);
  console.log(`  FAILED: ${fail}`);
  console.log(`=========================================`);
  if (fail > 0) {
    console.log("E2E RESULT: FAIL");
    process.exit(1);
  }
  console.log("E2E RESULT: PASS");
}

main().catch((err) => {
  console.error("\nE2E crashed:", err);
  process.exit(1);
});
