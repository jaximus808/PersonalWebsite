-- ============================================================
-- Migration: Debts (Payable & Receivable)
-- Run this in the Supabase SQL Editor AFTER previous migrations.
-- ============================================================

-- finance_debts – tracks money I owe others and others owe me
create table if not exists finance_debts (
  id          uuid primary key default gen_random_uuid(),
  person      text            not null,              -- who (name)
  direction   text            not null check (direction in ('i_owe', 'they_owe')),
  amount      numeric(12,2)   not null check (amount > 0),
  description text            not null default '',
  date        date            not null default current_date,   -- when the debt started
  settled     boolean         not null default false,          -- has this been paid off?
  settled_at  timestamptz,                                      -- when it was settled
  created_at  timestamptz     not null default now()
);

create index if not exists idx_finance_debts_direction
  on finance_debts (direction);

create index if not exists idx_finance_debts_settled
  on finance_debts (settled);

alter table finance_debts enable row level security;
create policy "service_role_all" on finance_debts
  for all using (true) with check (true);
