import bcrypt from 'bcryptjs'
import { pool } from '../db.js'

// Idempotent demo seed: admin password, one salesman, product catalog.
async function main() {
  const adminHash = await bcrypt.hash('admin123', 10)
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin','admin@wholesale.local',$1,'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [adminHash],
  )

  const salesHash = await bcrypt.hash('salesman123', 10)
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone, must_change_password)
     VALUES ('Ali Khan','ali@shop.com',$1,'salesman','03001234567',FALSE)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, must_change_password = FALSE`,
    [salesHash],
  )

  const products: Array<[string, string, string, string, number, number, number]> = [
    ['Sunflower Cooking Oil 5L', 'OIL-5L', 'Grocery', 'box', 2200, 120, 20],
    ['Basmati Rice 25kg', 'RICE-25', 'Grocery', 'bag', 4800, 60, 10],
    ['White Sugar 50kg', 'SUG-50', 'Grocery', 'bag', 5200, 40, 8],
    ['Wheat Flour 10kg', 'FLR-10', 'Grocery', 'bag', 950, 200, 30],
    ['Green Tea 250g', 'TEA-250', 'Beverage', 'box', 380, 300, 50],
    ['Powder Milk 900g', 'MILK-900', 'Dairy', 'tin', 1150, 90, 15],
  ]
  for (const [name, sku, category, unit, price, stock, threshold] of products) {
    await pool.query(
      `INSERT INTO products (name, sku, category, unit, price, stock_qty, reorder_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price`,
      [name, sku, category, unit, price, stock, threshold],
    )
  }

  console.log('[seed] admin(admin@wholesale.local/admin123), salesman(ali@shop.com/salesman123), 6 products')
  await pool.end()
}

main().catch((e) => {
  console.error('[seed] failed:', e.message)
  process.exit(1)
})
