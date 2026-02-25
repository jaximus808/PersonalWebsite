// ============================================================
// POST /api/admin/finance/projection
// Actions: getSettings, saveSettings, listSalary, addSalary,
//          removeSalary, listGoals, addGoal, removeGoal,
//          listRecurring, addRecurring, removeRecurring
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../../lib/supabase";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const SETTINGS_TABLE = "finance_projection_settings";
const SALARY_TABLE = "finance_salary_periods";
const GOALS_TABLE = "finance_goal_purchases";
const RECURRING_TABLE = "finance_recurring_expenses";

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

// ── Row mappers ─────────────────────────────────────────────

function mapSettings(r: any) {
  return {
    id: r.id,
    hysaAllocationPct: Number(r.hysa_allocation_pct),
    stockAllocationPct: Number(r.stock_allocation_pct),
    projectedHysaApy: Number(r.projected_hysa_apy),
    projectedStockReturnPct: Number(r.projected_stock_return),
    monthlyExpenses: Number(r.monthly_expenses),
    yearsToProject: Number(r.years_to_project),
  };
}

function mapSalary(r: any) {
  return {
    id: r.id,
    annualSalary: Number(r.annual_salary),
    startDate: r.start_date,
    endDate: r.end_date ?? "",
    label: r.label ?? "",
    createdAt: r.created_at,
  };
}

function mapGoal(r: any) {
  return {
    id: r.id,
    name: r.name,
    totalCost: Number(r.total_cost),
    purchaseDate: r.purchase_date,
    monthlyPayment: Number(r.monthly_payment),
    interestRate: Number(r.interest_rate),
    downPayment: Number(r.down_payment),
    createdAt: r.created_at,
  };
}

function mapRecurring(r: any) {
  return {
    id: r.id,
    name: r.name,
    monthlyAmount: Number(r.monthly_amount),
    startDate: r.start_date,
    endDate: r.end_date ?? "",
    createdAt: r.created_at,
  };
}

// ── Handler ────────────────────────────────────────────────

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
    // ── GET SETTINGS ────────────────────────────────────
    if (action === "getSettings") {
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select("*")
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        // Create default settings row
        const { data: created, error: createError } = await supabase
          .from(SETTINGS_TABLE)
          .insert({})
          .select()
          .single();

        if (createError) throw createError;
        return res.json({ ok: true, data: mapSettings(created) });
      }

      return res.json({ ok: true, data: mapSettings(data[0]) });
    }

    // ── SAVE SETTINGS ───────────────────────────────────
    if (action === "saveSettings") {
      const {
        hysaAllocationPct,
        stockAllocationPct,
        projectedHysaApy,
        projectedStockReturnPct,
        monthlyExpenses,
        yearsToProject,
      } = req.body;

      // Get existing row (or create one)
      const { data: existing } = await supabase
        .from(SETTINGS_TABLE)
        .select("id")
        .limit(1);

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (hysaAllocationPct !== undefined)
        payload.hysa_allocation_pct = hysaAllocationPct;
      if (stockAllocationPct !== undefined)
        payload.stock_allocation_pct = stockAllocationPct;
      if (projectedHysaApy !== undefined)
        payload.projected_hysa_apy = projectedHysaApy;
      if (projectedStockReturnPct !== undefined)
        payload.projected_stock_return = projectedStockReturnPct;
      if (monthlyExpenses !== undefined)
        payload.monthly_expenses = monthlyExpenses;
      if (yearsToProject !== undefined)
        payload.years_to_project = yearsToProject;

      let result;
      if (existing && existing.length > 0) {
        const { data, error } = await supabase
          .from(SETTINGS_TABLE)
          .update(payload)
          .eq("id", existing[0].id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from(SETTINGS_TABLE)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return res.json({ ok: true, data: mapSettings(result) });
    }

    // ── LIST SALARY PERIODS ─────────────────────────────
    if (action === "listSalary") {
      const { data, error } = await supabase
        .from(SALARY_TABLE)
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return res.json({ ok: true, data: (data ?? []).map(mapSalary) });
    }

    // ── ADD SALARY PERIOD ───────────────────────────────
    if (action === "addSalary") {
      const { annualSalary, startDate, endDate, label } = req.body;
      if (typeof annualSalary !== "number" || annualSalary <= 0) {
        return res.status(400).json({ error: "Invalid annualSalary" });
      }
      if (!startDate) {
        return res.status(400).json({ error: "Missing startDate" });
      }

      const { data, error } = await supabase
        .from(SALARY_TABLE)
        .insert({
          annual_salary: annualSalary,
          start_date: startDate,
          end_date: endDate || null,
          label: (label ?? "").trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, data: mapSalary(data) });
    }

    // ── REMOVE SALARY PERIOD ────────────────────────────
    if (action === "removeSalary") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(SALARY_TABLE).delete().eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── LIST GOAL PURCHASES ─────────────────────────────
    if (action === "listGoals") {
      const { data, error } = await supabase
        .from(GOALS_TABLE)
        .select("*")
        .order("purchase_date", { ascending: true });

      if (error) throw error;
      return res.json({ ok: true, data: (data ?? []).map(mapGoal) });
    }

    // ── ADD GOAL PURCHASE ───────────────────────────────
    if (action === "addGoal") {
      const { name, totalCost, purchaseDate, monthlyPayment, interestRate, downPayment } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Missing name" });
      }
      if (typeof totalCost !== "number" || totalCost <= 0) {
        return res.status(400).json({ error: "Invalid totalCost" });
      }
      if (!purchaseDate) {
        return res.status(400).json({ error: "Missing purchaseDate" });
      }

      const { data, error } = await supabase
        .from(GOALS_TABLE)
        .insert({
          name: name.trim(),
          total_cost: totalCost,
          purchase_date: purchaseDate,
          monthly_payment: monthlyPayment ?? 0,
          interest_rate: interestRate ?? 0,
          down_payment: downPayment ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, data: mapGoal(data) });
    }

    // ── REMOVE GOAL PURCHASE ────────────────────────────
    if (action === "removeGoal") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(GOALS_TABLE).delete().eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── LIST RECURRING EXPENSES ─────────────────────────
    if (action === "listRecurring") {
      const { data, error } = await supabase
        .from(RECURRING_TABLE)
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return res.json({ ok: true, data: (data ?? []).map(mapRecurring) });
    }

    // ── ADD RECURRING EXPENSE ───────────────────────────
    if (action === "addRecurring") {
      const { name, monthlyAmount, startDate, endDate } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Missing name" });
      }
      if (typeof monthlyAmount !== "number" || monthlyAmount <= 0) {
        return res.status(400).json({ error: "Invalid monthlyAmount" });
      }
      if (!startDate) {
        return res.status(400).json({ error: "Missing startDate" });
      }

      const { data, error } = await supabase
        .from(RECURRING_TABLE)
        .insert({
          name: name.trim(),
          monthly_amount: monthlyAmount,
          start_date: startDate,
          end_date: endDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, data: mapRecurring(data) });
    }

    // ── REMOVE RECURRING EXPENSE ────────────────────────
    if (action === "removeRecurring") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from(RECURRING_TABLE).delete().eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: any) {
    console.error("[finance/projection]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
