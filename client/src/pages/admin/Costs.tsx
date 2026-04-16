import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

function fmtCost(n: number) {
  if (n < 0.01) return `$${(n * 100).toFixed(4)}¢`;
  return `$${n.toFixed(4)}`;
}

function fmtNum(n: number) {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function Costs() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCosts(days).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Failed to load</div>;

  const total = data.total?.v ?? 0;
  const calls = data.callCount?.v ?? 0;
  const failureRate = data.failureRate?.v ?? 0;
  const maxDayCost = Math.max(...(data.byDay?.map((d: any) => d.cost) ?? [0]));

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Cost Tracking</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">LLM Spend</h1>
              <p className="text-sm text-muted-foreground">Per-provider and per-task costs based on actual API calls.</p>
            </div>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button key={r.days} onClick={() => setDays(r.days)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${days === r.days ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-5">
            <div className="glass rounded-xl px-5 py-4 flex-1">
              <div className="text-3xl font-bold text-foreground">${total.toFixed(4)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Total spend · last {days}d</div>
            </div>
            <div className="glass rounded-xl px-5 py-4 flex-1">
              <div className="text-3xl font-bold text-foreground">{fmtNum(calls)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Total calls</div>
            </div>
            <div className="glass rounded-xl px-5 py-4 flex-1">
              <div className={`text-3xl font-bold ${failureRate > 0.05 ? "text-red-400" : "text-emerald-400"}`}>
                {(failureRate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Failure rate</div>
            </div>
            <div className="glass rounded-xl px-5 py-4 flex-1">
              <div className="text-3xl font-bold text-foreground">
                {calls > 0 ? `$${(total / calls).toFixed(5)}` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Avg cost / call</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        {/* Daily trend */}
        {data.byDay && data.byDay.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Daily Trend</h2>
            <div className="glass rounded-xl p-5">
              <div className="flex items-end gap-1.5 h-40">
                {data.byDay.map((d: any) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end flex-1">
                      <div className="text-[9px] text-muted-foreground font-mono mb-1">{fmtCost(d.cost)}</div>
                      <div className="w-full bg-amber-500/30 rounded-t" style={{ height: `${(d.cost / (maxDayCost || 1)) * 100}%`, minHeight: "2px" }} />
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono">{d.day.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Provider */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">By Provider</h2>
            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_80px_80px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
                <span>Provider</span><span>Calls</span><span>Tokens</span><span>Cost</span>
              </div>
              {data.byProvider.map((p: any, i: number) => (
                <div key={p.provider_id} className={`grid grid-cols-[1fr_60px_80px_80px] gap-0 px-4 py-2 text-xs items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <span className="text-foreground">{p.provider_id}</span>
                  <span className="text-muted-foreground font-mono">{p.calls}</span>
                  <span className="text-muted-foreground font-mono">{fmtNum(p.input_tokens + p.output_tokens)}</span>
                  <span className="text-amber-400 font-mono">{fmtCost(p.cost)}</span>
                </div>
              ))}
              {data.byProvider.length === 0 && <div className="text-center py-6 text-muted-foreground text-xs">No data yet</div>}
            </div>
          </div>

          {/* By Task */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">By Task</h2>
            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_80px_80px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
                <span>Task</span><span>Calls</span><span>Latency</span><span>Cost</span>
              </div>
              {data.byTask.map((t: any, i: number) => (
                <div key={t.task} className={`grid grid-cols-[1fr_60px_80px_80px] gap-0 px-4 py-2 text-xs items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <span className="text-foreground">{t.task}</span>
                  <span className="text-muted-foreground font-mono">{t.calls}</span>
                  <span className="text-muted-foreground font-mono">{Math.round(t.avg_latency)}ms</span>
                  <span className="text-amber-400 font-mono">{fmtCost(t.cost)}</span>
                </div>
              ))}
              {data.byTask.length === 0 && <div className="text-center py-6 text-muted-foreground text-xs">No data yet</div>}
            </div>
          </div>
        </div>

        {/* By Model */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">By Model <span className="text-[10px] text-muted-foreground font-normal">· performance & cost</span></h2>
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_60px_80px_80px_80px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
              <span>Model</span><span>Provider</span><span>Calls</span><span>Latency</span><span>Success</span><span>Cost</span>
            </div>
            {data.byModel.map((m: any, i: number) => (
              <div key={m.model_id} className={`grid grid-cols-[1.5fr_1fr_60px_80px_80px_80px] gap-0 px-4 py-2 text-xs items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <span className="text-foreground font-mono text-[11px] truncate">{m.model_id}</span>
                <span className="text-muted-foreground">{m.provider_id}</span>
                <span className="text-muted-foreground font-mono">{m.calls}</span>
                <span className="text-muted-foreground font-mono">{Math.round(m.avg_latency)}ms</span>
                <span className={`font-mono ${m.success_rate < 0.95 ? "text-red-400" : "text-emerald-400"}`}>
                  {(m.success_rate * 100).toFixed(0)}%
                </span>
                <span className="text-amber-400 font-mono">{fmtCost(m.cost)}</span>
              </div>
            ))}
            {data.byModel.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                <AlertCircle className="h-4 w-4 mx-auto mb-2 opacity-50" />
                No calls recorded in the last {days}d. Make some LLM calls to generate data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
