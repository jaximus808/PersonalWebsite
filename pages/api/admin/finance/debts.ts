// ============================================================
// POST /api/admin/finance/debts   { action: "list" | "add" | "remove" | "settle" | "unsettle" }
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const TABLE = "finance_debts";

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

function mapRow(r: any) {
  return {
    id: r.id,
    person: r.person,
    direction: r.direction as "i_owe" | "they_owe",
    amount: Number(r.amount),
    description: r.description ?? "",
    date: r.date,
    settled: r.settled,
    settledAt: r.settled_at ?? null,
    createdAt: r.created_at,
  };
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
        .order("settled", { ascending: true })
        .order("date", { ascending: false });

      if (error) throw error;
      return res.json({ ok: true, data: (data ?? []).map(mapRow) });
    }

    // ── ADD ─────────────────────────────────────────────
    if (action === "add") {
      const { person, direction, amount, description, date } = req.body;
      if (!person || typeof person !== "string") {
        return res.status(400).json({ error: "Missing person" });
      }
      if (!["i_owe", "they_owe"].includes(direction)) {
        return res.status(400).json({ error: "Invalid direction" });
      }
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          person: person.trim(),
          direction,
          amount,
          description: (description ?? "").trim(),
          date: date || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, data: mapRow(data) });
    }

    // ── REMOVE ──────────────────────────────────────────
    if (action === "remove") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── SETTLE ──────────────────────────────────────────
    if (action === "settle") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { data, error } = await supabase
        .from(TABLE)
        .update({ settled: true, settled_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, data: mapRow(data) });
    }

    // ── UNSETTLE (undo) ─────────────────────────────────
    if (action === "unsettle") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { data, error } = await supabase
        .from(TABLE)
        .update({ settled: false, settled_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, data: mapRow(data) });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/debts]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
