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
    // A: qty 3 (<= stock 8, no warning). B: qty 5 (> stock 2, warning).
    const { status, data } = await booker.req<{
      order: { id: string; status: string; subtotal: number };
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
    check(status === 403, `other booker cannot read this order (got ${status})`);
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

    // C1 prepaid-full — no auto-settle at invoice; settles on physical delivery.
    const fullAdv = 3000;
    const oF = await booker.req<{
      order: { id: string };
      balanceDue: number;
    }>("POST", "/api/orders", {
      customerId: custId,
      submit: true,
      advance: fullAdv,
      items: [{ productId: prodP, qty: 3, unitPrice: priceP }],
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
      ordF1.data.order.status === "invoiced",
      `PREPAID order does NOT auto-settle at invoicing — stays 'invoiced' (got ${ordF1.data.order.status})`,
    );
    await office.req("POST", `/api/orders/${oFid}/status`, {
      status: "out_for_delivery",
    });
    const deliv = await office.req<{ order: { status: string } }>(
      "POST",
      `/api/orders/${oFid}/status`,
      { status: "delivered" },
    );
    check(
      deliv.data.order.status === "settled",
      `prepaid order settles when office confirms physical delivery (got ${deliv.data.order.status})`,
    );
    const invFRead = await office.req<{
      invoice: { deliveredAt: string | null };
    }>("GET", `/api/invoices/${invF.data.invoice.id}`);
    check(
      invFRead.data.invoice.deliveredAt !== null,
      `deliveredAt stamped on the delivered transition (got ${JSON.stringify(invFRead.data.invoice.deliveredAt)})`,
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
