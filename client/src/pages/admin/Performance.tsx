import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2, TrendingDown, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

export default function Performance() {
  const [data, setData] = useState<any[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getPerformance(days).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;

  const maxLatency = Math.max(...data.map(d => d.avg_ms), 1);

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Performance</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Model Performance</h1>
              <p className="text-sm text-muted-foreground">Latency, success rate, and failures per model × task.</p>
            </div>
            <div className="flex gap-1">
              {[1, 7, 30].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${days === d ? "bg-amber-500/10 text-amber-400" : "glass text-muted-foreground hover:text-foreground"}`}>
                  {d === 1 ? "24h" : d === 7 ? "7d" : "30d"}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_60px_100px_80px_60px] gap-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/30">
            <span>Model</span><span>Task</span><span>Latency</span><span>Calls</span><span>Success</span><span>Fails</span><span className="text-right">Range</span>
          </div>
          {data.map((row: any, i: number) => {
            const healthColor = row.success_rate < 0.8 ? "text-red-400" : row.success_rate < 0.95 ? "text-amber-400" : "text-emerald-400";
            const latencyPct = (row.avg_ms / maxLatency) * 100;
            return (
              <div key={i} className={`grid grid-cols-[1fr_1fr_1fr_60px_100px_80px_60px] gap-0 px-4 py-2.5 text-xs items-center ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <span className="text-foreground font-mono text-[11px] truncate">{row.model_id}</span>
                <span className="text-muted-foreground">{row.task}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400/40 rounded-full" style={{ width: `${latencyPct}%` }} />
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px] shrink-0 w-16 text-right">{Math.round(row.avg_ms)}ms</span>
                </div>
                <span className="text-muted-foreground font-mono">{row.calls}</span>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${healthColor.replace("text-", "bg-")}`} />
                  <span className={`font-mono ${healthColor}`}>{(row.success_rate * 100).toFixed(0)}%</span>
                </div>
                {row.failures > 0 ? (
                  <span className="text-red-400 font-mono flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />{row.failures}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <span className="text-[9px] text-muted-foreground font-mono text-right">{row.min_ms}–{row.max_ms}</span>
              </div>
            );
          })}
          {data.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs">No performance data yet.</div>}
        </div>
      </div>
    </div>
  );
}
