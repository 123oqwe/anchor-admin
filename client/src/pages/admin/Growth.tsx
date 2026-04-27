/**
 * Admin · Growth — cohorts, LTV, funnel in one screen.
 *
 * Three independent SQL aggregates rendered as three plain sections.
 * No charts — operator at 100 users does fine reading numbers; charts
 * are easy to add later when the data deserves them.
 */
import { useEffect, useState } from "react";
import { Loader2, Users, DollarSign, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

interface Cohort { signup_week: string; signed_up: number; week_0_active: number; week_1_active: number; week_4_active: number }
interface LTVRow { id: string; email: string; createdAt: string; revenueUsd: number; llmCostUsd: number; marginUsd: number }
interface FunnelStep { stage: string; count: number }

export default function Growth() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [ltv, setLtv] = useState<LTVRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.adminCohorts().then(setCohorts),
      api.adminLTV().then(setLtv),
      api.adminFunnel().then(setFunnel),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const maxFunnel = Math.max(1, ...funnel.map(s => s.count));

  return (
    <div className="space-y-8 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Growth</h1>
        <p className="text-xs text-muted-foreground mt-1">Cohort retention, lifetime value, and signup funnel.</p>
      </div>

      {/* Funnel */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5" /> Funnel</h2>
        <div className="glass rounded-xl p-4 space-y-2">
          {funnel.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
          {funnel.map((s, i) => {
            const prevCount = i === 0 ? null : funnel[i - 1].count;
            const conv = prevCount && prevCount > 0 ? (s.count / prevCount) * 100 : null;
            return (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-32">{s.stage}</span>
                <div className="flex-1 h-6 bg-white/[0.02] rounded overflow-hidden">
                  <div className="h-full bg-primary/30" style={{ width: `${(s.count / maxFunnel) * 100}%` }} />
                </div>
                <span className="text-sm tabular-nums w-16 text-right">{s.count}</span>
                {conv != null && (
                  <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums">{conv.toFixed(0)}%</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Cohorts */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Cohort retention</h2>
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3">Signup week</th>
                <th className="text-right py-2 px-3">Signed up</th>
                <th className="text-right py-2 px-3">Week 0 active</th>
                <th className="text-right py-2 px-3">Week 1 active</th>
                <th className="text-right py-2 px-3">Week 4 active</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">No cohort data.</td></tr>}
              {cohorts.map(c => (
                <tr key={c.signup_week} className="border-b border-white/5 last:border-0">
                  <td className="py-2 px-3 text-xs text-muted-foreground">{c.signup_week}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{c.signed_up}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{cellPct(c.week_0_active, c.signed_up)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{cellPct(c.week_1_active, c.signed_up)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{cellPct(c.week_4_active, c.signed_up)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LTV */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" /> Top users by revenue</h2>
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-right py-2 px-3">Revenue</th>
                <th className="text-right py-2 px-3">LLM cost</th>
                <th className="text-right py-2 px-3">Margin</th>
              </tr>
            </thead>
            <tbody>
              {ltv.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-xs text-muted-foreground">No paying users yet.</td></tr>}
              {ltv.slice(0, 25).map(r => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 px-3 truncate">{r.email}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-emerald-300">${r.revenueUsd.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">${r.llmCostUsd.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right tabular-nums ${r.marginUsd >= 0 ? "text-foreground" : "text-amber-400"}`}>${r.marginUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function cellPct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${n} (${Math.round((n / total) * 100)}%)`;
}
