import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HeartPulse, Loader2, CheckCircle2, XCircle, AlertTriangle, Brain, Shield } from "lucide-react";
import { api } from "@/lib/api";

export default function Health() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSystemHealth().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Failed to load health data</div>;

  return (
    <div className="min-h-screen dot-grid">
      <div className="px-8 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">System Health</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Health Dashboard</h1>
          <p className="text-sm text-muted-foreground">Confirmation rates, failures, skill reuse, and system vitals.</p>

          {/* Key metrics */}
          <div className="flex gap-4 mt-6 flex-wrap">
            <div className="glass rounded-xl px-4 py-3 min-w-[120px]">
              <div className="text-2xl font-bold text-foreground">{data.confirmRate}%</div>
              <div className="text-[10px] text-muted-foreground">Confirm Rate</div>
              <div className="text-[9px] text-muted-foreground/50">{data.totalDecisions} decisions</div>
            </div>
            <div className="glass rounded-xl px-4 py-3 min-w-[120px]">
              <div className="text-2xl font-bold text-foreground">{data.avgResponseMs}ms</div>
              <div className="text-[10px] text-muted-foreground">Avg Latency (7d)</div>
            </div>
            <div className="glass rounded-xl px-4 py-3 min-w-[120px]">
              <div className="text-2xl font-bold text-foreground">{data.skills?.reuseRate ?? 0}%</div>
              <div className="text-[10px] text-muted-foreground">Skill Reuse</div>
              <div className="text-[9px] text-muted-foreground/50">{data.skills?.used}/{data.skills?.total} skills</div>
            </div>
            <div className="glass rounded-xl px-4 py-3 min-w-[120px]">
              <div className={`text-2xl font-bold ${data.failures24h > 0 ? "text-red-400" : "text-emerald-400"}`}>{data.failures24h}</div>
              <div className="text-[10px] text-muted-foreground">Failures (24h)</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        {/* Top failures */}
        {data.topFailures?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Top Failures (7d)
            </h2>
            <div className="glass rounded-xl p-4 space-y-2">
              {data.topFailures.map((f: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{f.agent}</span>
                  <span className="text-red-400 font-mono">{f.cnt} failures</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Evolution dimensions */}
        {data.evolution?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-purple-400" /> Evolution State
            </h2>
            <div className="glass rounded-xl p-4 space-y-3">
              {data.evolution.map((dim: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground capitalize">{dim.dimension}</span>
                    <span className="text-muted-foreground font-mono">{Math.round(dim.current_value * 100)}% ({dim.evidence_count} evidence)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-400/60" style={{ width: `${dim.current_value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Permission audit */}
        {data.permissionAudit?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-amber-400" /> Permission Audit (7d)
            </h2>
            <div className="glass rounded-xl p-4">
              <div className="flex gap-4 flex-wrap">
                {data.permissionAudit.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {a.decision === "allowed" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span className="text-foreground capitalize">{a.decision}</span>
                    <span className="text-muted-foreground font-mono">{a.cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Last dream */}
        {data.lastDream && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <h2 className="text-sm font-semibold text-foreground mb-3">Last Dream Run</h2>
            <div className="glass rounded-xl p-4 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground">{data.lastDream.status ?? "unknown"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-foreground">{data.lastDream.created_at?.slice(0, 19)}</span></div>
              {data.lastDream.summary && (
                <div className="mt-2 text-muted-foreground/80">{data.lastDream.summary}</div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
