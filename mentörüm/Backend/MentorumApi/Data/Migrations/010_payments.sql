CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  student_id UUID NOT NULL,
  parent_id UUID NULL,
  period_type VARCHAR(16) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  month_day INTEGER NULL,
  start_date DATE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  due_date DATE NOT NULL,
  base_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  paid_at TIMESTAMPTZ NULL,
  rolled_from_item_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(32) NULL,
  recorded_by UUID NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(16) NOT NULL DEFAULT 'PAID',
  receipt_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
