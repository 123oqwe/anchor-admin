/**
 * Admin · Experiments — read view of the per-user A/B framework.
 *
 * Each row is one experiment owned by one user. Clicking a row expands
 * the variant breakdown with a Wilson 95% CI when sample size is ≥ 5
 * (the backend returns null for smaller n; we render "—" so the UI
 * never lies about statistical confidence at small numbers).
 *
 * Stop is the only mutation here — admin force-stops a misconfigured
 * experiment. Creation lives in anchor-backend (per-user CRUD).
 */
import { useEffect, useState } from "react";
import { Loader2, Square, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface ExpListRow {
  id: string; user_id: string; user_email: string | null;
  key: string; description: string; status: string;
  traffic_split: number; success_metric: string;
  started_at: string; ended_at: string | null; winner: string | null;
  assignments: number;
}

interface VariantStat {
  variant: "a" | "b";
  total: number;
  withOutcome: number;
  avgValue: number | null;
  ci95: { low: number; high: number } | null;
}

export default function Experiments() {
  const { can } = useSession();
  const [rows, setRows] = useState<ExpListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ experiment: ExpListRow; variants: VariantStat[] } | null>(null);

  const reload = () => api.adminExperiments().then(setRows).catch(() => {});
  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  async function expand(id: string) {
    if (open === id) { setOpen(null); setDetail(null); return; }
    setOpen(id);
    setDetail(null);
    try { setDetail(await api.adminExperiment(id)); }
    catch { setDetail(null); }
  }

  async function stop(id: string) {
    if (!confirm("Stop this experiment? Past assignments stay; no new ones.")) return;
    try { await api.adminStopExperiment(id); reload(); }
    catch (e: any) { alert(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;
  const writable = can("experiments.write");

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">A/B experiments</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Per-user prompt variants. CIs shown when n ≥ 5 — at smaller samples,
          treat differences as suggestive, not conclusive.
        </p>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {rows.length === 0 && <p className="p-8 text-center text-xs text-muted-foreground">No experiments running.</p>}
        {rows.map(e => {
          const expanded = open === e.id;
          return (
            <div key={e.id} className="border-b border-white/5 last:border-0">
              <div onClick={() => expand(e.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]">
                {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-foreground truncate">{e.key}</div>
                  <div className="text-[10px] text-muted-foreground">{e.user_email ?? e.user_id} · started {new Date(e.started_at + "Z").toLocaleDateString()}</div>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">n = {e.assignments}</div>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  e.status === "running" ? "bg-emerald-500/10 text-emerald-300"
                  : e.status === "stopped" ? "bg-muted/20 text-muted-foreground"
                  : "bg-amber-500/10 text-amber-300"
                }`}>{e.status}</span>
                {writable && e.status === "running" && (
                  <button onClick={(ev) => { ev.stopPropagation(); stop(e.id); }}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1" title="Stop">
                    <Square className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {expanded && detail?.experiment.id === e.id && (
                <div className="px-4 pb-4 pl-9 space-y-3">
                  <div className="text-[11px] text-muted-foreground">
                    success metric: <span className="font-mono">{e.success_metric}</span> ·
                    traffic split: A {Math.round(e.traffic_split * 100)}% / B {100 - Math.round(e.traffic_split * 100)}%
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(["a", "b"] as const).map(v => {
                      const stat = detail.variants.find(x => x.variant === v);
                      return (
                        <div key={v} className="rounded-md border border-white/5 p-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Variant {v.toUpperCase()}</span>
                            <span className="text-sm tabular-nums">n = {stat?.total ?? 0}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            with outcome: <span className="text-foreground">{stat?.withOutcome ?? 0}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            avg outcome value: <span className="text-foreground">{stat?.avgValue == null ? "—" : stat.avgValue.toFixed(3)}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            95% CI: {stat?.ci95 == null
                              ? <span title="n < 5 — too few samples to estimate">—</span>
                              : <span className="text-foreground tabular-nums">[{(stat.ci95.low * 100).toFixed(1)}%, {(stat.ci95.high * 100).toFixed(1)}%]</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
