/**
 * Finance Tracker — runway calculation + manual spend tracking.
 *
 * No bank API needed. User enters:
 * - Current balance
 * - Monthly burn rate
 * → System calculates runway and creates finance graph nodes.
 */
import { db, DEFAULT_USER_ID } from "../../infra/storage/db.js";
import { nanoid } from "nanoid";

export interface FinanceSnapshot {
  balance: number;
  monthlyBurn: number;
  monthlyIncome: number;
  runway: number; // months
  updatedAt: string;
}

export function saveFinanceSnapshot(data: { balance: number; monthlyBurn: number; monthlyIncome?: number }): FinanceSnapshot {
  const netBurn = data.monthlyBurn - (data.monthlyIncome ?? 0);
  const runway = netBurn > 0 ? Math.round((data.balance / netBurn) * 10) / 10 : 999;

  // Upsert finance constraint node
  const existing = db.prepare(
    "SELECT id FROM graph_nodes WHERE user_id=? AND type='constraint' AND label LIKE '%Runway%'"
  ).get(DEFAULT_USER_ID) as any;

  if (existing) {
    db.prepare("UPDATE graph_nodes SET detail=?, status=?, updated_at=datetime('now') WHERE id=?")
      .run(`$${data.balance.toLocaleString()} balance, $${data.monthlyBurn.toLocaleString()}/mo burn, ${runway} months runway`, runway < 3 ? "critical" : runway < 6 ? "active" : "stable", existing.id);
  } else {
    db.prepare("INSERT INTO graph_nodes (id, user_id, domain, label, type, status, captured, detail) VALUES (?,?,?,?,?,?,?,?)")
      .run(nanoid(), DEFAULT_USER_ID, "finance", `Runway: ${runway} months`, "constraint", runway < 3 ? "critical" : runway < 6 ? "active" : "stable", "Manual finance input", `$${data.balance.toLocaleString()} balance, $${data.monthlyBurn.toLocaleString()}/mo burn`);
  }

  // Create or update balance node
  const balanceNode = db.prepare(
    "SELECT id FROM graph_nodes WHERE user_id=? AND domain='finance' AND label LIKE '%Balance%'"
  ).get(DEFAULT_USER_ID) as any;

  if (balanceNode) {
    db.prepare("UPDATE graph_nodes SET detail=?, updated_at=datetime('now') WHERE id=?")
      .run(`$${data.balance.toLocaleString()}`, balanceNode.id);
  } else {
    db.prepare("INSERT INTO graph_nodes (id, user_id, domain, label, type, status, captured, detail) VALUES (?,?,?,?,?,?,?,?)")
      .run(nanoid(), DEFAULT_USER_ID, "finance", "Current Balance", "resource", "active", "Manual input", `$${data.balance.toLocaleString()}`);
  }

  return {
    balance: data.balance,
    monthlyBurn: data.monthlyBurn,
    monthlyIncome: data.monthlyIncome ?? 0,
    runway,
    updatedAt: new Date().toISOString(),
  };
}

export function getFinanceSnapshot(): FinanceSnapshot | null {
  const node = db.prepare(
    "SELECT detail FROM graph_nodes WHERE user_id=? AND type='constraint' AND label LIKE '%Runway%'"
  ).get(DEFAULT_USER_ID) as any;

  if (!node) return null;

  // Parse from detail string
  const balanceMatch = node.detail.match(/\$([0-9,]+)/);
  const burnMatch = node.detail.match(/\$([0-9,]+)\/mo/);
  const runwayMatch = node.detail.match(/([0-9.]+) months/);

  return {
    balance: balanceMatch ? parseInt(balanceMatch[1].replace(/,/g, "")) : 0,
    monthlyBurn: burnMatch ? parseInt(burnMatch[1].replace(/,/g, "")) : 0,
    monthlyIncome: 0,
    runway: runwayMatch ? parseFloat(runwayMatch[1]) : 0,
    updatedAt: "",
  };
}
