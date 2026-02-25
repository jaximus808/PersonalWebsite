-- ============================================================
-- Finance Recurring Expenses – monthly expenses with date ranges
-- Run AFTER finance_migration_projection.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  monthly_amount  real NOT NULL,
  start_date      date NOT NULL,
  end_date        date,               -- NULL = ongoing
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON finance_recurring_expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_start
  ON finance_recurring_expenses (start_date);
