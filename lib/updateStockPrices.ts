// ============================================================
// lib/updateStockPrices.ts
//   Shared logic for fetching live stock prices and updating
//   the finance_portfolio_stocks table. Used by:
//     - /api/admin/finance/update-stock-prices  (cron / Bearer)
//     - /api/admin/finance/stocks               (cookie auth)
// ============================================================
import supabase from "./supabase";

const STOCKS_TABLE = "finance_portfolio_stocks";

/**
 * Fetch the current price for a single ticker via Yahoo Finance v8
 * chart endpoint (no API key required).
 */
export async function fetchPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
    )}?interval=1d&range=1d`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!resp.ok) {
      console.warn(`[update-stock-prices] Yahoo returned ${resp.status} for ${ticker}`);
      return null;
    }

    const json = await resp.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price: number | undefined =
      meta?.regularMarketPrice ?? meta?.previousClose;

    if (typeof price !== "number" || price <= 0) {
      console.warn(`[update-stock-prices] No valid price in response for ${ticker}`);
      return null;
    }

    return price;
  } catch (err) {
    console.error(`[update-stock-prices] fetch failed for ${ticker}`, err);
    return null;
  }
}

export interface PriceUpdateResult {
  updated: { ticker: string; oldPrice: number; newPrice: number }[];
  failed: string[];
  total: number;
}

/**
 * Fetch all tickers from the portfolio, get live prices, and
 * update every row that returns a valid price.
 */
export async function updateAllStockPrices(): Promise<PriceUpdateResult> {
  // 1. Fetch all tickers from the portfolio
  const { data: stocks, error: listErr } = await supabase
    .from(STOCKS_TABLE)
    .select("id, ticker, current_price_per_share");

  if (listErr) throw listErr;
  if (!stocks || stocks.length === 0) {
    return { updated: [], failed: [], total: 0 };
  }

  // 2. Fetch prices concurrently
  const results = await Promise.all(
    stocks.map(async (stock: any) => {
      const price = await fetchPrice(stock.ticker);
      return {
        id: stock.id,
        ticker: stock.ticker,
        oldPrice: Number(stock.current_price_per_share),
        newPrice: price,
      };
    })
  );

  // 3. Update each stock that got a valid price
  const updated: PriceUpdateResult["updated"] = [];
  const failed: string[] = [];

  for (const r of results) {
    if (r.newPrice === null) {
      failed.push(r.ticker);
      continue;
    }

    const { error: updErr } = await supabase
      .from(STOCKS_TABLE)
      .update({ current_price_per_share: r.newPrice })
      .eq("id", r.id);

    if (updErr) {
      console.error(`[update-stock-prices] DB update failed for ${r.ticker}`, updErr);
      failed.push(r.ticker);
      continue;
    }

    updated.push({ ticker: r.ticker, oldPrice: r.oldPrice, newPrice: r.newPrice });
  }

  return { updated, failed, total: stocks.length };
}
