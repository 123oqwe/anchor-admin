/**
 * Agent Monitor — all 11 system agents + custom agents.
 * Shows status, last run, success/failure counts, manual trigger.
 */
import { useState, useEffect } from "react";
import { Loader2, Play, CheckCircle2, XCircle, Bot, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Agents() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const load = () => fetch("/api/admin/agent-status").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const triggerEngine = async (engine: string) => {
    setTriggering(engine);
    try {
      const res = await fetch(`/api/admin/trigger/${engine}`, { method: "POST" }).then(r => r.json());
      toast.success(`${engine} completed`);
      load(); // refresh
    } catch { toast.error(`${engine} failed`); }
    setTriggering(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>;

  const TRIGGER_MAP: Record<string, string> = {
    "Dream Engine": "dream",
    "Evolution Engine": "evolution",
    "GEPA Optimizer": "gepa",
    "Proactive Agent": "proactive",
    "Self-Portrait": "portrait",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">System Agents</h2>
        <p className="text-xs text-muted-foreground mb-4">11 agents that run the AI system</p>
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">Last Run</th>
                <th className="text-right p-3">Success</th>
                <th className="text-right p-3">Failed</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.systemAgents?.map((a: any) => (
                <tr key={a.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-sm font-medium text-foreground flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    {a.name}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">
                    {a.lastRun ? new Date(a.lastRun).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}
                  </td>
                  <td className="p-3 text-xs text-right font-mono text-emerald-400">{a.successes}</td>
                  <td className="p-3 text-xs text-right font-mono text-red-400">{a.failures}</td>
                  <td className="p-3 text-right">
                    {TRIGGER_MAP[a.name] && (
                      <button
                        onClick={() => triggerEngine(TRIGGER_MAP[a.name])}
                        disabled={triggering === TRIGGER_MAP[a.name]}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] hover:bg-primary/20 disabled:opacity-50"
                      >
                        {triggering === TRIGGER_MAP[a.name] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        Run Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data?.customAgents?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Custom Agents</h2>
          <p className="text-xs text-muted-foreground mb-4">User-created agents</p>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Last Run</th>
                  <th className="text-right p-3">Total Runs</th>
                </tr>
              </thead>
              <tbody>
                {data.customAgents.map((a: any) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-sm font-medium text-foreground">{a.name}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{a.lastRun ?? "never"}</td>
                    <td className="p-3 text-xs text-right font-mono">{a.runs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
