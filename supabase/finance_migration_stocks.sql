-- ============================================================
-- Migration: Portfolio Stocks + Stock Transactions
-- Run this in the Supabase SQL Editor AFTER the original schema.
-- This adds the new portfolio model alongside the existing
-- finance_stock_holdings table (which can be dropped later).
-- ============================================================

-- 1. Portfolio Stocks – a stock/ETF in the portfolio (one row per ticker)
create table if not exists finance_portfolio_stocks (
  id                      uuid primary key default gen_random_uuid(),
  ticker                  text           not null unique,
  current_price_per_share numeric(12,4)  not null default 0,
  created_at              timestamptz    not null default now()
);

alter table finance_portfolio_stocks enable row level security;
create policy "service_role_all" on finance_portfolio_stocks
  for all using (true) with check (true);

-- 2. Stock Transactions – buy/sell transactions under a portfolio stock
create table if not exists finance_stock_transactions (
  id              uuid primary key default gen_random_uuid(),
  stock_id        uuid           not null references finance_portfolio_stocks(id) on delete cascade,
  type            text           not null check (type in ('buy', 'sell')),
  shares          numeric(14,4)  not null check (shares > 0),
  price_per_share numeric(12,4)  not null check (price_per_share > 0),
  date            date           not null default current_date,
  created_at      timestamptz    not null default now()
);

create index if not exists idx_stock_transactions_stock_id
  on finance_stock_transactions (stock_id);

alter table finance_stock_transactions enable row level security;
create policy "service_role_all" on finance_stock_transactions
  for all using (true) with check (true);
