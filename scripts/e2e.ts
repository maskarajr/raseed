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
