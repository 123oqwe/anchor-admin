/**
 * Finance Tracker — personal money management for Human Graph.
 *
 * Finance domain = ONLY real money:
 *   balance, spending, income, runway, investments, debt
 *   NOT "finance courses" or "valuation study" (those go to work/growth)
 *
 * Features:
 * 1. Runway calculation (balance / net burn)
 * 2. Spending categories (rent, food, tools, servers, entertainment)
 * 3. Monthly trend tracking
 * 4. Risk detection (burn rate increasing, runway shrinking)
 */
import { db, DEFAULT_USER_ID } from "../../infra/storage/db.js";
import { nanoid } from "nanoid";

// ── Spending table (create if not exists) ───────────────────────────────────

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      month TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_finance_user ON finance_entries(user_id, month);
  `);
} catch {}

export interface FinanceSnapshot {
  balance: number;
  monthlyBurn: number;
  monthlyIncome: number;
  runway: number;
  categories: { category: string; amount: number }[];
  trend: { month: string; burn: number; income: number }[];
  risks: string[];
  updatedAt: string;
}

// ── Core: save balance + burn ───────────────────────────────────────────────

export function saveFinanceSnapshot(data: {
  balance: number;
  monthlyBurn: number;
  monthlyIncome?: number;
  categories?: { category: string; amount: number }[];
}): FinanceSnapshot {
  const netBurn = data.monthlyBurn - (data.monthlyIncome ?? 0);
  const runway = netBurn > 0 ? Math.round((data.balance / netBurn) * 10) / 10 : 999;
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Save monthly totals as finance entries
  const existing = db.prepare("SELECT id FROM finance_entries WHERE user_id=? AND month=? AND type='summary'").get(DEFAULT_USER_ID, month) as any;
  if (existing) {
    db.prepare("UPDATE finance_entries SET amount=?, note=? WHERE id=?")
      .run(data.monthlyBurn, `balance:${data.balance}|income:${data.monthlyIncome ?? 0}`, existing.id);
  } else {
    db.prepare("INSERT INTO finance_entries (id, user_id, type, category, amount, note, month) VALUES (?,?,?,?,?,?,?)")
      .run(nanoid(), DEFAULT_USER_ID, "summary", "total", data.monthlyBurn, `balance:${data.balance}|income:${data.monthlyIncome ?? 0}`, month);
  }

  // Save spending categories
  if (data.categories) {
    for (const cat of data.categories) {
      db.prepare("INSERT INTO finance_entries (id, user_id, type, category, amount, month) VALUES (?,?,?,?,?,?)")
        .run(nanoid(), DEFAULT_USER_ID, "expense", cat.category, cat.amount, month);
    }
  }

  // ── Update graph nodes ──

  // Runway constraint
  const runwayNode = db.prepare("SELECT id FROM graph_nodes WHERE user_id=? AND domain='finance' AND label LIKE '%Runway%'").get(DEFAULT_USER_ID) as any;
  const runwayLabel = `Runway: ${runway} months`;
  const runwayDetail = `$${data.balance.toLocaleString()} balance | $${data.monthlyBurn.toLocaleString()}/mo burn | $${(data.monthlyIncome ?? 0).toLocaleString()}/mo income`;
  const runwayStatus = runway < 3 ? "critical" : runway < 6 ? "delayed" : runway < 12 ? "active" : "stable";

  if (runwayNode) {
    db.prepare("UPDATE graph_nodes SET label=?, detail=?, status=?, updated_at=datetime('now') WHERE id=?")
      .run(runwayLabel, runwayDetail, runwayStatus, runwayNode.id);
  } else {
    db.prepare("INSERT INTO graph_nodes (id, user_id, domain, label, type, status, captured, detail) VALUES (?,?,?,?,?,?,?,?)")
      .run(nanoid(), DEFAULT_USER_ID, "finance", runwayLabel, "constraint", runwayStatus, "Finance tracker", runwayDetail);
  }

  // Monthly burn node
  const burnNode = db.prepare("SELECT id FROM graph_nodes WHERE user_id=? AND domain='finance' AND label LIKE '%Monthly Burn%'").get(DEFAULT_USER_ID) as any;
  if (burnNode) {
    db.prepare("UPDATE graph_nodes SET detail=?, updated_at=datetime('now') WHERE id=?")
      .run(`$${data.monthlyBurn.toLocaleString()}/mo`, burnNode.id);
  } else {
    db.prepare("INSERT INTO graph_nodes (id, user_id, domain, label, type, status, captured, detail) VALUES (?,?,?,?,?,?,?,?)")
      .run(nanoid(), DEFAULT_USER_ID, "finance", "Monthly Burn Rate", "constraint", "active", "Finance tracker", `$${data.monthlyBurn.toLocaleString()}/mo`);
  }

  // Detect risks
  const risks: string[] = [];
  if (runway < 3) risks.push("Critical: less than 3 months runway");
  if (runway < 6) risks.push("Runway under 6 months — start fundraising now");
  if (data.monthlyBurn > (data.monthlyIncome ?? 0) * 2) risks.push("Burn rate is 2x+ your income");

  // Create risk node if critical
  if (runway < 6) {
    const riskNode = db.prepare("SELECT id FROM graph_nodes WHERE user_id=? AND domain='finance' AND type='risk'").get(DEFAULT_USER_ID) as any;
    if (!riskNode) {
      db.prepare("INSERT INTO graph_nodes (id, user_id, domain, label, type, status, captured, detail) VALUES (?,?,?,?,?,?,?,?)")
        .run(nanoid(), DEFAULT_USER_ID, "finance", "Runway Risk", "risk", runway < 3 ? "critical" : "active", "Finance tracker", `${runway} months remaining at current burn`);
    }
  }

  return {
    balance: data.balance,
    monthlyBurn: data.monthlyBurn,
    monthlyIncome: data.monthlyIncome ?? 0,
    runway,
    categories: data.categories ?? [],
    trend: getMonthlyTrend(),
    risks,
    updatedAt: new Date().toISOString(),
  };
}

// ── Add individual expense ──────────────────────────────────────────────────

export function addExpense(data: { category: string; amount: number; note?: string }): void {
  const month = new Date().toISOString().slice(0, 7);
  db.prepare("INSERT INTO finance_entries (id, user_id, type, category, amount, note, month) VALUES (?,?,?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, "expense", data.category, data.amount, data.note ?? "", month);
}

// ── Monthly trend ───────────────────────────────────────────────────────────

function getMonthlyTrend(): { month: string; burn: number; income: number }[] {
  const rows = db.prepare(
    "SELECT month, amount, note FROM finance_entries WHERE user_id=? AND type='summary' ORDER BY month DESC LIMIT 6"
  ).all(DEFAULT_USER_ID) as any[];

  return rows.map(r => {
    const incomeMatch = r.note?.match(/income:(\d+)/);
    return { month: r.month, burn: r.amount, income: incomeMatch ? parseInt(incomeMatch[1]) : 0 };
  }).reverse();
}

// ── Get current snapshot ────────────────────────────────────────────────────

export function getFinanceSnapshot(): FinanceSnapshot | null {
  const month = new Date().toISOString().slice(0, 7);
  const summary = db.prepare(
    "SELECT amount, note FROM finance_entries WHERE user_id=? AND type='summary' AND month=?"
  ).get(DEFAULT_USER_ID, month) as any;

  if (!summary) return null;

  const balanceMatch = summary.note?.match(/balance:(\d+)/);
  const incomeMatch = summary.note?.match(/income:(\d+)/);
  const balance = balanceMatch ? parseInt(balanceMatch[1]) : 0;
  const income = incomeMatch ? parseInt(incomeMatch[1]) : 0;
  const burn = summary.amount;
  const netBurn = burn - income;
  const runway = netBurn > 0 ? Math.round((balance / netBurn) * 10) / 10 : 999;

  // Get spending categories for this month
  const categories = db.prepare(
    "SELECT category, SUM(amount) as amount FROM finance_entries WHERE user_id=? AND type='expense' AND month=? GROUP BY category ORDER BY amount DESC"
  ).all(DEFAULT_USER_ID, month) as any[];

  const risks: string[] = [];
  if (runway < 3) risks.push("Critical: less than 3 months runway");
  if (runway < 6) risks.push("Runway under 6 months");

  return {
    balance, monthlyBurn: burn, monthlyIncome: income, runway,
    categories: categories.map((c: any) => ({ category: c.category, amount: c.amount })),
    trend: getMonthlyTrend(),
    risks,
    updatedAt: new Date().toISOString(),
  };
}

// ── Spending categories for UI ──────────────────────────────────────────────

export const SPENDING_CATEGORIES = [
  "rent", "food", "transport", "tools", "servers", "subscriptions",
  "entertainment", "education", "health", "clothing", "other",
];
