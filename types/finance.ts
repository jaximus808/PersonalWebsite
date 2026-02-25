// ============================================================
// Finance Data Models
// ============================================================

/** A single deposit into the checking account. */
export interface Deposit {
  id: string;
  amount: number; // positive
  description: string;
  date: string; // ISO date string
  createdAt: string;
}

/** A recurring (or one-time) monthly expense that debits checking. */
export interface MonthlyExpense {
  id: string;
  name: string;
  amount: number; // positive – will be subtracted from checking
  /** If true the expense repeats every month. */
  recurring: boolean;
  date: string; // ISO date string
  createdAt: string;
}

/** A transfer from checking → HYSA bucket. */
export interface HYSATransfer {
  id: string;
  amount: number; // positive
  date: string; // ISO date string
  createdAt: string;
}

/** HYSA bucket configuration. */
export interface HYSABucket {
  /** Annual percentage yield, e.g. 4.5 means 4.5 % */
  apy: number;
  transfers: HYSATransfer[];
}

/** A stock/ETF in the portfolio. */
export interface PortfolioStock {
  id: string;
  ticker: string; // e.g. "VOO", "AAPL"
  currentPricePerShare: number; // latest price (manually updated)
  createdAt: string;
}

/** A buy or sell transaction for a portfolio stock. */
export interface StockTransaction {
  id: string;
  stockId: string;
  type: "buy" | "sell";
  shares: number; // always positive
  pricePerShare: number; // price at time of transaction
  date: string; // ISO date string
  createdAt: string;
}

/**
 * Legacy interface kept for migration reference.
 * @deprecated Use PortfolioStock + StockTransaction instead.
 */
export interface StockHolding {
  id: string;
  ticker: string;
  shares: number;
  costBasisPerShare: number;
  currentPricePerShare: number;
  date: string;
  createdAt: string;
}

// ── Credit Card types ─────────────────────────────────────

/** A credit card. */
export interface CreditCard {
  id: string;
  name: string; // e.g. "Chase Sapphire"
  last4: string; // last 4 digits
  createdAt: string;
}

/** A spending category with per-card points rates. */
export interface SpendingCategory {
  id: string;
  name: string; // e.g. "Food", "Gas", "Travel"
  /** Points multiplier per dollar per card. key = cardId, value = rate (e.g. 3 = 3x) */
  pointsRates: Record<string, number>;
  createdAt: string;
}

/** A credit card transaction. */
export interface CreditCardTransaction {
  id: string;
  cardId: string;
  cardName?: string; // denormalized for display
  categoryId: string;
  categoryName?: string; // denormalized for display
  amount: number; // positive – withdraws from checking
  description: string;
  pointsEarned: number; // computed at insertion: amount * rate
  date: string;
  createdAt: string;
}

// ── Debts (payable & receivable) ──────────────────────────

/** A debt – either I owe someone, or they owe me. */
export interface Debt {
  id: string;
  person: string;           // who
  direction: "i_owe" | "they_owe";
  amount: number;            // always positive
  description: string;
  date: string;              // ISO date – when the debt started
  settled: boolean;
  settledAt: string | null;
  createdAt: string;
}

// ── Starting balances ─────────────────────────────────────

/**
 * Starting balances for each bucket.
 * These override the "transfer-from-checking" logic:
 * e.g. HYSA starting amount is just the initial balance, not
 * derived from checking transfers.
 */
export interface StartingBalances {
  checking: number;
  hysa: number;
  stocks: number;
}

// ── Top-level state ───────────────────────────────────────

/** Top-level state for the entire finance tracker. */
export interface FinanceState {
  deposits: Deposit[];
  monthlyExpenses: MonthlyExpense[];
  hysa: HYSABucket;
  portfolioStocks: PortfolioStock[];
  stockTransactions: StockTransaction[];
  creditCards: CreditCard[];
  spendingCategories: SpendingCategory[];
  ccTransactions: CreditCardTransaction[];
  debts: Debt[];
  startingBalances: StartingBalances;
}

// ============================================================
// Computed / derived helpers (pure functions – no side effects)
// ============================================================

/** Sum of all deposits. */
export function totalDeposits(state: FinanceState): number {
  return state.deposits.reduce((sum, d) => sum + d.amount, 0);
}

/** Sum of all monthly expenses. */
export function totalExpenses(state: FinanceState): number {
  return state.monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Sum of all money transferred into HYSA. */
export function totalHYSATransfers(state: FinanceState): number {
  return state.hysa.transfers.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Estimate current HYSA value by applying simple daily-compounded interest
 * from each transfer's date to today.
 * Starts from the HYSA starting balance.
 */
export function estimatedHYSAValue(state: FinanceState): number {
  const now = Date.now();
  const dailyRate = state.hysa.apy / 100 / 365;

  // Starting balance accrues interest from "the beginning" (no extra compounding – flat base)
  let total = state.startingBalances.hysa;

  // Each transfer accrues interest from its date
  for (const t of state.hysa.transfers) {
    const days = Math.max(0, (now - new Date(t.date).getTime()) / 86_400_000);
    total += t.amount * Math.pow(1 + dailyRate, days);
  }
  return total;
}

/** Total cost basis of all stock purchases (buys − sells at their cost). */
export function totalStockCostBasis(state: FinanceState): number {
  return state.stockTransactions.reduce((sum, t) => {
    const cost = t.shares * t.pricePerShare;
    return t.type === "buy" ? sum + cost : sum - cost;
  }, 0);
}

/** Total current market value of all stock holdings (net shares × current price). */
export function totalStockMarketValue(state: FinanceState): number {
  // Build net shares per stockId
  const netShares = new Map<string, number>();
  for (const t of state.stockTransactions) {
    const cur = netShares.get(t.stockId) ?? 0;
    netShares.set(t.stockId, t.type === "buy" ? cur + t.shares : cur - t.shares);
  }
  let total = 0;
  for (const stock of state.portfolioStocks) {
    const shares = netShares.get(stock.id) ?? 0;
    if (shares > 0) {
      total += shares * stock.currentPricePerShare;
    }
  }
  return total;
}

/** Total amount spent via credit cards (withdraws from checking). */
export function totalCCSpend(state: FinanceState): number {
  return state.ccTransactions.reduce((sum, t) => sum + t.amount, 0);
}

/** Points earned per card. Returns Map<cardId, totalPoints>. */
export function pointsByCard(state: FinanceState): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of state.ccTransactions) {
    map.set(t.cardId, (map.get(t.cardId) ?? 0) + t.pointsEarned);
  }
  return map;
}

/** Total unsettled debts I owe (subtracts from checking). */
export function totalDebtsIOwe(state: FinanceState): number {
  return state.debts
    .filter((d) => d.direction === "i_owe" && !d.settled)
    .reduce((sum, d) => sum + d.amount, 0);
}

/** Total unsettled debts others owe me (potential receivable, not in checking). */
export function totalDebtsTheyOwe(state: FinanceState): number {
  return state.debts
    .filter((d) => d.direction === "they_owe" && !d.settled)
    .reduce((sum, d) => sum + d.amount, 0);
}

/**
 * Checking account balance.
 * = startingBalance + deposits − expenses − HYSA transfers − stock cost basis − CC spend − debts I owe
 */
export function checkingBalance(state: FinanceState): number {
  return (
    state.startingBalances.checking +
    totalDeposits(state) -
    totalExpenses(state) -
    totalHYSATransfers(state) -
    totalStockCostBasis(state) -
    totalCCSpend(state) -
    totalDebtsIOwe(state)
  );
}

/**
 * Net worth = checking + HYSA estimated value + stock starting balance + stock market value + debts receivable
 * Debts receivable (they owe me) are counted as a separate asset line, NOT added to checking.
 */
export function netWorth(state: FinanceState): number {
  return (
    checkingBalance(state) +
    estimatedHYSAValue(state) +
    state.startingBalances.stocks +
    totalStockMarketValue(state) +
    totalDebtsTheyOwe(state)
  );
}

// ============================================================
// Graph & Projection types
// ============================================================

/** A single data point for time-series graphs. */
export interface TimeSeriesPoint {
  date: string;   // ISO date "YYYY-MM-DD"
  value: number;
  label?: string; // optional event label
}

/** Salary period (biweekly pay between two dates). */
export interface SalaryPeriod {
  id: string;
  annualSalary: number;
  startDate: string; // ISO date
  endDate: string;   // ISO date (empty string = ongoing)
  label: string;     // e.g. "Starting salary", "Promotion 1"
}

/** A goal purchase with optional financing. */
export interface GoalPurchase {
  id: string;
  name: string;
  totalCost: number;
  /** When you plan to buy it (ISO date). */
  purchaseDate: string;
  /** Monthly payment if financed. 0 = paid in full on purchase date. */
  monthlyPayment: number;
  /** Annual interest rate on financing (e.g. 5.9 = 5.9%). 0 = no interest. */
  interestRate: number;
  /** Down payment amount. */
  downPayment: number;
}

/** A recurring monthly expense active over a date range. */
export interface RecurringExpense {
  id: string;
  name: string;
  /** Monthly cost in dollars. */
  monthlyAmount: number;
  /** First month this expense is active (ISO date). */
  startDate: string;
  /** Last month this expense is active (ISO date, empty string = ongoing). */
  endDate: string;
}

/** Full projection configuration. */
export interface ProjectionConfig {
  /** Salary schedule (periods of biweekly pay). */
  salaryPeriods: SalaryPeriod[];
  /** % of each paycheck to allocate to HYSA. */
  hysaAllocationPct: number;
  /** % of each paycheck to allocate to stocks. */
  stockAllocationPct: number;
  /** Expected annual HYSA APY for the projection. */
  projectedHysaApy: number;
  /** Expected annual stock return rate for the projection. */
  projectedStockReturnPct: number;
  /** Flat monthly expenses assumed during projection (legacy single value). */
  monthlyExpenses: number;
  /** Goal purchases to overlay on the projection. */
  goalPurchases: GoalPurchase[];
  /** Recurring monthly expenses with date ranges. */
  recurringExpenses: RecurringExpense[];
  /** How many years to project forward. */
  yearsToProject: number;
}

// ============================================================
// Graph data builder – Net Worth Timeline from actual events
// ============================================================

/**
 * Builds a chronological net worth timeline from all historical events.
 * Each event (deposit, expense, HYSA transfer, stock tx, debt, CC tx) is a point.
 * HYSA compounding is applied per-day between events.
 */
export function buildNetWorthTimeline(state: FinanceState): TimeSeriesPoint[] {
  // Collect all events with their dates and effects on buckets
  type Event = { date: string; label: string; };
  const events: Event[] = [];

  for (const d of state.deposits) events.push({ date: d.date, label: `Deposit: ${d.description}` });
  for (const e of state.monthlyExpenses) events.push({ date: e.date, label: `Expense: ${e.name}` });
  for (const t of state.hysa.transfers) events.push({ date: t.date, label: `HYSA Transfer` });
  for (const t of state.stockTransactions) events.push({ date: t.date, label: `Stock ${t.type}: ${state.portfolioStocks.find(s => s.id === t.stockId)?.ticker ?? "?"}` });
  for (const d of state.debts) events.push({ date: d.date, label: `Debt: ${d.person}` });
  for (const t of state.ccTransactions) events.push({ date: t.date, label: `CC: ${t.description || t.cardName || "Purchase"}` });

  if (events.length === 0) return [];

  // Sort events by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate dates (group events on same date)
  const uniqueDates = Array.from(new Set(events.map(e => e.date)));

  // For each date, compute cumulative net worth up to that date
  const points: TimeSeriesPoint[] = [];

  for (const date of uniqueDates) {
    // Build a "snapshot" state as of this date (only include events <= date)
    const snapshot: FinanceState = {
      deposits: state.deposits.filter(d => d.date <= date),
      monthlyExpenses: state.monthlyExpenses.filter(e => e.date <= date),
      hysa: {
        apy: state.hysa.apy,
        transfers: state.hysa.transfers.filter(t => t.date <= date),
      },
      portfolioStocks: state.portfolioStocks,
      stockTransactions: state.stockTransactions.filter(t => t.date <= date),
      creditCards: state.creditCards,
      spendingCategories: state.spendingCategories,
      ccTransactions: state.ccTransactions.filter(t => t.date <= date),
      debts: state.debts.filter(d => d.date <= date),
      startingBalances: state.startingBalances,
    };

    // Compute HYSA value as of that date (not today)
    const hysaVal = estimatedHYSAValueAsOf(snapshot, new Date(date));
    const chk = checkingBalance(snapshot);
    const stkMkt = totalStockMarketValue(snapshot);
    const debtsThey = totalDebtsTheyOwe(snapshot);

    const nwValue = chk + hysaVal + snapshot.startingBalances.stocks + stkMkt + debtsThey;

    const dayEvents = events.filter(e => e.date === date);
    points.push({
      date,
      value: Math.round(nwValue * 100) / 100,
      label: dayEvents.map(e => e.label).join(", "),
    });
  }

  // Add today if last event is before today
  const todayStr = new Date().toISOString().slice(0, 10);
  if (uniqueDates.length > 0 && uniqueDates[uniqueDates.length - 1] < todayStr) {
    points.push({
      date: todayStr,
      value: Math.round(netWorth(state) * 100) / 100,
      label: "Today",
    });
  }

  return points;
}

/** Estimate HYSA value as of a given date (not necessarily today). */
export function estimatedHYSAValueAsOf(state: FinanceState, asOfDate: Date): number {
  const asOf = asOfDate.getTime();
  const dailyRate = state.hysa.apy / 100 / 365;
  let total = state.startingBalances.hysa;

  for (const t of state.hysa.transfers) {
    const tDate = new Date(t.date).getTime();
    if (tDate > asOf) continue;
    const days = Math.max(0, (asOf - tDate) / 86_400_000);
    total += t.amount * Math.pow(1 + dailyRate, days);
  }
  return total;
}

// ============================================================
// Graph data builder – Stock Portfolio Timeline
// ============================================================

/**
 * Builds a timeline of total stock portfolio market value from stock transactions.
 * Uses current price per share (since historical prices aren't stored).
 */
export function buildStockTimeline(state: FinanceState): TimeSeriesPoint[] {
  if (state.stockTransactions.length === 0) return [];

  const sorted = [...state.stockTransactions].sort((a, b) => a.date.localeCompare(b.date));
  const uniqueDates = Array.from(new Set(sorted.map(t => t.date)));

  // price lookup
  const priceMap = new Map<string, number>();
  for (const s of state.portfolioStocks) priceMap.set(s.id, s.currentPricePerShare);

  const points: TimeSeriesPoint[] = [];
  const netSharesMap = new Map<string, number>();

  for (const date of uniqueDates) {
    // Apply all transactions on or before this date
    for (const tx of sorted.filter(t => t.date === date)) {
      const cur = netSharesMap.get(tx.stockId) ?? 0;
      netSharesMap.set(tx.stockId, tx.type === "buy" ? cur + tx.shares : cur - tx.shares);
    }

    // Compute market value at this date using current prices
    let value = state.startingBalances.stocks;
    netSharesMap.forEach((shares, stockId) => {
      if (shares > 0) value += shares * (priceMap.get(stockId) ?? 0);
    });

    const dayTxs = sorted.filter(t => t.date === date);
    points.push({
      date,
      value: Math.round(value * 100) / 100,
      label: dayTxs.map(t => `${t.type === "buy" ? "Buy" : "Sell"} ${state.portfolioStocks.find(s => s.id === t.stockId)?.ticker ?? "?"}`).join(", "),
    });
  }

  // Add today
  const todayStr = new Date().toISOString().slice(0, 10);
  if (uniqueDates[uniqueDates.length - 1] < todayStr) {
    let value = state.startingBalances.stocks;
    netSharesMap.forEach((shares, stockId) => {
      if (shares > 0) value += shares * (priceMap.get(stockId) ?? 0);
    });
    points.push({ date: todayStr, value: Math.round(value * 100) / 100, label: "Today" });
  }

  return points;
}

/** Build per-stock cost basis timeline. */
export function buildPerStockTimeline(
  state: FinanceState,
  stockId: string
): { costBasis: TimeSeriesPoint[]; marketValue: TimeSeriesPoint[] } {
  const stock = state.portfolioStocks.find(s => s.id === stockId);
  if (!stock) return { costBasis: [], marketValue: [] };

  const txs = state.stockTransactions
    .filter(t => t.stockId === stockId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (txs.length === 0) return { costBasis: [], marketValue: [] };

  const costBasis: TimeSeriesPoint[] = [];
  const marketValue: TimeSeriesPoint[] = [];
  let netShares = 0;
  let totalCost = 0;

  const uniqueDates = Array.from(new Set(txs.map(t => t.date)));
  for (const date of uniqueDates) {
    for (const tx of txs.filter(t => t.date === date)) {
      if (tx.type === "buy") {
        netShares += tx.shares;
        totalCost += tx.shares * tx.pricePerShare;
      } else {
        netShares -= tx.shares;
        totalCost -= tx.shares * tx.pricePerShare;
      }
    }
    costBasis.push({ date, value: Math.round(totalCost * 100) / 100 });
    marketValue.push({ date, value: Math.round(netShares * stock.currentPricePerShare * 100) / 100 });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (uniqueDates[uniqueDates.length - 1] < todayStr) {
    costBasis.push({ date: todayStr, value: Math.round(totalCost * 100) / 100 });
    marketValue.push({ date: todayStr, value: Math.round(netShares * stock.currentPricePerShare * 100) / 100 });
  }

  return { costBasis, marketValue };
}

// ============================================================
// Projection Engine
// ============================================================

export interface ProjectionPoint {
  date: string;
  netWorth: number;
  checking: number;
  hysa: number;
  stocks: number;
  /** Cumulative goal spending paid so far. */
  goalSpent: number;
  /** Outstanding loan balances on all goals combined. */
  loanBalance: number;
  label?: string;
}

/**
 * Run a forward projection starting from the current state.
 * Simulates biweekly paychecks, monthly expenses, HYSA compounding,
 * stock returns, and goal purchases with optional financing.
 */
export function runProjection(
  currentState: FinanceState,
  config: ProjectionConfig
): ProjectionPoint[] {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + config.yearsToProject);

  // Initialize buckets from current state
  let checking = checkingBalance(currentState);
  let hysa = estimatedHYSAValue(currentState);
  let stocks = currentState.startingBalances.stocks + totalStockMarketValue(currentState);
  let loanBalance = 0;
  let goalSpent = 0;

  const points: ProjectionPoint[] = [];
  const dailyHysaRate = config.projectedHysaApy / 100 / 365;
  const dailyStockRate = config.projectedStockReturnPct / 100 / 365;

  // Pre-process goal purchases and sort by date
  const goals = config.goalPurchases
    .map(g => ({
      ...g,
      purchaseDateObj: new Date(g.purchaseDate),
      triggered: false,
      remainingLoan: 0,
      monthlyPaymentAmount: g.monthlyPayment,
      monthlyInterestRate: g.interestRate / 100 / 12,
    }))
    .sort((a, b) => a.purchaseDateObj.getTime() - b.purchaseDateObj.getTime());

  // Find next paycheck date (assume next Friday from start as first pay day)
  const getNextPayday = (from: Date): Date => {
    const d = new Date(from);
    const day = d.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    return d;
  };

  let nextPayday = getNextPayday(startDate);
  let lastMonthExpenseDate = new Date(startDate);
  let lastMonthLoanPaymentDate = new Date(startDate);

  // Step day by day
  const cursor = new Date(startDate);
  let dayIndex = 0;

  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().slice(0, 10);
    let label: string | undefined;

    // ── HYSA daily compounding ──
    hysa *= (1 + dailyHysaRate);

    // ── Stock daily growth ──
    stocks *= (1 + dailyStockRate);

    // ── Paycheck (biweekly) ──
    if (cursor.getTime() === nextPayday.getTime()) {
      // Find applicable salary period – pick the latest-starting period
      // that contains the cursor date. This means a newer salary period
      // (e.g. a raise) automatically supersedes an earlier "ongoing" one.
      let salary: typeof config.salaryPeriods[number] | undefined;
      for (let i = 0; i < config.salaryPeriods.length; i++) {
        const sp = config.salaryPeriods[i];
        const start = new Date(sp.startDate);
        const end = sp.endDate ? new Date(sp.endDate) : endDate;
        if (cursor >= start && cursor <= end) {
          // Always prefer the later-starting period (more specific)
          if (!salary || start >= new Date(salary.startDate)) {
            salary = sp;
          }
        }
      }

      if (salary) {
        const biweeklyGross = salary.annualSalary / 26;
        // Allocations
        const toHysa = biweeklyGross * (config.hysaAllocationPct / 100);
        const toStocks = biweeklyGross * (config.stockAllocationPct / 100);
        const toChecking = biweeklyGross - toHysa - toStocks;

        checking += toChecking;
        hysa += toHysa;
        stocks += toStocks;
        label = `Pay: ${salary.label} (${fmt2(biweeklyGross)})`;
      }

      // Advance to next paycheck (2 weeks)
      nextPayday = new Date(nextPayday);
      nextPayday.setDate(nextPayday.getDate() + 14);
    }

    // ── Monthly expenses (1st of each month or every ~30 days) ──
    if (cursor.getMonth() !== lastMonthExpenseDate.getMonth() ||
        cursor.getFullYear() !== lastMonthExpenseDate.getFullYear()) {
      // Flat "Projected Monthly Spend" setting
      checking -= config.monthlyExpenses;

      // Recurring expense schedule – sum all active expenses for this month
      let recurringTotal = 0;
      for (let i = 0; i < (config.recurringExpenses || []).length; i++) {
        const re = config.recurringExpenses[i];
        const reStart = new Date(re.startDate);
        const reEnd = re.endDate ? new Date(re.endDate) : endDate;
        if (cursor >= reStart && cursor <= reEnd) {
          recurringTotal += re.monthlyAmount;
        }
      }
      if (recurringTotal > 0) {
        checking -= recurringTotal;
      }

      lastMonthExpenseDate = new Date(cursor);
    }

    // ── Goal purchases ──
    for (const goal of goals) {
      // Trigger purchase on the purchase date
      if (!goal.triggered && cursor >= goal.purchaseDateObj) {
        goal.triggered = true;
        checking -= goal.downPayment;
        goalSpent += goal.downPayment;
        const financed = goal.totalCost - goal.downPayment;
        if (financed > 0 && goal.monthlyPaymentAmount > 0) {
          goal.remainingLoan = financed;
          loanBalance += financed;
        } else {
          // Paid in full
          checking -= financed;
          goalSpent += financed;
        }
        label = (label ? label + " | " : "") + `🎯 Purchase: ${goal.name}`;
      }

      // Monthly loan payments
      if (goal.triggered && goal.remainingLoan > 0) {
        if (cursor.getMonth() !== lastMonthLoanPaymentDate.getMonth() ||
            cursor.getFullYear() !== lastMonthLoanPaymentDate.getFullYear()) {
          // Interest accrues
          const interest = goal.remainingLoan * goal.monthlyInterestRate;
          goal.remainingLoan += interest;
          // Payment
          const payment = Math.min(goal.monthlyPaymentAmount, goal.remainingLoan);
          goal.remainingLoan -= payment;
          checking -= payment;
          goalSpent += payment;
          loanBalance = goals.reduce((s, g) => s + g.remainingLoan, 0);
        }
      }
    }

    // Update loan payment tracker
    if (cursor.getMonth() !== lastMonthLoanPaymentDate.getMonth() ||
        cursor.getFullYear() !== lastMonthLoanPaymentDate.getFullYear()) {
      lastMonthLoanPaymentDate = new Date(cursor);
    }

    // Record a point every 7 days or on events
    if (dayIndex % 7 === 0 || label) {
      const nwValue = checking + hysa + stocks - loanBalance;
      points.push({
        date: dateStr,
        netWorth: Math.round(nwValue * 100) / 100,
        checking: Math.round(checking * 100) / 100,
        hysa: Math.round(hysa * 100) / 100,
        stocks: Math.round(stocks * 100) / 100,
        goalSpent: Math.round(goalSpent * 100) / 100,
        loanBalance: Math.round(loanBalance * 100) / 100,
        label,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
    dayIndex++;
  }

  return points;
}

function fmt2(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

// ============================================================
// Utility: generate a pseudo-random id (swap for uuid / cuid later)
// ============================================================
export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}
