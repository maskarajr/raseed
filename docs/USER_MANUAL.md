# Raseed — User Manual

Raseed is a wholesale distribution operations tool. It runs on the office PC and is used during office hours (online only). There are two surfaces:

- **Office dashboard** (`/office`) — desktop back office for owner/office staff: products, stock, customers, bookers, orders, invoices, returns, payments, reports.
- **Booker PWA** (`/booker`) — mobile app for field salesmen (bookers) to capture and submit retailer orders.

Currency is **PKR** (shown as `Rs 12,450`). Language is English. All money values are whole rupees.

---

## 1. Logging in and roles

Open the app URL and sign in with your email and password.

- **Owner / Office** → land on the Office dashboard (`/office`) with full access.
- **Booker** → land on the Booker PWA (`/booker`) and can only see and act on **their own** orders and customers.

The correct surface is chosen automatically by your role. To sign out, use the **Account** tab (booker) or the logout control in the Office nav.

---

## 2. Key concepts (read this first)

- **Product** — an item you sell (e.g. "Lifebuoy Soap"). Has an SKU, price, stock quantity, unit, and an optional reorder level.
- **Stock quantity** — how many units you currently have. It changes automatically when you invoice (goes down) or log a return (goes up), and manually via the Stock page.
- **Reorder level** — a low-stock threshold. When stock is **at or below** this number, the product is flagged **Low** on the Stock page and in Reports. It is only a reminder — Raseed does **not** place orders for you.
- **Stock ledger** — an automatic history of every stock movement (purchase, sale, return restock, adjustment, correction) with the running balance after each change. You cannot edit it; it is your audit trail.
- **Order** — what a booker submits for a shop. It moves through a fixed lifecycle (see §5).
- **Invoice** — created from a confirmed order. Deducting stock happens at this step.
- **Return** — a customer sends items back. Logged against an invoice: stock is restocked and the invoice balance drops.
- **Payment** — cash received against an invoice.
- **Balance due** — `Subtotal − Returns − Payments`. This is the amount the shop still owes. A shop with an unpaid balance is effectively a credit sale — there is no separate "credit" label.
- **Settled** — an order settles **automatically** the moment its invoice balance reaches **Rs 0** (through payments and/or returns). There is no manual "settle" button.

**Status pills** always show a colored chip **and** a text label:

| Pill | Meaning |
| --- | --- |
| Draft | Order started, not yet submitted |
| Submitted | Booker sent it; office needs to confirm |
| Confirmed | Office accepted; ready to invoice |
| Invoiced | Invoice created; stock deducted |
| Out for delivery | On its way to the shop |
| Delivered | Received by the shop |
| Settled | Fully paid (balance Rs 0) |
| Cancelled | Voided before invoicing |
| Return logged | At least one return recorded on the invoice |
| Unpaid / Partial / Paid | Invoice payment status |

---

## 3. Office — Products

**Where:** left nav → **Products**.

### Add a product
1. Click **Add product**.
2. Fill in the form:
   - **SKU** — unique code (e.g. `SKU-SOAP-6`). Set once; cannot be changed later.
   - **Name** — display name.
   - **Category** — optional grouping.
   - **Unit** — e.g. `pcs`, `ctn`, `bag` (defaults to `pcs`).
   - **Price (PKR)** — selling price per unit, whole rupees.
   - **Opening stock** — how many units you already have on hand.
   - **Reorder level** — optional low-stock threshold (see §2).
3. Click **Save**. The product appears in the table.

### Edit a product
Click **Edit** on a row. You can change name, category, unit, price, and reorder level. **SKU and stock are not editable here** — change stock on the **Stock** page (§4), and SKU is fixed.

### Activate / Deactivate
Use **Deactivate** to hide a product from new orders without deleting it (keeps history intact). **Activate** brings it back. Inactive products don't show in the booker's product search or the stock adjustment list.

### Search
Type an SKU or name and press Enter or **Search**.

---

## 4. Office — Stock (and updating stock quantity)

**Where:** left nav → **Stock**.

There are three parts on this page: a **Manual adjustment** form, the **Current stock** table, and the **Ledger history**.

### How stock quantity changes
- **Automatically** when you generate an invoice (stock goes **down** by the invoiced quantity, reason `sale`).
- **Automatically** when you log a return (stock goes **up**, shown as **Return restock**).
- **Manually** via the adjustment form below (for purchases, stock-takes, corrections).

You never type a new stock number directly — you record the **change** (a delta), so the ledger always explains why stock moved.

### Make a manual adjustment
1. In **Manual adjustment**, choose the **Product**.
2. Enter **Delta (+/-)** — the change, not the new total. For example, receiving 50 units → `50`; writing off 5 broken units → `-5`.
3. Choose a **Reason**:
   - **purchase** — new stock bought in.
   - **adjustment** — general change (e.g. stock-take difference).
   - **correction** — fixing a data-entry mistake.
4. Click **Apply adjustment**. The Current stock and Ledger update immediately.

> Note: stock can go **negative** if an over-sold order is invoiced (the low-stock warning is a soft warning and never blocks work). A later purchase brings it back positive.

### Current stock table
Shows each active product's stock and reorder level. If stock is at or below the reorder level, the quantity turns red and a **Low** flag appears.

### Ledger history
A time-stamped list of every movement: when, product, delta (+/-), reason (returns display as **Return restock**), a reference (e.g. linked to an invoice), and the **balance after** the movement.

---

## 5. Office — Orders and the order lifecycle

**Where:** left nav → **Orders**.

The inbox is a dense table: **Time · Order# · Booker · Customer · Items · Total · Status · Actions**. Use the **status filter** (top right) to narrow the list.

### The lifecycle
```
draft → submitted → confirmed → invoiced → out_for_delivery → delivered → settled
                    (or cancelled before invoicing)
```

### What to do at each stage
1. **Submitted** → click **Confirm** (inline on the row, or open the order and click **Confirm order**). This accepts the booker's order.
2. **Confirmed** → open the order and click **Generate invoice (deduct stock)**. This creates the invoice and reduces stock. You're taken to the invoice.
3. **Invoiced** → optionally click **Mark out for delivery**.
4. **Out for delivery** → optionally click **Mark delivered**.
5. **Settled** happens on its own once the invoice balance reaches Rs 0 (from payments/returns) — there is no settle button.

### Cancelling
While an order is **Draft**, **Submitted**, or **Confirmed**, you can **Cancel order** from the order detail. Once invoiced it can no longer be cancelled.

---

## 6. Office — Invoices, payments, returns, printing

**Where:** left nav → **Invoices**, or open an invoice from its order.

The invoices list shows Total, Paid, **Balance due**, and payment status. Open one to manage it.

### Totals block
- **Subtotal** — sum of the order lines.
- **Returns (−)** — value of returned items.
- **Paid (−)** — payments received.
- **Balance due** — what's still owed (`Subtotal − Returns − Paid`), shown large.

### Record a payment (cash)
1. Click **Record payment**.
2. The **Amount** defaults to the full outstanding balance. You can enter a smaller amount for a **partial** payment. It cannot exceed the balance.
3. Method is **Cash** (v1 is cash-only).
4. Click **Record payment**. Balance updates; when it hits Rs 0 the order becomes **Settled** automatically.

Leaving a balance unpaid is fine — that is a credit sale, tracked by the Balance due figure.

### Log a return
1. Click **Log return**. The sheet is titled **Log returns — Invoice #…**.
2. Each order line shows **SKU · invoiced qty · a return-qty stepper · optional reason**. Increase the return quantity for any line(s) returned. You can't return more than was invoiced (the stepper is capped at the returnable amount).
3. The **Preview** shows the effect live: `Restock +N · Invoice − Rs X`.
4. Click **Confirm returns**. This restocks the items (a **Return restock** ledger entry), reduces the invoice total and balance, and adds a "Return logged" pill. If the return clears the balance to Rs 0, the order settles.

> The optional per-line **reason** is a note for the person logging it; in v1 it is not stored.

### Print / PDF
Click **Print / PDF** to open a print-friendly invoice, then use your browser's Print dialog (choose "Save as PDF" to get a PDF file).

---

## 7. Office — Customers

**Where:** left nav → **Customers**.

- **Add:** click **New customer**, fill **Name** (required), **Phone** and **Area** (optional), then **Save**.
- **Edit:** click **Edit** on a row to update details.
- **Search:** by name, phone, or area.

Bookers can also create shops on the fly during an order (§9).

---

## 8. Office — Bookers

**Where:** left nav → **Bookers**.

- **Create a booker account:** enter **Name**, **Email**, and a **Password** (at least 6 characters), then **Create**. Share these credentials with the booker for the PWA.
- **Activate / Deactivate:** toggle a booker's access without deleting their history. Deactivated bookers can't sign in.

Bookers only ever see and act on their own orders and the shops they work with.

---

## 9. Booker PWA — capturing orders

Bookers use the mobile app with a bottom nav: **Home · Orders · Account**.

### Home
Shows the **Raseed** wordmark, a three-cell metric strip — **Today booked** (Rs), **Open orders** (count), **This week** (Rs) — a big **+ New order** button, and your recent orders with status pills.

### Create a new order (3 steps)
1. **Customer** — search for the shop by name, phone, or area and tap to select it. If it's not listed, tap **Can't find? Add a new shop**, fill **Name** (required), **Phone**, **Area**, and tap **Save & continue** — the new shop is selected automatically.
2. **Items** — search products and tap to add. For each line, use the **− / +** steppers (or type) to set the quantity, and adjust the **unit price** if needed. If you order more than is in stock, an amber warning appears — **you can still submit** (it's just a heads-up). Add optional **Notes**.
3. **Review** — check the lines; quantities are still **editable** here and the **Total** updates live. Tap **Submit order** (sticky button at the bottom).

After submitting you see a **success screen** with the order number ("Order ORD-000xx submitted") and any low-stock notes, plus a **Back to home** button.

### My orders
The **Orders** tab lists all your orders with their current status pills.

### Account
Shows your profile and a sign-out option.

---

## 10. Office — Reports

**Where:** left nav → **Reports**.

Pick a **From**/**To** date range and click **Apply**. You get:
- **Summary cards:** Invoices, Sales, Collected, Outstanding.
- **Sales by day:** invoices and sales value per day.
- **Top SKUs:** best-selling products by quantity and revenue.
- **Current stock / low stock:** quantities with Low flags.
- **Booker leaderboard:** orders and sales value per booker.

---

## 11. Office — Settings

**Where:** left nav → **Settings**. Shows your account (name, email, role) and app info (Currency PKR, Language English, Online-only). Bookers, products, stock, customers and reports each have their own nav section.

---

## 12. A typical day

1. **Morning:** office records any new stock arrivals under **Stock → Manual adjustment** (reason `purchase`).
2. **In the field:** bookers submit orders from the PWA.
3. **Office:** in **Orders**, **Confirm** each submitted order, then **Generate invoice** (stock deducts).
4. **On delivery:** mark **Out for delivery** → **Delivered**; **Record payment** (full or partial). If items come back, **Log return**.
5. Orders **settle** automatically as balances reach Rs 0. Check **Reports** for sales, outstanding balances, low stock, and booker performance.

---

## 13. FAQ

- **How do I set a new stock total?** You don't type a total — record the change (delta) on the **Stock** page so the ledger stays accurate. To go from 20 to 70, enter `+50`.
- **What does "reorder level" do?** It only flags a product **Low** when stock falls to or below it. It's a reminder to buy more; it doesn't order anything.
- **Why is stock negative?** An over-sold order was invoiced. The stock warning never blocks invoicing; record a purchase to bring it positive.
- **How do I do a credit sale?** Just invoice and leave the balance unpaid (or take a partial payment). The **Balance due** is the credit signal.
- **Why isn't there a "settled" button?** Orders settle automatically the instant the invoice balance hits Rs 0 (via payments and/or returns).
- **Can a booker create a shop?** Yes — during step 1 of a new order via **Can't find? Add a new shop**. Office can also add shops under **Customers**.
