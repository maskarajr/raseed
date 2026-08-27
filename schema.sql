-- ============================================================
-- Wholesale Sales Management System — PostgreSQL Schema
-- Run this against a fresh database: psql -d wholesale -f schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram search on names

-- ============================================================
-- USERS (salesmen + admins)
-- ============================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL CHECK (role IN ('salesman', 'admin')),
  phone                 TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE for all new salesman accounts
  last_active_at        TIMESTAMPTZ,                     -- updated on each login
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email  ON users (email);
CREATE INDEX idx_users_role   ON users (role);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,          -- normalized (digits only, no country code)
  address      TEXT,
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES users(id),
  deleted_at   TIMESTAMPTZ,            -- soft delete
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phone must be unique among non-deleted customers
CREATE UNIQUE INDEX idx_customers_phone_unique
  ON customers (phone)
  WHERE deleted_at IS NULL;

-- Trigram index for fuzzy name search
CREATE INDEX idx_customers_name_trgm
  ON customers USING GIN (name gin_trgm_ops);

CREATE INDEX idx_customers_created_by ON customers (created_by);

-- ============================================================
-- PRODUCTS (stock items)
-- ============================================================
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  sku                 TEXT NOT NULL UNIQUE,
  category            TEXT,
  unit                TEXT NOT NULL DEFAULT 'pcs',  -- e.g. pcs, kg, box, dozen
  price               NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock_qty           INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  reserved_qty        INTEGER NOT NULL DEFAULT 0,   -- soft reservation from PENDING invoices
  reorder_threshold   INTEGER,                      -- alert admin when available <= this
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at          TIMESTAMPTZ,                  -- soft delete
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Computed available qty (stock not locked by pending invoices)
-- available_qty = stock_qty - reserved_qty
-- Query as: stock_qty - reserved_qty AS available_qty

CREATE UNIQUE INDEX idx_products_sku_active
  ON products (sku)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_active    ON products (active) WHERE deleted_at IS NULL;

-- ============================================================
-- STOCK ADJUSTMENT LOG
-- Tracks every manual stock change (receive goods, corrections)
-- ============================================================
CREATE TABLE stock_adjustments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES products(id),
  adjusted_by  UUID NOT NULL REFERENCES users(id),
  adjustment   INTEGER NOT NULL,   -- positive = add, negative = remove
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_adj_product ON stock_adjustments (product_id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salesman_id        UUID NOT NULL REFERENCES users(id),
  customer_id        UUID NOT NULL REFERENCES customers(id),
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
  total_amount       NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  notes              TEXT,
  rejection_reason   TEXT,

  -- Offline sync fields
  local_id           TEXT NOT NULL UNIQUE,  -- '{deviceId}_{localUUID}' idempotency key
  created_at_device  TIMESTAMPTZ NOT NULL,  -- device clock at invoice creation
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  approved_at        TIMESTAMPTZ,
  approved_by        UUID REFERENCES users(id),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: rejection_reason required when rejected
ALTER TABLE invoices
  ADD CONSTRAINT chk_rejection_reason
  CHECK (status != 'rejected' OR rejection_reason IS NOT NULL);

-- Constraint: approved_at required when approved
ALTER TABLE invoices
  ADD CONSTRAINT chk_approved_at
  CHECK (status != 'approved' OR approved_at IS NOT NULL);

CREATE INDEX idx_invoices_salesman   ON invoices (salesman_id);
CREATE INDEX idx_invoices_customer   ON invoices (customer_id);
CREATE INDEX idx_invoices_status     ON invoices (status);
CREATE INDEX idx_invoices_device_ts  ON invoices (created_at_device DESC);
CREATE INDEX idx_invoices_synced_at  ON invoices (synced_at DESC);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE invoice_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  qty          INTEGER NOT NULL CHECK (qty > 0),
  unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal     NUMERIC(12, 2) NOT NULL,  -- qty * unit_price, stored for history
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice  ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_product  ON invoice_items (product_id);

-- ============================================================
-- PAYMENTS (receivables per invoice)
-- One payment record per invoice created on approval.
-- amount_paid updated separately as cash comes in.
-- ============================================================
CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id     UUID NOT NULL REFERENCES invoices(id),
  customer_id    UUID NOT NULL REFERENCES customers(id),
  amount_due     NUMERIC(12, 2) NOT NULL,
  amount_paid    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance        NUMERIC(12, 2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  payment_mode   TEXT CHECK (payment_mode IN ('cash', 'credit', 'mixed')),
  due_date       DATE,
  paid_at        TIMESTAMPTZ,        -- set when balance = 0
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice    ON payments (invoice_id);
CREATE INDEX idx_payments_customer   ON payments (customer_id);
CREATE INDEX idx_payments_balance    ON payments (balance) WHERE balance > 0;

-- ============================================================
-- SYNC LOG (audit trail for offline syncs)
-- ============================================================
CREATE TABLE sync_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      TEXT NOT NULL,
  salesman_id    UUID NOT NULL REFERENCES users(id),
  record_count   INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  error_detail   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_log_salesman ON sync_log (salesman_id);
CREATE INDEX idx_sync_log_device   ON sync_log (device_id);

-- ============================================================
-- TRIGGERS — updated_at auto-maintenance
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- LOW STOCK ALERT TRIGGER
-- Fires after any product update that might push available below threshold.
-- The API listens via NOTIFY / pg_notify and emits a WebSocket event.
-- ============================================================
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reorder_threshold IS NOT NULL
     AND (NEW.stock_qty - NEW.reserved_qty) <= NEW.reorder_threshold
     AND (OLD.stock_qty - OLD.reserved_qty) > NEW.reorder_threshold
  THEN
    PERFORM pg_notify(
      'low_stock',
      json_build_object(
        'product_id',     NEW.id,
        'name',           NEW.name,
        'available_qty',  NEW.stock_qty - NEW.reserved_qty,
        'threshold',      NEW.reorder_threshold
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_low_stock_notify
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- ============================================================
-- PASSWORD RESET LOG
-- Tracks temp passwords issued by admin (audit only — plain text never stored)
-- ============================================================
CREATE TABLE password_reset_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id),
  reset_by     UUID NOT NULL REFERENCES users(id),   -- admin who triggered it
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pwd_reset_user ON password_reset_log (user_id);

-- ============================================================
-- SEED DATA — Initial admin user
-- Password: admin123 (bcrypt hash — change immediately)
-- ============================================================
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@wholesale.local',
  '$2b$10$rOuLTRNQK8JFoQ1gIxOT3.HsxEGxUg7tOZm9j7lX2sVi8k5mC9.Vy',
  'admin'
);

-- ============================================================
-- USEFUL QUERIES (reference for API layer)
-- ============================================================

-- Available qty per product (use in every product SELECT)
-- SELECT *, (stock_qty - reserved_qty) AS available_qty FROM products;

-- Pending invoices with full detail
-- SELECT i.*, c.name as customer_name, c.phone, u.name as salesman_name
-- FROM invoices i
-- JOIN customers c ON c.id = i.customer_id
-- JOIN users u ON u.id = i.salesman_id
-- WHERE i.status = 'pending'
-- ORDER BY i.created_at_device ASC;

-- Customer outstanding balance
-- SELECT c.id, c.name, c.phone,
--        SUM(p.balance) as outstanding_balance
-- FROM customers c
-- JOIN payments p ON p.customer_id = c.id
-- WHERE p.balance > 0
-- GROUP BY c.id, c.name, c.phone
-- ORDER BY outstanding_balance DESC;

-- Salesman list with stats
-- SELECT u.id, u.name, u.email, u.phone, u.active, u.last_active_at,
--        COUNT(i.id) FILTER (WHERE i.status = 'approved') AS approved_invoices,
--        COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'approved'), 0) AS total_revenue
-- FROM users u
-- LEFT JOIN invoices i ON i.salesman_id = u.id
-- WHERE u.role = 'salesman'
-- GROUP BY u.id
-- ORDER BY total_revenue DESC;

-- Revenue by salesman (date range)
-- SELECT u.id, u.name,
--        COUNT(i.id) as order_count,
--        SUM(i.total_amount) as revenue,
--        AVG(i.total_amount) as avg_order
-- FROM invoices i
-- JOIN users u ON u.id = i.salesman_id
-- WHERE i.status = 'approved'
--   AND i.approved_at BETWEEN :from AND :to
-- GROUP BY u.id, u.name
-- ORDER BY revenue DESC;
