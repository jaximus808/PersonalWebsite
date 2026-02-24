// ============================================================
// POST /api/admin/finance/hysa
//   { action: "list" | "add" | "remove" | "getConfig" | "setApy", ... }
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const TRANSFERS_TABLE = "finance_hysa_transfers";
const CONFIG_TABLE = "finance_hysa_config";

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
    // ── GET CONFIG (apy) ────────────────────────────────
    if (action === "getConfig") {
      const { data, error } = await supabase
        .from(CONFIG_TABLE)
        .select("*")
        .eq("id", 1)
        .single();

      if (error) throw error;

      return res.json({ ok: true, data: { apy: Number(data.apy) } });
    }

    // ── SET APY ─────────────────────────────────────────
    if (action === "setApy") {
      const { apy } = req.body;
      if (typeof apy !== "number" || apy < 0) {
        return res.status(400).json({ error: "Invalid APY" });
      }

      const { error } = await supabase
        .from(CONFIG_TABLE)
        .update({ apy })
        .eq("id", 1);

      if (error) throw error;

      return res.json({ ok: true });
    }

    // ── LIST TRANSFERS ──────────────────────────────────
    if (action === "list") {
      const { data, error } = await supabase
        .from(TRANSFERS_TABLE)
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount),
        date: r.date,
        createdAt: r.created_at,
      }));

      return res.json({ ok: true, data: mapped });
    }

    // ── ADD TRANSFER ────────────────────────────────────
    if (action === "add") {
      const { amount, date } = req.body;
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const { data, error } = await supabase
        .from(TRANSFERS_TABLE)
        .insert({
          amount,
          date: date || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (error) throw error;

      const mapped = {
        id: data.id,
        amount: Number(data.amount),
        date: data.date,
        createdAt: data.created_at,
      };

      return res.json({ ok: true, data: mapped });
    }

    // ── REMOVE TRANSFER ─────────────────────────────────
    if (action === "remove") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase
        .from(TRANSFERS_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/hysa]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
