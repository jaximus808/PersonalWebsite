// ============================================================
// POST /api/admin/finance/balances
// Actions: get, set
// Single-row table for starting balances (checking, hysa, stocks)
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const TABLE = "finance_starting_balances";

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
    // ── GET ─────────────────────────────────────────────
    if (action === "get") {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", 1)
        .single();

      if (error && error.code === "PGRST116") {
        // Row doesn't exist yet – return defaults
        return res.json({
          ok: true,
          data: { checking: 0, hysa: 0, stocks: 0 },
        });
      }
      if (error) throw error;

      return res.json({
        ok: true,
        data: {
          checking: Number(data.checking),
          hysa: Number(data.hysa),
          stocks: Number(data.stocks),
        },
      });
    }

    // ── SET ─────────────────────────────────────────────
    if (action === "set") {
      const { checking, hysa, stocks } = req.body;

      const updates: Record<string, number> = {};
      if (typeof checking === "number") updates.checking = checking;
      if (typeof hysa === "number") updates.hysa = hysa;
      if (typeof stocks === "number") updates.stocks = stocks;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const { error } = await supabase
        .from(TABLE)
        .upsert({ id: 1, ...updates }, { onConflict: "id" });

      if (error) throw error;

      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/balances]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
