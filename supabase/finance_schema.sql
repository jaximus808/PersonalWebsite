-- ============================================================
-- Supabase SQL Schema for Finance Tracker
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Deposits – money deposited into checking
create table if not exists finance_deposits (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(12,2)   not null check (amount > 0),
  description text            not null default 'Deposit',
  date        date            not null default current_date,
  created_at  timestamptz     not null default now()
);

-- 2. Monthly Expenses – recurring or one-time debits from checking
create table if not exists finance_expenses (
  id          uuid primary key default gen_random_uuid(),
  name        text            not null,
  amount      numeric(12,2)   not null check (amount > 0),
  recurring   boolean         not null default true,
  date        date            not null default current_date,
  created_at  timestamptz     not null default now()
);

-- 3. HYSA Config – single-row table holding the current APY
--    We use a CHECK to guarantee exactly one row.
create table if not exists finance_hysa_config (
  id   int primary key default 1 check (id = 1),
  apy  numeric(6,4) not null default 4.5000
);

-- Seed the single config row (no-op if it already exists)
insert into finance_hysa_config (id, apy)
values (1, 4.5000)
on conflict (id) do nothing;

-- 4. HYSA Transfers – money moved from checking → HYSA
create table if not exists finance_hysa_transfers (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(12,2)   not null check (amount > 0),
  date        date            not null default current_date,
  created_at  timestamptz     not null default now()
);

-- 5. Stock Holdings – individual purchase lots
create table if not exists finance_stock_holdings (
  id                     uuid primary key default gen_random_uuid(),
  ticker                 text           not null,
  shares                 numeric(14,4)  not null check (shares > 0),
  cost_basis_per_share   numeric(12,4)  not null check (cost_basis_per_share > 0),
  current_price_per_share numeric(12,4) not null check (current_price_per_share > 0),
  date                   date           not null default current_date,
  created_at             timestamptz    not null default now()
);

-- Index for grouping / filtering stocks by ticker
create index if not exists idx_stock_holdings_ticker
  on finance_stock_holdings (ticker);

-- 6. Credit Cards
create table if not exists finance_credit_cards (
  id          uuid primary key default gen_random_uuid(),
  name        text            not null,
  last4       text            not null default '0000',
  created_at  timestamptz     not null default now()
);

-- 7. Spending Categories (Food, Gas, Travel, etc.)
create table if not exists finance_spending_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text            not null,
  created_at  timestamptz     not null default now()
);

-- 8. Per-card per-category points rate (e.g. Chase Sapphire gets 3x on Food)
create table if not exists finance_category_card_rates (
  id          uuid    primary key default gen_random_uuid(),
  category_id uuid    not null references finance_spending_categories(id) on delete cascade,
  card_id     uuid    not null references finance_credit_cards(id) on delete cascade,
  rate        numeric(6,2) not null default 1,
  unique(category_id, card_id)
);

-- 9. Credit Card Transactions
create table if not exists finance_cc_transactions (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid           not null references finance_credit_cards(id) on delete cascade,
  category_id   uuid           not null references finance_spending_categories(id) on delete cascade,
  amount        numeric(12,2)  not null check (amount > 0),
  description   text           not null default '',
  points_earned numeric(12,2)  not null default 0,
  date          date           not null default current_date,
  created_at    timestamptz    not null default now()
);

-- 10. Starting Balances (single-row table)
create table if not exists finance_starting_balances (
  id       int primary key default 1 check (id = 1),
  checking numeric(12,2) not null default 0,
  hysa     numeric(12,2) not null default 0,
  stocks   numeric(12,2) not null default 0
);

insert into finance_starting_balances (id, checking, hysa, stocks)
values (1, 0, 0, 0)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security (RLS)
-- These tables are accessed exclusively through the service-role
-- key from our Next.js API routes, so we enable RLS but grant
-- full access to the service role. If you later add user-scoped
-- access, add policies per-user instead.
-- ============================================================

alter table finance_deposits             enable row level security;
alter table finance_expenses             enable row level security;
alter table finance_hysa_config          enable row level security;
alter table finance_hysa_transfers       enable row level security;
alter table finance_stock_holdings       enable row level security;
alter table finance_credit_cards         enable row level security;
alter table finance_spending_categories  enable row level security;
alter table finance_category_card_rates  enable row level security;
alter table finance_cc_transactions      enable row level security;
alter table finance_starting_balances    enable row level security;

-- Allow service_role full access (already implicit, but explicit is clearer)
create policy "service_role_all" on finance_deposits             for all using (true) with check (true);
create policy "service_role_all" on finance_expenses             for all using (true) with check (true);
create policy "service_role_all" on finance_hysa_config          for all using (true) with check (true);
create policy "service_role_all" on finance_hysa_transfers       for all using (true) with check (true);
create policy "service_role_all" on finance_stock_holdings       for all using (true) with check (true);
create policy "service_role_all" on finance_credit_cards         for all using (true) with check (true);
create policy "service_role_all" on finance_spending_categories  for all using (true) with check (true);
create policy "service_role_all" on finance_category_card_rates  for all using (true) with check (true);
create policy "service_role_all" on finance_cc_transactions      for all using (true) with check (true);
create policy "service_role_all" on finance_starting_balances    for all using (true) with check (true);
