-- ============================================================
-- Finance Projection – Salary Periods, Goal Purchases, Settings
-- Run AFTER finance_schema.sql, finance_migration_stocks.sql,
-- and finance_migration_debts.sql
-- ============================================================

-- ── 1. Projection settings (single-row, like starting_balances) ──
CREATE TABLE IF NOT EXISTS finance_projection_settings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hysa_allocation_pct     real NOT NULL DEFAULT 20,
  stock_allocation_pct    real NOT NULL DEFAULT 20,
  projected_hysa_apy      real NOT NULL DEFAULT 4.0,
  projected_stock_return   real NOT NULL DEFAULT 10,
  monthly_expenses        real NOT NULL DEFAULT 0,
  years_to_project        integer NOT NULL DEFAULT 5,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_projection_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON finance_projection_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 2. Salary periods ──
CREATE TABLE IF NOT EXISTS finance_salary_periods (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_salary   real NOT NULL,
  start_date      date NOT NULL,
  end_date        date,               -- NULL = ongoing
  label           text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_salary_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON finance_salary_periods
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_salary_periods_start
  ON finance_salary_periods (start_date);

-- ── 3. Goal purchases ──
CREATE TABLE IF NOT EXISTS finance_goal_purchases (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  total_cost      real NOT NULL,
  purchase_date   date NOT NULL,
  monthly_payment real NOT NULL DEFAULT 0,
  interest_rate   real NOT NULL DEFAULT 0,
  down_payment    real NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_goal_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON finance_goal_purchases
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_goal_purchases_date
  ON finance_goal_purchases (purchase_date);

-- ── 4. Fix: update default monthly_expenses from 3000 to 0 ──
-- If the settings row was already created with the old default,
-- reset it so the user isn't surprised by phantom expenses.
ALTER TABLE finance_projection_settings
  ALTER COLUMN monthly_expenses SET DEFAULT 0;

UPDATE finance_projection_settings
  SET monthly_expenses = 0
  WHERE monthly_expenses = 3000;
