import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type {
  FinanceState,
  ProjectionConfig,
  SalaryPeriod,
  GoalPurchase,
  RecurringExpense,
  ProjectionPoint,
} from "../../types/finance";
import { runProjection } from "../../types/finance";
import { MultiLineChart } from "./FinanceChart";

// ────────────────────────────────────────────────────────────
// API helper (calls /api/admin/finance/projection)
// ────────────────────────────────────────────────────────────
async function projectionApi<T = any>(body: Record<string, any>): Promise<T> {
  const res = await fetch("/api/admin/finance/projection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`projection ${res.status}: ${text}`);
  }
  return res.json();
}

// ────────────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// ────────────────────────────────────────────────────────────
// Styles (match the parent page)
// ────────────────────────────────────────────────────────────
const inputCls =
  "bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const btnPrimary =
  "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors";
const btnDanger =
  "bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors";

// ────────────────────────────────────────────────────────────
// Debounce hook for auto-saving settings
// ────────────────────────────────────────────────────────────
function useDebouncedSave(
  fn: () => void,
  deps: any[],
  delay: number,
  ready: boolean
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);
  useEffect(() => {
    if (!ready) return;
    // skip the first render (initial load from API)
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ────────────────────────────────────────────────────────────
// ProjectionSection
// ────────────────────────────────────────────────────────────
interface ProjectionSectionProps {
  state: FinanceState;
}

export default function ProjectionSection({ state }: ProjectionSectionProps) {
  // ── Loading state ──
  const [loaded, setLoaded] = useState(false);

  // ── Salary periods ──
  const [salaryPeriods, setSalaryPeriods] = useState<SalaryPeriod[]>([]);
  const [spSalary, setSpSalary] = useState("");
  const [spStart, setSpStart] = useState(today());
  const [spEnd, setSpEnd] = useState("");
  const [spLabel, setSpLabel] = useState("");

  // ── Allocation & rate settings ──
  const [hysaAllocPct, setHysaAllocPct] = useState(20);
  const [stockAllocPct, setStockAllocPct] = useState(20);
  const [projectedHysaApy, setProjectedHysaApy] = useState(state.hysa.apy);
  const [projectedStockReturn, setProjectedStockReturn] = useState(10);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [yearsToProject, setYearsToProject] = useState(5);

  // ── Goal purchases ──
  const [goals, setGoals] = useState<GoalPurchase[]>([]);
  const [gpName, setGpName] = useState("");
  const [gpCost, setGpCost] = useState("");
  const [gpDate, setGpDate] = useState(futureDate(1));
  const [gpMonthly, setGpMonthly] = useState("");
  const [gpInterest, setGpInterest] = useState("");
  const [gpDown, setGpDown] = useState("");

  // ── Recurring expenses ──
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [reName, setReName] = useState("");
  const [reAmount, setReAmount] = useState("");
  const [reStart, setReStart] = useState(today());
  const [reEnd, setReEnd] = useState("");

  // ── Show/hide sections ──
  const [showSalaryForm, setShowSalaryForm] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(true);
  const [showRecurringForm, setShowRecurringForm] = useState(true);

  // ── Saving indicator ──
  const [saving, setSaving] = useState(false);

  // ────────────────────────────────────────────────────────
  // Load data from API on mount
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settingsRes, salaryRes, goalsRes, recurringRes] = await Promise.all([
          projectionApi<{ ok: boolean; data: any }>({ action: "getSettings" }),
          projectionApi<{ ok: boolean; data: any[] }>({ action: "listSalary" }),
          projectionApi<{ ok: boolean; data: any[] }>({ action: "listGoals" }),
          projectionApi<{ ok: boolean; data: any[] }>({ action: "listRecurring" }),
        ]);
        if (cancelled) return;

        const s = settingsRes.data;
        setHysaAllocPct(s.hysaAllocationPct);
        setStockAllocPct(s.stockAllocationPct);
        setProjectedHysaApy(s.projectedHysaApy);
        setProjectedStockReturn(s.projectedStockReturnPct);
        setMonthlyExpenses(s.monthlyExpenses);
        setYearsToProject(s.yearsToProject);

        setSalaryPeriods(salaryRes.data);
        setGoals(goalsRes.data);
        setRecurringExpenses(recurringRes.data);
        setLoaded(true);
      } catch (err) {
        console.error("[ProjectionSection] load error:", err);
        setLoaded(true); // still show UI with defaults
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ────────────────────────────────────────────────────────
  // Auto-save settings when they change (debounced 800ms)
  // ────────────────────────────────────────────────────────
  useDebouncedSave(
    () => {
      setSaving(true);
      projectionApi({
        action: "saveSettings",
        hysaAllocationPct: hysaAllocPct,
        stockAllocationPct: stockAllocPct,
        projectedHysaApy,
        projectedStockReturnPct: projectedStockReturn,
        monthlyExpenses,
        yearsToProject,
      })
        .catch((err) => console.error("[ProjectionSection] save settings error:", err))
        .finally(() => setSaving(false));
    },
    [hysaAllocPct, stockAllocPct, projectedHysaApy, projectedStockReturn, monthlyExpenses, yearsToProject],
    800,
    loaded
  );

  // ── Add salary period ──
  const addSalaryPeriod = useCallback(async () => {
    const salary = parseFloat(spSalary.replaceAll(',', ''));
    if (isNaN(salary) || salary <= 0 || !spLabel.trim()) return;
    try {
      const { data } = await projectionApi<{ ok: boolean; data: SalaryPeriod }>({
        action: "addSalary",
        annualSalary: salary,
        startDate: spStart,
        endDate: spEnd || "",
        label: spLabel.trim(),
      });
      setSalaryPeriods((prev) => [...prev, data]);
      setSpSalary("");
      setSpLabel("");
      setSpStart(today());
      setSpEnd("");
    } catch (err) {
      console.error("[ProjectionSection] addSalary error:", err);
    }
  }, [spSalary, spStart, spEnd, spLabel]);

  const removeSalaryPeriod = useCallback(async (id: string) => {
    try {
      await projectionApi({ action: "removeSalary", id });
      setSalaryPeriods((prev) => prev.filter((sp) => sp.id !== id));
    } catch (err) {
      console.error("[ProjectionSection] removeSalary error:", err);
    }
  }, []);

  // ── Add goal purchase ──
  const addGoal = useCallback(async () => {
    const cost = parseFloat(gpCost);
    if (isNaN(cost) || cost <= 0 || !gpName.trim()) return;
    const monthly = parseFloat(gpMonthly) || 0;
    const interest = parseFloat(gpInterest) || 0;
    const down = parseFloat(gpDown) || 0;
    try {
      const { data } = await projectionApi<{ ok: boolean; data: GoalPurchase }>({
        action: "addGoal",
        name: gpName.trim(),
        totalCost: cost,
        purchaseDate: gpDate,
        monthlyPayment: monthly,
        interestRate: interest,
        downPayment: down,
      });
      setGoals((prev) => [...prev, data]);
      setGpName("");
      setGpCost("");
      setGpDate(futureDate(1));
      setGpMonthly("");
      setGpInterest("");
      setGpDown("");
    } catch (err) {
      console.error("[ProjectionSection] addGoal error:", err);
    }
  }, [gpName, gpCost, gpDate, gpMonthly, gpInterest, gpDown]);

  const removeGoal = useCallback(async (id: string) => {
    try {
      await projectionApi({ action: "removeGoal", id });
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error("[ProjectionSection] removeGoal error:", err);
    }
  }, []);

  // ── Add recurring expense ──
  const addRecurringExpense = useCallback(async () => {
    const amount = parseFloat(reAmount);
    if (isNaN(amount) || amount <= 0 || !reName.trim()) return;
    try {
      const { data } = await projectionApi<{ ok: boolean; data: RecurringExpense }>({
        action: "addRecurring",
        name: reName.trim(),
        monthlyAmount: amount,
        startDate: reStart,
        endDate: reEnd || "",
      });
      setRecurringExpenses((prev) => [...prev, data]);
      setReName("");
      setReAmount("");
      setReStart(today());
      setReEnd("");
    } catch (err) {
      console.error("[ProjectionSection] addRecurring error:", err);
    }
  }, [reName, reAmount, reStart, reEnd]);

  const removeRecurringExpense = useCallback(async (id: string) => {
    try {
      await projectionApi({ action: "removeRecurring", id });
      setRecurringExpenses((prev) => prev.filter((re) => re.id !== id));
    } catch (err) {
      console.error("[ProjectionSection] removeRecurring error:", err);
    }
  }, []);

  // ── Build projection ──
  const config: ProjectionConfig = useMemo(
    () => ({
      salaryPeriods,
      hysaAllocationPct: hysaAllocPct,
      stockAllocationPct: stockAllocPct,
      projectedHysaApy,
      projectedStockReturnPct: projectedStockReturn,
      monthlyExpenses,
      goalPurchases: goals,
      recurringExpenses,
      yearsToProject,
    }),
    [salaryPeriods, hysaAllocPct, stockAllocPct, projectedHysaApy, projectedStockReturn, monthlyExpenses, goals, recurringExpenses, yearsToProject]
  );

  const projection: ProjectionPoint[] = useMemo(
    () => runProjection(state, config),
    [state, config]
  );

  // Chart data – merge all series into one array for recharts
  const chartData = useMemo(
    () =>
      projection.map((p) => ({
        date: p.date,
        "Net Worth": p.netWorth,
        Checking: p.checking,
        HYSA: p.hysa,
        Stocks: p.stocks,
        "Loan Balance": -p.loanBalance,
        label: p.label,
      })),
    [projection]
  );

  // Summary stats from projection
  const finalPoint = projection.length > 0 ? projection[projection.length - 1] : null;
  const startPoint = projection.length > 0 ? projection[0] : null;
  const totalGrowth = finalPoint && startPoint ? finalPoint.netWorth - startPoint.netWorth : 0;

  // ── Loading spinner ──
  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <svg className="animate-spin h-6 w-6 mr-3 text-indigo-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading projection data…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* saving indicator */}
      {saving && (
        <div className="text-xs text-indigo-400 animate-pulse">Saving settings…</div>
      )}

      {/* ── Controls grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Salary & Settings ── */}
        <div className="flex flex-col gap-4">
          <h3 className="text-md font-semibold text-gray-300">
            💼 Salary Schedule
            <button
              className="ml-3 text-xs text-gray-500 hover:text-gray-300"
              onClick={() => setShowSalaryForm((v) => !v)}
            >
              {showSalaryForm ? "▼ hide" : "▶ show"}
            </button>
          </h3>

          {showSalaryForm && (
            <>
              {/* Existing salary periods */}
              {salaryPeriods.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">Label</th>
                        <th className="px-3 py-2 text-right">Annual</th>
                        <th className="px-3 py-2 text-left">Start</th>
                        <th className="px-3 py-2 text-left">End</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {salaryPeriods.map((sp) => (
                        <tr key={sp.id} className="hover:bg-gray-900/60">
                          <td className="px-3 py-2">{sp.label}</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-medium">
                            {fmt(sp.annualSalary)}
                          </td>
                          <td className="px-3 py-2 text-gray-400">{sp.startDate}</td>
                          <td className="px-3 py-2 text-gray-400">{sp.endDate || "Ongoing"}</td>
                          <td className="px-3 py-2 text-right">
                            <button className={btnDanger} onClick={() => removeSalaryPeriod(sp.id)}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add salary period form */}
              <div className="flex flex-wrap gap-2 items-end">
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Label
                  <input
                    type="text"
                    placeholder="Promotion, Raise…"
                    className={inputCls + " w-36"}
                    value={spLabel}
                    onChange={(e) => setSpLabel(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Annual Salary
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="80000"
                    className={inputCls + " w-28"}
                    value={spSalary}
                    onChange={(e) => setSpSalary(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Start
                  <input
                    type="date"
                    className={inputCls + " w-36"}
                    value={spStart}
                    onChange={(e) => setSpStart(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  End (blank = ongoing)
                  <input
                    type="date"
                    className={inputCls + " w-36"}
                    value={spEnd}
                    onChange={(e) => setSpEnd(e.target.value)}
                  />
                </label>
                <button className={btnPrimary} onClick={addSalaryPeriod}>
                  + Add Period
                </button>
              </div>
            </>
          )}

          {/* ── Allocation & Rate Settings ── */}
          <h3 className="text-md font-semibold text-gray-300 mt-2">⚙️ Allocation & Rates</h3>
          <p className="text-[11px] text-gray-500 -mt-2">
            &ldquo;Projected Monthly Spend&rdquo; is subtracted from checking each month in the projection.
            Set to 0 if you don&rsquo;t want recurring expenses in the forecast.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              HYSA Alloc (%)
              <input
                type="number"
                min="0"
                max="100"
                className={inputCls + " w-20"}
                value={hysaAllocPct}
                onChange={(e) => setHysaAllocPct(parseFloat(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Stock Alloc (%)
              <input
                type="number"
                min="0"
                max="100"
                className={inputCls + " w-20"}
                value={stockAllocPct}
                onChange={(e) => setStockAllocPct(parseFloat(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Checking (%)
              <div className={inputCls + " w-20 text-gray-500 cursor-not-allowed"}>
                {Math.max(0, 100 - hysaAllocPct - stockAllocPct)}%
              </div>
            </label>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              HYSA APY (%)
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputCls + " w-20"}
                value={projectedHysaApy}
                onChange={(e) => setProjectedHysaApy(parseFloat(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Stock Return (% annual)
              <input
                type="number"
                min="-100"
                step="0.5"
                className={inputCls + " w-20"}
                value={projectedStockReturn}
                onChange={(e) => setProjectedStockReturn(parseFloat(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Projected Monthly Spend ($)
              <input
                type="number"
                min="0"
                step="100"
                placeholder="0 = no drain"
                className={inputCls + " w-28"}
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(parseFloat(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Years to Project
              <input
                type="number"
                min="1"
                max="30"
                className={inputCls + " w-16"}
                value={yearsToProject}
                onChange={(e) => setYearsToProject(parseInt(e.target.value) || 5)}
              />
            </label>
          </div>
        </div>

        {/* ── Right: Goal Purchases ── */}
        <div className="flex flex-col gap-4">
          <h3 className="text-md font-semibold text-gray-300">
            🎯 Goal Purchases
            <button
              className="ml-3 text-xs text-gray-500 hover:text-gray-300"
              onClick={() => setShowGoalForm((v) => !v)}
            >
              {showGoalForm ? "▼ hide" : "▶ show"}
            </button>
          </h3>

          {showGoalForm && (
            <>
              {/* Existing goals */}
              {goals.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">Goal</th>
                        <th className="px-3 py-2 text-right">Cost</th>
                        <th className="px-3 py-2 text-right">Down</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">Mo. Pay</th>
                        <th className="px-3 py-2 text-right">APR</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {goals.map((g) => {
                        const financed = g.totalCost - g.downPayment;
                        const months =
                          g.monthlyPayment > 0 ? Math.ceil(financed / g.monthlyPayment) : 0;
                        const totalInterest =
                          g.interestRate > 0 && g.monthlyPayment > 0
                            ? estimateTotalInterest(financed, g.interestRate, g.monthlyPayment)
                            : 0;
                        return (
                          <tr key={g.id} className="hover:bg-gray-900/60">
                            <td className="px-3 py-2">
                              <div>{g.name}</div>
                              {months > 0 && (
                                <div className="text-[10px] text-gray-500">
                                  ~{months} months · ~{fmt(totalInterest)} interest
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-red-400 font-medium">
                              {fmt(g.totalCost)}
                            </td>
                            <td className="px-3 py-2 text-right text-amber-400">
                              {fmt(g.downPayment)}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{g.purchaseDate}</td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {g.monthlyPayment > 0 ? fmt(g.monthlyPayment) : "Paid in full"}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-400">
                              {g.interestRate > 0 ? `${g.interestRate}%` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button className={btnDanger} onClick={() => removeGoal(g.id)}>
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add goal form */}
              <div className="flex flex-wrap gap-2 items-end">
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Name
                  <input
                    type="text"
                    placeholder="Car, House down…"
                    className={inputCls + " w-36"}
                    value={gpName}
                    onChange={(e) => setGpName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Total Cost
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="60000"
                    className={inputCls + " w-28"}
                    value={gpCost}
                    onChange={(e) => setGpCost(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Down Payment
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="10000"
                    className={inputCls + " w-28"}
                    value={gpDown}
                    onChange={(e) => setGpDown(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Purchase Date
                  <input
                    type="date"
                    className={inputCls + " w-36"}
                    value={gpDate}
                    onChange={(e) => setGpDate(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Monthly Payment
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="0 = paid in full"
                    className={inputCls + " w-32"}
                    value={gpMonthly}
                    onChange={(e) => setGpMonthly(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Interest Rate (APR %)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="5.9"
                    className={inputCls + " w-24"}
                    value={gpInterest}
                    onChange={(e) => setGpInterest(e.target.value)}
                  />
                </label>
                <button className={btnPrimary} onClick={addGoal}>
                  + Add Goal
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recurring Expense Schedule ── */}
      <div className="flex flex-col gap-4">
        <h3 className="text-md font-semibold text-gray-300">
          🔁 Recurring Expense Schedule
          <button
            className="ml-3 text-xs text-gray-500 hover:text-gray-300"
            onClick={() => setShowRecurringForm((v) => !v)}
          >
            {showRecurringForm ? "▼ hide" : "▶ show"}
          </button>
          {recurringExpenses.length > 0 && !showRecurringForm && (
            <span className="ml-2 text-xs text-gray-500">
              ({recurringExpenses.length} expense{recurringExpenses.length !== 1 ? "s" : ""} ·{" "}
              {fmt(recurringExpenses.reduce((s, re) => s + re.monthlyAmount, 0))}/mo)
            </span>
          )}
        </h3>
        <p className="text-[11px] text-gray-500 -mt-2">
          Monthly costs that recur over a date range (e.g. rent, subscriptions, insurance).
          Each active expense is subtracted from checking every month in the projection.
        </p>

        {showRecurringForm && (
          <>
            {/* Existing recurring expenses */}
            {recurringExpenses.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left">Expense</th>
                      <th className="px-3 py-2 text-right">Monthly</th>
                      <th className="px-3 py-2 text-left">Start</th>
                      <th className="px-3 py-2 text-left">End</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {recurringExpenses.map((re) => (
                      <tr key={re.id} className="hover:bg-gray-900/60">
                        <td className="px-3 py-2">{re.name}</td>
                        <td className="px-3 py-2 text-right text-red-400 font-medium">
                          {fmt(re.monthlyAmount)}
                        </td>
                        <td className="px-3 py-2 text-gray-400">{re.startDate}</td>
                        <td className="px-3 py-2 text-gray-400">{re.endDate || "Ongoing"}</td>
                        <td className="px-3 py-2 text-right">
                          <button className={btnDanger} onClick={() => removeRecurringExpense(re.id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-gray-900/40 font-semibold">
                      <td className="px-3 py-2 text-gray-300">Total</td>
                      <td className="px-3 py-2 text-right text-red-400">
                        {fmt(recurringExpenses.reduce((s, re) => s + re.monthlyAmount, 0))}/mo
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Add recurring expense form */}
            <div className="flex flex-wrap gap-2 items-end">
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Name
                <input
                  type="text"
                  placeholder="Rent, Netflix, Insurance…"
                  className={inputCls + " w-44"}
                  value={reName}
                  onChange={(e) => setReName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Monthly Amount
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="1500"
                  className={inputCls + " w-28"}
                  value={reAmount}
                  onChange={(e) => setReAmount(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Start
                <input
                  type="date"
                  className={inputCls + " w-36"}
                  value={reStart}
                  onChange={(e) => setReStart(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                End (blank = ongoing)
                <input
                  type="date"
                  className={inputCls + " w-36"}
                  value={reEnd}
                  onChange={(e) => setReEnd(e.target.value)}
                />
              </label>
              <button className={btnPrimary} onClick={addRecurringExpense}>
                + Add Expense
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Summary cards ── */}
      {finalPoint && startPoint && (
        <div className="flex flex-wrap gap-4 mt-2">
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
            <span className="text-gray-400 text-xs uppercase tracking-wider">Starting NW</span>
            <span className="text-xl font-bold text-white">{fmt(startPoint.netWorth)}</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Projected NW ({yearsToProject}yr)
            </span>
            <span className={`text-xl font-bold ${finalPoint.netWorth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(finalPoint.netWorth)}
            </span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
            <span className="text-gray-400 text-xs uppercase tracking-wider">Total Growth</span>
            <span className={`text-xl font-bold ${totalGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalGrowth >= 0 ? "+" : ""}{fmt(totalGrowth)}
            </span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
            <span className="text-gray-400 text-xs uppercase tracking-wider">HYSA ({yearsToProject}yr)</span>
            <span className="text-sky-400 text-xl font-bold">{fmt(finalPoint.hysa)}</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
            <span className="text-gray-400 text-xs uppercase tracking-wider">Stocks ({yearsToProject}yr)</span>
            <span className="text-indigo-400 text-xl font-bold">{fmt(finalPoint.stocks)}</span>
          </div>
          {finalPoint.loanBalance > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Outstanding Loans</span>
              <span className="text-red-400 text-xl font-bold">{fmt(finalPoint.loanBalance)}</span>
            </div>
          )}
          {finalPoint.goalSpent > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Goal Spending</span>
              <span className="text-amber-400 text-xl font-bold">{fmt(finalPoint.goalSpent)}</span>
            </div>
          )}
          {recurringExpenses.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Recurring (/mo)</span>
              <span className="text-orange-400 text-xl font-bold">
                {fmt(recurringExpenses.reduce((s, re) => s + re.monthlyAmount, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Projection Graph ── */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-md font-semibold text-gray-300 mb-4">
          📈 Net Worth Projection ({yearsToProject} years)
        </h3>
        <MultiLineChart
          data={chartData}
          lines={[
            { dataKey: "Net Worth", name: "Net Worth", color: "#818cf8" },
            { dataKey: "Checking", name: "Checking", color: "#34d399" },
            { dataKey: "HYSA", name: "HYSA", color: "#38bdf8" },
            { dataKey: "Stocks", name: "Stocks", color: "#f472b6" },
            ...(goals.length > 0
              ? [{ dataKey: "Loan Balance", name: "Loan Balance", color: "#ef4444" }]
              : []),
          ]}
          height={400}
          refLines={goals.map((g) => ({
            y: -0, // We'll show vertical event markers via labels in tooltip
            label: "",
            color: "transparent",
          }))}
        />
      </div>

      {/* ── Goal payoff details ── */}
      {goals.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4">
          <h3 className="text-md font-semibold text-gray-300 mb-3">📋 Goal Payoff Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const financed = g.totalCost - g.downPayment;
              const totalInterest =
                g.interestRate > 0 && g.monthlyPayment > 0
                  ? estimateTotalInterest(financed, g.interestRate, g.monthlyPayment)
                  : 0;
              const totalPaid = g.downPayment + financed + totalInterest;
              const months =
                g.monthlyPayment > 0 ? estimatePayoffMonths(financed, g.interestRate, g.monthlyPayment) : 0;
              const payoffDate = new Date(g.purchaseDate);
              payoffDate.setMonth(payoffDate.getMonth() + months);

              return (
                <div key={g.id} className="bg-gray-900 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{g.name}</span>
                    <span className="text-red-400 font-bold">{fmt(g.totalCost)}</span>
                  </div>
                  <div className="text-xs text-gray-400 flex flex-col gap-1">
                    <span>Purchase: {g.purchaseDate}</span>
                    <span>Down Payment: <span className="text-amber-400">{fmt(g.downPayment)}</span></span>
                    <span>Financed: <span className="text-white">{fmt(financed)}</span></span>
                    {g.monthlyPayment > 0 && (
                      <>
                        <span>Monthly Payment: <span className="text-white">{fmt(g.monthlyPayment)}</span></span>
                        <span>Interest Rate: <span className="text-white">{g.interestRate}% APR</span></span>
                        <span>Total Interest: <span className="text-red-400">{fmt(totalInterest)}</span></span>
                        <span>Total Paid: <span className="text-red-400">{fmt(totalPaid)}</span></span>
                        <span>Payoff: ~{months} months ({payoffDate.toISOString().slice(0, 7)})</span>
                      </>
                    )}
                    {g.monthlyPayment === 0 && (
                      <span className="text-emerald-400">Paid in full on purchase date</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Loan math helpers
// ────────────────────────────────────────────────────────────

/** Estimate total interest paid on a loan with fixed monthly payments. */
function estimateTotalInterest(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  if (principal <= 0 || monthlyPayment <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return 0;

  let balance = principal;
  let totalInterest = 0;
  let safety = 0;
  while (balance > 0.01 && safety < 1200) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance += interest;
    const payment = Math.min(monthlyPayment, balance);
    balance -= payment;
    safety++;
  }
  return totalInterest;
}

/** Estimate how many months to pay off a loan. */
function estimatePayoffMonths(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  if (principal <= 0 || monthlyPayment <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return Math.ceil(principal / monthlyPayment);

  let balance = principal;
  let months = 0;
  while (balance > 0.01 && months < 1200) {
    balance += balance * monthlyRate;
    balance -= Math.min(monthlyPayment, balance);
    months++;
  }
  return months;
}
