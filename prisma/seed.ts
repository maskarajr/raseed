import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const OWNER = { name: "Agency Owner", email: "owner@raseed.local", password: "owner123" };
const BOOKERS = [
  { name: "Bilal Booker", email: "bilal@raseed.local", password: "booker123" },
  { name: "Sana Salesman", email: "sana@raseed.local", password: "booker123" },
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

const CUSTOMERS = [
  { name: "Al-Madina Kiryana Store", phone: "0300-1234567", address: "Shop 4, Main Bazaar", area: "Gulberg" },
  { name: "New Sabzi Mandi Store", phone: "0321-2223344", address: "Stall 12, Vegetable Market", area: "Johar Town" },
  { name: "Bismillah General Store", phone: "0333-9988776", address: "Block C, Model Town", area: "Model Town" },
  { name: "Rehman Karyana", phone: "0345-5566778", address: "Street 8, Township", area: "Township" },
  { name: "City Mart", phone: "0301-4455667", address: "Plaza 2, Main Boulevard", area: "DHA" },
];

async function main() {
  const ownerHash = await bcrypt.hash(OWNER.password, 10);
  const owner = await prisma.user.upsert({
    where: { email: OWNER.email },
    update: {
      name: OWNER.name,
      role: "owner",
      passwordHash: ownerHash,
      active: true,
    },
    create: {
      name: OWNER.name,
      email: OWNER.email,
      passwordHash: ownerHash,
      role: "owner",
    },
  });

  const bookers = [];
  for (const b of BOOKERS) {
    const hash = await bcrypt.hash(b.password, 10);
    const booker = await prisma.user.upsert({
      where: { email: b.email },
      update: {
        name: b.name,
        role: "booker",
        passwordHash: hash,
        active: true,
      },
      create: {
        name: b.name,
        email: b.email,
        passwordHash: hash,
        role: "booker",
      },
    });
    bookers.push(booker);
  }

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }

  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.customer.create({
        data: { ...c, createdBy: owner.id },
      });
    }
  }

  console.log("\n=== Raseed seed complete ===");
  console.log(`Products: ${PRODUCTS.length}, Customers: ${CUSTOMERS.length}`);
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
