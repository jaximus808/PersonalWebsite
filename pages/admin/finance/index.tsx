import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";
import type {
  FinanceState,
  Deposit,
  MonthlyExpense,
  HYSATransfer,
  PortfolioStock,
  StockTransaction,
  CreditCard,
  SpendingCategory,
  CreditCardTransaction,
  Debt,
  StartingBalances,
} from "../../../types/finance";
import {
  totalDeposits,
  totalExpenses,
  totalHYSATransfers,
  estimatedHYSAValue,
  totalStockCostBasis,
  totalStockMarketValue,
  totalCCSpend,
  pointsByCard,
  totalDebtsIOwe,
  totalDebtsTheyOwe,
  checkingBalance,
  netWorth,
  buildNetWorthTimeline,
  buildStockTimeline,
  buildPerStockTimeline,
} from "../../../types/finance";

// Dynamic imports for chart-heavy components (SSR off for recharts)
const SingleLineChart = dynamic(
  () => import("../../../components/finance/FinanceChart").then((m) => m.SingleLineChart),
  { ssr: false }
);
const MultiLineChart = dynamic(
  () => import("../../../components/finance/FinanceChart").then((m) => m.MultiLineChart),
  { ssr: false }
);
const ProjectionSection = dynamic(
  () => import("../../../components/finance/ProjectionSection"),
  { ssr: false }
);

// ────────────────────────────────────────────────────────────
// Auth gate – redirect to login if not authenticated
// ────────────────────────────────────────────────────────────
export const getServerSideProps: GetServerSideProps = async (context) => {
  const parsedCookies = cookies.parse(
    context.req.headers.cookie ? context.req.headers.cookie : ""
  );
  const token = parsedCookies.token;
  let authenticated = false;
  if (token) {
    try {
      jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }
  if (!authenticated) {
    return { redirect: { destination: "/auth/login/swaggang?redirect=/admin/finance", permanent: false } };
  }
  return { props: {} };
};

// ────────────────────────────────────────────────────────────
// API helper – typed POST to /api/admin/finance/*
// ────────────────────────────────────────────────────────────
async function api<T = any>(
  endpoint: "deposits" | "expenses" | "hysa" | "stocks" | "creditcards" | "balances" | "debts" | "projection",
  body: Record<string, any>
): Promise<T> {
  const res = await fetch(`/api/admin/finance/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${endpoint} ${res.status}: ${text}`);
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

// ────────────────────────────────────────────────────────────
// Reusable tiny components
// ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-white tracking-wide border-b border-gray-700 pb-2 mb-4">
      {children}
    </h2>
  );
}

/** Collapsible section heading. Click to toggle visibility. Shows summary when collapsed. */
function CollapsibleHeading({
  children,
  open,
  onToggle,
  summary,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  summary?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between text-xl font-bold text-white tracking-wide border-b border-gray-700 pb-2 mb-4 cursor-pointer hover:text-indigo-300 transition-colors"
    >
      <span className="flex items-center gap-3 flex-wrap">
        <span>{children}</span>
        {!open && summary && (
          <span className="text-xs font-normal text-gray-400 flex items-center gap-3">{summary}</span>
        )}
      </span>
      <span className="text-sm text-gray-500 ml-2 shrink-0">{open ? "▼" : "▶"}</span>
    </button>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  const color =
    positive === undefined
      ? "text-white"
      : positive
      ? "text-emerald-400"
      : "text-red-400";
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 min-w-[180px]">
      <span className="text-gray-400 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-2xl font-bold ${color}`}>{fmt(value)}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main page component
// ────────────────────────────────────────────────────────────
export default function FinancePage() {
  // ── Core state ──────────────────────────────────────────
  const [state, setState] = useState<FinanceState>({
    deposits: [],
    monthlyExpenses: [],
    hysa: { apy: 4.5, transfers: [] },
    portfolioStocks: [],
    stockTransactions: [],
    creditCards: [],
    spendingCategories: [],
    ccTransactions: [],
    debts: [],
    startingBalances: { checking: 0, hysa: 0, stocks: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Deposit form state ──────────────────────────────────
  const [depAmount, setDepAmount] = useState("");
  const [depDesc, setDepDesc] = useState("");
  const [depDate, setDepDate] = useState(today());

  // ── Expense form state ──────────────────────────────────
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(today());
  const [expRecurring, setExpRecurring] = useState(true);

  // ── HYSA form state ─────────────────────────────────────
  const [hysaAmount, setHysaAmount] = useState("");
  const [hysaDate, setHysaDate] = useState(today());

  // ── Stock form state ────────────────────────────────────
  const [stkTicker, setStkTicker] = useState("");
  const [stkPrice, setStkPrice] = useState("");

  // ── Stock transaction form state ────────────────────────
  const [stkTxStockId, setStkTxStockId] = useState("");
  const [stkTxType, setStkTxType] = useState<"buy" | "sell">("buy");
  const [stkTxShares, setStkTxShares] = useState("");
  const [stkTxPrice, setStkTxPrice] = useState("");
  const [stkTxDate, setStkTxDate] = useState(today());

  // ── Editing stock price inline ──────────────────────────
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockPrice, setEditStockPrice] = useState("");

  // ── APY debounce ref ────────────────────────────────────
  const apyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Credit card form state ──────────────────────────────
  const [ccName, setCcName] = useState("");
  const [ccLast4, setCcLast4] = useState("");

  // ── Spending category form state ────────────────────────
  const [catName, setCatName] = useState("");

  // ── CC Transaction form state ───────────────────────────
  const [txCardId, setTxCardId] = useState("");
  const [txCatId, setTxCatId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState(today());

  // ── Starting balance debounce ref ───────────────────────
  const balanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debt form state ─────────────────────────────────────
  const [debtPerson, setDebtPerson] = useState("");
  const [debtDirection, setDebtDirection] = useState<"i_owe" | "they_owe">("i_owe");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDesc, setDebtDesc] = useState("");
  const [debtDate, setDebtDate] = useState(today());

  // ── Section visibility toggles ──────────────────────────
const [showStartingBal, setShowStartingBal] = useState(false);
const [showDeposits, setShowDeposits] = useState(true);
const [showExpenses, setShowExpenses] = useState(true);
const [showHYSA, setShowHYSA] = useState(true);
const [showStocks, setShowStocks] = useState(true);
const [showCC, setShowCC] = useState(true);
const [showDebts, setShowDebts] = useState(true);
const [showNetWorth, setShowNetWorth] = useState(true);
const [showGraphs, setShowGraphs] = useState(true);
const [showProjection, setShowProjection] = useState(true);

  // ── Deposit list toggle ─────────────────────────────────
  const [showDepositList, setShowDepositList] = useState(false);
  const [showExpenseList, setShowExpenseList] = useState(false);
  const [showHYSAList, setShowHYSAList] = useState(false);
  const [showCCTransactions, setShowCCTransactions] = useState(false);
  const [expandedStockIds, setExpandedStockIds] = useState<Set<string>>(new Set());

  // ── Load all data on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [depRes, expRes, hysaConfigRes, hysaTransRes, stkRes, stkTxRes, cardsRes, catsRes, txRes, balRes, debtsRes] =
          await Promise.all([
            api("deposits", { action: "list" }),
            api("expenses", { action: "list" }),
            api("hysa", { action: "getConfig" }),
            api("hysa", { action: "list" }),
            api("stocks", { action: "listStocks" }),
            api("stocks", { action: "listTransactions" }),
            api("creditcards", { action: "listCards" }),
            api("creditcards", { action: "listCategories" }),
            api("creditcards", { action: "listTransactions" }),
            api("balances", { action: "get" }),
            api("debts", { action: "list" }),
          ]);

        if (cancelled) return;

        setState({
          deposits: depRes.data as Deposit[],
          monthlyExpenses: expRes.data as MonthlyExpense[],
          hysa: {
            apy: hysaConfigRes.data.apy as number,
            transfers: hysaTransRes.data as HYSATransfer[],
          },
          portfolioStocks: stkRes.data as PortfolioStock[],
          stockTransactions: stkTxRes.data as StockTransaction[],
          creditCards: cardsRes.data as CreditCard[],
          spendingCategories: catsRes.data as SpendingCategory[],
          ccTransactions: txRes.data as CreditCardTransaction[],
          debts: debtsRes.data as Debt[],
          startingBalances: balRes.data as StartingBalances,
        });
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Computed values ─────────────────────────────────────
  const checking = useMemo(() => checkingBalance(state), [state]);
  const nw = useMemo(() => netWorth(state), [state]);
  const depTotal = useMemo(() => totalDeposits(state), [state]);
  const expTotal = useMemo(() => totalExpenses(state), [state]);
  const hysaTransferTotal = useMemo(() => totalHYSATransfers(state), [state]);
  const hysaValue = useMemo(() => estimatedHYSAValue(state), [state]);
  const stockCost = useMemo(() => totalStockCostBasis(state), [state]);
  const stockMarket = useMemo(() => totalStockMarketValue(state), [state]);
  const ccSpend = useMemo(() => totalCCSpend(state), [state]);
  const ccPoints = useMemo(() => pointsByCard(state), [state]);
  const debtsIOwe = useMemo(() => totalDebtsIOwe(state), [state]);
  const debtsTheyOwe = useMemo(() => totalDebtsTheyOwe(state), [state]);

  // ── Graph timeline data ─────────────────────────────────
  const nwTimeline = useMemo(() => buildNetWorthTimeline(state), [state]);
  const stockTimeline = useMemo(() => buildStockTimeline(state), [state]);

  // ── Computed stock data per portfolio stock ──────────────
  const stockSummaries = useMemo(() => {
    // Build net shares & cost basis per stockId from transactions
    const txByStock = new Map<
      string,
      { netShares: number; totalCostBasis: number; transactions: StockTransaction[] }
    >();
    for (const t of state.stockTransactions) {
      if (!txByStock.has(t.stockId)) {
        txByStock.set(t.stockId, { netShares: 0, totalCostBasis: 0, transactions: [] });
      }
      const entry = txByStock.get(t.stockId)!;
      entry.transactions.push(t);
      if (t.type === "buy") {
        entry.netShares += t.shares;
        entry.totalCostBasis += t.shares * t.pricePerShare;
      } else {
        entry.netShares -= t.shares;
        entry.totalCostBasis -= t.shares * t.pricePerShare;
      }
    }

    return state.portfolioStocks.map((stock) => {
      const data = txByStock.get(stock.id) ?? {
        netShares: 0,
        totalCostBasis: 0,
        transactions: [],
      };
      const marketValue = data.netShares * stock.currentPricePerShare;
      const gain = marketValue - data.totalCostBasis;
      return {
        stock,
        netShares: data.netShares,
        totalCostBasis: data.totalCostBasis,
        marketValue,
        gain,
        gainPct:
          data.totalCostBasis > 0
            ? ((gain / data.totalCostBasis) * 100).toFixed(2)
            : "0.00",
        transactions: data.transactions
          .slice()
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
      };
    });
  }, [state.portfolioStocks, state.stockTransactions]);

  // ── Handlers ────────────────────────────────────────────

  const addDeposit = useCallback(async () => {
    const amount = parseFloat(depAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const res = await api("deposits", {
        action: "add",
        amount,
        description: depDesc.trim() || "Deposit",
        date: depDate,
      });
      setState((prev) => ({
        ...prev,
        deposits: [res.data as Deposit, ...prev.deposits],
      }));
      setDepAmount("");
      setDepDesc("");
      setDepDate(today());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [depAmount, depDesc, depDate]);

  const removeDeposit = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("deposits", { action: "remove", id });
      setState((prev) => ({
        ...prev,
        deposits: prev.deposits.filter((d) => d.id !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const addExpense = useCallback(async () => {
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0 || !expName.trim()) return;
    setSaving(true);
    try {
      const res = await api("expenses", {
        action: "add",
        name: expName.trim(),
        amount,
        recurring: expRecurring,
        date: expDate,
      });
      setState((prev) => ({
        ...prev,
        monthlyExpenses: [res.data as MonthlyExpense, ...prev.monthlyExpenses],
      }));
      setExpName("");
      setExpAmount("");
      setExpDate(today());
      setExpRecurring(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [expAmount, expName, expRecurring, expDate]);

  const removeExpense = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("expenses", { action: "remove", id });
      setState((prev) => ({
        ...prev,
        monthlyExpenses: prev.monthlyExpenses.filter((e) => e.id !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const addHYSATransfer = useCallback(async () => {
    const amount = parseFloat(hysaAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const res = await api("hysa", {
        action: "add",
        amount,
        date: hysaDate,
      });
      setState((prev) => ({
        ...prev,
        hysa: {
          ...prev.hysa,
          transfers: [res.data as HYSATransfer, ...prev.hysa.transfers],
        },
      }));
      setHysaAmount("");
      setHysaDate(today());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [hysaAmount, hysaDate]);

  const removeHYSATransfer = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("hysa", { action: "remove", id });
      setState((prev) => ({
        ...prev,
        hysa: {
          ...prev.hysa,
          transfers: prev.hysa.transfers.filter((t) => t.id !== id),
        },
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const setAPY = useCallback(
    (value: string) => {
      const apy = parseFloat(value);
      if (isNaN(apy) || apy < 0) return;
      // Optimistic local update
      setState((prev) => ({ ...prev, hysa: { ...prev.hysa, apy } }));
      // Debounce the API call so we don't fire on every keystroke
      if (apyTimerRef.current) clearTimeout(apyTimerRef.current);
      apyTimerRef.current = setTimeout(async () => {
        try {
          await api("hysa", { action: "setApy", apy });
        } catch (err: any) {
          setError(err.message);
        }
      }, 600);
    },
    []
  );

  const addPortfolioStock = useCallback(async () => {
    if (!stkTicker.trim()) return;
    const price = parseFloat(stkPrice);
    setSaving(true);
    try {
      const res = await api("stocks", {
        action: "addStock",
        ticker: stkTicker.trim().toUpperCase(),
        currentPricePerShare: isNaN(price) || price < 0 ? 0 : price,
      });
      setState((prev) => ({
        ...prev,
        portfolioStocks: [...prev.portfolioStocks, res.data as PortfolioStock],
      }));
      setStkTicker("");
      setStkPrice("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [stkTicker, stkPrice]);

  const removePortfolioStock = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("stocks", { action: "removeStock", id });
      setState((prev) => ({
        ...prev,
        portfolioStocks: prev.portfolioStocks.filter((s) => s.id !== id),
        stockTransactions: prev.stockTransactions.filter((t) => t.stockId !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateStockPrice = useCallback(
    async (id: string) => {
      const price = parseFloat(editStockPrice);
      if (isNaN(price) || price < 0) return;
      setSaving(true);
      try {
        await api("stocks", {
          action: "updatePrice",
          id,
          currentPricePerShare: price,
        });
        setState((prev) => ({
          ...prev,
          portfolioStocks: prev.portfolioStocks.map((s) =>
            s.id === id ? { ...s, currentPricePerShare: price } : s
          ),
        }));
        setEditingStockId(null);
        setEditStockPrice("");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [editStockPrice]
  );

  // ── Refresh all stock prices via live Yahoo data ────────
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const refreshAllPrices = useCallback(async () => {
    setRefreshingPrices(true);
    try {
      const res = await api("stocks", { action: "refreshAllPrices" });
      if (res.updated && res.updated.length > 0) {
        setState((prev) => {
          const priceMap = new Map<string, number>();
          for (const u of res.updated) {
            priceMap.set(u.ticker, u.newPrice);
          }
          return {
            ...prev,
            portfolioStocks: prev.portfolioStocks.map((s) =>
              priceMap.has(s.ticker) ? { ...s, currentPricePerShare: priceMap.get(s.ticker)! } : s
            ),
          };
        });
      }
      if (res.failed && res.failed.length > 0) {
        setError(`Could not fetch prices for: ${res.failed.join(", ")}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshingPrices(false);
    }
  }, []);

  const addStockTransaction = useCallback(async () => {
    const shares = parseFloat(stkTxShares);
    const price = parseFloat(stkTxPrice);
    if (!stkTxStockId || isNaN(shares) || shares <= 0 || isNaN(price) || price <= 0)
      return;
    setSaving(true);
    try {
      const res = await api("stocks", {
        action: "addTransaction",
        stockId: stkTxStockId,
        type: stkTxType,
        shares,
        pricePerShare: price,
        date: stkTxDate,
      });
      setState((prev) => ({
        ...prev,
        stockTransactions: [res.data as StockTransaction, ...prev.stockTransactions],
      }));
      setStkTxShares("");
      setStkTxPrice("");
      setStkTxDate(today());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [stkTxStockId, stkTxType, stkTxShares, stkTxPrice, stkTxDate]);

  const removeStockTransaction = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("stocks", { action: "removeTransaction", id });
      setState((prev) => ({
        ...prev,
        stockTransactions: prev.stockTransactions.filter((t) => t.id !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Credit Card handlers ────────────────────────────────

  const addCard = useCallback(async () => {
    if (!ccName.trim()) return;
    setSaving(true);
    try {
      const res = await api("creditcards", {
        action: "addCard",
        name: ccName.trim(),
        last4: ccLast4.trim() || "0000",
      });
      setState((prev) => ({
        ...prev,
        creditCards: [...prev.creditCards, res.data as CreditCard],
      }));
      setCcName("");
      setCcLast4("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [ccName, ccLast4]);

  const removeCard = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("creditcards", { action: "removeCard", id });
      setState((prev) => ({
        ...prev,
        creditCards: prev.creditCards.filter((c) => c.id !== id),
        ccTransactions: prev.ccTransactions.filter((t) => t.cardId !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const addCategory = useCallback(async () => {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      const res = await api("creditcards", {
        action: "addCategory",
        name: catName.trim(),
      });
      setState((prev) => ({
        ...prev,
        spendingCategories: [
          ...prev.spendingCategories,
          res.data as SpendingCategory,
        ],
      }));
      setCatName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [catName]);

  const removeCategory = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("creditcards", { action: "removeCategory", id });
      setState((prev) => ({
        ...prev,
        spendingCategories: prev.spendingCategories.filter((c) => c.id !== id),
        ccTransactions: prev.ccTransactions.filter((t) => t.categoryId !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const setRate = useCallback(
    async (categoryId: string, cardId: string, rateStr: string) => {
      const rate = parseFloat(rateStr);
      if (isNaN(rate) || rate < 0) return;
      // Optimistic update
      setState((prev) => ({
        ...prev,
        spendingCategories: prev.spendingCategories.map((cat) =>
          cat.id === categoryId
            ? { ...cat, pointsRates: { ...cat.pointsRates, [cardId]: rate } }
            : cat
        ),
      }));
      try {
        await api("creditcards", { action: "setRate", categoryId, cardId, rate });
      } catch (err: any) {
        setError(err.message);
      }
    },
    []
  );

  const addTransaction = useCallback(async () => {
    const amount = parseFloat(txAmount);
    if (!txCardId || !txCatId || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const res = await api("creditcards", {
        action: "addTransaction",
        cardId: txCardId,
        categoryId: txCatId,
        amount,
        description: txDesc.trim() || "",
        date: txDate,
      });
      setState((prev) => ({
        ...prev,
        ccTransactions: [res.data as CreditCardTransaction, ...prev.ccTransactions],
      }));
      setTxAmount("");
      setTxDesc("");
      setTxDate(today());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [txCardId, txCatId, txAmount, txDesc, txDate]);

  const removeTransaction = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("creditcards", { action: "removeTransaction", id });
      setState((prev) => ({
        ...prev,
        ccTransactions: prev.ccTransactions.filter((t) => t.id !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Starting balance handler (debounced) ────────────────

  const updateStartingBalance = useCallback(
    (field: keyof StartingBalances, value: string) => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      // Optimistic local update
      setState((prev) => ({
        ...prev,
        startingBalances: { ...prev.startingBalances, [field]: num },
      }));
      // Debounce API call
      if (balanceTimerRef.current) clearTimeout(balanceTimerRef.current);
      balanceTimerRef.current = setTimeout(async () => {
        try {
          await api("balances", { action: "set", [field]: num });
        } catch (err: any) {
          setError(err.message);
        }
      }, 600);
    },
    []
  );

  // ── Debt handlers ───────────────────────────────────────

  const addDebt = useCallback(async () => {
    const amount = parseFloat(debtAmount);
    if (isNaN(amount) || amount <= 0 || !debtPerson.trim()) return;
    setSaving(true);
    try {
      const res = await api("debts", {
        action: "add",
        person: debtPerson.trim(),
        direction: debtDirection,
        amount,
        description: debtDesc.trim(),
        date: debtDate,
      });
      setState((prev) => ({
        ...prev,
        debts: [res.data as Debt, ...prev.debts],
      }));
      setDebtPerson("");
      setDebtAmount("");
      setDebtDesc("");
      setDebtDate(today());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [debtPerson, debtDirection, debtAmount, debtDesc, debtDate]);

  const removeDebt = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await api("debts", { action: "remove", id });
      setState((prev) => ({
        ...prev,
        debts: prev.debts.filter((d) => d.id !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const settleDebt = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const res = await api("debts", { action: "settle", id });
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === id ? (res.data as Debt) : d)),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const unsettleDebt = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const res = await api("debts", { action: "unsettle", id });
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === id ? (res.data as Debt) : d)),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Toggle stock transaction visibility ─────────────────
  const toggleStockExpanded = useCallback((stockId: string) => {
    setExpandedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(stockId)) next.delete(stockId);
      else next.add(stockId);
      return next;
    });
  }, []);

  // ── Render ──────────────────────────────────────────────

  const inputCls =
    "bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
  const btnPrimary =
    "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors";
  const btnDanger =
    "bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors";
  const btnSecondary =
    "bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors";

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-400 animate-pulse">
          Loading finance data…
        </span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Finance Tracker</title>
      </Head>

      <div className="min-h-screen bg-gray-950 text-white font-sans">
        {/* ────── Top bar ────── */}
        <header className="sticky top-0 z-50 backdrop-blur bg-gray-950/80 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">
              💰 Finance Tracker
            </h1>
            <div className="flex items-center gap-4">
              {saving && (
                <span className="text-xs text-amber-400 animate-pulse">
                  Saving…
                </span>
              )}
              <span className="text-sm text-gray-400">
                Synced with Supabase
              </span>
            </div>
          </div>
          {/* ────── Fixed section nav ────── */}
          <nav className="border-t border-gray-800/60 bg-gray-950/60">
            <div className="max-w-7xl mx-auto px-6 py-1.5 flex flex-wrap items-center gap-1">
              {[
                { id: "section-summary", label: "Summary", emoji: "📋" },
                { id: "section-starting", label: "Balances", emoji: "🏁" },
                { id: "section-deposits", label: "Deposits", emoji: "📥" },
                { id: "section-expenses", label: "Expenses", emoji: "📤" },
                { id: "section-hysa", label: "HYSA", emoji: "🏦" },
                { id: "section-stocks", label: "Stocks", emoji: "📈" },
                { id: "section-cc", label: "Cards", emoji: "💳" },
                { id: "section-debts", label: "Debts", emoji: "🤝" },
                { id: "section-networth", label: "Net Worth", emoji: "🧮" },
                { id: "section-graphs", label: "Graphs", emoji: "📊" },
                { id: "section-projection", label: "Projection", emoji: "🔮" },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  {item.emoji} {item.label}
                </a>
              ))}
            </div>
          </nav>
        </header>

        {/* ────── Error banner ────── */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 pt-4">
            <div className="bg-red-900/60 border border-red-700 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-red-200 text-sm">{error}</span>
              <button
                className="text-red-300 hover:text-white text-sm"
                onClick={() => setError(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-10 scroll-mt-28">
          {/* ════════════════════════════════════════════════
              Summary cards
             ════════════════════════════════════════════════ */}
          <section id="section-summary" className="scroll-mt-28 flex flex-wrap gap-4">
            <StatCard label="Net Worth" value={nw} positive={nw >= 0} />
            <StatCard
              label="Checking"
              value={checking}
              positive={checking >= 0}
            />
            <StatCard label="Total Deposits" value={depTotal} positive />
            <StatCard
              label="Total Expenses"
              value={expTotal}
              positive={false}
            />
            <StatCard label="HYSA (est.)" value={hysaValue} positive />
            <StatCard
              label="Stocks (market)"
              value={stockMarket}
              positive={stockMarket >= stockCost}
            />
            <StatCard
              label="CC Spend"
              value={ccSpend}
              positive={false}
            />
            <StatCard
              label="I Owe (debts)"
              value={debtsIOwe}
              positive={false}
            />
            <StatCard
              label="Owed to Me"
              value={debtsTheyOwe}
              positive={debtsTheyOwe > 0}
            />
          </section>

          {/* ════════════════════════════════════════════════
              0 · STARTING BALANCES
             ════════════════════════════════════════════════ */}
          <section id="section-starting" className="scroll-mt-28">
            <CollapsibleHeading open={showStartingBal} onToggle={() => setShowStartingBal((v) => !v)} summary={<>
              <span>Checking: <span className="text-white">{fmt(state.startingBalances.checking)}</span></span>
              <span>HYSA: <span className="text-white">{fmt(state.startingBalances.hysa)}</span></span>
              <span>Stocks: <span className="text-white">{fmt(state.startingBalances.stocks)}</span></span>
            </>}>
              🏁 Starting Balances
            </CollapsibleHeading>
            {showStartingBal && (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  Set the initial amount for each bucket. These are base values that don't come from deposits/transfers.
                </p>
                <div className="flex flex-wrap gap-6 items-end">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Checking
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls + " w-40"}
                      value={state.startingBalances.checking}
                      onChange={(e) => updateStartingBalance("checking", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    HYSA
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls + " w-40"}
                      value={state.startingBalances.hysa}
                      onChange={(e) => updateStartingBalance("hysa", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Stocks
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls + " w-40"}
                      value={state.startingBalances.stocks}
                      onChange={(e) => updateStartingBalance("stocks", e.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              1 · DEPOSITS (into checking)
             ════════════════════════════════════════════════ */}
          <section id="section-deposits" className="scroll-mt-28">
            <CollapsibleHeading open={showDeposits} onToggle={() => setShowDeposits((v) => !v)} summary={<>
              <span>Total: <span className="text-emerald-400">{fmt(depTotal)}</span></span>
              <span className="text-gray-500">{state.deposits.length} deposits</span>
            </>}>
              📥 Deposits → Checking
            </CollapsibleHeading>

            {showDeposits && (
              <>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Amount
                    <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-32"} value={depAmount} onChange={(e) => setDepAmount(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Description
                    <input type="text" placeholder="Paycheck, bonus…" className={inputCls + " w-48"} value={depDesc} onChange={(e) => setDepDesc(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Date
                    <input type="date" className={inputCls + " w-40"} value={depDate} onChange={(e) => setDepDate(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addDeposit}>+ Add Deposit</button>
                </div>

                {state.deposits.length > 0 && (
                  <>
                    <button className={btnSecondary + " mb-3"} onClick={() => setShowDepositList((v) => !v)}>
                      {showDepositList ? "Hide" : "Show"} Deposits ({state.deposits.length})
                    </button>
                    {showDepositList && (
                      <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Description</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-right"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {state.deposits.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((d) => (
                              <tr key={d.id} className="hover:bg-gray-900/60 transition-colors">
                                <td className="px-4 py-2.5 text-gray-300">{d.date}</td>
                                <td className="px-4 py-2.5">{d.description}</td>
                                <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{fmt(d.amount)}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <button className={btnDanger} disabled={saving} onClick={() => removeDeposit(d.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-900/40">
                            <tr>
                              <td colSpan={2} className="px-4 py-2.5 text-xs text-gray-400 uppercase">Total</td>
                              <td className="px-4 py-2.5 text-right text-emerald-400 font-bold">{fmt(depTotal)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              2 · MONTHLY EXPENSES (subtract from checking)
             ════════════════════════════════════════════════ */}
          <section id="section-expenses" className="scroll-mt-28">
            <CollapsibleHeading open={showExpenses} onToggle={() => setShowExpenses((v) => !v)} summary={<>
              <span>Total: <span className="text-red-400">−{fmt(expTotal)}</span></span>
              <span className="text-gray-500">{state.monthlyExpenses.length} expenses</span>
            </>}>
              📤 Monthly Expenses
            </CollapsibleHeading>

            {showExpenses && (
              <>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Expense Name
                    <input type="text" placeholder="Rent, utilities…" className={inputCls + " w-48"} value={expName} onChange={(e) => setExpName(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Amount
                    <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-32"} value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Date
                    <input type="date" className={inputCls + " w-40"} value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-400 pt-4">
                    <input type="checkbox" checked={expRecurring} onChange={(e) => setExpRecurring(e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                    Recurring
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addExpense}>+ Add Expense</button>
                </div>

                {state.monthlyExpenses.length > 0 && (
                  <>
                    <button className={btnSecondary + " mb-3"} onClick={() => setShowExpenseList((v) => !v)}>
                      {showExpenseList ? "Hide" : "Show"} Expenses ({state.monthlyExpenses.length})
                    </button>
                    {showExpenseList && (
                      <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Name</th>
                              <th className="px-4 py-3 text-center">Recurring</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-right"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {state.monthlyExpenses.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e) => (
                              <tr key={e.id} className="hover:bg-gray-900/60 transition-colors">
                                <td className="px-4 py-2.5 text-gray-300">{e.date}</td>
                                <td className="px-4 py-2.5">{e.name}</td>
                                <td className="px-4 py-2.5 text-center">{e.recurring ? "🔁 Yes" : "One-time"}</td>
                                <td className="px-4 py-2.5 text-right text-red-400 font-medium">−{fmt(e.amount)}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <button className={btnDanger} disabled={saving} onClick={() => removeExpense(e.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-900/40">
                            <tr>
                              <td colSpan={3} className="px-4 py-2.5 text-xs text-gray-400 uppercase">Total Expenses</td>
                              <td className="px-4 py-2.5 text-right text-red-400 font-bold">−{fmt(expTotal)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              3 · HYSA BUCKET (transfer from checking)
             ════════════════════════════════════════════════ */}
          <section id="section-hysa" className="scroll-mt-28">
            <CollapsibleHeading open={showHYSA} onToggle={() => setShowHYSA((v) => !v)} summary={<>
              <span>Transferred: <span className="text-sky-400">{fmt(hysaTransferTotal)}</span></span>
              <span>Est. Value: <span className="text-emerald-400">{fmt(hysaValue)}</span></span>
              <span>Interest: <span className="text-emerald-400">{fmt(hysaValue - hysaTransferTotal - state.startingBalances.hysa)}</span></span>
              <span className="text-gray-500">{state.hysa.apy}% APY</span>
            </>}>
              🏦 HYSA Bucket
            </CollapsibleHeading>

            {showHYSA && (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    APY&nbsp;(%)
                    <input type="number" min="0" step="0.01" className={inputCls + " w-24"} value={state.hysa.apy} onChange={(e) => setAPY(e.target.value)} />
                  </label>
                  <span className="text-xs text-gray-500">
                    Estimated value: <span className="text-emerald-400 font-semibold">{fmt(hysaValue)}</span> · Interest earned: <span className="text-emerald-400 font-semibold">{fmt(hysaValue - hysaTransferTotal)}</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Transfer Amount
                    <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-32"} value={hysaAmount} onChange={(e) => setHysaAmount(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Date
                    <input type="date" className={inputCls + " w-40"} value={hysaDate} onChange={(e) => setHysaDate(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addHYSATransfer}>+ Transfer to HYSA</button>
                </div>

                {state.hysa.transfers.length > 0 && (
                  <>
                    <button className={btnSecondary + " mb-3"} onClick={() => setShowHYSAList((v) => !v)}>
                      {showHYSAList ? "Hide" : "Show"} Transfers ({state.hysa.transfers.length})
                    </button>
                    {showHYSAList && (
                      <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-right"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {state.hysa.transfers.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                              <tr key={t.id} className="hover:bg-gray-900/60 transition-colors">
                                <td className="px-4 py-2.5 text-gray-300">{t.date}</td>
                                <td className="px-4 py-2.5 text-right text-sky-400 font-medium">{fmt(t.amount)}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <button className={btnDanger} disabled={saving} onClick={() => removeHYSATransfer(t.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-900/40">
                            <tr>
                              <td className="px-4 py-2.5 text-xs text-gray-400 uppercase">Total Transferred</td>
                              <td className="px-4 py-2.5 text-right text-sky-400 font-bold">{fmt(hysaTransferTotal)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              4 · STOCKS & ETFs (portfolio)
             ════════════════════════════════════════════════ */}
          <section id="section-stocks" className="scroll-mt-28">
            <CollapsibleHeading open={showStocks} onToggle={() => setShowStocks((v) => !v)} summary={<>
              <span>Cost Basis: <span className="text-gray-300">{fmt(stockCost)}</span></span>
              <span>Market Value: <span className="text-white">{fmt(stockMarket)}</span></span>
              <span>Gain/Loss: <span className={stockMarket - stockCost >= 0 ? "text-emerald-400" : "text-red-400"}>{stockMarket - stockCost >= 0 ? "+" : ""}{fmt(stockMarket - stockCost)}</span></span>
              <span className="text-gray-500">{state.portfolioStocks.length} stocks</span>
            </>}>
              📈 Stocks &amp; ETFs
            </CollapsibleHeading>

            {showStocks && (
              <>
                {/* ── Add stock to portfolio ── */}
                <div className="flex flex-wrap gap-3 items-end mb-6">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Ticker
                    <input type="text" placeholder="VOO" className={inputCls + " w-28 uppercase"} value={stkTicker} onChange={(e) => setStkTicker(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Current Price
                    <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-32"} value={stkPrice} onChange={(e) => setStkPrice(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addPortfolioStock}>+ Add Stock</button>
                  <button
                    className={"bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"}
                    disabled={saving || refreshingPrices || state.portfolioStocks.length === 0}
                    onClick={refreshAllPrices}
                  >
                    {refreshingPrices ? "Refreshing…" : "🔄 Refresh All Prices"}
                  </button>
                </div>

                {/* ── Add stock transaction ── */}
                {state.portfolioStocks.length > 0 && (
                  <>
                    <h3 className="text-md font-semibold text-gray-300 mb-3">Add Transaction</h3>
                    <div className="flex flex-wrap gap-3 items-end mb-6">
                      <label className="flex flex-col gap-1 text-xs text-gray-400">
                        Stock
                        <select className={inputCls + " w-40"} value={stkTxStockId} onChange={(e) => setStkTxStockId(e.target.value)}>
                          <option value="">Select…</option>
                          {state.portfolioStocks.map((s) => (<option key={s.id} value={s.id}>{s.ticker}</option>))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-gray-400">
                        Type
                        <select className={inputCls + " w-28"} value={stkTxType} onChange={(e) => setStkTxType(e.target.value as "buy" | "sell")}>
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-gray-400">
                        Shares
                        <input type="number" min="0" step="0.0001" placeholder="0" className={inputCls + " w-28"} value={stkTxShares} onChange={(e) => setStkTxShares(e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-gray-400">
                        Price / Share
                        <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-32"} value={stkTxPrice} onChange={(e) => setStkTxPrice(e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-gray-400">
                        Date
                        <input type="date" className={inputCls + " w-40"} value={stkTxDate} onChange={(e) => setStkTxDate(e.target.value)} />
                      </label>
                      <button className={btnPrimary} disabled={saving} onClick={addStockTransaction}>+ Add Transaction</button>
                    </div>
                  </>
                )}

                {/* ── Per-stock summary cards ── */}
                {stockSummaries.length > 0 && (
                  <div className="flex flex-col gap-6 mb-6">
                    {stockSummaries.map((summary) => (
                      <div key={summary.stock.id} className="bg-gray-800 rounded-xl p-5 flex flex-col gap-4">
                        {/* ── Header row ── */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold">{summary.stock.ticker}</span>
                            <span className={`text-sm font-semibold ${summary.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {summary.gain >= 0 ? "+" : ""}{fmt(summary.gain)} ({summary.gainPct}%)
                            </span>
                          </div>
                          <button className={btnDanger} disabled={saving} onClick={() => removePortfolioStock(summary.stock.id)}>Remove Stock</button>
                        </div>

                        {/* ── Stats row ── */}
                        <div className="text-xs text-gray-400 flex flex-wrap gap-5">
                          <span>Net Shares: <span className="text-white font-medium">{summary.netShares.toLocaleString()}</span></span>
                          <span>Cost Basis: <span className="text-white font-medium">{fmt(summary.totalCostBasis)}</span></span>
                          <span>Market Value: <span className="text-white font-medium">{fmt(summary.marketValue)}</span></span>
                          <span>
                            Price:{" "}
                            {editingStockId === summary.stock.id ? (
                              <span className="inline-flex gap-1 items-center">
                                <input type="number" min="0" step="0.01" className={inputCls + " w-24 text-xs"} value={editStockPrice} onChange={(e) => setEditStockPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") updateStockPrice(summary.stock.id); if (e.key === "Escape") setEditingStockId(null); }} autoFocus />
                                <button className={btnSecondary} disabled={saving} onClick={() => updateStockPrice(summary.stock.id)}>✓</button>
                              </span>
                            ) : (
                              <button className="underline decoration-dashed underline-offset-4 text-sky-400 hover:text-sky-300" onClick={() => { setEditingStockId(summary.stock.id); setEditStockPrice(String(summary.stock.currentPricePerShare)); }}>
                                {fmt(summary.stock.currentPricePerShare)}
                              </button>
                            )}
                          </span>
                        </div>

                        {/* ── Transactions toggle (hidden by default) ── */}
                        {summary.transactions.length > 0 && (
                          <>
                            <button className={btnSecondary} onClick={() => toggleStockExpanded(summary.stock.id)}>
                              {expandedStockIds.has(summary.stock.id) ? "Hide" : "Show"} Transactions ({summary.transactions.length})
                            </button>
                            {expandedStockIds.has(summary.stock.id) && (
                              <div className="overflow-x-auto rounded-lg border border-gray-700">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Date</th>
                                      <th className="px-3 py-2 text-left">Type</th>
                                      <th className="px-3 py-2 text-right">Shares</th>
                                      <th className="px-3 py-2 text-right">Price/Share</th>
                                      <th className="px-3 py-2 text-right">Total</th>
                                      <th className="px-3 py-2 text-right"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-700">
                                    {summary.transactions.map((t) => (
                                      <tr key={t.id} className="hover:bg-gray-700/40 transition-colors">
                                        <td className="px-3 py-2 text-gray-300">{t.date}</td>
                                        <td className="px-3 py-2">
                                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${t.type === "buy" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>{t.type}</span>
                                        </td>
                                        <td className="px-3 py-2 text-right">{t.shares}</td>
                                        <td className="px-3 py-2 text-right text-gray-300">{fmt(t.pricePerShare)}</td>
                                        <td className={`px-3 py-2 text-right font-medium ${t.type === "buy" ? "text-red-400" : "text-emerald-400"}`}>
                                          {t.type === "buy" ? "−" : "+"}{fmt(t.shares * t.pricePerShare)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <button className={btnDanger} disabled={saving} onClick={() => removeStockTransaction(t.id)}>Remove</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Totals ── */}
                {(stockSummaries.length > 0 || state.startingBalances.stocks > 0) && (
                  <div className="overflow-x-auto rounded-xl border border-gray-800 mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Summary</th>
                          <th className="px-4 py-3 text-right">Cost Basis</th>
                          <th className="px-4 py-3 text-right">Market Value</th>
                          <th className="px-4 py-3 text-right">Gain/Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {stockSummaries.map((s) => (
                          <tr key={s.stock.id} className="hover:bg-gray-900/60 transition-colors">
                            <td className="px-4 py-2.5 font-semibold">{s.stock.ticker}</td>
                            <td className="px-4 py-2.5 text-right text-gray-300">{fmt(s.totalCostBasis)}</td>
                            <td className="px-4 py-2.5 text-right text-white font-medium">{fmt(s.marketValue)}</td>
                            <td className={`px-4 py-2.5 text-right font-medium ${s.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {s.gain >= 0 ? "+" : ""}{fmt(s.gain)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-900/40">
                        <tr>
                          <td className="px-4 py-2.5 text-xs text-gray-400 uppercase">Total</td>
                          <td className="px-4 py-2.5 text-right text-gray-300 font-bold">{fmt(stockCost)}</td>
                          <td className="px-4 py-2.5 text-right text-white font-bold">{fmt(stockMarket)}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${stockMarket - stockCost >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {stockMarket - stockCost >= 0 ? "+" : ""}{fmt(stockMarket - stockCost)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              5 · CREDIT CARDS
             ════════════════════════════════════════════════ */}
          <section id="section-cc" className="scroll-mt-28">
            <CollapsibleHeading open={showCC} onToggle={() => setShowCC((v) => !v)} summary={<>
              <span>Spend: <span className="text-red-400">−{fmt(ccSpend)}</span></span>
              <span>Points: <span className="text-amber-400">{state.ccTransactions.reduce((s, t) => s + t.pointsEarned, 0).toLocaleString()}</span></span>
              <span className="text-gray-500">{state.creditCards.length} cards · {state.ccTransactions.length} txns</span>
            </>}>
              💳 Credit Cards
            </CollapsibleHeading>

            {showCC && (
              <>
                {/* ── Add card ── */}
                <div className="flex flex-wrap gap-3 items-end mb-6">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Card Name
                    <input type="text" placeholder="Chase Sapphire" className={inputCls + " w-48"} value={ccName} onChange={(e) => setCcName(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Last 4
                    <input type="text" placeholder="1234" maxLength={4} className={inputCls + " w-24"} value={ccLast4} onChange={(e) => setCcLast4(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addCard}>+ Add Card</button>
                </div>

                {/* ── Cards list with points ── */}
                {state.creditCards.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {state.creditCards.map((card) => {
                      const pts = ccPoints.get(card.id) ?? 0;
                      return (
                        <div key={card.id} className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">{card.name} <span className="text-gray-500 text-sm font-normal">····{card.last4}</span></span>
                            <button className={btnDanger} disabled={saving} onClick={() => removeCard(card.id)}>Remove</button>
                          </div>
                          <div className="text-sm text-amber-400 font-semibold">⭐ {pts.toLocaleString()} points</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Spending Categories & Points Rates ── */}
                <h3 className="text-md font-semibold text-gray-300 mb-3">Spending Categories & Points Rates</h3>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Category Name
                    <input type="text" placeholder="Food, Gas, Travel…" className={inputCls + " w-48"} value={catName} onChange={(e) => setCatName(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addCategory}>+ Add Category</button>
                </div>

                {state.spendingCategories.length > 0 && state.creditCards.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-800 mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Category</th>
                          {state.creditCards.map((card) => (
                            <th key={card.id} className="px-4 py-3 text-center">{card.name}<br /><span className="text-[10px] text-gray-500 normal-case">pts/$ rate</span></th>
                          ))}
                          <th className="px-4 py-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {state.spendingCategories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-gray-900/60 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{cat.name}</td>
                            {state.creditCards.map((card) => (
                              <td key={card.id} className="px-4 py-2.5 text-center">
                                <input type="number" min="0" step="0.1" className={inputCls + " w-20 text-center text-xs"} value={cat.pointsRates[card.id] ?? 1} onChange={(e) => setRate(cat.id, card.id, e.target.value)} />
                              </td>
                            ))}
                            <td className="px-4 py-2.5 text-right">
                              <button className={btnDanger} disabled={saving} onClick={() => removeCategory(cat.id)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Add CC Transaction ── */}
                <h3 className="text-md font-semibold text-gray-300 mb-3">Transactions</h3>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Card
                    <select className={inputCls + " w-44"} value={txCardId} onChange={(e) => setTxCardId(e.target.value)}>
                      <option value="">Select card…</option>
                      {state.creditCards.map((c) => (<option key={c.id} value={c.id}>{c.name} (····{c.last4})</option>))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Category
                    <select className={inputCls + " w-40"} value={txCatId} onChange={(e) => setTxCatId(e.target.value)}>
                      <option value="">Select…</option>
                      {state.spendingCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Amount
                    <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-28"} value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Description
                    <input type="text" placeholder="Restaurant, Gas…" className={inputCls + " w-44"} value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Date
                    <input type="date" className={inputCls + " w-40"} value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addTransaction}>+ Add Transaction</button>
                </div>

                {/* ── CC Transactions table ── */}
                {state.ccTransactions.length > 0 && (
                  <>
                    <button className={btnSecondary + " mb-3"} onClick={() => setShowCCTransactions((v) => !v)}>
                      {showCCTransactions ? "Hide" : "Show"} CC Transactions ({state.ccTransactions.length})
                    </button>
                    {showCCTransactions && (
                      <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Card</th>
                              <th className="px-4 py-3 text-left">Category</th>
                              <th className="px-4 py-3 text-left">Description</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-right">Points</th>
                              <th className="px-4 py-3 text-right"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {state.ccTransactions.map((t) => (
                              <tr key={t.id} className="hover:bg-gray-900/60 transition-colors">
                                <td className="px-4 py-2.5 text-gray-300">{t.date}</td>
                                <td className="px-4 py-2.5">{t.cardName}</td>
                                <td className="px-4 py-2.5 text-gray-300">{t.categoryName}</td>
                                <td className="px-4 py-2.5 text-gray-300">{t.description}</td>
                                <td className="px-4 py-2.5 text-right text-red-400 font-medium">−{fmt(t.amount)}</td>
                                <td className="px-4 py-2.5 text-right text-amber-400 font-medium">+{t.pointsEarned.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <button className={btnDanger} disabled={saving} onClick={() => removeTransaction(t.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-900/40">
                            <tr>
                              <td colSpan={4} className="px-4 py-2.5 text-xs text-gray-400 uppercase">Total CC Spend</td>
                              <td className="px-4 py-2.5 text-right text-red-400 font-bold">−{fmt(ccSpend)}</td>
                              <td className="px-4 py-2.5 text-right text-amber-400 font-bold">{state.ccTransactions.reduce((s, t) => s + t.pointsEarned, 0).toLocaleString()}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              6 · DEBTS (Payable & Receivable)
             ════════════════════════════════════════════════ */}
          <section id="section-debts" className="scroll-mt-28">
            <CollapsibleHeading open={showDebts} onToggle={() => setShowDebts((v) => !v)} summary={<>
              <span>I Owe: <span className="text-red-400">{fmt(debtsIOwe)}</span></span>
              <span>Owed to Me: <span className="text-emerald-400">{fmt(debtsTheyOwe)}</span></span>
              <span className="text-gray-500">{state.debts.filter(d => !d.settled).length} unsettled</span>
            </>}>
              🤝 Debts
            </CollapsibleHeading>

            {showDebts && (
              <>
                {/* ── Add debt ── */}
                <div className="flex flex-wrap gap-3 items-end mb-6">
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Person
                    <input type="text" placeholder="John, Jane…" className={inputCls + " w-40"} value={debtPerson} onChange={(e) => setDebtPerson(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Direction
                    <select className={inputCls + " w-40"} value={debtDirection} onChange={(e) => setDebtDirection(e.target.value as "i_owe" | "they_owe")}>
                      <option value="i_owe">I owe them</option>
                      <option value="they_owe">They owe me</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Amount
                    <input type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " w-28"} value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Description
                    <input type="text" placeholder="Dinner, rent split…" className={inputCls + " w-44"} value={debtDesc} onChange={(e) => setDebtDesc(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Date
                    <input type="date" className={inputCls + " w-40"} value={debtDate} onChange={(e) => setDebtDate(e.target.value)} />
                  </label>
                  <button className={btnPrimary} disabled={saving} onClick={addDebt}>+ Add Debt</button>
                </div>

                {/* ── Summary ── */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="bg-red-900/30 border border-red-800 rounded-xl px-5 py-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">I Owe (unsettled)</span>
                    <div className="text-xl font-bold text-red-400">{fmt(debtsIOwe)}</div>
                  </div>
                  <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-5 py-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Owed to Me (unsettled)</span>
                    <div className="text-xl font-bold text-emerald-400">{fmt(debtsTheyOwe)}</div>
                  </div>
                </div>

                {/* ── I Owe (debts payable) ── */}
                {state.debts.filter((d) => d.direction === "i_owe").length > 0 && (
                  <>
                    <h3 className="text-md font-semibold text-red-400 mb-3">💸 I Owe (Debts Payable)</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-800 mb-6">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Person</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-left">Since</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {state.debts.filter((d) => d.direction === "i_owe").sort((a, b) => Number(a.settled) - Number(b.settled) || new Date(b.date).getTime() - new Date(a.date).getTime()).map((d) => (
                            <tr key={d.id} className={`transition-colors ${d.settled ? "opacity-50" : "hover:bg-gray-900/60"}`}>
                              <td className="px-4 py-2.5 font-medium">{d.person}</td>
                              <td className="px-4 py-2.5 text-gray-300">{d.description || "—"}</td>
                              <td className="px-4 py-2.5 text-gray-400">{d.date}</td>
                              <td className="px-4 py-2.5 text-right text-red-400 font-medium">{fmt(d.amount)}</td>
                              <td className="px-4 py-2.5 text-center">
                                {d.settled ? (
                                  <button className="text-xs text-emerald-400 underline underline-offset-2" onClick={() => unsettleDebt(d.id)} disabled={saving}>✅ Settled</button>
                                ) : (
                                  <button className={btnSecondary} onClick={() => settleDebt(d.id)} disabled={saving}>Mark Paid</button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className={btnDanger} disabled={saving} onClick={() => removeDebt(d.id)}>Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* ── They Owe Me (debts receivable) ── */}
                {state.debts.filter((d) => d.direction === "they_owe").length > 0 && (
                  <>
                    <h3 className="text-md font-semibold text-emerald-400 mb-3">📥 Owed to Me (Debts Receivable)</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-800 mb-6">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Person</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-left">Since</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {state.debts.filter((d) => d.direction === "they_owe").sort((a, b) => Number(a.settled) - Number(b.settled) || new Date(b.date).getTime() - new Date(a.date).getTime()).map((d) => (
                            <tr key={d.id} className={`transition-colors ${d.settled ? "opacity-50" : "hover:bg-gray-900/60"}`}>
                              <td className="px-4 py-2.5 font-medium">{d.person}</td>
                              <td className="px-4 py-2.5 text-gray-300">{d.description || "—"}</td>
                              <td className="px-4 py-2.5 text-gray-400">{d.date}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{fmt(d.amount)}</td>
                              <td className="px-4 py-2.5 text-center">
                                {d.settled ? (
                                  <button className="text-xs text-emerald-400 underline underline-offset-2" onClick={() => unsettleDebt(d.id)} disabled={saving}>✅ Collected</button>
                                ) : (
                                  <button className={btnSecondary} onClick={() => settleDebt(d.id)} disabled={saving}>Mark Collected</button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className={btnDanger} disabled={saving} onClick={() => removeDebt(d.id)}>Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              NET WORTH BREAKDOWN
             ════════════════════════════════════════════════ */}
          <section id="section-networth" className="scroll-mt-28">
            <CollapsibleHeading open={showNetWorth} onToggle={() => setShowNetWorth((v) => !v)} summary={<>
              <span>Net Worth: <span className={nw >= 0 ? "text-emerald-400" : "text-red-400"}>{fmt(nw)}</span></span>
            </>}>
              🧮 Net Worth Breakdown
            </CollapsibleHeading>
            {showNetWorth && (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Bucket</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr className="hover:bg-gray-900/60 transition-colors">
                      <td className="px-4 py-2.5">Checking Account</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${checking >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(checking)}</td>
                    </tr>
                    <tr className="hover:bg-gray-900/60 transition-colors">
                      <td className="px-4 py-2.5">HYSA ({state.hysa.apy}% APY)</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{fmt(hysaValue)}</td>
                    </tr>
                    {state.startingBalances.stocks > 0 && (
                      <tr className="hover:bg-gray-900/60 transition-colors">
                        <td className="px-4 py-2.5 pl-8 text-gray-400 italic">Stocks starting balance</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 font-medium">{fmt(state.startingBalances.stocks)}</td>
                      </tr>
                    )}
                    {stockSummaries.map((summary) => (
                      <tr key={summary.stock.id} className="hover:bg-gray-900/60 transition-colors">
                        <td className="px-4 py-2.5 pl-8 text-gray-300">{summary.stock.ticker}</td>
                        <td className="px-4 py-2.5 text-right text-white font-medium">{fmt(summary.marketValue)}</td>
                      </tr>
                    ))}
                    {(stockSummaries.length > 0 || state.startingBalances.stocks > 0) && (
                      <tr className="hover:bg-gray-900/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold">Stocks &amp; ETFs (total)</td>
                        <td className="px-4 py-2.5 text-right text-white font-medium">{fmt(state.startingBalances.stocks + stockMarket)}</td>
                      </tr>
                    )}
                    {debtsIOwe > 0 && (
                      <tr className="hover:bg-gray-900/60 transition-colors">
                        <td className="px-4 py-2.5 text-red-400">Debts I Owe (payable)</td>
                        <td className="px-4 py-2.5 text-right text-red-400 font-medium">−{fmt(debtsIOwe)}</td>
                      </tr>
                    )}
                    {debtsTheyOwe > 0 && (
                      <tr className="hover:bg-gray-900/60 transition-colors">
                        <td className="px-4 py-2.5 text-emerald-400">Debts Receivable (owed to me)</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{fmt(debtsTheyOwe)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-indigo-900/30">
                    <tr>
                      <td className="px-4 py-3 font-bold text-lg">Net Worth</td>
                      <td className={`px-4 py-3 text-right font-bold text-lg ${nw >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(nw)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              GRAPHS & CHARTS
             ════════════════════════════════════════════════ */}
          <section id="section-graphs" className="scroll-mt-28">
            <CollapsibleHeading open={showGraphs} onToggle={() => setShowGraphs((v) => !v)} summary={<>
              <span className="text-gray-500">{nwTimeline.length} data points</span>
            </>}>
              📊 Graphs &amp; Charts
            </CollapsibleHeading>

            {showGraphs && (
              <div className="flex flex-col gap-8">
                {/* ── Net Worth Over Time ── */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h3 className="text-md font-semibold text-gray-300 mb-4">
                    📈 Net Worth Over Time
                  </h3>
                  <SingleLineChart
                    data={nwTimeline}
                    color="#818cf8"
                    gradientId="nwGrad"
                    name="Net Worth"
                    height={350}
                    refLines={[{ y: 0, label: "$0", color: "#6b7280" }]}
                  />
                </div>

                {/* ── Total Stock Portfolio Value ── */}
                {stockTimeline.length >= 2 && (
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <h3 className="text-md font-semibold text-gray-300 mb-4">
                      📊 Stock Portfolio Value Over Time
                    </h3>
                    <SingleLineChart
                      data={stockTimeline}
                      color="#f472b6"
                      gradientId="stkGrad"
                      name="Portfolio Value"
                      height={300}
                    />
                  </div>
                )}

                {/* ── Per-Stock Cost Basis vs Market Value ── */}
                {stockSummaries.filter(s => s.transactions.length >= 2).map((summary) => {
                  const timeline = buildPerStockTimeline(state, summary.stock.id);
                  if (timeline.costBasis.length < 2) return null;

                  // Merge cost basis and market value into a single dataset
                  const merged = timeline.costBasis.map((cb, i) => ({
                    date: cb.date,
                    costBasis: cb.value,
                    marketValue: timeline.marketValue[i]?.value ?? 0,
                  }));

                  return (
                    <div key={summary.stock.id} className="bg-gray-800/50 rounded-xl p-4">
                      <h3 className="text-md font-semibold text-gray-300 mb-4">
                        {summary.stock.ticker}: Cost Basis vs Market Value
                      </h3>
                      <MultiLineChart
                        data={merged}
                        lines={[
                          { dataKey: "costBasis", name: "Cost Basis", color: "#9ca3af" },
                          { dataKey: "marketValue", name: "Market Value", color: "#34d399" },
                        ]}
                        height={250}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ════════════════════════════════════════════════
              PROJECTION
             ════════════════════════════════════════════════ */}
          <section id="section-projection" className="scroll-mt-28">
            <CollapsibleHeading open={showProjection} onToggle={() => setShowProjection((v) => !v)} summary={<>
              <span className="text-gray-500">Salary, compounding, goal purchases</span>
            </>}>
              🔮 Financial Projection
            </CollapsibleHeading>

            {showProjection && (
              <ProjectionSection state={state} />
            )}
          </section>

          {/* spacer */}
          <div className="h-16" />
        </main>
      </div>
    </>
  );
}
