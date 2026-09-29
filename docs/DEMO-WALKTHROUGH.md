# Raseed demo — client walkthrough

Live demo: **https://demo.raseed.xyz**

Booker captures the order. Office confirms and invoices. Booker collects the cash. Same ledger.

Cash on delivery. Collect part or full on the invoice. Cash, bank, or cheque. Leave **Cash advance taken now** at `0`.

The database is shared. Small qtys only.

## Sign in

| Card | Email | Password |
| --- | --- | --- |
| Office | `owner@raseed.local` | `owner123` |
| Booker | `bilal@raseed.local` | `booker123` |

Pick the card, then **Sign in**.

## Recorded pass

The recording that keeps the whole window on screen is the one to use. That pass is **ORD-00037** → **INV-00027** (Al-Madina Kiryana Store, Sugar 1kg × 1, Rs 150, full cash). Catalog example: **DEMO-CARD-33** Demo Cardamom 50g, opening stock 5, reorder 20, then stock **+30** purchase and **−10** adjustment (on hand 25).

## 1. Office

Sign in as Office. Open each tab once: Dashboard, Reports, Orders, Invoices, Products, Customers, Bookers, Stock, Settings. Sign out.

## 2. Booker

Sign in as Booker. Open Home, Orders, Account. Stay signed in.

## 3. Booker places the order

**New** → **Al-Madina Kiryana Store** → **Sugar 1kg** qty **1** → cash advance **0** → **Collect on delivery Rs 150** → **Place order**. Note the ORD code. Sign out.

## 4. Office confirms and invoices

Office → **Orders** → that ORD → **Confirm order** → **Generate invoice** → the invoice opens (Rs 150 to collect, cash on delivery). Sign out.

## 5. Booker collects

Booker → **Orders** → **Collect** → **Full settlement** → **Cash** → **Record payment**. The row shows **Collected**. Sign out.

## 6. Office updates the catalog

Office → **Products** → **New product**.

- SKU `DEMO-CARD-32` (use a new SKU if that one exists)
- Name `Demo Cardamom 50g`
- Unit `pack`, rate `180`, category `Grocery`
- Opening stock `5`, reorder level `20`
- **Create product** (5 on hand against reorder 20 shows **Low**)

**Stock** → **Adjust** → that SKU → delta `30`, reason `purchase`, **Apply** (on hand 35). **Adjust** again → delta `-10`, reason `adjustment`, **Apply** (on hand 25). The movement rail shows both lines.
