# Raseed demo — client walkthrough

Live demo: **https://demo.raseed.xyz**

Two products, one ledger:

- **Booker** (phone / PWA) — the salesman on the route captures the shop order and collects cash.
- **Office** (desktop) — the back office confirms, invoices, prints, and sees stock and money move.

Cash on delivery. Collect on the invoice, part or full. Cash, bank, or cheque. Never credit. Leave **Cash advance taken now** at `0`.

This database is shared. Anything you create stays for the next person. Use a small qty (1–2) when you try a write.

## Sign in

Open https://demo.raseed.xyz/login. Pick the role card, then **Sign in**.

| Role card | Email | Password | Lands on |
| --- | --- | --- | --- |
| Office | `owner@raseed.local` | `owner123` | `/office` |
| Booker | `bilal@raseed.local` | `booker123` | `/booker` |
| Booker | `sana@raseed.local` | `booker123` | `/booker` |

Office hours on the login screen are 09:00–19:00, Asia/Karachi. Sign out from the arrow next to the name in the office sidebar, or **Sign out** on the booker Account tab.

Phone layout: on a phone, open `/booker` and use the browser **Add to Home Screen** / **Install**. On Account, **Install booker app** is the same prompt when the browser allows it.

## How the two sides meet

```
Booker places order (COD, advance 0)
        → Office confirms
        → Office generates the invoice (stock goes down)
        → Booker or Office records cash (part or full)
        → Office logs a return if goods come back (stock goes up, invoice drops)
```

A worked example already on the demo, from the recorded pass (28 Sep 2026):

- Booker **Bilal Booker**, shop **Raza mart**, **Sugar 1kg × 2**, advance `0`, collect on delivery **Rs 300**
- **ORD-00026** was confirmed in the office (Sugar 1kg × 2, Rs 300) and left at **Generate invoice**
- **ORD-00028** is the invoiced one: **INV-00020**
- Cash **Rs 300** recorded on INV-00020 (the history line reads **Part payment**, to collect **Rs 0**)
- Return **1** Sugar 1kg → restock **+1**, invoice **−Rs 150** (returns line **−Rs 150**, invoice total **Rs 150**)
- Stock: inward today **+1**, Sugar movements show the invoice out and the return in

For your own test, do a single order and click **Full settlement** so the history label matches a full collection.

Use your own shop and a qty of 1 if you want a clean trail. The steps below are the ones to click.

---

## 1. Booker — home

Sign in as Bilal. You should see **Salaam, Bilal**.

- Cards: orders, stops left, to collect
- **New order** and **Collect**
- **Next stops** — shops on the route, with **Scheduled** or **To collect**

Bottom nav: **Home · Orders · New · Account**.

## 2. Booker — place an order

**New order**. Three steps: **Shop · Products · Advance**.

1. **Shop.** Search name, phone, or area. Tap a shop (try **Raza mart**, Gulshan Anwar). **Continue.**  
   Missing shop: **Can't find? Add a new shop**.
2. **Products.** Search a SKU or name. Use **+** / **−**. Try **Sugar 1kg**, qty **2**. Footer should read **2 items · Rs 300**. **Continue.**  
   A low-stock warning does not block the order.
3. **Advance and submit.** Leave **Cash advance taken now** at **0**. The box must say **Collect on delivery Rs 300**. **Place order.**  
   **Save as draft** keeps it without sending it to the office.

Open **Orders**. The new row is **Awaiting confirm**. Filters: **All · Scheduled · To collect · Collected**. Booked, collected, and to collect sit above the list.

## 3. Office — see it arrive

Sign out. Sign in as the owner with the **Office** card.

**Dashboard**

- Range **7 days** / **30 days**, **Export**
- Booked today, today's flow (draft / awaiting confirm / confirmed / invoiced), outstanding, low stock, who is on the road
- Chart: collected vs to collect
- **Awaiting confirmation** list — open the order, or use **New order** if the office is booking on behalf of a booker

**Orders**

- Filters: **All · Scheduled · Awaiting confirm · Draft**
- Search: order, customer, or booker
- Open your new order (the recording used **ORD-00026**, then invoiced **ORD-00028**)

On the order:

- Customer, booker, **Cash on delivery**, line items, stock pill
- Timeline: Captured → Confirmed → Invoiced (stock deducted)
- **Confirm order** (only while it is awaiting confirm)
- Then **Generate invoice**
- Then the **Invoice INV-…** link
- Also on this screen: **Duplicate**, **Reassign booker**, **Cancel order** (before it is invoiced)

## 4. Office — invoice, print, collect, return

Open the invoice.

- Billed to, **Cash on delivery**, who collects, received, to collect
- Charges from the order
- **Send** — shows a “sent on WhatsApp” note in this demo. It does not deliver a real message.
- **Print** — the tax invoice with no office sidebar. Use the browser print dialog and choose **Save as PDF**. Back returns to the invoice.
- **Record payment**
  - **Part payment** — type an amount up to the balance
  - **Full settlement** — the whole balance, method **Cash**. On INV-00020 the recorded line is **Part payment · Rs 300** because the amount was the full balance; to collect went to **Rs 0** either way. Prefer **Full settlement** when you try it.
  - Method: **Cash**, **Bank**, or **Cheque**
  - The sheet says cash, bank, or cheque — never credit terms
  - Do not use **Cash advance**
- **Log return** — **+** on a line (capped at what was invoiced). The preview reads **Restock +N · Invoice −Rs …**. **Confirm returns.** Stock comes back and the invoice value drops.

Invoice list filters: **All · To collect · Paid · Draft**. Search invoice or customer. **Record payment** is also on the list.

## 5. Booker — collect on the route

Sign in as the booker who owns the order (Bilal for ORD-00028 / INV-00020).

A row with money still due shows **To collect** and **Collect**. Same sheet as the office: part or full, cash / bank / cheque, never credit. **Collect** also sits on Home.

After a full settlement the row reads **Collected**. Open the order to see the invoice code and the lines.

Bookers only see their own shops and orders. Sana does not see Bilal’s book.

## 6. Office — the rest of the desk

Walk these after the money loop. Read-only is enough; create only if you want to.

**Reports** — **Today · 7 days · This month · Export**. Orders, value, average, collections, returns, and a row per booker (orders, value, collected, returns).

**Products** — chips **All · Rice · Oil · Grocery · Pulses**, search SKU or name. **New product** opens a drawer (SKU, name, pack, price, reorder). The pencil opens product details. **Low** is the reorder warning (Olpers milk is the current low SKU).

**Customers** — shop, area, route, booker, outstanding, **Active**. **New customer**. Search shop, area, or route. Outstanding is the money column. Status is whether the shop account is active.

**Bookers** — who is on the road, orders today, value today, collected. **Add booker**. Per row: **Deactivate**, **Reset PIN**.

**Stock** — value on hand, units, low, out of stock. Brand chips. **Adjust** opens a sheet: product, **Delta** (the change, not the new total; `+50` receives fifty), reason **purchase / adjustment / correction**, **Apply**. The right rail is the movement list (invoice outward, return inward). **Ledger** opens the full list.

**Settings** — business name **Raseed Traders**, PKR, Asia/Karachi, office hours, invoice issuer (address, phone, NTN, STRN — empty fields are left off the printed sheet). Roles: bookers can see outstanding; offline capture queues until the phone is back. **Appearance → Dark office chrome** is marked **Not shipped**. **Save** writes business fields. Do not expect a dark theme.

## 7. Suggested pass (about 15 minutes)

1. Booker: Home → New order → Raza mart → Sugar 1kg × 1 → advance 0 → Place order. Note the ORD code.
2. Office: Orders → that ORD → Confirm order → Generate invoice → open the invoice.
3. Print, then Back.
4. Record payment → Full settlement → Cash.
5. Log return → 1 unit → Confirm returns.
6. Stock: find Sugar 1kg and the latest inward return.
7. Reports → This month. Products, Customers, Bookers, Settings — open each once.
8. Booker Account: name, today’s numbers, PKR, English, Install, Sign out.

You are done when the invoice shows the payment, the return line reduced the invoice, and Stock shows the unit back in.
