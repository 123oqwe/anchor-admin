/**
 * Admin Overview — 3-second system health assessment.
 * Shows: decisions, LLM cost, failures, graph, memory, alerts, live activity.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, XCircle, Brain, Loader2, TrendingUp, Database, Zap } from "lucide-react";
import { api } from "@/lib/api";

export default function Overview() {
  const [health, setHealth] = useState<any>(null);
  const [costs, setCosts] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSystemHealth().catch(() => null),
      api.getCosts(1).catch(() => null),
      api.getExecutions().catch(() => []),
    ]).then(([h, c, a]) => {
      setHealth(h);
      setCosts(c);
      setActivity(a?.slice(0, 15) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const isHealthy = (health?.failures24h ?? 0) < 5;
  const totalCost = costs?.totalCost ?? 0;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl ${isHealthy ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
        {isHealthy ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
        <span className="text-sm font-medium text-foreground">{isHealthy ? "System Healthy" : "Issues Detected"}</span>
        <span className="ml-auto text-xs text-muted-foreground">Last 24h</span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Decisions", value: health?.totalDecisions ?? 0, sub: `${health?.confirmRate ?? 0}% confirmed`, color: "text-blue-400" },
          { label: "LLM Cost", value: `$${totalCost.toFixed(2)}`, sub: `${health?.avgResponseMs ?? 0}ms avg`, color: "text-emerald-400" },
          { label: "Failures", value: health?.failures24h ?? 0, sub: "last 24h", color: health?.failures24h > 0 ? "text-red-400" : "text-emerald-400" },
          { label: "Skills", value: `${health?.skills?.used ?? 0}/${health?.skills?.total ?? 0}`, sub: `${health?.skills?.reuseRate ?? 0}% reused`, color: "text-cyan-400" },
          { label: "Evolution", value: health?.evolution?.length ?? 0, sub: "dimensions", color: "text-purple-400" },
        ].map(m => (
          <div key={m.label} className="glass rounded-xl p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</span>
            <div className={`text-2xl font-bold font-mono mt-1 ${m.color}`}>{m.value}</div>
            <span className="text-[10px] text-muted-foreground">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {health?.failures24h > 0 && health?.topFailures?.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-3">Alerts</h3>
          {health.topFailures.map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1">
              <XCircle className="h-3 w-3 text-red-400" />
              <span className="text-foreground">{f.agent}</span>
              <span className="text-muted-foreground ml-auto">{f.cnt} failures this week</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent activity feed */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Agent Activity</h3>
        <div className="space-y-1">
          {activity.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 text-xs py-1">
              <span className={`w-1.5 h-1.5 rounded-full ${a.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-muted-foreground w-24 shrink-0 font-mono">{a.created_at?.slice(11, 16)}</span>
              <span className="text-foreground w-32 shrink-0">{a.agent}</span>
              <span className="text-muted-foreground truncate">{a.action}</span>
            </div>
          ))}
          {activity.length === 0 && <p className="text-xs text-muted-foreground/40">No activity yet</p>}
        </div>
      </div>
    </div>
  );
}
