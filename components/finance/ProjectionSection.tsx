import React, { useState, useMemo, useCallback } from "react";
import type {
  FinanceState,
  ProjectionConfig,
  SalaryPeriod,
  GoalPurchase,
  ProjectionPoint,
} from "../../types/finance";
import { runProjection, generateId } from "../../types/finance";
import { MultiLineChart } from "./FinanceChart";

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
// ProjectionSection
// ────────────────────────────────────────────────────────────
interface ProjectionSectionProps {
  state: FinanceState;
}

export default function ProjectionSection({ state }: ProjectionSectionProps) {
  // ── Salary periods ──
  const [salaryPeriods, setSalaryPeriods] = useState<SalaryPeriod[]>([
    {
      id: generateId(),
      annualSalary: 80000,
      startDate: today(),
      endDate: "",
      label: "Starting salary",
    },
  ]);
  const [spSalary, setSpSalary] = useState("");
  const [spStart, setSpStart] = useState(today());
  const [spEnd, setSpEnd] = useState("");
  const [spLabel, setSpLabel] = useState("");

  // ── Allocation & rate settings ──
  const [hysaAllocPct, setHysaAllocPct] = useState(20);
  const [stockAllocPct, setStockAllocPct] = useState(20);
  const [projectedHysaApy, setProjectedHysaApy] = useState(state.hysa.apy);
  const [projectedStockReturn, setProjectedStockReturn] = useState(10);
  const [monthlyExpenses, setMonthlyExpenses] = useState(3000);
  const [yearsToProject, setYearsToProject] = useState(5);

  // ── Goal purchases ──
  const [goals, setGoals] = useState<GoalPurchase[]>([]);
  const [gpName, setGpName] = useState("");
  const [gpCost, setGpCost] = useState("");
  const [gpDate, setGpDate] = useState(futureDate(1));
  const [gpMonthly, setGpMonthly] = useState("");
  const [gpInterest, setGpInterest] = useState("");
  const [gpDown, setGpDown] = useState("");

  // ── Show/hide sections ──
  const [showSalaryForm, setShowSalaryForm] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(true);

  // ── Add salary period ──
  const addSalaryPeriod = useCallback(() => {
    const salary = parseFloat(spSalary);
    if (isNaN(salary) || salary <= 0 || !spLabel.trim()) return;
    setSalaryPeriods((prev) => [
      ...prev,
      {
        id: generateId(),
        annualSalary: salary,
        startDate: spStart,
        endDate: spEnd,
        label: spLabel.trim(),
      },
    ]);
    setSpSalary("");
    setSpLabel("");
    setSpStart(today());
    setSpEnd("");
  }, [spSalary, spStart, spEnd, spLabel]);

  const removeSalaryPeriod = useCallback((id: string) => {
    setSalaryPeriods((prev) => prev.filter((sp) => sp.id !== id));
  }, []);

  // ── Add goal purchase ──
  const addGoal = useCallback(() => {
    const cost = parseFloat(gpCost);
    if (isNaN(cost) || cost <= 0 || !gpName.trim()) return;
    const monthly = parseFloat(gpMonthly) || 0;
    const interest = parseFloat(gpInterest) || 0;
    const down = parseFloat(gpDown) || 0;
    setGoals((prev) => [
      ...prev,
      {
        id: generateId(),
        name: gpName.trim(),
        totalCost: cost,
        purchaseDate: gpDate,
        monthlyPayment: monthly,
        interestRate: interest,
        downPayment: down,
      },
    ]);
    setGpName("");
    setGpCost("");
    setGpDate(futureDate(1));
    setGpMonthly("");
    setGpInterest("");
    setGpDown("");
  }, [gpName, gpCost, gpDate, gpMonthly, gpInterest, gpDown]);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
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
      yearsToProject,
    }),
    [salaryPeriods, hysaAllocPct, stockAllocPct, projectedHysaApy, projectedStockReturn, monthlyExpenses, goals, yearsToProject]
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

  return (
    <div className="flex flex-col gap-6">
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
              Monthly Expenses
              <input
                type="number"
                min="0"
                step="100"
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
