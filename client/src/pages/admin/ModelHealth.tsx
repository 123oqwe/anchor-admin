/**
 * Admin · Model Health — top 30 most-used models with rolling P95/error stats.
 *
 * Status colors: healthy=green, degraded=amber, down=red. Auto-refresh every 30s
 * (matches the in-process cache TTL on the backend).
 */
import { useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { api } from "@/lib/api";

const STATUS_COLOR: Record<string, string> = {
  healthy: "text-emerald-400",
  degraded: "text-amber-400",
  down: "text-red-400",
};
const STATUS_BG: Record<string, string> = {
  healthy: "bg-emerald-500/10",
  degraded: "bg-amber-500/10",
  down: "bg-red-500/10",
};

export default function ModelHealth() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try { setRows(await api.modelsHealth()); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); const i = setInterval(reload, 30_000); return () => clearInterval(i); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-5 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-amber-400" /> Model health</h1>
        <p className="text-xs text-muted-foreground mt-1">Top {rows.length} models by usage in last 24h. Computed from llm_calls — refreshed every 30s.</p>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_70px_80px_70px_70px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
          <span>Model</span><span>24h</span><span>1k tot</span><span>fail %</span><span>P95 ms</span><span>Status</span>
        </div>
        {rows.length === 0 && <div className="text-center py-10 text-muted-foreground text-xs">No traffic in last 24h.</div>}
        {rows.map(r => {
          const failRate = r.total_calls_1k > 0 ? r.failures_1k / r.total_calls_1k : 0;
          return (
            <div key={r.model_id} className="grid grid-cols-[1fr_60px_70px_80px_70px_70px] gap-2 px-4 py-2 text-xs items-center border-b border-white/5 last:border-0">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-foreground truncate">{r.model_id}</div>
                {r.name && <div className="text-[10px] text-muted-foreground truncate">{r.name}</div>}
              </div>
              <span className="text-foreground font-mono text-[10px] tabular-nums">{r.calls_24h}</span>
              <span className="text-muted-foreground font-mono text-[10px] tabular-nums">{r.total_calls_1k ?? 0}</span>
              <span className={`font-mono text-[10px] tabular-nums ${failRate > 0.1 ? "text-red-400" : failRate > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                {(failRate * 100).toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-mono text-[10px] tabular-nums">{r.p95_latency_ms ?? "—"}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono w-fit ${STATUS_COLOR[r.status] ?? "text-muted-foreground"} ${STATUS_BG[r.status] ?? ""}`}>
                {r.status ?? "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
