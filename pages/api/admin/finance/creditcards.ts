// ============================================================
// POST /api/admin/finance/creditcards
// Actions: listCards, addCard, removeCard,
//          listCategories, addCategory, removeCategory,
//          setRate,
//          listTransactions, addTransaction, removeTransaction
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const CARDS_TABLE = "finance_credit_cards";
const CATEGORIES_TABLE = "finance_spending_categories";
const RATES_TABLE = "finance_category_card_rates";
const TX_TABLE = "finance_cc_transactions";

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
    // ── LIST CARDS ──────────────────────────────────────
    if (action === "listCards") {
      const { data, error } = await supabase
        .from(CARDS_TABLE)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        last4: r.last4,
        createdAt: r.created_at,
      }));
      return res.json({ ok: true, data: mapped });
    }

    // ── ADD CARD ────────────────────────────────────────
    if (action === "addCard") {
      const { name, last4 } = req.body;
      if (!name) return res.status(400).json({ error: "Missing name" });
      const { data, error } = await supabase
        .from(CARDS_TABLE)
        .insert({ name, last4: last4 || "0000" })
        .select()
        .single();
      if (error) throw error;
      return res.json({
        ok: true,
        data: {
          id: data.id,
          name: data.name,
          last4: data.last4,
          createdAt: data.created_at,
        },
      });
    }

    // ── REMOVE CARD ─────────────────────────────────────
    if (action === "removeCard") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });
      const { error } = await supabase.from(CARDS_TABLE).delete().eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── LIST CATEGORIES ─────────────────────────────────
    if (action === "listCategories") {
      // Fetch categories
      const { data: cats, error: cErr } = await supabase
        .from(CATEGORIES_TABLE)
        .select("*")
        .order("created_at", { ascending: true });
      if (cErr) throw cErr;

      // Fetch all rates
      const { data: rates, error: rErr } = await supabase
        .from(RATES_TABLE)
        .select("*");
      if (rErr) throw rErr;

      // Build pointsRates map per category
      const mapped = (cats ?? []).map((c: any) => {
        const pointsRates: Record<string, number> = {};
        for (const r of rates ?? []) {
          if (r.category_id === c.id) {
            pointsRates[r.card_id] = Number(r.rate);
          }
        }
        return {
          id: c.id,
          name: c.name,
          pointsRates,
          createdAt: c.created_at,
        };
      });
      return res.json({ ok: true, data: mapped });
    }

    // ── ADD CATEGORY ────────────────────────────────────
    if (action === "addCategory") {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Missing name" });
      const { data, error } = await supabase
        .from(CATEGORIES_TABLE)
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return res.json({
        ok: true,
        data: {
          id: data.id,
          name: data.name,
          pointsRates: {},
          createdAt: data.created_at,
        },
      });
    }

    // ── REMOVE CATEGORY ─────────────────────────────────
    if (action === "removeCategory") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });
      const { error } = await supabase
        .from(CATEGORIES_TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── SET RATE (per card per category) ────────────────
    if (action === "setRate") {
      const { categoryId, cardId, rate } = req.body;
      if (!categoryId || !cardId || typeof rate !== "number") {
        return res.status(400).json({ error: "Missing categoryId, cardId, or rate" });
      }
      // Upsert
      const { error } = await supabase.from(RATES_TABLE).upsert(
        { category_id: categoryId, card_id: cardId, rate },
        { onConflict: "category_id,card_id" }
      );
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── LIST TRANSACTIONS ───────────────────────────────
    if (action === "listTransactions") {
      const { data, error } = await supabase
        .from(TX_TABLE)
        .select(`
          *,
          finance_credit_cards ( name ),
          finance_spending_categories ( name )
        `)
        .order("date", { ascending: false });
      if (error) throw error;
      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.finance_credit_cards?.name ?? "",
        categoryId: r.category_id,
        categoryName: r.finance_spending_categories?.name ?? "",
        amount: Number(r.amount),
        description: r.description,
        pointsEarned: Number(r.points_earned),
        date: r.date,
        createdAt: r.created_at,
      }));
      return res.json({ ok: true, data: mapped });
    }

    // ── ADD TRANSACTION ─────────────────────────────────
    if (action === "addTransaction") {
      const { cardId, categoryId, amount, description, date } = req.body;
      if (!cardId || !categoryId || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid transaction data" });
      }

      // Look up the points rate for this card + category
      const { data: rateRow } = await supabase
        .from(RATES_TABLE)
        .select("rate")
        .eq("card_id", cardId)
        .eq("category_id", categoryId)
        .single();

      const rate = rateRow ? Number(rateRow.rate) : 1;
      const pointsEarned = amount * rate;

      const { data, error } = await supabase
        .from(TX_TABLE)
        .insert({
          card_id: cardId,
          category_id: categoryId,
          amount,
          description: description || "",
          points_earned: pointsEarned,
          date: date || new Date().toISOString().slice(0, 10),
        })
        .select(`
          *,
          finance_credit_cards ( name ),
          finance_spending_categories ( name )
        `)
        .single();
      if (error) throw error;

      return res.json({
        ok: true,
        data: {
          id: data.id,
          cardId: data.card_id,
          cardName: data.finance_credit_cards?.name ?? "",
          categoryId: data.category_id,
          categoryName: data.finance_spending_categories?.name ?? "",
          amount: Number(data.amount),
          description: data.description,
          pointsEarned: Number(data.points_earned),
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

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/creditcards]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
