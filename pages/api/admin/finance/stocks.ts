// ============================================================
// POST /api/admin/finance/stocks
//   Portfolio stocks + buy/sell transactions
//   Actions: listStocks, addStock, removeStock, updatePrice,
//            listTransactions, addTransaction, removeTransaction
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";
import { updateAllStockPrices } from "../../../../lib/updateStockPrices";

const STOCKS_TABLE = "finance_portfolio_stocks";
const TX_TABLE = "finance_stock_transactions";

function isAuthed(req: NextApiRequest): boolean {
  const parsed = cookies.parse(req.headers.cookie ?? "");
  const token = parsed.token;
  if (!token) return false;
  try {
    jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body;

  try {
    // ── LIST STOCKS ─────────────────────────────────────
    if (action === "listStocks") {
      const { data, error } = await supabase
        .from(STOCKS_TABLE)
        .select("*")
        .order("ticker", { ascending: true });

      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        ticker: r.ticker,
        currentPricePerShare: Number(r.current_price_per_share),
        createdAt: r.created_at,
      }));

      return res.json({ ok: true, data: mapped });
    }

    // ── ADD STOCK ───────────────────────────────────────
    if (action === "addStock") {
      const { ticker, currentPricePerShare } = req.body;
      if (!ticker) {
        return res.status(400).json({ error: "Missing ticker" });
      }

      const { data, error } = await supabase
        .from(STOCKS_TABLE)
        .insert({
          ticker: ticker.toUpperCase().trim(),
          current_price_per_share: currentPricePerShare ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        ok: true,
        data: {
          id: data.id,
          ticker: data.ticker,
          currentPricePerShare: Number(data.current_price_per_share),
          createdAt: data.created_at,
        },
      });
    }

    // ── REMOVE STOCK (cascades transactions) ────────────
    if (action === "removeStock") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(STOCKS_TABLE).delete().eq("id", id);
      if (error) throw error;

      return res.json({ ok: true });
    }

    // ── UPDATE PRICE ────────────────────────────────────
    if (action === "updatePrice") {
      const { id, currentPricePerShare } = req.body;
      if (!id || typeof currentPricePerShare !== "number" || currentPricePerShare < 0) {
        return res.status(400).json({ error: "Invalid data" });
      }

      const { error } = await supabase
        .from(STOCKS_TABLE)
        .update({ current_price_per_share: currentPricePerShare })
        .eq("id", id);

      if (error) throw error;

      return res.json({ ok: true });
    }

    // ── LIST TRANSACTIONS ───────────────────────────────
    if (action === "listTransactions") {
      const { data, error } = await supabase
        .from(TX_TABLE)
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        stockId: r.stock_id,
        type: r.type as "buy" | "sell",
        shares: Number(r.shares),
        pricePerShare: Number(r.price_per_share),
        date: r.date,
        createdAt: r.created_at,
      }));

      return res.json({ ok: true, data: mapped });
    }

    // ── ADD TRANSACTION ─────────────────────────────────
    if (action === "addTransaction") {
      const { stockId, type, shares, pricePerShare, date } = req.body;

      if (
        !stockId ||
        !["buy", "sell"].includes(type) ||
        typeof shares !== "number" ||
        shares <= 0 ||
        typeof pricePerShare !== "number" ||
        pricePerShare <= 0
      ) {
        return res.status(400).json({ error: "Invalid transaction data" });
      }

      const { data, error } = await supabase
        .from(TX_TABLE)
        .insert({
          stock_id: stockId,
          type,
          shares,
          price_per_share: pricePerShare,
          date: date || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        ok: true,
        data: {
          id: data.id,
          stockId: data.stock_id,
          type: data.type as "buy" | "sell",
          shares: Number(data.shares),
          pricePerShare: Number(data.price_per_share),
          date: data.date,
          createdAt: data.created_at,
        },
      });
    }

    // ── REMOVE TRANSACTION ──────────────────────────────
    if (action === "removeTransaction") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(TX_TABLE).delete().eq("id", id);
      if (error) throw error;

      return res.json({ ok: true });
    }

    // ── REFRESH ALL PRICES (live fetch) ─────────────────
    if (action === "refreshAllPrices") {
      const result = await updateAllStockPrices();
      return res.json({ ok: true, ...result });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/stocks]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
