/**
 * Admin · Users — list with sortable columns, click for detail.
 *
 * Shows the at-a-glance picture an operator wants for any beta cohort:
 * who's signed up, when they were last active, balance, this-month spend.
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Loader2, Shield, ShieldOff, ChevronUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

interface UserRow {
  id: string;
  email: string;
  isAdmin: boolean;
  status: string;
  credits: number;
  thisMonthSpendCredits: number;
  lastActiveAt: string | null;
  createdAt: string;
}

type SortKey = "email" | "credits" | "thisMonthSpendCredits" | "lastActiveAt" | "createdAt";

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso + "Z").getTime();
  if (ms < 0) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Users() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    api.adminUsers().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const f = filter.toLowerCase();
    return rows
      .filter(r => !f || r.email.toLowerCase().includes(f) || r.id.includes(f))
      .sort((a, b) => {
        const va: any = (a as any)[sort];
        const vb: any = (b as any)[sort];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
        return dir === "asc" ? cmp : -cmp;
      });
  }, [rows, filter, sort, dir]);

  function flip(k: SortKey) {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(k); setDir("desc"); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-xs text-muted-foreground mt-1">{rows.length} total — click a row for actions</p>
        </div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="filter by email or id…"
          className="rounded-lg bg-background/50 px-3 py-1.5 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
              <SortHeader k="email" label="Email" sort={sort} dir={dir} flip={flip} />
              <th className="text-left py-2 px-3 w-20">Role</th>
              <th className="text-left py-2 px-3 w-24">Status</th>
              <SortHeader k="credits" label="Balance" align="right" sort={sort} dir={dir} flip={flip} />
              <SortHeader k="thisMonthSpendCredits" label="Spend (mo)" align="right" sort={sort} dir={dir} flip={flip} />
              <SortHeader k="lastActiveAt" label="Last active" sort={sort} dir={dir} flip={flip} />
              <SortHeader k="createdAt" label="Joined" sort={sort} dir={dir} flip={flip} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">No users match.</td></tr>
            )}
            {sorted.map(u => (
              <tr key={u.id}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer">
                <td className="py-3 px-3">
                  <div className="text-foreground">{u.email || <span className="italic text-muted-foreground">no email</span>}</div>
                  <div className="text-[10px] text-muted-foreground/70 font-mono">{u.id.slice(0, 14)}</div>
                </td>
                <td className="py-3 px-3">
                  {u.isAdmin
                    ? <span className="inline-flex items-center gap-1 text-amber-300 text-xs"><Shield className="h-3 w-3" />admin</span>
                    : <span className="text-xs text-muted-foreground"><ShieldOff className="h-3 w-3 inline" /> user</span>}
                </td>
                <td className="py-3 px-3">
                  <span className={`text-xs ${u.status === "active" ? "text-emerald-300" : "text-amber-400"}`}>{u.status}</span>
                </td>
                <td className="py-3 px-3 text-right tabular-nums">{fmtNum(u.credits)}</td>
                <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">{fmtNum(u.thisMonthSpendCredits)}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{fmtRelative(u.lastActiveAt)}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{fmtRelative(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({ k, label, align, sort, dir, flip }: {
  k: SortKey; label: string; align?: "right"; sort: SortKey; dir: "asc" | "desc"; flip: (k: SortKey) => void;
}) {
  const active = sort === k;
  return (
    <th onClick={() => flip(k)}
        className={`py-2 px-3 cursor-pointer select-none ${align === "right" ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1 ${active ? "text-foreground" : ""}`}>
        {label}
        {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}
