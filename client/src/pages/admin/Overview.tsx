/**
 * Admin · Overview — single-screen system pulse.
 *
 * Sources from admin-backend's tiny aggregate endpoints (cheap SQL):
 *   /admin/health  — counters across users / runs / jobs / failures
 *   /admin/margin  — Stripe revenue vs OpenRouter spend over a window
 *   /admin/runs    — recent activity for the live ticker
 *
 * Designed to render the operator's daily five-second question:
 * "is anything on fire and how much money am I making/burning?"
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, AlertTriangle, Loader2, Coins, Users, Activity } from "lucide-react";
import { api } from "@/lib/api";

export default function Overview() {
  const [, navigate] = useLocation();
  const [health, setHealth] = useState<{ usersTotal: number; usersToday: number; runsRunning: number; jobsPending: number; failures24h: number } | null>(null);
  const [margin, setMargin] = useState<{ days: number; stripeRevenueUsd: number; llmSpendUsd: number; marginUsd: number } | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.adminHealth().catch(() => null),
      api.adminMargin(7).catch(() => null),
      api.adminRuns({ limit: 15 }).catch(() => []),
    ]).then(([h, m, r]) => {
      setHealth(h);
      setMargin(m);
      setRuns(r ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const isHealthy = (health?.failures24h ?? 0) < 5;
  const marginUsd = margin?.marginUsd ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl ${isHealthy ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
        {isHealthy ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
        <span className="text-sm font-medium text-foreground">{isHealthy ? "System healthy" : "Issues detected"}</span>
        <span className="ml-auto text-xs text-muted-foreground">past 24h · {health?.failures24h ?? 0} failed runs</span>
      </div>

      {/* Money + people grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Active users" value={health?.usersTotal ?? 0} sub={`${health?.usersToday ?? 0} active today`} color="text-blue-400" />
        <Metric label="Revenue (7d)" value={`$${(margin?.stripeRevenueUsd ?? 0).toFixed(2)}`} sub="Stripe top-ups" color="text-emerald-400" />
        <Metric label="LLM spend (7d)" value={`$${(margin?.llmSpendUsd ?? 0).toFixed(2)}`} sub="OpenRouter cost" color="text-amber-400" />
        <Metric label="Margin (7d)" value={`$${marginUsd.toFixed(2)}`} sub={marginUsd >= 0 ? "in the black" : "subsidising"} color={marginUsd >= 0 ? "text-emerald-400" : "text-red-400"} />
        <Metric label="Running" value={health?.runsRunning ?? 0} sub={`${health?.jobsPending ?? 0} jobs queued`} color="text-cyan-400" />
      </div>

      {/* Recent runs ticker */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="h-3 w-3" /> Recent agent runs
        </h3>
        <div className="space-y-1">
          {runs.length === 0 && <p className="text-xs text-muted-foreground/40 py-4 text-center">No activity yet.</p>}
          {runs.map(r => (
            <div key={r.id}
              onClick={() => navigate(`/admin/runs/${r.id}`)}
              className="flex items-center gap-2 text-xs py-1.5 px-2 -mx-2 rounded cursor-pointer hover:bg-white/[0.02]">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                r.status === "completed" ? "bg-emerald-400"
                : r.status === "failed" ? "bg-red-400"
                : r.status === "running" ? "bg-blue-400 animate-pulse"
                : "bg-muted-foreground"
              }`} />
              <span className="text-muted-foreground w-12 shrink-0 font-mono text-[10px]">{r.created_at?.slice(11, 16)}</span>
              <span className="text-foreground w-40 shrink-0 truncate">{r.agent_name}</span>
              <span className="text-muted-foreground truncate flex-1">{r.user_message}</span>
              <span className="text-muted-foreground/70 w-16 text-right shrink-0">turn {r.turn}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</div>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </div>
  );
}
