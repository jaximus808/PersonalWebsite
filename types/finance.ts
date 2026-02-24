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
// Utility: generate a pseudo-random id (swap for uuid / cuid later)
// ============================================================
export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}
