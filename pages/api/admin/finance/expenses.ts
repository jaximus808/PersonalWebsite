// ============================================================
// POST /api/admin/finance/expenses   { action: "list" | "add" | "remove", ... }
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const TABLE = "finance_expenses";

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
    // ── LIST ────────────────────────────────────────────
    if (action === "list") {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        amount: Number(r.amount),
        recurring: r.recurring,
        date: r.date,
        createdAt: r.created_at,
      }));

      return res.json({ ok: true, data: mapped });
    }

    // ── ADD ─────────────────────────────────────────────
    if (action === "add") {
      const { name, amount, recurring, date } = req.body;
      if (!name || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid name or amount" });
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          name,
          amount,
          recurring: recurring ?? true,
          date: date || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (error) throw error;

      const mapped = {
        id: data.id,
        name: data.name,
        amount: Number(data.amount),
        recurring: data.recurring,
        date: data.date,
        createdAt: data.created_at,
      };

      return res.json({ ok: true, data: mapped });
    }

    // ── REMOVE ──────────────────────────────────────────
    if (action === "remove") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;

      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/expenses]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
